# Contenido de los carruseles 30 nov – 6 dic 2026 (Agencia JS)
def V(n, title, text, tip, label='Truco'):
    return (f'<div class="num">{n}</div><h2>{title}</h2><p>{text}</p>'
            f'<div class="fix"><b>{label}</b><span>{tip}</span></div>', {})

def BLOCK(label, title, items):
    checks = ''.join(f'<div class="check"><i>✓</i><span>{t}</span></div>' for t in items)
    return (f'<div class="step">{label}</div><h2>{title}</h2>{checks}', {})

def SINO(n, title, no, si):
    return (f'<div class="num" style="font-size:150px">{n}</div><h2 style="font-size:64px">{title}</h2>'
            f'<div class="flag"><i>✖️</i><span><b>Así no</b>{no}</span></div>'
            f'<div class="flag ok"><i>✅</i><span><b>Así sí</b>{si}</span></div>', {})

# Maqueta de web con 5 fallos (juego "encuentra los fallos")
def MOCK(marks=False):
    m = (lambda k, top, left: f'<div style="position:absolute;top:{top}px;left:{left}px;width:64px;height:64px;border-radius:50%;background:#ef4444;color:#fff;font-weight:800;font-size:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px rgba(239,68,68,.3)">{k}</div>') if marks else (lambda *a: '')
    return ('<div style="position:relative;background:#f4f1ea;border-radius:28px;overflow:hidden;color:#333;font-family:Times New Roman,serif;box-shadow:0 20px 50px rgba(0,0,0,.5)">'
            '<div style="background:#ddd;padding:14px 22px;font-family:Inter;font-size:22px;color:#666">⚠️ No seguro · minegocio.com</div>'
            '<div style="padding:30px 36px">'
            '<div style="font-size:52px;font-weight:bold;color:#7a3e9d">Bienvenidos a nuestra web</div>'
            '<div style="font-size:26px;margin-top:10px;color:#999">Horario de verano: 9:00 – 14:00</div>'
            '<div style="height:200px;margin-top:22px;background:repeating-linear-gradient(45deg,#ccc,#ccc 10px,#bbb 10px,#bbb 20px);display:flex;align-items:center;justify-content:center;font-size:30px;color:#555">foto_local_2014.jpg</div>'
            '<div style="font-size:24px;margin-top:20px;line-height:1.4;color:#666">Somos una empresa líder con años de experiencia ofreciendo servicios de calidad a nuestros clientes con la máxima profesionalidad…</div>'
            '<div style="font-size:20px;margin-top:22px;color:#aaa;text-align:right">Contacto: ver página 3 › formulario</div>'
            '<div style="font-size:18px;margin-top:10px;color:#bbb">© 2017 · Todos los derechos reservados</div>'
            '</div>'
            + m(1, -5, 440) + m(2, 135, 400) + m(3, 250, 820) + m(4, 412, 830) + m(5, 498, 485) +
            '</div>')

def TERM(word, plain, example):
    return (f'<div class="step">Diccionario</div><h2 style="font-size:84px">{word}</h2><p style="font-size:44px;line-height:1.4">{plain}</p>'
            f'<div class="fix"><b>Ejemplo</b><span>{example}</span></div>', {})

def MYTH(myth, real):
    return (f'<div class="myth">Mito</div><h2>{myth}</h2>'
            f'<div class="real"><b>Realidad</b><span>{real}</span></div>', {})

def BIO(title, lines, ok):
    cls = 'flag ok' if ok else 'flag'
    ico = '✅' if ok else '✖️'
    lab = 'Después' if ok else 'Antes'
    body = '<br>'.join(lines)
    return (f'<div class="step">{lab}</div><h2 style="font-size:64px">{title}</h2>'
            f'<div style="background:#111114;border:2px solid rgba(255,255,255,.14);border-radius:32px;padding:40px 44px;margin-top:36px;font-size:36px;line-height:1.5;color:#fafafa">'
            f'<div style="display:flex;align-items:center;gap:22px;margin-bottom:22px"><div style="width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,#3a9bff,#e8c766)"></div><b style="font-size:38px">tunegocio</b></div>{body}</div>'
            f'<div class="{cls}" style="margin-top:30px"><i>{ico}</i><span style="font-size:32px">{"Se entiende qué haces, dónde y cómo escribirte." if ok else "No dice qué haces ni cómo contactar."}</span></div>', {})

def VS(a, b):
    return f'<div class="pair"><div><b>A</b>{a}</div><em>o</em><div class="b"><b>B</b>{b}</div></div>'

def FAQ(q, a):
    return (f'<div class="step">Nos preguntáis</div><h2 style="font-size:68px">{q}</h2>'
            f'<div class="real"><b>Respuesta</b><span>{a}</span></div>', {})

POSTS = [
 ('2026-11-30-ficha-diciembre', [
   ('<div class="tag">Checklist de diciembre 🎄</div><h1>Tu ficha de Google, <span class="g">lista para las fiestas</span></h1><p style="margin-top:44px">Puentes, festivos y compras de Navidad: es cuando más te buscan. Repásala en 10 minutos.</p>', {}),
   BLOCK('Paso 1', 'Horario de festivos', ['Pon el «horario especial» de los festivos de diciembre', 'Incluye Nochebuena, Navidad y Nochevieja', 'Así nadie se encuentra la persiana bajada']),
   BLOCK('Paso 2', 'Fotos y novedades', ['Sube fotos recientes del local decorado', 'Publica tus horarios o productos de Navidad', 'Quita fotos viejas que ya no te representan']),
   BLOCK('Paso 3', 'Contacto y reseñas', ['Comprueba teléfono y enlace a tu web', 'Responde las reseñas pendientes, buenas y malas', 'Pon fácil opinar a tus clientes contentos']),
   (cta('¿La revisamos <span class="g">contigo</span>?', 'Te decimos gratis qué le falta a tu ficha antes de las fiestas.', 'Escríbenos 👇'), {}),
 ]),
 ('2026-12-02-videos-navidad', [
   ('<div class="tag">Consejos rápidos 🎬</div><h1>4 vídeos de Navidad <span class="g">que puedes grabar con el móvil</span></h1><p style="margin-top:44px">Sin guion largo ni equipo. Solo luz natural y 15 segundos.</p>', {}),
   V(1, 'Decorando el local', 'Un antes y después del escaparate o del mostrador, en cámara rápida.', 'Graba siempre en vertical y desde el mismo sitio.', 'Truco'),
   V(2, 'Tu producto estrella', 'Envuélvelo para regalo y enséñalo de cerca, con detalle.', 'Busca la luz de una ventana, nunca de frente.', 'Truco'),
   V(3, 'El equipo felicita', 'Todos a cámara diciendo una frase cada uno. Natural, sin ensayar mucho.', 'Una toma corta por persona y se montan seguidas.', 'Truco'),
   V(4, 'Horario de fiestas', 'Tú contándolo en 10 segundos delante del local.', 'Ponle subtítulos: muchos lo ven sin sonido.', 'Truco'),
   (cta('¿Prefieres que <span class="g">lo hagamos nosotros</span>?', 'Vídeos verticales personalizados para tu negocio, listos para publicar.', 'Pídenos info 👇'), {}),
 ]),
 ('2026-12-03-web-para-todos', [
   ('<div class="tag">3 de diciembre ♿</div><h1>¿Tu web la puede usar <span class="g">todo el mundo</span>?</h1><p style="margin-top:44px">Hoy es el Día Internacional de las Personas con Discapacidad. Revisa estas 5 cosas.</p>', {}),
   BLOCK('Check 1 y 2', 'Que se lea bien', ['Texto con buen contraste sobre el fondo', 'Letra que se pueda ampliar sin romper la página']),
   BLOCK('Check 3 y 4', 'Que se use bien', ['Botones grandes y fáciles de pulsar en el móvil', 'Que se pueda navegar también con el teclado']),
   BLOCK('Check 5', 'Que se entienda todo', ['Fotos con texto alternativo para los lectores de pantalla', 'Vídeos con subtítulos', 'Formularios con etiquetas claras']),
   (cta('Una web <span class="g">para todos</span>', 'Diseñamos webs accesibles, rápidas y fáciles de usar desde el móvil.', 'Te la revisamos gratis 👇'), {}),
 ]),
 ('2026-12-05-preguntas-nfc', [
   ('<div class="tag">Tarjetas NFC ⭐</div><h1>Lo que más nos preguntáis <span class="g">de las tarjetas de reseñas</span></h1><p style="margin-top:44px">4 respuestas cortas. Desliza 👉</p>', {}),
   FAQ('¿El cliente necesita instalar una app?', 'No. Acerca el móvil a la tarjeta y se abre tu página de reseñas de Google. El móvil necesita tener NFC.'),
   FAQ('¿Asegura que me dejen 5 estrellas?', 'No, y desconfía de quien lo prometa. Lo que hace es ponérselo fácil a quien quiera opinar.'),
   FAQ('¿Dónde la pongo?', 'Donde termina el servicio: en el mostrador, en la caja o en la mesa. A la vista y a mano.'),
   FAQ('¿Cuándo la ofrezco?', 'Al final de un buen servicio, con naturalidad y sin insistir. «Si te ha gustado, aquí puedes contarlo».'),
   (cta('¿Te queda <span class="g">alguna duda</span>?', 'Pregúntanos lo que quieras de las tarjetas NFC de reseñas.', 'Comenta 👇'), {}),
 ]),
 ('2026-12-06-esto-o-esto', [
   ('<div class="tag">Juego de domingo 🎲</div><h1>¿Esto o esto? <span class="g">Versión clientes</span></h1><p style="margin-top:44px">Elige lo que prefieren los tuyos y te decimos qué significa para tu negocio 👉</p>', {}),
   ('<div class="step">Ronda 1</div><h2 style="font-size:64px">Para pedir cita…</h2>' + VS('Escribir por WhatsApp', 'Llamar por teléfono') +
    '<div class="step" style="margin-top:60px">Ronda 2</div><h2 style="font-size:64px">Antes de venir…</h2>' + VS('Ver precios en la web', 'Preguntar el precio'), {}),
   ('<div class="step">Ronda 3</div><h2 style="font-size:64px">Para encontrarte…</h2>' + VS('Buscar en Google Maps', 'Buscarte en Instagram') +
    '<div class="step" style="margin-top:60px">Ronda 4</div><h2 style="font-size:64px">Para opinar…</h2>' + VS('Un toque con el móvil', 'Buscar tu ficha a mano'), {}),
   ('<div class="step">Lo que significa</div>'
    '<div class="check"><i>1</i><span>WhatsApp a un toque, visible en tu web y tu bio</span></div>'
    '<div class="check"><i>2</i><span>Precios orientativos que ahorran preguntas</span></div>'
    '<div class="check"><i>3</i><span>Ficha de Google completa y perfil con enlace a tu web</span></div>'
    '<div class="check"><i>4</i><span>Una forma rápida de dejar su opinión</span></div>', {}),
   (cta('¿Qué has elegido <span class="g">tú</span>?', 'Pon tus 4 letras en comentarios. Ejemplo: A B A A', 'Comenta 👇'), {}),
 ]),
]
