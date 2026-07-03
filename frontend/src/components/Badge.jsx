import React from 'react';

// Explicit class map. Never build Tailwind classes by string interpolation.
const VARIANT_CLASSES = {
  'booking.com': 'bg-blue-50 text-blue-700 border border-blue-200',
  airbnb: 'bg-red-50 text-red-600 border border-red-200',
  hostelworld: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  directo: 'bg-green-50 text-green-700 border border-green-200',
  pendiente: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  checkin_completado: 'bg-green-50 text-green-700 border border-green-200',
  activo: 'bg-green-50 text-green-700 border border-green-200',
  checkout_hoy: 'bg-gray-100 text-gray-600 border border-gray-200',
  pagado: 'bg-green-50 text-green-700 border border-green-200',
  pendiente_pago: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  limpia: 'bg-green-50 text-green-700 border border-green-200',
  en_proceso: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  proximamente: 'bg-gray-100 text-gray-500 border border-gray-200',
  default: 'bg-gray-100 text-gray-600 border border-gray-200',
};

export default function Badge({ variant = 'default', children, className = '', ...props }) {
  const key = String(variant).toLowerCase();
  const variantClass = VARIANT_CLASSES[key] || VARIANT_CLASSES.default;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
