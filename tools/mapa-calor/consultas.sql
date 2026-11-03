-- Consultas para sacar los datos del mapa de calor (base D1 agencia-js-metricas). Cambia las fechas.
SELECT disp, SUM(n) AS n, SUM(ms) AS ms FROM visitas WHERE dia BETWEEN '2026-11-03' AND '2099-12-31' GROUP BY disp;
SELECT seccion, disp, SUM(vistas) AS vistas, SUM(ms) AS ms FROM secciones WHERE dia BETWEEN '2026-11-03' AND '2099-12-31' GROUP BY seccion, disp;
SELECT objetivo, seccion, disp, SUM(n) AS n FROM clics WHERE dia BETWEEN '2026-11-03' AND '2099-12-31' GROUP BY objetivo, seccion, disp ORDER BY n DESC;
SELECT seccion, disp, xb, yb, SUM(n) AS n FROM puntos WHERE dia BETWEEN '2026-11-03' AND '2099-12-31' GROUP BY seccion, disp, xb, yb;
