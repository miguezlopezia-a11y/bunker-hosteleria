import React from 'react';

let uid = 0;

const baseClasses = 'w-full border rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none';
const borderClasses = {
  error: 'border-red-600',
  normal: 'border-gray-200',
};

export default function Input({
  label,
  id,
  error,
  type = 'text',
  className = '',
  required = false,
  ...props
}) {
  const inputId = id || `input-${(uid += 1)}`;
  const inputClasses = `${baseClasses} ${error ? borderClasses.error : borderClasses.normal}`;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-900 mb-1.5">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="text-red-600 text-xs mt-1" data-testid={`${inputId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
