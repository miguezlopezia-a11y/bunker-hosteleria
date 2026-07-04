// 4 local services with pilgrim discounts (mutable via AppContext for Phase 3 Marketplace).
export const marketplaceServices = [
  { id: 1, name: 'Bar El Peregrino', category: 'Restaurante', description: 'Menú del día y raciones para peregrinos.', discount: '10% dto con tarjeta BunkerHostal', phone: '948223344' },
  { id: 2, name: 'Lavandería Rápida', category: 'Lavandería', description: 'Servicio de lavado y secado en 2 horas.', discount: 'Recogida y entrega en albergue', phone: '648112233' },
  { id: 3, name: 'Farmacia Camino', category: 'Farmacia', description: 'Productos de primeros auxilios y cuidado del peregrino.', discount: 'Kits de primeros auxilios para peregrinos', phone: '948334455' },
  { id: 4, name: 'Taxi Camino', category: 'Taxi', description: 'Traslados rápidos y seguros por la zona.', discount: 'Traslado estación ↔ albergue € 8', phone: '677445566' },
];
