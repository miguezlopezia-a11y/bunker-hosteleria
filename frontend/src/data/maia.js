// 5 MaiA notifications. 2 are "alerta" (matches dashboard "2 alertas de MaiA").
export const maiaNotifications = [
  { id: 1, type: 'alerta', message: 'Posible doble reserva detectada en cama 2C', date: new Date() },
  { id: 2, type: 'alerta', message: 'Huésped sin documento escaneado tras 24h', date: new Date() },
  { id: 3, type: 'info', message: 'Recordatorio: enviar plantilla de bienvenida a nuevos huéspedes', date: new Date() },
  { id: 4, type: 'info', message: 'Sincronización con Booking.com completada', date: new Date() },
  { id: 5, type: 'info', message: 'Nuevo comentario recibido en Hostelworld', date: new Date() },
];
