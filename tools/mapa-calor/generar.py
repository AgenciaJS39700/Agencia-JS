#!/usr/bin/env python3
"""Genera el mapa de calor de la portada de agencia-js.com a partir de los datos de la medición propia.

Uso:
  python3 tools/mapa-calor/generar.py datos.json salida_dir [m|e]

datos.json = {"secciones": [...], "clics": [...], "puntos": [...], "visitas": [...]}
(filas tal como salen de la base de datos D1 agencia-js-metricas; ver consultas.sql).
Hace una captura de la portada local (http://localhost:8766) y pinta encima:
  - color de fondo por sección = cuánto tiempo se queda la gente (rojo = más),
  - puntos de calor = dónde hacen clic,
  - y un resumen con % de visitas que llegan a cada sección y botones más pulsados.
"""
import json
import math
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FUENTE = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"
NOMBRES = {"cabecera": "Cabecera", "inicio": "Inicio", "auditoria": "Auditoría", "asistentes": "Asistentes 24/7",
           "demos": "Demos", "planes": "Planes y precios", "video": "Vídeo", "nfc": "Tarjetas NFC",
           "servicios": "Servicios", "tecnologia": "Tecnología", "faq": "Preguntas", "contacto": "Contacto", "pie": "Pie"}


def captura(disp, salida):
    """Captura de página completa y posición de cada sección (en píxeles de la captura)."""
    w, h = (390, 844) if disp == "m" else (1440, 900)
    js = r"""
const pw = require(process.env.PW);
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: %d, height: %d }, deviceScaleFactor: 2 });
  await p.route('**/tracker.metricool.com/**', r => r.fulfill({ status: 200, body: '' }));
  await p.goto('http://localhost:8766/index.html', { waitUntil: 'networkidle' });
  for (let y = 0; y < 30000; y += 600) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(60); }
  await p.evaluate(() => { window.scrollTo(0, 0); const h = document.querySelector('header'); if (h) h.style.position = 'static'; });
  await p.waitForTimeout(500);
  const cajas = await p.evaluate(() => {
    const out = {}; const add = (k, el) => { if (!el) return; const r = el.getBoundingClientRect(); out[k] = [r.top + scrollY, r.height]; };
    add('cabecera', document.querySelector('header'));
    ['inicio','auditoria','asistentes','demos','planes','video','nfc','servicios','tecnologia','faq','contacto'].forEach(i => add(i, document.getElementById(i)));
    add('pie', document.querySelector('footer'));
    return out; });
  await p.screenshot({ path: '%s', fullPage: true, type: 'jpeg', quality: 80 });
  console.log(JSON.stringify(cajas));
  await b.close();
})();
""" % (w, h, salida)
    raiz = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
    r = subprocess.run(["node", "-e", js], capture_output=True, text=True, env={**os.environ, "PW": raiz + "/playwright"})
    if r.returncode:
        sys.exit(r.stderr)
    return w, json.loads(r.stdout.strip().splitlines()[-1])


def color(v):  # 0..1 → azul → amarillo → rojo
    stops = [(0, (40, 90, 255)), (0.5, (255, 220, 0)), (1, (235, 30, 30))]
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        if v <= b:
            t = (v - a) / (b - a) if b > a else 0
            return tuple(int(ca[i] + (cb[i] - ca[i]) * t) for i in range(3))
    return stops[-1][1]


def main():
    datos = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    disp = sys.argv[3] if len(sys.argv) > 3 else "m"
    os.makedirs(out, exist_ok=True)
    shot = os.path.join(out, f"captura_{disp}.jpg")
    vw, cajas = captura(disp, shot)
    im = Image.open(shot).convert("RGB")
    esc = im.width / vw
    visitas = sum(r["n"] for r in datos.get("visitas", []) if r["disp"] == disp) or 1
    sec = {r["seccion"]: r for r in datos.get("secciones", []) if r["disp"] == disp}
    max_ms = max([r["ms"] / visitas for r in sec.values()] + [1])
    capa = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    f = ImageFont.truetype(FUENTE, int(15 * esc))
    for k, (top, alto) in cajas.items():
        y0, y1 = int(top * esc), int((top + alto) * esc)
        r = sec.get(k)
        if r:
            v = (r["ms"] / visitas) / max_ms
            d.rectangle((0, y0, im.width, y1), fill=color(v) + (70,))
    # clics
    calor = Image.new("L", im.size, 0)
    dc = ImageDraw.Draw(calor)
    pts = [p for p in datos.get("puntos", []) if p["disp"] == disp]
    maxn = max([p["n"] for p in pts] + [1])
    for p in pts:
        if p["seccion"] not in cajas:
            continue
        top, alto = cajas[p["seccion"]]
        cx = (p["xb"] + 0.5) / 20 * im.width
        cy = (top + (p["yb"] + 0.5) / 20 * alto) * esc
        rad = 40 * esc
        dc.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), fill=int(60 + 195 * p["n"] / maxn))
    calor = calor.filter(ImageFilter.GaussianBlur(30 * esc))
    lut = [color(i / 255) + (int(min(255, i * 1.6)),) for i in range(256)]
    puntos = Image.new("RGBA", im.size)
    puntos.putdata([lut[v] for v in calor.tobytes()])
    final = Image.alpha_composite(Image.alpha_composite(im.convert("RGBA"), capa), puntos)
    d = ImageDraw.Draw(final)
    for k, (top, alto) in cajas.items():
        r = sec.get(k)
        pct = f"{100 * r['vistas'] / visitas:.0f}% llega · {r['ms'] / visitas / 1000:.1f} s de media" if r else "sin datos"
        y = int(top * esc) + 8
        txt = f"{NOMBRES.get(k, k)}: {pct}"
        tw = d.textlength(txt, font=f)
        d.rectangle((8, y, 24 + tw, y + 22 * esc), fill=(0, 0, 0, 200))
        d.text((16, y + 4), txt, font=f, fill=(255, 255, 255))
    final.convert("RGB").save(os.path.join(out, f"mapa_calor_{disp}.jpg"), quality=85)
    print("ok", os.path.join(out, f"mapa_calor_{disp}.jpg"))


if __name__ == "__main__":
    main()
