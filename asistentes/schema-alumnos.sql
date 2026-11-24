-- /asistentes/schema-alumnos.sql — Cuentas de clientes, bonos, pagos y lista de espera.
-- Va en la misma D1 «agencia-citas» que las citas, separado por slug como todo lo demás.
-- Se aplica una sola vez (todo es IF NOT EXISTS; los ALTER hay que correrlos sueltos).

CREATE TABLE IF NOT EXISTS alumnos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  email TEXT NOT NULL,
  nombre TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  marketing INTEGER NOT NULL DEFAULT 0,          -- 1 = acepta ofertas y novedades
  marketing_fecha TEXT,                          -- cuándo lo aceptó (prueba del consentimiento)
  baja_token TEXT,                               -- para la baja en un clic desde el correo
  nota TEXT,                                     -- lo que apunte el estudio (lesiones, avisos)
  creado TEXT NOT NULL DEFAULT (datetime('now')),
  visto TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS alumnos_slug_email ON alumnos(slug, email);

CREATE TABLE IF NOT EXISTS al_sesiones (
  token_hash TEXT PRIMARY KEY,
  alumno_id INTEGER NOT NULL,
  expira TEXT NOT NULL,
  creada TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS al_sesiones_alumno ON al_sesiones(alumno_id);

CREATE TABLE IF NOT EXISTS al_codigos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  email TEXT NOT NULL,
  codigo_hash TEXT NOT NULL,
  expira TEXT NOT NULL,
  usado INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS al_codigos_busca ON al_codigos(slug, email, usado);

CREATE TABLE IF NOT EXISTS al_intentos (k TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS al_intentos_k ON al_intentos(k, ts);

CREATE TABLE IF NOT EXISTS bonos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  alumno_id INTEGER NOT NULL,
  producto TEXT NOT NULL,                        -- id del producto en la config del cliente
  nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo',         -- activo | cancelado | caducado | impago
  inicio TEXT NOT NULL,
  fin TEXT NOT NULL,
  sem INTEGER NOT NULL DEFAULT 0,                -- clases por semana (0 = sin límite)
  tipos TEXT NOT NULL DEFAULT '',                -- actividades que cubre, separadas por coma
  recurrente INTEGER NOT NULL DEFAULT 0,
  stripe_sub TEXT,
  stripe_cust TEXT,
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS bonos_alumno ON bonos(slug, alumno_id, estado);
CREATE INDEX IF NOT EXISTS bonos_sub ON bonos(stripe_sub);

CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  alumno_id INTEGER,
  bono_id INTEGER,
  concepto TEXT NOT NULL,
  importe INTEGER NOT NULL DEFAULT 0,            -- en céntimos
  estado TEXT NOT NULL DEFAULT 'pendiente',      -- pendiente | pagado | fallido | devuelto
  stripe_id TEXT,
  metodo TEXT NOT NULL DEFAULT 'tarjeta',        -- tarjeta | efectivo | transferencia
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS pagos_stripe ON pagos(stripe_id);
CREATE INDEX IF NOT EXISTS pagos_slug ON pagos(slug, fecha);

CREATE TABLE IF NOT EXISTS espera (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  alumno_id INTEGER,
  servicio TEXT NOT NULL,
  fecha TEXT NOT NULL,
  inicio INTEGER NOT NULL,
  nombre TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefono TEXT,
  avisado INTEGER NOT NULL DEFAULT 0,
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS espera_clase ON espera(slug, fecha, inicio, servicio, avisado);

-- Accesos del equipo (responsables y profesores).
-- Lo que hay aquí MANDA sobre las claves escritas en el archivo del cliente:
-- así se puede cambiar una clave o dar de baja a alguien sin tocar el código.
CREATE TABLE IF NOT EXISTS accesos (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  slug   TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol    TEXT NOT NULL DEFAULT 'profe',   -- 'panel' (gestiona todo) | 'profe' (solo sus clases)
  hash   TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  creado TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS accesos_slug_nombre ON accesos (slug, nombre);

-- Último acceso de cada persona del equipo. Va aparte de `accesos` a propósito:
-- anotarlo no convierte a nadie en «clave propia», así las claves escritas en el
-- archivo del cliente siguen mandando hasta que alguien las cambie de verdad.
CREATE TABLE IF NOT EXISTS vistos (
  slug   TEXT NOT NULL,
  nombre TEXT NOT NULL,
  visto  TEXT NOT NULL,
  PRIMARY KEY (slug, nombre)
);

-- ---------------------------------------------------------------------------
-- Añadidos del 24/11/2026 (avisos de cobro y cumpleaños). Correr sueltos:
-- D1 no admite «ADD COLUMN IF NOT EXISTS», así que si ya existen, da error y se ignora.
--
--   ALTER TABLE alumnos ADD COLUMN nacimiento TEXT;      -- 'AAAA-MM-DD' o '--MM-DD' si no quiere dar el año
--   ALTER TABLE alumnos ADD COLUMN felicitado TEXT;      -- año en que se le felicitó, para no repetir
--   ALTER TABLE alumnos ADD COLUMN avisado_cobro TEXT;   -- fecha del último aviso de cobro próximo
-- ---------------------------------------------------------------------------
