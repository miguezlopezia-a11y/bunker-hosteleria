import React from 'react';
import { loyaltyPilgrims } from '../data/loyalty';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';

const HOW_IT_WORKS = [
  'El peregrino acumula 1 punto por cada noche',
  '10 puntos = 1 noche gratis en cualquier albergue BunkerHostal',
  'Descuento automático aplicado al reservar directamente',
];

export default function Fidelizacion() {
  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto" data-testid="fidelizacion-page">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Programa Peregrino — Fidelización</h1>

        <Card className="mb-6" data-testid="fidelizacion-status-card">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="pendiente">BETA</Badge>
          </div>
          <p className="text-sm text-slate-600">
            El programa de fidelización está disponible para nuevos albergues a partir de la temporada 2027.
          </p>
        </Card>

        <h2 className="text-base font-semibold text-slate-900 mb-3">Cómo funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {HOW_IT_WORKS.map((text, idx) => (
            <Card key={idx} className="text-center" data-testid={`fidelizacion-how-it-works-${idx}`}>
              <p className="text-sm font-semibold text-blue-600 mb-1">{idx + 1}</p>
              <p className="text-sm text-slate-600">{text}</p>
            </Card>
          ))}
        </div>

        <h2 className="text-base font-semibold text-slate-900 mb-3">Ranking de peregrinos frecuentes</h2>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm" data-testid="loyalty-ranking-table">
            <thead>
              <tr className="text-left text-slate-400 border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">Nombre</th>
                <th className="py-2 pr-3 font-medium">Rutas completadas</th>
                <th className="py-2 pr-3 font-medium">Puntos</th>
                <th className="py-2 pr-3 font-medium">Último Camino</th>
              </tr>
            </thead>
            <tbody>
              {loyaltyPilgrims.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-3 text-slate-900">{p.name}</td>
                  <td className="py-2 pr-3 text-slate-600">{p.routesCompleted}</td>
                  <td className="py-2 pr-3 text-slate-600">{p.points}</td>
                  <td className="py-2 pr-3 text-slate-600">{p.lastCamino}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-start gap-2">
          <span title="Disponible en 2027">
            <Button disabled data-testid="activate-loyalty-program-button">
              Activa el programa para tu albergue
            </Button>
          </span>
          <p className="text-xs text-slate-400">
            La infraestructura de puntos ya está registrada en cada check-in. No necesitas hacer nada ahora.
          </p>
        </div>
      </div>
    </ManagerLayout>
  );
}
