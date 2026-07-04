// Employees: Ana García (Empleado), Carlos Ruiz (Recepción), Jorge Martín (Director).
// clockInTime/clockOutTime are simple "HH:MM" strings for today's mock fichaje state.
export const employees = [
  { id: 1, name: 'Ana García', role: 'Empleado', contractHours: 30, clockedIn: false, clockInTime: null, clockOutTime: '16:00', verification: 'wifi' },
  { id: 2, name: 'Carlos Ruiz', role: 'Recepción', contractHours: 40, clockedIn: true, clockInTime: '08:32', clockOutTime: null, verification: 'gps' },
  { id: 3, name: 'Jorge Martín', role: 'Director', contractHours: 40, clockedIn: true, clockInTime: '08:15', clockOutTime: null, verification: 'wifi' },
];
