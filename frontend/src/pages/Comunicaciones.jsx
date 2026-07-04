import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { communicationHistory } from '../data/communications';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Select from '../components/Select';
import Toggle from '../components/Toggle';
import { formatDate } from '../utils/format';

const CHANNEL_OPTIONS = [
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Email', label: 'Email' },
  { value: 'Ambos', label: 'Ambos' },
];

function EditTemplateModal({ template, onClose }) {
  const { saveTemplate } = useApp();
  const { showToast } = useToast();
  const [channel, setChannel] = useState(template?.channel || 'WhatsApp');
  const [message, setMessage] = useState(template?.message || '');
  const [active, setActive] = useState(template?.active ?? true);

  if (!template) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    saveTemplate(template.id, { channel, message, active });
    showToast('Plantilla guardada');
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={template.name} testId="edit-template-modal">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="edit-template-form">
        <Select
          label="Canal"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          options={CHANNEL_OPTIONS}
          data-testid="edit-template-channel-select"
        />
        <div>
          <label htmlFor="template-message" className="block text-sm font-medium text-slate-900 mb-1.5">
            Mensaje
          </label>
          <textarea
            id="template-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            data-testid="edit-template-message-textarea"
            className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <p className="text-xs text-slate-400 mt-1">Variables disponibles: {'{nombre}'}, {'{fecha_llegada}'}, {'{albergue}'}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-900">{active ? 'Activo' : 'Inactivo'}</span>
          <Toggle checked={active} onChange={setActive} testId="edit-template-active-toggle" label="Plantilla activa" />
        </div>
        <Button type="submit" fullWidth data-testid="edit-template-save-button">
          Guardar
        </Button>
      </form>
    </Modal>
  );
}

export default function Comunicaciones() {
  const { communicationTemplates, toggleTemplateActive } = useApp();
  const [editingTemplate, setEditingTemplate] = useState(null);

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto" data-testid="comunicaciones-page">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Comunicaciones automáticas</h1>

        <div className="flex flex-col gap-2 mb-8">
          {communicationTemplates.map((t) => (
            <Card key={t.id} className="flex items-center justify-between gap-3 flex-wrap" data-testid={`template-card-${t.id}`}>
              <div>
                <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-400">{t.channel}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(t)}
                  data-testid={`template-edit-link-${t.id}`}
                  className="text-blue-600 text-sm font-medium hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                >
                  Editar
                </button>
                <Toggle
                  checked={t.active}
                  onChange={() => toggleTemplateActive(t.id)}
                  testId={`template-toggle-${t.id}`}
                  label={`Activar ${t.name}`}
                />
              </div>
            </Card>
          ))}
        </div>

        <h2 className="text-base font-semibold text-slate-900 mb-3">Historial de envíos</h2>
        {communicationHistory.length === 0 ? (
          <p className="text-center text-slate-400 py-10" data-testid="communications-history-empty-state">
            No hay envíos recientes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="communications-history-table">
              <thead>
                <tr className="text-left text-slate-400 border-b border-gray-200">
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Huésped</th>
                  <th className="py-2 pr-3 font-medium">Plantilla</th>
                  <th className="py-2 pr-3 font-medium">Canal</th>
                  <th className="py-2 pr-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {communicationHistory.map((h) => (
                  <tr key={h.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-3 text-slate-600">{formatDate(h.date)}</td>
                    <td className="py-2 pr-3 text-slate-900">{h.guestName}</td>
                    <td className="py-2 pr-3 text-slate-600">{h.template}</td>
                    <td className="py-2 pr-3 text-slate-600">{h.channel}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={h.status === 'Enviado' ? 'pagado' : 'pendiente_pago'}>{h.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <EditTemplateModal template={editingTemplate} onClose={() => setEditingTemplate(null)} />
      </div>
    </ManagerLayout>
  );
}
