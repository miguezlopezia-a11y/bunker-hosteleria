import React from 'react';

export default function Tabs({ tabs, activeTab, onChange, testIdPrefix = 'tab' }) {
  return (
    <div className="flex border-b border-gray-200 gap-1" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            data-testid={`${testIdPrefix}-${tab.id}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-t-md -mb-px ${
              isActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
