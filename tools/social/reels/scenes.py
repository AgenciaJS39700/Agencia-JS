import asyncio, os
D = os.path.dirname(os.path.abspath(__file__))
from playwright.async_api import async_playwright
BASE = """<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{background:#000;font-family:Inter,sans-serif}
.s{width:1080px;height:1920px;position:relative;overflow:hidden;background:#0a0a0a;color:#d4d4d8;display:flex;flex-direction:column;justify-content:center;padding:0 96px}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:60px 60px}
.glow{position:absolute;width:1200px;height:1200px;border-radius:50%;background:radial-gradient(circle,rgba(58,155,255,.32),rgba(2,98,216,0) 65%);right:-500px;top:-400px}
.glow.g2{background:radial-gradient(circle,rgba(212,175,55,.22),rgba(212,175,55,0) 65%);left:-560px;bottom:-500px;top:auto;right:auto}
.glow.or{background:radial-gradient(circle,rgba(251,146,60,.30),rgba(251,146,60,0) 65%)}
.in{position:relative;z-index:2}
.brand{position:absolute;top:120px;left:96px;z-index:3;display:flex;align-items:center;gap:22px;color:#fafafa;font-weight:700;font-size:40px;letter-spacing:.04em}
.brand img{width:90px;height:90px}
h1{font-family:"Inter Display","Inter";color:#fafafa;font-size:118px;line-height:1.03;font-weight:800;letter-spacing:-.02em}
h1 .g{color:#e8c766}
p{font-size:50px;line-height:1.4;color:#c4c4cc;margin-top:56px}
.tag{display:inline-block;border:3px solid rgba(232,199,102,.5);color:#e8c766;border-radius:80px;padding:16px 38px;font-size:36px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:60px}
.cta{background:linear-gradient(135deg,#3a9bff,#0262d8);color:#fff;border-radius:100px;padding:38px 64px;font-size:54px;font-weight:700;display:inline-block;margin-top:70px}
.contact{margin-top:64px;font-size:50px;line-height:1.75;color:#fafafa}.contact i{font-style:normal;color:#e8c766}
.note{background:#1c1c1f;border:2px solid rgba(255,255,255,.12);border-radius:44px;padding:64px 60px;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.note .h{display:flex;align-items:center;gap:20px;color:#8a8a93;font-size:34px;margin-bottom:34px}
.note .h b{width:70px;height:70px;border-radius:50%;background:#2a2a2e;display:flex;align-items:center;justify-content:center;color:#fafafa;font-size:34px}
.note .t{font-size:70px;line-height:1.25;color:#fafafa;font-weight:600}
.note .sig{margin-top:40px;font-size:64px;color:#e8c766;font-weight:800;text-align:right}
.counter{font-family:"Inter Display";font-size:330px;font-weight:800;color:#fafafa;line-height:1}
.react{font-size:260px;line-height:1;margin-top:40px}
.lab{font-size:54px;color:#c4c4cc;margin-bottom:30px}
.stars{color:#fbbc04;font-size:90px;letter-spacing:8px}
.small{font-size:32px;color:#8a8a93;margin-top:60px}
.fact{font-size:84px;line-height:1.2;color:#fafafa;font-weight:700}
.fact .g{color:#fb923c}
.pill{display:inline-block;background:rgba(251,146,60,.12);border:3px solid rgba(251,146,60,.5);color:#fdba74;border-radius:80px;padding:16px 38px;font-size:36px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:60px}
.old{background:#c0c0c0;border:6px outset #e0e0e0;font-family:'Comic Sans MS','Times New Roman',serif;color:#000;padding:30px}
.old .mar{background:#000080;color:#ff0;font-size:44px;padding:10px;font-weight:bold}
.old h2{font-size:72px;color:#f0f;text-align:center;margin:26px 0;text-shadow:3px 3px #0ff}
.old .uc{background:#ff0;color:#000;font-size:44px;text-align:center;padding:16px;border:4px dashed #000}
.old .cnt{font-family:monospace;font-size:40px;background:#000;color:#0f0;display:inline-block;padding:8px 16px;margin-top:20px}
.old p{color:#000;font-size:40px;margin-top:20px}
.new{background:#0f0f12;border:2px solid rgba(255,255,255,.12);border-radius:48px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.6)}
.new .hero{height:560px;background:linear-gradient(135deg,#3a9bff,#0262d8);display:flex;flex-direction:column;justify-content:flex-end;padding:50px;color:#fff}
.new .hero b{font-size:84px;line-height:1.05}.new .hero span{font-size:40px;opacity:.9;margin-top:14px}
.new .row{display:flex;gap:24px;padding:40px 50px}
.new .btn{flex:1;text-align:center;border-radius:30px;padding:30px;font-size:40px;font-weight:700}
.new .b1{background:#25d366;color:#05230f}.new .b2{background:#fafafa;color:#0a0a0a}
.new .info{padding:0 50px 50px;font-size:38px;color:#c4c4cc;line-height:1.6}
</style></head><body>"""
BR = '<div class="brand"><img src="../logo.svg">AGENCIA JS</div>'
END = lambda title, sub, btn='agencia-js.com': (f'<section class="s"><div class="grid"></div><div class="glow"></div><div class="glow g2"></div>{BR}<div class="in">'
       f'<div class="tag">Auditoría gratis</div><h1>{title}</h1><p>{sub}</p><div class="cta">{btn}</div>'
       '<div class="contact">WhatsApp <i>628 22 47 19</i><br>WhatsApp <i>688 93 33 08</i><br>info@agencia-js.com</div></div></section>')
def S(inner, extra=''):
    return f'<section class="s"><div class="grid"></div><div class="glow {extra}"></div>{BR}<div class="in">{inner}</div></section>'
def NOTE(t):
    return S(f'<div class="note"><div class="h"><b>?</b>Mensaje anónimo · ahora</div><div class="t">{t}</div><div class="sig">—A</div></div>')

SEARCH = ('<div style="background:#fff;border-radius:60px;padding:34px 46px;font-size:46px;color:#202124;display:flex;gap:24px;align-items:center;box-shadow:0 30px 70px rgba(0,0,0,.6)">🔍 <span>[tu servicio] cerca de mí</span></div>'
  '<div style="background:#fff;border-radius:40px;padding:50px;margin-top:40px;color:#202124;box-shadow:0 30px 70px rgba(0,0,0,.6)">'
  '<div style="font-size:62px;font-weight:800">Tu Negocio</div><div style="color:#fbbc04;font-size:50px;margin:12px 0">★★★★★ <span style="color:#5f6368;font-size:36px">Reseñas</span></div>'
  '<div style="font-size:40px;color:#5f6368"><b style="color:#188038">Abre mañana</b> · 9:00</div>'
  '<div style="display:flex;gap:20px;margin-top:36px"><div style="flex:1;text-align:center;background:#1a73e8;color:#fff;border-radius:40px;padding:24px;font-size:38px;font-weight:700">Sitio web</div><div style="flex:1;text-align:center;border:3px solid #1a73e8;color:#1a73e8;border-radius:40px;padding:24px;font-size:38px;font-weight:700">Cómo llegar</div></div></div>')
CHAT = ('<div style="background:#0b141a;border-radius:44px;padding:50px;box-shadow:0 30px 80px rgba(0,0,0,.6);border:2px solid rgba(255,255,255,.1)">'
  '<div style="color:#8a8a93;font-size:34px;margin-bottom:30px">WhatsApp · Tu Negocio</div>'
  '<div style="background:#005c4b;color:#fff;border-radius:34px 34px 8px 34px;padding:34px 40px;font-size:52px;line-height:1.3;margin-left:80px">¡Hola! ¿Tenéis hueco mañana por la mañana? 🙏<div style="text-align:right;font-size:30px;color:#a7d7c5;margin-top:10px">23:04 ✓✓</div></div></div>'
  '<p>Mensaje recibido mientras tú descansas.</p>')
CHECKS = lambda items: ''.join(f'<div style="display:flex;gap:30px;align-items:flex-start;font-size:54px;line-height:1.3;color:#fafafa;margin-top:44px"><span style="flex:none;width:84px;height:84px;border-radius:22px;border:4px solid #e8c766;color:#e8c766;display:flex;align-items:center;justify-content:center;font-weight:800">{i}</span><span>{t}</span></div>' for i,t in enumerate(items,1))

REELS = {
 'reel-2026-11-04-pov-23h': [
   S('<div class="tag">POV 🌙</div><h1>Son las 23:00 y alguien busca <span class="g">tu negocio</span> en el móvil…</h1>'),
   S('<div class="lab">1. Te encuentra en Google</div>' + SEARCH),
   S('<div class="new"><div class="hero"><b>Tu Negocio</b><span>Precios, fotos reales y horario</span></div><div class="row"><div class="btn b1">WhatsApp</div><div class="btn b2">Llamar</div></div><div class="info">⭐ Reseñas · 📍 Cómo llegar</div></div><p>2. Tu web abre rápido y lo tiene todo.</p>'),
   S('<div class="lab">3. Te escribe</div>' + CHAT),
   S('<div class="react" style="margin:0 0 40px">😴</div><h1>Tú, durmiendo.<br>Tu web, <span class="g">trabajando</span>.</h1>'),
   END('Que tu negocio <span class="g">atienda 24/7</span>', 'Web rápida, ficha de Google al día y WhatsApp a un toque.'),
 ],
 'reel-2026-11-06-black-friday': [
   S('<div class="tag">Faltan 3 semanas ⏳</div><h1>Black Friday en mi negocio: <span class="g">expectativa</span> vs <span class="g">realidad</span></h1>'),
   S('<div class="tag">Expectativa 🤩</div><div class="react" style="margin:0;font-size:200px;white-space:nowrap">🛍️🛍️🛍️</div><div class="fact" style="margin-top:50px">Cola en la puerta y el WhatsApp <span class="g" style="color:#e8c766">echando humo</span>.</div>'),
   S('<div class="pill">Realidad 😶</div><div class="react" style="margin:0">🦗</div><div class="fact" style="margin-top:50px">Tu oferta solo estaba en una historia de 24 horas… <span class="g">y casi nadie la vio</span>.</div>', 'or'),
   S('<h1 style="font-size:96px">Cómo cambiar <span class="g">el final</span> 👇</h1>' + CHECKS(['Una página de ofertas en tu web','Tu oferta publicada en tu ficha de Google','Botón de WhatsApp para pedir o reservar','Avisa a tus clientes con tiempo'])),
   END('Prepara tu <span class="g">Black Friday</span> ahora', 'Te ayudamos con la web, la ficha de Google y los vídeos.'),
 ],
}

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width":1080,"height":1920})
        for name, scenes in REELS.items():
            html = BASE + ''.join(scenes) + '</body></html>'
            open(f'{D}/{name}.html','w',encoding='utf-8').write(html)
            await pg.goto(f'file://{D}/{name}.html'); await pg.wait_for_timeout(500)
            for i,e in enumerate(await pg.query_selector_all('section.s'),1):
                await e.screenshot(path=f'{D}/{name}_{i:02d}.png')
        await b.close()
asyncio.run(main()); print('ok')
