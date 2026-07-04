import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Input from '../components/Input';
import Button from '../components/Button';
import { formatRelativeDateTime, formatEuro } from '../utils/format';

const TYPE_LABELS = { precio: 'Precio', ocupacion: 'Ocupación', aviso: 'Aviso' };

function getMockAnswer(question, ctx) {
  const q = question.toLowerCase();
  if (q.includes('cama')) {
    const free = ctx.beds.filter((b) => b.status === 'free').length;
    return `Actualmente tienes ${free} camas libres.`;
  }
  if (q.includes('ocupa')) {
    return 'La ocupación media esta semana es del 71%.';
  }
  if (q.includes('pago') || q.includes('pendiente')) {
    const pending = ctx.guests.find((g) => g.paymentStatus === 'pendiente');
    return pending
      ? `${pending.name} tiene un pago pendiente de ${formatEuro(pending.price)}.`
      : 'No hay pagos pendientes en este momento.';
  }
  if (q.includes('precio')) {
    return 'Recomiendo mantener el precio entre € 15 y € 22 según demanda de la zona.';
  }
  return 'Gracias por tu pregunta, estoy analizando los datos del albergue...';
}

function MaiaChat() {
  const ctx = useApp();
  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question;
    setQuestion('');
    setLoading(true);
    setTimeout(() => {
      const answer = getMockAnswer(q, ctx);
      setExchanges((prev) => [...prev, { question: q, answer }].slice(-3));
      setLoading(false);
    }, 1000);
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
          <div className="flex flex-col gap-1.5 mb-2 max-h-32 overflow-y-auto" data-testid="maia-chat-exchanges">
            {exchanges.map((ex, idx) => (
              <div key={idx} className="text-xs">
                <p className="text-slate-900 font-medium">Tú: {ex.question}</p>
                <p className="text-slate-600">MaiA: {ex.answer}</p>
              </div>
            ))}
            {loading && <p className="text-xs text-slate-400">MaiA está escribiendo...</p>}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            label=""
            placeholder="Pregunta algo a MaiA..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1"
            data-testid="maia-chat-input"
          />
          <Button type="submit" data-testid="maia-chat-send-button">
            Enviar
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function MaiaPanel() {
  const { notifications, markNotificationRead } = useApp();
  const sorted = [...notifications].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto pb-40 md:pb-24" data-testid="maia-page">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">MaiA — Asistente del albergue</h1>

        {sorted.length === 0 ? (
          <p className="text-center text-slate-400 py-10" data-testid="maia-empty-state">
            No hay notificaciones nuevas.
          </p>
        ) : (
          <div className="flex flex-col gap-2" data-testid="maia-notifications-list">
            {sorted.map((n) => (
              <Card key={n.id} className={n.read ? 'opacity-60' : ''} data-testid={`maia-notification-${n.id}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={n.type}>{TYPE_LABELS[n.type]}</Badge>
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
        )}
      </div>
      <MaiaChat />
    </ManagerLayout>
  );
}
