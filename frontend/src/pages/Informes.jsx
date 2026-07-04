import React, { useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import { financials } from '../data/financials';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import Select from '../components/Select';
import { formatEuro, formatEuroDecimal } from '../utils/format';

const RANGE_OPTIONS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
];

export default function Informes() {
  const { showToast } = useToast();
  const [range, setRange] = useState('mes');
  const [exporting, setExporting] = useState(false);

  const maxChannelIncome = Math.max(...financials.byChannel.map((c) => c.income));

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto" data-testid="informes-page">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Informes</h1>
          <Select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            options={RANGE_OPTIONS}
            data-testid="informes-range-select"
            className="w-40"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card data-testid="metric-total-income">
            <p className="text-xs text-slate-400">Ingresos totales</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatEuro(financials.totalIncome)}</p>
            <p className="text-xs text-green-600 mt-1">+{financials.incomeChangePercent}% vs mes anterior</p>
          </Card>
          <Card data-testid="metric-occupancy">
            <p className="text-xs text-slate-400">Ocupación media</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{financials.averageOccupancy}%</p>
          </Card>
          <Card data-testid="metric-average-price">
            <p className="text-xs text-slate-400">Precio medio por cama</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatEuroDecimal(financials.averagePricePerBed)}</p>
          </Card>
          <Card data-testid="metric-direct-vs-channels">
            <p className="text-xs text-slate-400">Reservas directas vs canales</p>
            <p className="text-sm font-semibold text-slate-900 mt-2">
              {financials.directBookingPercent}% directo · {financials.channelBookingPercent}% canales
            </p>
          </Card>
        </div>

        <Card className="mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Ingresos por canal</h2>
          <div className="flex flex-col gap-3">
            {financials.byChannel.map((c) => (
              <div key={c.channel} data-testid={`channel-income-row-${c.channel}`}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">{c.channel}</span>
                  <span className="font-medium text-slate-900">{formatEuro(c.income)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${(c.income / maxChannelIncome) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Estimación IVA</h2>
          <div className="flex flex-col gap-1 text-sm text-slate-600">
            <p><span className="text-slate-400">Base imponible: </span>{formatEuro(financials.vat.taxBase)}</p>
            <p><span className="text-slate-400">IVA alojamiento ({financials.vat.rate}%): </span>{formatEuro(financials.vat.vatAmount)}</p>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Estimación orientativa (IVA reducido {financials.vat.rate}% alojamiento turístico). Consulta con tu gestor.
          </p>
        </Card>

        <Button
          variant="secondary"
          onClick={() => {
            setExporting(true);
            setTimeout(() => {
              showToast('Exportado (mock)');
              setExporting(false);
            }, 800);
          }}
          loading={exporting}
          data-testid="informes-export-button"
        >
          Descargar informe CSV (mock)
        </Button>
      </div>
    </ManagerLayout>
  );
}
