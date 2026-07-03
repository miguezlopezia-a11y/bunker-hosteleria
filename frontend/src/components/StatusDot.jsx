import React from 'react';

const DOT_COLORS = {
  green: 'bg-green-600',
  yellow: 'bg-yellow-500',
  red: 'bg-red-600',
  gray: 'bg-gray-400',
};

export default function StatusDot({ color = 'gray', className = '' }) {
  const dotClass = DOT_COLORS[color] || DOT_COLORS.gray;
  return <span className={`inline-block w-2 h-2 rounded-full ${dotClass} ${className}`} data-testid="status-dot" />;
}
