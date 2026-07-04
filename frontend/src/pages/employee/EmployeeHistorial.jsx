import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { generateClockHistory } from '../../utils/clockHistory';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import EmployeeTabs from '../../components/EmployeeTabs';
import { formatDate } from '../../utils/format';

const VERIFICATION_LABELS = { wifi: 'WiFi albergue', gps: 'GPS verificado', out_of_zone: 'Fuera de zona' };

export default function EmployeeHistorial() {
  const { session } = useApp();
  const { showToast } = useToast();
  const records = useMemo(() => generateClockHistory(session?.employeeName || '', 30), [session]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 max-w-lg mx-auto" data-testid="employee-historial-page">
      <h1 className="text-xl font-bold text-slate-900 mb-4">Mi historial de fichajes</h1>

      <EmployeeTabs active="historial" />

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm" data-testid="employee-historial-table">
          <thead>
            <tr className="text-left text-slate-400 border-b border-gray-200">
              <th className="py-2 pr-3 font-medium">Fecha</th>
              <th className="py-2 pr-3 font-medium">Entrada</th>
              <th className="py-2 pr-3 font-medium">Salida</th>
              <th className="py-2 pr-3 font-medium">Horas</th>
              <th className="py-2 pr-3 font-medium">Verificación</th>
              <th className="py-2 pr-1 font-medium" />
            </tr>
          </thead>
          <tbody>
            {records.map((r, idx) => (
              <tr key={idx} className="border-b border-gray-100 last:border-0">
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

      <p className="text-xs text-slate-400 mb-4">
        No se pueden modificar los registros. Contacta con tu director para correcciones.
      </p>

      <Button variant="secondary" onClick={() => showToast('Exportado')} data-testid="employee-export-history-button">
        Descargar mis horas CSV (mock)
      </Button>
    </div>
  );
}
