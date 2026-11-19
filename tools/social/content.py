# Contenido de los carruseles 23 – 29 nov 2026 (Agencia JS)
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

POSTS = [
 ('2026-11-23-diccionario', [
   ('<div class="tag">Sin tecnicismos 📖</div><h1>El diccionario de tu web <span class="g">explicado fácil</span></h1><p style="margin-top:44px">6 palabras que te dicen siempre y nadie te explica.</p>', {}),
   TERM('Dominio', 'El nombre de tu web, lo que escribes en el navegador.', 'tunegocio.com. Que esté a tu nombre, no al de otra persona.'),
   TERM('Hosting', 'El «local» donde vive tu web en internet. Se paga como un alquiler.', 'Si no se renueva, tu web desaparece aunque el dominio siga siendo tuyo.'),
   TERM('Certificado SSL', 'El candado junto a la dirección. Cifra lo que el cliente escribe.', 'Sin él, el navegador avisa con un «No seguro».'),
   TERM('SEO local', 'Todo lo que ayuda a que te encuentren cuando buscan tu servicio cerca.', 'Web clara, ficha de Google completa y reseñas de clientes reales.'),
   TERM('Ficha de Google', 'Tu perfil gratuito en Google Maps y en el buscador.', 'Horario, fotos, teléfono y reseñas, todo en un vistazo.'),
   TERM('Tarjeta NFC', 'Una tarjeta que, al acercar el móvil, abre un enlace al momento.', 'Por ejemplo, la página para dejar tu opinión en Google.'),
   (cta('¿Qué palabra <span class="g">te faltaba</span>?', 'Pregúntanos cualquier duda de tu web, sin tecnicismos.', 'Comenta 👇'), {}),
 ]),
 ('2026-11-25-encuesta', [
   ('<div class="tag">Encuesta rápida 🗳️</div><h1 style="font-size:72px;margin-bottom:20px">¿Cómo te encuentra <span class="g">tu cliente nuevo</span>?</h1>'
    '<div class="opt" style="padding:24px 36px;margin-top:20px;font-size:38px"><b style="width:64px;height:64px;font-size:32px">A</b>Buscando en Google o Maps</div>'
    '<div class="opt" style="padding:24px 36px;margin-top:20px;font-size:38px"><b style="width:64px;height:64px;font-size:32px">B</b>Por Instagram o TikTok</div>'
    '<div class="opt" style="padding:24px 36px;margin-top:20px;font-size:38px"><b style="width:64px;height:64px;font-size:32px">C</b>Boca a boca</div>'
    '<div class="opt" style="padding:24px 36px;margin-top:20px;font-size:38px"><b style="width:64px;height:64px;font-size:32px">D</b>Pasa por delante del local</div>'
    '<p style="margin-top:28px;font-size:32px">Responde con una letra en comentarios 👇</p>', {'foot': 'Desliza →'}),
   ('<div class="tag">Y según tu respuesta…</div>'
    '<div class="check"><i>A</i><span>Cuida tu ficha de Google: horario, fotos y reseñas al día.</span></div>'
    '<div class="check"><i>B</i><span>Que tu bio lleve a una web que cargue rápido en el móvil.</span></div>'
    '<div class="check"><i>C</i><span>Ponles fácil recomendarte: un enlace o una tarjeta para opinar.</span></div>'
    '<div class="check"><i>D</i><span>Que tu escaparate tenga un QR o tu web visible.</span></div>', {}),
   (cta('¿Cuál es <span class="g">la tuya</span>?', 'Te decimos gratis qué mejorar primero según cómo te encuentran.', 'Comenta A, B, C o D 👇'), {}),
 ]),
 ('2026-11-26-mitos-resenas', [
   ('<div class="tag">Reseñas de Google ⭐</div><h1>5 mitos sobre las reseñas <span class="g">que frenan a tu negocio</span></h1><p style="margin-top:44px">Desliza y dinos cuál te creías 👉</p>', {}),
   MYTH('«Solo opinan los que se enfadan»', 'Muchos clientes contentos opinarían, pero nadie se lo pide. Pedirlo en el momento ayuda.'),
   MYTH('«Pedir una reseña queda mal»', 'Si lo haces al final de un buen servicio y sin insistir, es de lo más natural.'),
   MYTH('«A una mala reseña mejor no responder»', 'Una respuesta educada y con solución también la leen los clientes que vienen detrás.'),
   MYTH('«Comprar reseñas es un atajo»', 'Las reseñas falsas van contra las normas de Google y pueden acabar eliminadas.'),
   MYTH('«Ya tengo reseñas, no hace falta más»', 'Las recientes cuentan: muestran que tu negocio sigue vivo y atendiendo bien.'),
   (cta('¿Cuál <span class="g">te creías</span>?', 'Con una tarjeta NFC tus clientes abren tu página de reseñas al instante. Opinan si quieren, en un toque.', 'Pregúntanos 👇'), {}),
 ]),
 ('2026-11-28-bio-antes-despues', [
   ('<div class="tag">Antes / después ✨</div><h1>Tu bio de Instagram <span class="g">en 30 segundos</span></h1><p style="margin-top:44px">Es lo primero que lee quien llega a tu perfil.</p>', {}),
   BIO('La bio que no vende', ['Bienvenidos 🌸✨', 'Pasión por lo que hacemos', 'Desde siempre'], False),
   BIO('La bio que trae clientes', ['✂️ Peluquería · color y cortes', '📍 Calle Mayor 5 · L a S', '📲 Cita por WhatsApp 👇', '🔗 tunegocio.com'], True),
   ('<div class="step">La fórmula</div><h2>4 líneas y listo</h2>'
    '<div class="check"><i>1</i><span>Qué haces, en palabras normales</span></div>'
    '<div class="check"><i>2</i><span>Dónde estás y cuándo abres</span></div>'
    '<div class="check"><i>3</i><span>Cómo pedir cita o comprar</span></div>'
    '<div class="check"><i>4</i><span>Enlace a tu web o tu WhatsApp</span></div>', {}),
   (cta('¿Aprueba <span class="g">tu bio</span>?', 'Si tu enlace lleva a una web lenta o desactualizada, te ayudamos.', 'Escríbenos 👇'), {}),
 ]),
 ('2026-11-29-carta-navidad', [
   ('<div class="tag">Querido Papá Noel 🎅</div><h1>Este año <span class="g">mi negocio</span> ha sido bueno y pide…</h1><p style="margin-top:44px">Marca los tuyos y cuéntanos tu número 👉</p>', {}),
   ('<div class="step">Mi carta</div>'
    '<div class="check"><i>1</i><span>Una web que se vea bien en el móvil</span></div>'
    '<div class="check"><i>2</i><span>Que me encuentren en Google cuando me buscan cerca</span></div>'
    '<div class="check"><i>3</i><span>Que mis clientes contentos se animen a opinar</span></div>'
    '<div class="check"><i>4</i><span>Un vídeo que cuente lo que hago</span></div>'
    '<div class="check"><i>5</i><span>Dejar de pelearme con la web los domingos</span></div>', {}),
   (cta('¿Qué número <span class="g">pedirías</span>?', 'Web, SEO local, tarjetas NFC de reseñas y vídeos para tu negocio. Sin esperar al 25.', 'Comenta 👇'), {}),
 ]),
]
