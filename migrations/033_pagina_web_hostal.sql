-- ============================================================
-- 033_pagina_web_hostal.sql
-- Tarea: shared/tarea-kimi-web-hostal-plantilla-piloto.md
-- Campos de contenido para la página web pública por hostal
-- (/sitio/:slug) + RPC pública get_pagina_hostal.
--
-- NO EJECUTAR sin confirmacion explicita de Pablo en el momento.
-- Idempotente (add column if not exists / create or replace).
--
-- Requisitos duros del proyecto para RPCs nuevas (respetados abajo):
--   * security definer + set search_path
--   * revoke all ... from public + grant execute a anon, authenticated
--     (revocar solo de anon NO basta: PUBLIC conserva el execute)
--   * anti-enumeracion: slug inexistente y pagina desactivada producen
--     el mismo observable (0 filas -> el frontend muestra 404). Al ser un
--     SELECT plano con WHERE no hay rama de error ni timing distinto.
--
-- NO se toca list_public_hostales (006): es el listado del directorio y
-- no debe exponer estos campos. Guarda permanente en
-- frontend/src/migrationsGuard.test.js.
-- ============================================================

-- 1) Campos de contenido (paleta acotada: nunca hex libre)
alter table public.hostales
  add column if not exists descripcion_larga text;
alter table public.hostales
  add column if not exists fotos text[] not null default '{}';
alter table public.hostales
  add column if not exists color_acento text;
alter table public.hostales
  add column if not exists plantilla text;
alter table public.hostales
  add column if not exists pagina_web_activa boolean not null default false;

-- Paleta fija (6 opciones) — la misma lista que frontend/src/utils/paleta.js.
-- Si se amplia, cambiar AQUI y en paleta.js en el mismo commit.
alter table public.hostales
  drop constraint if exists hostales_color_acento_check;
alter table public.hostales
  add constraint hostales_color_acento_check
    check (color_acento is null or color_acento in
      ('ocre', 'verde', 'azul', 'burdeos', 'pizarra', 'coral'));

-- Un solo valor valido por ahora; nuevas plantillas = nuevo valor del check
-- + componente de presentacion nuevo, en el mismo commit.
alter table public.hostales
  drop constraint if exists hostales_plantilla_check;
alter table public.hostales
  add constraint hostales_plantilla_check
    check (plantilla is null or plantilla in ('piloto_a'));

-- 2) RPC publica: perfil + contenido editorial SOLO si la pagina esta activa.
--    Devuelve 0 filas si el slug no existe O si pagina_web_activa = false
--    (mismo observable en ambos casos).
create or replace function public.get_pagina_hostal(p_slug text)
returns table (
  name text,
  slug text,
  address text,
  base_price numeric,
  descripcion_larga text,
  fotos text[],
  color_acento text,
  plantilla text
)
language sql
stable
security definer
set search_path = public
as $$
  select h.name,
         h.slug,
         h.address,
         h.base_price,
         h.descripcion_larga,
         h.fotos,
         h.color_acento,
         h.plantilla
  from public.hostales h
  where h.slug = p_slug
    and h.pagina_web_activa;
$$;

revoke all on function public.get_pagina_hostal(text) from public;
grant execute on function public.get_pagina_hostal(text) to anon, authenticated;
