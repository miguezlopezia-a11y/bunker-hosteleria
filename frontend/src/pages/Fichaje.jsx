import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Tabs from '../components/Tabs';
import Input from '../components/Input';
import StatusDot from '../components/StatusDot';
import ProgressBar from '../components/ProgressBar';
import { formatDate, formatTime, startOfDay } from '../utils/format';

const VERIFICATION_LABELS = {
  wifi: 'WiFi albergue',
  gps: 'GPS verificado',
  out_of_zone: 'Fuera de zona',
};

function resolveVerificationVariant(record) {
  if (record.verificado) {
    return record.lat != null ? 'gps' : 'wifi';
  }
  return 'out_of_zone';
}

function buildHistory(fichajes) {
  const byDay = new Map();
  const sorted = [...fichajes].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  sorted.forEach((f) => {
    const day = startOfDay(new Date(f.timestamp)).toISOString();
    const key = `${f.empleado_nombre}|${day}`;
    if (!byDay.has(key)) {
      byDay.set(key, { employeeName: f.empleado_nombre, date: f.timestamp, entrada: null, salida: null, records: [] });
    }
    const item = byDay.get(key);
    item.records.push(f);
    if (f.tipo === 'entrada') item.entrada = f;
    if (f.tipo === 'salida') item.salida = f;
  });
  return Array.from(byDay.values())
    .map((item) => {
      const start = item.entrada ? new Date(item.entrada.timestamp).getTime() : null;
      const end = item.salida ? new Date(item.salida.timestamp).getTime() : null;
      let horas = '-';
      if (start && end && end > start) {
        horas = ((end - start) / 3600000).toFixed(1);
      }
      const verification = item.records.length > 0 ? resolveVerificationVariant(item.records[item.records.length - 1]) : 'wifi';
      return {
        employeeName: item.employeeName,
        date: item.date,
        entrada: item.entrada ? formatTime(item.entrada.timestamp) : '—',
        salida: item.salida ? formatTime(item.salida.timestamp) : '—',
        horas,
        verification,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function formatTimeInput(timeStr) {
  if (!timeStr) return '09:00';
  return timeStr.slice(0, 5);
}

function EstadoEquipo({ employees }) {
  const { updateEmployeeExpectedCheckin } = useApp();
  const { showToast } = useToast();

  if (employees.length === 0) {
    return (
      <p className="text-center text-slate-400 py-10" data-testid="fichaje-empty-state">
        No hay registros de fichaje.
      </p>
    );
  }

  const handleTimeChange = async (e, empleadoId) => {
    const { error } = await updateEmployeeExpectedCheckin(empleadoId, `${e.target.value}:00`);
    if (error) {
      showToast(error, 'error');
      return;
    }
    showToast('Horario esperado actualizado');
  };

  return (
    <div className="flex flex-col gap-2" data-testid="team-status-list">
      {employees.map((e) => {
        const statusLabel = e.clockedIn ? 'Trabajando' : e.clockOutTime ? 'Fuera' : 'Sin fichar';
        const dotColor = e.clockedIn ? 'green' : e.clockOutTime ? 'gray' : 'yellow';
        return (
          <Card key={e.id} className="flex items-center justify-between gap-3 flex-wrap" data-testid={`employee-status-card-${e.id}`}>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {e.name} <span className="text-slate-400 font-normal">· {e.role}</span>
              </p>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <StatusDot color={dotColor} />
                {statusLabel}
                {e.clockedIn && e.clockInTime && ` · Entrada: ${e.clockInTime}`}
                {!e.clockedIn && e.clockOutTime && ` · Salida: ${e.clockOutTime}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                label="Entrada esperada"
                type="time"
                value={formatTimeInput(e.expectedCheckinTime)}
                onChange={(ev) => handleTimeChange(ev, e.id)}
                className="w-32"
                data-testid={`employee-expected-time-${e.id}`}
              />
              {e.verification && (
                <Badge variant={e.verification}>{VERIFICATION_LABELS[e.verification]}</Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function HistorialTab({ employees, fichajes }) {
  const { showToast } = useToast();
  const records = useMemo(() => buildHistory(fichajes), [fichajes]);

  const workedByEmployee = useMemo(() => {
    return employees.reduce((acc, e) => {
      const total = records
        .filter((r) => r.employeeName === e.name && r.horas !== '-')
        .reduce((sum, r) => sum + parseFloat(r.horas), 0);
      acc[e.name] = total;
      return acc;
    }, {});
  }, [employees, records]);

  const handleExport = () => showToast('Exportado (mock)');

  return (
    <div data-testid="fichaje-historial-tab">
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm" data-testid="fichaje-historial-table">
          <thead>
            <tr className="text-left text-slate-400 border-b border-gray-200">
              <th className="py-2 pr-3 font-medium">Empleado</th>
              <th className="py-2 pr-3 font-medium">Fecha</th>
              <th className="py-2 pr-3 font-medium">Entrada</th>
              <th className="py-2 pr-3 font-medium">Salida</th>
              <th className="py-2 pr-3 font-medium">Horas</th>
              <th className="py-2 pr-3 font-medium">Verificación GPS</th>
              <th className="py-2 pr-1 font-medium" />
            </tr>
          </thead>
          <tbody>
            {records.slice(0, 30).map((r, idx) => (
              <tr key={`${r.employeeName}-${idx}`} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-3 text-slate-900">{r.employeeName}</td>
                <td className="py-2 pr-3 text-slate-600">{formatDate(r.date)}</td>
                <td className="py-2 pr-3 text-slate-600">{r.entrada}</td>
                <td className="py-2 pr-3 text-slate-600">{r.salida}</td>
                <td className="py-2 pr-3 text-slate-600">{r.horas}h</td>
                <td className="py-2 pr-3">
                  <Badge variant={r.verification}>{VERIFICATION_LABELS[r.verification]}</Badge>
                </td>
                <td className="py-2 pr-1 text-slate-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="11" width="14" height="9" rx="1.5" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mb-4">Registros conservados 4 años conforme al ET art. 34.9</p>
      <Button variant="secondary" onClick={handleExport} data-testid="fichaje-export-button">
        Exportar CSV (mock) para inspección
      </Button>

      <h2 className="text-base font-semibold text-slate-900 mt-8 mb-3">Resumen mensual</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {employees.map((e) => {
          const worked = workedByEmployee[e.name] ?? 0;
          const contracted = (e.contractHours ?? 40) * 4;
          return (
            <Card key={e.id} data-testid={`weekly-summary-card-${e.id}`}>
              <p className="text-sm font-semibold text-slate-900">{e.name}</p>
              <p className="text-xs text-slate-400 mb-2">
                {worked.toFixed(1)}h / {contracted}h contratadas
              </p>
              <ProgressBar percentage={(worked / contracted) * 100} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function Fichaje() {
  const { employees, fichajes } = useApp();
  const [activeTab, setActiveTab] = useState('estado');

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto" data-testid="fichaje-page">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Fichaje del equipo — Hoy</h1>

        <Tabs
          tabs={[
            { id: 'estado', label: 'Estado actual' },
            { id: 'historial', label: 'Historial' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          testIdPrefix="fichaje-tab"
        />

        <div className="mt-4">
          {activeTab === 'estado' ? <EstadoEquipo employees={employees} /> : <HistorialTab employees={employees} fichajes={fichajes} />}
        </div>
      </div>
    </ManagerLayout>
  );
}
