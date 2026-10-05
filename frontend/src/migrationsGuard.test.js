/**
 * Guarda estática de migraciones — TDD de la migración 023.
 *
 * Propiedad: los campos de contenido de la página web por hostal
 * (descripcion_larga, fotos, color_acento, plantilla, pagina_web_activa) NO
 * deben colarse en `list_public_hostales`, que es el listado del directorio
 * (/directorio) y expone solo name, slug, address, base_price.
 *
 * La verificación de comportamiento real es en vivo (probe REST tras aplicar
 * la migración); este test es la guarda permanente en CI para que nadie
 * redefina la RPC del directorio por accidente en una migración futura.
 */
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

const CAMPOS_PAGINA_WEB = [
  'descripcion_larga',
  'fotos',
  'color_acento',
  'plantilla',
  'pagina_web_activa',
];

const REDEFINE_LIST_PUBLIC_HOSTALES =
  /create\s+(or\s+replace\s+)?function\s+public\.list_public_hostales\b/i;

function readMigration(file) {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
}

test('list_public_hostales (006) no expone los campos de la página web', () => {
  const sql = readMigration('006_list_public_hostales.sql');
  for (const campo of CAMPOS_PAGINA_WEB) {
    expect(sql).not.toContain(campo);
  }
});

test('ninguna migración redefine list_public_hostales fuera de la 006', () => {
  const redefiniciones = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => REDEFINE_LIST_PUBLIC_HOSTALES.test(readMigration(f)));
  expect(redefiniciones).toEqual(['006_list_public_hostales.sql']);
});
