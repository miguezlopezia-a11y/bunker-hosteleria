import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { rooms as roomsData } from '../../data/rooms';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import ProgressBar from '../../components/ProgressBar';
import EmployeeTabs from '../../components/EmployeeTabs';

const PRIORITY_LABELS = { high: 'Prioridad alta', normal: 'Prioridad normal' };

function FicharCard({ employee }) {
  const { clockIn, clockOut } = useApp();
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  if (!employee) return null;

  const handleTap = () => {
    setVerifying(true);
    setResult(null);
    setTimeout(() => {
      if (employee.clockedIn) {
        clockOut(employee.id);
        setResult({ ok: true, text: `Salida registrada · WiFi albergue verificado` });
      } else {
        clockIn(employee.id);
        setResult({ ok: true, text: `Entrada registrada · WiFi albergue verificado` });
      }
      setVerifying(false);
    }, 900);
  };

  return (
    <Card className="mb-6" data-testid="fichar-card">
      <p className="text-sm text-slate-600 mb-3">
        {employee.clockedIn
          ? `Trabajando · Entrada: ${employee.clockInTime}`
          : `Fuera · Última salida: ${employee.clockOutTime ? `ayer ${employee.clockOutTime}` : '—'}`}
      </p>

      {verifying ? (
        <p className="text-center text-slate-400 py-3" data-testid="fichar-verifying">
          Verificando ubicación...
        </p>
      ) : (
        <Button
          fullWidth
          variant={employee.clockedIn ? 'danger' : 'primary'}
          className="text-base py-4"
          onClick={handleTap}
          data-testid="fichar-toggle-button"
        >
          {employee.clockedIn ? 'FICHAR SALIDA' : 'FICHAR ENTRADA'}
        </Button>
      )}

      {result && (
        <p className="text-center text-green-600 font-medium mt-3" data-testid="fichar-result-success">
          {result.text}
        </p>
      )}

      <p className="text-xs text-slate-400 text-center mt-4">
        Tu fichaje queda registrado conforme al ET art. 34.9
      </p>
    </Card>
  );
}

function TaskCard({ task }) {
  const { markTaskDone } = useApp();
  const [syncing, setSyncing] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const room = roomsData.find((r) => r.id === task.roomId);

  const handleMarkDone = () => {
    markTaskDone(task.id);
    setJustCompleted(true);
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1000);
  };

  const isDone = task.status === 'done' || justCompleted;

  return (
    <Card data-testid={`employee-task-card-${task.id}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            {isDone && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m8 12 3 3 5-6" />
              </svg>
            )}
            {room?.name} · Camas {room?.beds?.[0]}–{room?.beds?.[room.beds.length - 1]}
          </p>
          <Badge variant={task.priority} className="mt-1">
            {PRIORITY_LABELS[task.priority]}
          </Badge>
        </div>
        {!isDone && (
          <Button onClick={handleMarkDone} data-testid={`mark-task-done-button-${task.id}`}>
            Marcar como lista
          </Button>
        )}
      </div>

      {isDone && (
        <div className="mt-3 border-t border-gray-100 pt-3 text-xs flex flex-col gap-1" data-testid={`task-sync-confirmation-${task.id}`}>
          <p className="text-green-600">Tu página propia: disponible ahora</p>
          <p className={syncing ? 'text-yellow-600' : 'text-blue-600'}>
            {syncing ? 'Canales externos conectados: sincronizando...' : 'Actualizado en canales conectados'}
          </p>
        </div>
      )}
    </Card>
  );
}

export default function EmployeePortal() {
  const { session, logout, employees, tasks } = useApp();
  const navigate = useNavigate();
  const employee = employees.find((e) => e.name === session?.employeeName);
  const myTasks = tasks.filter((t) => t.employeeName === session?.employeeName);
  const doneCount = myTasks.filter((t) => t.status === 'done').length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 max-w-lg mx-auto" data-testid="employee-portal-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">
          Hola, {session?.employeeName} · {session?.hostel?.name}
        </h1>
        <Button variant="ghost" onClick={handleLogout} data-testid="employee-logout-button">
          Cerrar sesión
        </Button>
      </div>

      <EmployeeTabs active="fichar" />

      <FicharCard employee={employee} />

      <h2 className="text-base font-semibold text-slate-900 mb-3">Tareas del día</h2>
      {myTasks.length === 0 ? (
        <p className="text-center text-slate-400 py-10" data-testid="employee-tasks-empty-state">
          No tienes tareas asignadas hoy.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-4">
            {myTasks.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
          <Card data-testid="employee-tasks-progress">
            <p className="text-sm text-slate-600 mb-2">
              Estado de mis tareas: {doneCount}/{myTasks.length} completadas
            </p>
            <ProgressBar percentage={(doneCount / myTasks.length) * 100} />
          </Card>
        </>
      )}
    </div>
  );
}
