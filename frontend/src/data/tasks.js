// Cleaning tasks. Ana García has 2 pending tasks (rooms 2 and 4), matching the
// Employee portal "Tareas del día" example. Carlos already completed 2 today,
// feeding the manager Limpieza "Log de limpieza" tab.
function todayAt(hour, minute) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

export const tasks = [
  { id: 1, roomId: 2, employeeName: 'Ana García', priority: 'high', status: 'pending', completedAt: null },
  { id: 2, roomId: 4, employeeName: 'Ana García', priority: 'normal', status: 'pending', completedAt: null },
  { id: 3, roomId: 1, employeeName: 'Carlos Ruiz', priority: 'normal', status: 'done', completedAt: todayAt(9, 15) },
  { id: 4, roomId: 3, employeeName: 'Ana García', priority: 'normal', status: 'done', completedAt: todayAt(10, 0) },
];
