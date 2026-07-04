import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function EmployeeTabs({ active }) {
  const navigate = useNavigate();
  const tabs = [
    { id: 'fichar', label: 'Fichar', to: '/empleado' },
    { id: 'historial', label: 'Historial', to: '/empleado/historial' },
  ];
  return (
    <div className="flex border-b border-gray-200 gap-1 mb-4" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          onClick={() => navigate(tab.to)}
          data-testid={`employee-tab-${tab.id}`}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-t-md -mb-px ${
            tab.id === active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
