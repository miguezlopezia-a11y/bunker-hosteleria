import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { generateClockHistory } from '../utils/clockHistory';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Tabs from '../components/Tabs';
import StatusDot from '../components/StatusDot';
import ProgressBar from '../components/ProgressBar';
import { formatDate } from '../utils/format';

const VERIFICATION_LABELS = {
  wifi: 'WiFi albergue',
  gps: 'GPS verificado',
  out_of_zone: 'Fuera de zona',
};

const CONTRACTED_HOURS = { 'Ana García': 30, 'Carlos Ruiz': 40, 'Jorge Martín': 40 };
const WORKED_HOURS = { 'Ana García': 24, 'Carlos Ruiz': 38, 'Jorge Martín': 40 };

function EstadoEquipo({ employees }) {
  if (employees.length === 0) {
    return (
      <p className="text-center text-slate-400 py-10" data-testid="fichaje-empty-state">
        No hay registros de fichaje.
      </p>
    );
  }
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
            {e.verification && (
              <Badge variant={e.verification}>{VERIFICATION_LABELS[e.verification]}</Badge>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function HistorialTab({ employees }) {
  const { showToast } = useToast();
  const records = useMemo(
    () => employees.flatMap((e) => generateClockHistory(e.name, 30)).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [employees]
  );

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

      <h2 className="text-base font-semibold text-slate-900 mt-8 mb-3">Resumen semanal</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {employees.map((e) => {
          const worked = WORKED_HOURS[e.name] ?? 0;
          const contracted = CONTRACTED_HOURS[e.name] ?? 40;
          return (
            <Card key={e.id} data-testid={`weekly-summary-card-${e.id}`}>
              <p className="text-sm font-semibold text-slate-900">{e.name}</p>
              <p className="text-xs text-slate-400 mb-2">
                {worked}h / {contracted}h contratadas
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
  const { employees } = useApp();
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
          {activeTab === 'estado' ? <EstadoEquipo employees={employees} /> : <HistorialTab employees={employees} />}
        </div>
      </div>
    </ManagerLayout>
  );
}
