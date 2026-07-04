import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Tabs from '../components/Tabs';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { formatTime, addMinutes, isSameDay } from '../utils/format';

const STATUS_LABELS = { clean: 'Lista', cleaning: 'En limpieza', dirty: 'Sucia', blocked: 'Bloqueada' };

function AssignTaskModal({ isOpen, onClose, rooms, employees }) {
  const { assignTask } = useApp();
  const { showToast } = useToast();
  const [roomId, setRoomId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomId || !employeeName) return;
    assignTask({ roomId: Number(roomId), employeeName, notes });
    showToast('Tarea asignada');
    setRoomId('');
    setEmployeeName('');
    setNotes('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Asignar tarea" testId="assign-task-modal" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="assign-task-form">
        <Select
          label="Habitación"
          required
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          options={rooms.map((r) => ({ value: String(r.id), label: r.name }))}
          placeholder="Selecciona una habitación"
          data-testid="assign-task-room-select"
        />
        <Select
          label="Empleado"
          required
          value={employeeName}
          onChange={(e) => setEmployeeName(e.target.value)}
          options={employees.map((e) => ({ value: e.name, label: e.name }))}
          placeholder="Selecciona un empleado"
          data-testid="assign-task-employee-select"
        />
        <Input
          label="Notas opcionales"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          data-testid="assign-task-notes-input"
        />
        <Button type="submit" fullWidth data-testid="assign-task-submit-button">
          Asignar
        </Button>
      </form>
    </Modal>
  );
}

export default function Limpieza() {
  const { session, rooms, employees, tasks, integrations } = useApp();
  const [activeTab, setActiveTab] = useState('habitaciones');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const isDirector = session?.role === 'Director';

  const todaysDoneTasks = tasks.filter((t) => t.status === 'done' && t.completedAt && isSameDay(t.completedAt, new Date()));

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto" data-testid="limpieza-page">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Estado de habitaciones — Hoy</h1>
          {isDirector && (
            <Button onClick={() => setAssignModalOpen(true)} data-testid="assign-task-button">
              Asignar tarea
            </Button>
          )}
        </div>

        <Tabs
          tabs={[
            { id: 'habitaciones', label: 'Habitaciones' },
            { id: 'log', label: 'Log de limpieza' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          testIdPrefix="limpieza-tab"
        />

        <div className="mt-4">
          {activeTab === 'habitaciones' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="rooms-grid">
              {rooms.map((r) => (
                <Card key={r.id} data-testid={`room-card-${r.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {r.name} · Camas {r.beds[0]}–{r.beds[r.beds.length - 1]}
                    </p>
                    <Badge variant={r.status}>{STATUS_LABELS[r.status]}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">Asignado a: {r.assignedTo || '—'}</p>
                  {r.status === 'clean' && (
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="pagado">Disponible en tu página propia</Badge>
                      {(integrations.bookingcom || integrations.airbnb || integrations.hostelworld) && (
                        <Badge variant="precio">Sincronizado en canales externos</Badge>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div data-testid="cleaning-log-tab">
              {todaysDoneTasks.length === 0 ? (
                <p className="text-center text-slate-400 py-10" data-testid="cleaning-log-empty-state">
                  No hay tareas completadas hoy.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="cleaning-log-table">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-gray-200">
                        <th className="py-2 pr-3 font-medium">Habitación</th>
                        <th className="py-2 pr-3 font-medium">Empleado</th>
                        <th className="py-2 pr-3 font-medium">Inicio</th>
                        <th className="py-2 pr-3 font-medium">Fin</th>
                        <th className="py-2 pr-3 font-medium">Estado</th>
                        <th className="py-2 pr-3 font-medium">Duración</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todaysDoneTasks.map((t) => {
                        const room = rooms.find((r) => r.id === t.roomId);
                        const start = addMinutes(t.completedAt, -25);
                        return (
                          <tr key={t.id} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 pr-3 text-slate-900">{room?.name}</td>
                            <td className="py-2 pr-3 text-slate-600">{t.employeeName}</td>
                            <td className="py-2 pr-3 text-slate-600">{formatTime(start)}</td>
                            <td className="py-2 pr-3 text-slate-600">{formatTime(t.completedAt)}</td>
                            <td className="py-2 pr-3">
                              <Badge variant="clean">Lista</Badge>
                            </td>
                            <td className="py-2 pr-3 text-slate-600">25 min</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <AssignTaskModal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} rooms={rooms} employees={employees} />
      </div>
    </ManagerLayout>
  );
}
