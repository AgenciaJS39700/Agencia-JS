# Herramientas de redes sociales (Agencia JS)

No se publican en la web (excluidas en `.assetsignore`).

- `gen.py` + `content.py`: carruseles 1080x1350. Editar `POSTS` en `content.py` y ejecutar `python3 gen.py` (crea `<nombre>-N.png`).
- `reels/scenes.py`: escenas 1080x1920 de los reels (diccionario `REELS`), `python3 scenes.py`.
- `reels/music.py`: música original sin derechos: `python3 music.py pop|spooky <segundos> salida.wav`.
- `reels/build.py`: monta los reels (zoom, transiciones y música). Editar `SPEC` (duración por escena, música, transiciones).
- Las piezas finales se suben a `/social/` (JPG calidad 88 y MP4) y Metricool las recoge desde `https://agencia-js.com/social/...`.

Normas: siempre las mismas publicaciones en Instagram, Facebook y TikTok (un único envío en Metricool con los 3); vídeos siempre con sonido; texto con agencia-js.com, WhatsApp 628 22 47 19 · 688 93 33 08 e info@agencia-js.com; TikTok con fotos usa `autoAddMusic: true`; Threads con texto corto (máx. 500 caracteres).
