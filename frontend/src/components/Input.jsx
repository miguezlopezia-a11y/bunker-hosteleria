import React, { useState } from 'react';

let uid = 0;

const baseClasses = 'w-full border rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none';
const borderClasses = {
  error: 'border-red-600',
  normal: 'border-gray-200',
};

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-3.22 4.44M1 1l22 22" />
    </svg>
  );
}

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
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-900 mb-1.5">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={isPassword && visible ? 'text' : type}
          className={isPassword ? `${inputClasses} pr-10` : inputClasses}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            data-testid={`${inputId}-toggle-visibility`}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
          >
            <EyeIcon visible={visible} />
          </button>
        )}
      </div>
      {error && (
        <p className="text-red-600 text-xs mt-1" data-testid={`${inputId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
