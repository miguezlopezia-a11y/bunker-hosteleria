// 3 mock hostels for BunkerHostal.
export const hostels = [
  {
    id: 1,
    name: 'Albergue El Camino',
    slug: 'albergue-el-camino',
    address: 'Calle Mayor 12, Pamplona',
    phone: '948123456',
    email: 'info@albergueelcamino.com',
    capacity: 20,
    basePrice: 15,
  },
  {
    id: 2,
    name: 'Albergue Los Pinos',
    slug: 'albergue-los-pinos',
    address: 'Camino de Santiago 45, Logroño',
    phone: '941234567',
    email: 'info@alberguelospinos.com',
    capacity: 24,
    basePrice: 16,
  },
  {
    id: 3,
    name: 'Hostal Santa María',
    slug: 'hostal-santa-maria',
    address: 'Plaza Santa María 3, Burgos',
    phone: '947345678',
    email: 'info@hostalsantamaria.com',
    capacity: 18,
    basePrice: 18,
  },
];

export function getHostelBySlug(slug) {
  return hostels.find((h) => h.slug === slug) || hostels[0];
}
