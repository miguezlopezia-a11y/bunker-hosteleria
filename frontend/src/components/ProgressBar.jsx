import React from 'react';

export default function ProgressBar({ percentage = 0 }) {
  const clamped = Math.min(100, Math.max(0, percentage));
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden" data-testid="progress-bar">
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
