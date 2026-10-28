-- /asistentes/schema.sql — Base de datos D1 «agencia-citas» (una sola para todos los clientes; cada fila lleva su slug).
-- Aplicar: npx wrangler d1 execute agencia-citas --remote --file=asistentes/schema.sql

CREATE TABLE IF NOT EXISTS citas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT    NOT NULL,              -- negocio (asistentes/clientes/<slug>.js)
  codigo     TEXT    NOT NULL,              -- código que ve el cliente (p. ej. K7M2Q9)
  servicio   TEXT    NOT NULL,              -- id del servicio
  servicio_n TEXT    NOT NULL,              -- nombre del servicio (por si cambia la config)
  fecha      TEXT    NOT NULL,              -- YYYY-MM-DD (hora local del negocio)
  inicio     INTEGER NOT NULL,              -- minutos desde las 00:00
  fin        INTEGER NOT NULL,
  nombre     TEXT    NOT NULL,
  telefono   TEXT    NOT NULL,
  email      TEXT,
  nota       TEXT,
  origen     TEXT    NOT NULL DEFAULT 'chat', -- chat | voz | panel
  estado     TEXT    NOT NULL DEFAULT 'ok',   -- ok | cancelada
  creada     TEXT    NOT NULL DEFAULT (datetime('now')),
  recordada  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS citas_dia ON citas (slug, fecha, estado);
CREATE UNIQUE INDEX IF NOT EXISTS citas_codigo ON citas (slug, codigo);

-- Huecos que el negocio cierra desde el panel (vacaciones, una tarde libre…). inicio/fin en minutos; día entero = 0..1440
CREATE TABLE IF NOT EXISTS bloqueos (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  slug   TEXT    NOT NULL,
  fecha  TEXT    NOT NULL,
  inicio INTEGER NOT NULL,
  fin    INTEGER NOT NULL,
  motivo TEXT
);
CREATE INDEX IF NOT EXISTS bloqueos_dia ON bloqueos (slug, fecha);
