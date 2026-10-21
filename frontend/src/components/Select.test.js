import React from 'react';
import { render, screen } from '@testing-library/react';
import Select from './Select';

test('con options plano renderiza las opciones sin optgroup', () => {
  render(<Select options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />);
  const select = screen.getByRole('combobox');
  expect(select.querySelectorAll('optgroup')).toHaveLength(0);
  expect([...select.querySelectorAll('option')].map((o) => o.value)).toEqual(['a', 'b']);
});

test('con groups renderiza un optgroup por grupo', () => {
  render(
    <Select
      groups={[
        { label: 'Camas', options: [{ value: 'bed:1A', label: 'Cama 1A' }] },
        { label: 'Habitaciones privadas', options: [{ value: 'room:rm2', label: 'Habitación Doble (privada)' }] },
      ]}
    />,
  );
  const optgroups = screen.getByRole('combobox').querySelectorAll('optgroup');
  expect(optgroups).toHaveLength(2);
  expect(optgroups[0]).toHaveAttribute('label', 'Camas');
  expect(optgroups[1]).toHaveAttribute('label', 'Habitaciones privadas');
});

test('con groups omite los grupos vacíos', () => {
  render(
    <Select
      groups={[
        { label: 'Camas', options: [{ value: 'bed:1A', label: 'Cama 1A' }] },
        { label: 'Habitaciones privadas', options: [] },
      ]}
    />,
  );
  const optgroups = screen.getByRole('combobox').querySelectorAll('optgroup');
  expect(optgroups).toHaveLength(1);
  expect(optgroups[0]).toHaveAttribute('label', 'Camas');
});
