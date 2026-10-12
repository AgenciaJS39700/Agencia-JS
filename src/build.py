#!/usr/bin/env python3
"""Genera los archivos publicados (index.html, extras.js, fx.js, servicios.js) minificados
a partir de los originales legibles de la carpeta src/. Uso: python3 src/build.py
Requiere esbuild (npm i -g esbuild). La carpeta src/ no se publica (.assetsignore)."""
import re, subprocess, pathlib, shutil, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
ESB = shutil.which("esbuild") or "/opt/npm-tools/node_modules/esbuild/bin/esbuild"

def esb(code, loader):
    r = subprocess.run([ESB, "--minify", f"--loader={loader}", "--target=es2018,chrome80,safari13"], input=code, text=True, capture_output=True)
    if r.returncode: sys.exit(r.stderr)
    return r.stdout.strip()

for name in ("extras", "fx", "servicios"):
    (ROOT / f"{name}.js").write_text(esb((ROOT / "src" / f"{name}.src.js").read_text(encoding="utf-8"), "js"), encoding="utf-8")

h = (ROOT / "src" / "index.src.html").read_text(encoding="utf-8")
h = re.sub(r"<!--.*?-->", "", h, flags=re.S)
h = re.sub(r"<style>(.*?)</style>", lambda m: "<style>" + esb(m.group(1), "css") + "</style>", h, flags=re.S)
def js_block(m):
    attrs, body = m.group(1), m.group(2)
    if "src=" in attrs or "ld+json" in attrs or not body.strip():
        if "ld+json" in attrs:
            import json
            return f"<script{attrs}>" + json.dumps(json.loads(body), ensure_ascii=False, separators=(",", ":")) + "</script>"
        return m.group(0)
    return f"<script{attrs}>" + esb(body, "js") + "</script>"
h = re.sub(r"<script([^>]*)>(.*?)</script>", js_block, h, flags=re.S)
h = "\n".join(l.strip() for l in h.splitlines() if l.strip())
(ROOT / "index.html").write_text(h + "\n", encoding="utf-8")
print("ok", len(h))
