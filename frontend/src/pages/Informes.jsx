import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
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

const VAT_RATE = 10;

function channelLabel(channel) {
  const map = {
    directo: 'Directo',
    booking: 'Booking.com',
    airbnb: 'Airbnb',
    hostelworld: 'Hostelworld',
  };
  return map[channel] || channel || 'Otros';
}

export default function Informes() {
  const { showToast } = useToast();
  const { reservations, guests, beds } = useApp();
  const [range, setRange] = useState('mes');
  const [exporting, setExporting] = useState(false);

  const financials = useMemo(() => {
    const activeReservations = (reservations || []).filter((r) => r.status !== 'cancelada');
    const totalIncome = activeReservations.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
    const totalBeds = Math.max(1, beds.length);
    const occupiedBeds = beds.filter((b) => b.status === 'occupied').length;
    const averageOccupancy = Math.round((occupiedBeds / totalBeds) * 100);
    const averagePricePerBed = totalIncome / Math.max(1, activeReservations.length);
    const directCount = activeReservations.filter((r) => r.origin === 'Directo' || r.channel === 'directo').length;
    const directBookingPercent = activeReservations.length
      ? Math.round((directCount / activeReservations.length) * 100)
      : 0;
    const channelBookingPercent = 100 - directBookingPercent;

    const channelMap = {};
    activeReservations.forEach((r) => {
      const label = channelLabel(r.origin || r.channel);
      channelMap[label] = (channelMap[label] || 0) + (Number(r.price) || 0);
    });
    const byChannel = Object.entries(channelMap).map(([channel, income]) => ({ channel, income }));

    const vatAmount = Math.round((totalIncome * VAT_RATE) / (100 + VAT_RATE));
    const taxBase = totalIncome - vatAmount;

    return {
      totalIncome,
      incomeChangePercent: 0,
      averageOccupancy,
      averagePricePerBed,
      directBookingPercent,
      channelBookingPercent,
      byChannel,
      byWeek: [],
      vat: { taxBase, vatAmount, rate: VAT_RATE },
    };
  }, [reservations, guests, beds]);

  const maxChannelIncome = Math.max(...financials.byChannel.map((c) => c.income), 1);

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
            {financials.byChannel.length === 0 ? (
              <p className="text-center text-slate-400 py-6">No hay ingresos registrados.</p>
            ) : (
              financials.byChannel.map((c) => (
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
              ))
            )}
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
              showToast('Exportado');
              setExporting(false);
            }, 800);
          }}
          loading={exporting}
          data-testid="informes-export-button"
        >
          Descargar informe CSV
        </Button>
      </div>
    </ManagerLayout>
  );
}
