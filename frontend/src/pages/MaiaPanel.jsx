import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatRelativeDateTime, addDays, isSameDay } from '../utils/format';

const TYPE_LABELS = { precio: 'Precio', ocupacion: 'Ocupación', aviso: 'Aviso', alerta: 'Alerta', info: 'Info', sugerencia: 'Sugerencia' };

function MaiaChat() {
  const { maiaChatAnswer } = useApp();
  const { showToast } = useToast();
  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question;
    setQuestion('');
    setLoading(true);

    const { answer, error } = await maiaChatAnswer(q);
    setLoading(false);

    if (error) {
      showToast(error, 'error');
      return;
    }

    setExchanges((prev) => [...prev, { question: q, answer }].slice(-5));
  };

  return (
    <div
      className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-[260px] bg-white border-t border-gray-200 p-3 z-30"
      data-testid="maia-chat"
    >
      <div className="max-w-3xl mx-auto">
        {exchanges.length === 0 && !loading ? (
          <p className="text-xs text-slate-400 mb-2">Ejemplo: ¿Cuántas camas tengo libres mañana?</p>
        ) : (
          <div className="flex flex-col gap-1.5 mb-2 max-h-40 overflow-y-auto" data-testid="maia-chat-exchanges">
            {exchanges.map((ex, idx) => (
              <div key={idx} className="text-xs">
                <p className="text-slate-900 font-medium">Tú: {ex.question}</p>
                <p className="text-slate-600">MaiA: {ex.answer}</p>
              </div>
            ))}
            {loading && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <LoadingSpinner size={12} /> MaiA está escribiendo...
              </p>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            aria-label="Pregunta algo a MaiA"
            placeholder="Pregunta algo a MaiA..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1"
            data-testid="maia-chat-input"
          />
          <Button type="submit" disabled={loading} data-testid="maia-chat-send-button">
            Enviar
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function MaiaPanel() {
  const { notifications, markNotificationRead, maiaAnalyze } = useApp();
  const { showToast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);

  const today = new Date();
  const tomorrow = addDays(today, 1);

  const { todayNotifications, earlierNotifications } = useMemo(() => {
    const sorted = [...notifications].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return {
      todayNotifications: sorted.filter((n) => isSameDay(n.timestamp, today)),
      earlierNotifications: sorted.filter((n) => !isSameDay(n.timestamp, today) && isSameDay(n.timestamp, tomorrow)),
    };
  }, [notifications, today, tomorrow]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const { alerts, error } = await maiaAnalyze();
    setAnalyzing(false);
    if (error) {
      showToast(error, 'error');
      return;
    }
    if (alerts.length === 0) {
      showToast('MaiA no ha detectado novedades');
    } else {
      showToast(`${alerts.length} alerta${alerts.length > 1 ? 's' : ''} generada${alerts.length > 1 ? 's' : ''}`);
    }
  };

  const renderList = (list) => {
    if (list.length === 0) {
      return (
        <p className="text-center text-slate-400 py-6" data-testid="maia-empty-state">
          No hay notificaciones nuevas.
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-2" data-testid="maia-notifications-list">
        {list.map((n) => (
          <Card key={n.id} className={n.read ? 'opacity-60' : ''} data-testid={`maia-notification-${n.id}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Badge variant={n.type}>{TYPE_LABELS[n.type] || n.type}</Badge>
                <span className="text-xs text-slate-400">{formatRelativeDateTime(n.timestamp)}</span>
              </div>
              {!n.read && (
                <button
                  type="button"
                  onClick={() => markNotificationRead(n.id)}
                  data-testid={`maia-mark-read-${n.id}`}
                  className="text-blue-600 text-xs font-medium hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                >
                  Marcar leído
                </button>
              )}
            </div>
            <p className="text-sm text-slate-900">{n.message}</p>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto pb-40 md:pb-24" data-testid="maia-page">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-2xl font-bold text-slate-900">MaiA — Asistente del albergue</h1>
          <Button onClick={handleAnalyze} loading={analyzing} data-testid="maia-analyze-button">
            Analizar ahora
          </Button>
        </div>

        <h2 className="text-base font-semibold text-slate-900 mb-3">Hoy</h2>
        {renderList(todayNotifications)}

        {earlierNotifications.length > 0 && (
          <>
            <h2 className="text-base font-semibold text-slate-900 mt-6 mb-3">Ayer</h2>
            {renderList(earlierNotifications)}
          </>
        )}
      </div>
      <MaiaChat />
    </ManagerLayout>
  );
}
