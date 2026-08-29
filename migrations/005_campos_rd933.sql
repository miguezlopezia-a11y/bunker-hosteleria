-- 005_campos_rd933.sql — Campos obligatorios RD 933/2021 en huespedes
-- Ejecutar en SQL Editor de Supabase (proyecto fyhehiqvygbabwwllpvb)
-- Idempotente. Requiere 003_policia_firma.sql aplicado.
--
-- Campos del viajero (14) y de la operación (4) según RD 933/2021.
-- Ya existen: nombre, apellidos, tipo/num documento, num_soporte_doc,
-- fecha_nacimiento, pais_nacionalidad (nacionalidad), firma_digital_url,
-- fecha_caducidad_doc. El sexo se captura pero vive solo en el XML por ahora.
-- Este SQL añade los que faltan. RLS ya existente en huespedes cubre las
-- nuevas columnas (las policies son por fila).

alter table huespedes add column if not exists direccion text;
alter table huespedes add column if not exists localidad text;
alter table huespedes add column if not exists pais_residencia text;
alter table huespedes add column if not exists telefono text;
alter table huespedes add column if not exists email text;
alter table huespedes add column if not exists num_viajeros int default 1;
alter table huespedes add column if not exists parentesco_menores text;
alter table huespedes add column if not exists referencia_contrato text;
alter table huespedes add column if not exists tipo_pago text;
alter table huespedes add column if not exists sexo text;

-- Verificación:
-- select column_name from information_schema.columns
-- where table_name = 'huespedes' order by ordinal_position;
