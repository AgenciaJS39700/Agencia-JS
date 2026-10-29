-- /mesas/schema.sql — Cuenta compartida de mesa (D1 agencia-citas, binding CITAS)
CREATE TABLE IF NOT EXISTS cuentas (codigo TEXT PRIMARY KEY, datos TEXT NOT NULL, v INTEGER NOT NULL DEFAULT 1, creada INTEGER NOT NULL, actualizada INTEGER NOT NULL);
