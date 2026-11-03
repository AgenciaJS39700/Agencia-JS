-- Medición propia de agencia-js.com: solo contadores agregados por día. Sin IP ni identificadores.
CREATE TABLE IF NOT EXISTS visitas (dia TEXT NOT NULL, disp TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, ms INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (dia, disp));
CREATE TABLE IF NOT EXISTS secciones (dia TEXT NOT NULL, seccion TEXT NOT NULL, disp TEXT NOT NULL, vistas INTEGER NOT NULL DEFAULT 0, ms INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (dia, seccion, disp));
CREATE TABLE IF NOT EXISTS clics (dia TEXT NOT NULL, objetivo TEXT NOT NULL, seccion TEXT NOT NULL, disp TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (dia, objetivo, seccion, disp));
CREATE TABLE IF NOT EXISTS puntos (dia TEXT NOT NULL, seccion TEXT NOT NULL, disp TEXT NOT NULL, xb INTEGER NOT NULL, yb INTEGER NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (dia, seccion, disp, xb, yb));
