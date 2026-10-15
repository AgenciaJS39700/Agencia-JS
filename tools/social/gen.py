# Genera los carruseles (1080x1350) de Agencia JS a partir de contenido estructurado
import json, asyncio, sys, os
D = os.path.dirname(os.path.abspath(__file__))
from playwright.async_api import async_playwright

HEAD = open(os.path.join(D,'_head.html'), encoding='utf-8').read()
EXTRA = """<style>
.opt{display:flex;align-items:center;gap:28px;background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.12);border-radius:28px;padding:34px 40px;margin-top:26px;font-size:40px;color:#fafafa}
.opt b{width:74px;height:74px;border-radius:50%;background:linear-gradient(135deg,#3a9bff,#0262d8);display:flex;align-items:center;justify-content:center;font-size:38px;flex:none;color:#fff}
.myth{display:inline-block;background:rgba(239,68,68,.12);border:2px solid rgba(239,68,68,.45);color:#fca5a5;border-radius:60px;padding:10px 26px;font-size:26px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:28px}
.real{margin-top:48px;background:rgba(34,197,94,.08);border:2px solid rgba(34,197,94,.35);border-radius:28px;padding:34px 38px}
.real b{display:block;color:#86efac;font-size:28px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px}
.real span{font-size:36px;line-height:1.4;color:#fafafa}
.check{display:flex;gap:26px;align-items:flex-start;font-size:38px;line-height:1.35;color:#fafafa;margin-top:30px}
.check i{font-style:normal;flex:none;width:58px;height:58px;border-radius:16px;border:3px solid #e8c766;color:#e8c766;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800}
.emoji{font-size:170px;line-height:1;margin-bottom:30px}
.ghost{display:flex;align-items:flex-end;gap:36px;margin-bottom:40px}
.sign{background:#fafafa;color:#0a0a0a;border-radius:18px;padding:26px 30px;font-size:40px;font-weight:800;line-height:1.15;transform:rotate(-3deg);box-shadow:0 18px 40px rgba(0,0,0,.5);max-width:620px}
.room{display:inline-block;color:#fb923c;border:2px solid rgba(251,146,60,.5);border-radius:60px;padding:10px 26px;font-size:26px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:28px}
.gcard{background:#fff;border-radius:28px;padding:36px 40px;color:#202124;font-family:Inter;box-shadow:0 20px 50px rgba(0,0,0,.5);margin:40px 0}
.gcard h3{font-size:44px;font-weight:700;margin-bottom:10px}
.gcard .st{font-size:34px;color:#5f6368}.gcard .st b{color:#d93025}
.gcard .stars{color:#fbbc04;font-size:34px;margin:8px 0}
.small{font-size:26px;color:#8a8a93;margin-top:24px}
</style>"""

def slide(i, n, inner, foot='→', glow2=False):
    g2 = '<div class="glow g2"></div>' if glow2 else ''
    return (f'<section class="s"><div class="grid"></div><div class="glow"></div>{g2}'
            f'<div class="top"><div class="brand"><img src="logo.svg">AGENCIA JS</div><div class="pg">{i}/{n}</div></div>'
            f'<div class="body">{inner}</div>'
            f'<div class="foot"><span>@agenciajs.webstudio</span><span class="swipe">{foot}</span></div></section>')

CONTACT = '<div class="contact">WhatsApp <i>628 22 47 19</i> · <i>688 93 33 08</i><br>info@agencia-js.com · agencia-js.com</div>'

def cta(title, sub, button):
    return (f'<div class="tag">Gratis y sin compromiso</div><h1 style="font-size:88px">{title}</h1>'
            f'<p style="margin-top:40px">{sub}</p><div class="cta">{button}</div>{CONTACT}')

def build(name, slides_inner):
    n = len(slides_inner)
    parts = []
    for i, (inner, opts) in enumerate(slides_inner, 1):
        foot = opts.get('foot', 'Desliza →' if i == 1 and n > 1 else ('Guarda este post 🔖' if i == n else '→'))
        parts.append(slide(i, n, inner, foot, opts.get('g2', i in (1, n))))
    html = HEAD.replace('</head>', EXTRA + '</head>') if '</head>' in HEAD else HEAD + EXTRA
    if '<body>' not in html: html += '</head><body>'
    html += ''.join(parts) + '</body></html>'
    open(f'{D}/{name}.html', 'w', encoding='utf-8').write(html)

async def shoot(names):
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1080, "height": 1350})
        for name in names:
            await pg.goto(f"file://{D}/{name}.html"); await pg.wait_for_timeout(500)
            for i, e in enumerate(await pg.query_selector_all("section.s"), 1):
                await e.screenshot(path=f"{D}/{name}-{i}.png")
        await b.close()

if __name__ == '__main__':
    exec(open(os.path.join(D,'content.py'), encoding='utf-8').read())
    names = [k for k, _ in POSTS]
    for k, s in POSTS: build(k, s)
    asyncio.run(shoot(names))
    print('ok', names)
