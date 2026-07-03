import React from 'react';

let uid = 0;

export default function Select({
  label,
  id,
  error,
  options = [],
  placeholder,
  className = '',
  required = false,
  ...props
}) {
  const selectId = id || `select-${(uid += 1)}`;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-slate-900 mb-1.5">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full border rounded-md px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none ${
          error ? 'border-red-600' : 'border-gray-200'
        }`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-red-600 text-xs mt-1" data-testid={`${selectId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
