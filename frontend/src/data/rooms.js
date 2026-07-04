// 4 rooms with cleaning status ('clean' | 'cleaning' | 'dirty' | 'blocked') and assigned employee.
// Rooms 2 and 4 are pending cleaning, matching Ana García's assigned tasks in tasks.js.
export const rooms = [
  { id: 1, name: 'Habitación 1', beds: ['1A', '1B', '1C', '1D', '1E'], status: 'clean', assignedTo: 'Carlos Ruiz' },
  { id: 2, name: 'Habitación 2', beds: ['2A', '2B', '2C', '2D', '2E'], status: 'dirty', assignedTo: 'Ana García' },
  { id: 3, name: 'Habitación 3', beds: ['3A', '3B', '3C', '3D', '3E'], status: 'clean', assignedTo: 'Ana García' },
  { id: 4, name: 'Habitación 4', beds: ['4A', '4B', '4C', '4D', '4E'], status: 'cleaning', assignedTo: 'Ana García' },
];
