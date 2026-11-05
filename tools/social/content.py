# Contenido de los carruseles 14 – 15 nov 2026 (Agencia JS)
def W(n, title, text, fix):
    return (f'<div class="num">{n}</div><h2>{title}</h2><p>{text}</p>'
            f'<div class="fix"><b>Mejor</b><span>{fix}</span></div>', {})

def F(n, red, green):
    return (f'<div class="num" style="font-size:150px">{n}</div>'
            f'<div class="flag"><i>🚩</i><span><b>Red flag</b>{red}</span></div>'
            f'<div class="flag ok"><i>💚</i><span><b>Green flag</b>{green}</span></div>', {})

def STEP(n, title, text, extra=''):
    return (f'<div class="num">{n}</div><div class="step">Paso {n[-1]}</div><h2>{title}</h2><p>{text}</p>{extra}', {})

def V(n, title, text, tip):
    return (f'<div class="num">{n}</div><h2>{title}</h2><p>{text}</p>'
            f'<div class="fix"><b>Truco</b><span>{tip}</span></div>', {})

def BLOCK(label, title, items):
    checks = ''.join(f'<div class="check"><i>✓</i><span>{t}</span></div>' for t in items)
    return (f'<div class="step">{label}</div><h2>{title}</h2>{checks}', {})

POSTS = [
 ('2026-11-14-bf-sin-bajar-precios', [
   ('<div class="tag">Black Friday · Faltan 2 semanas</div><h1>5 ideas para tu Black Friday <span class="g">sin bajar precios</span></h1><p style="margin-top:44px">Para cuando tu margen no da para más descuentos.</p>', {}),
   V('01', 'Regalo con la compra', 'Un detalle a partir de cierto importe: una muestra, un extra o un complemento.', 'Elige algo que a ti te cueste poco y el cliente valore.'),
   V('02', 'Pack con nombre propio', 'Junta dos o tres productos o servicios que encajan bien entre sí.', 'Ponle nombre y que se entienda de un vistazo.'),
   V('03', 'Bono o tarjeta regalo', 'Para regalar en Navidad o para usar más adelante.', 'Anúncialo ya, antes de que empiecen las compras navideñas.'),
   V('04', 'Acceso anticipado', 'Tus clientes de siempre se enteran antes que nadie y reservan primero.', 'Avísales unos días antes por tu lista de difusión de WhatsApp.'),
   V('05', 'Un servicio extra', 'Envío gratis, envoltorio de regalo o una cita prioritaria.', 'Elige el que menos te cueste y más se note.'),
   (cta('¿Cuál usarías <span class="g">este año</span>?', 'Cuéntanoslo y te decimos cómo prepararlo en tu web, tu ficha de Google o un vídeo.', 'Comenta del 1 al 5 👇'), {}),
 ]),
 ('2026-11-15-sunday-reset', [
   ('<div class="tag">Sunday reset 🧺</div><h1>El reset de domingo, pero <span class="g">para tu negocio</span></h1><p style="margin-top:44px">15 minutos para empezar el lunes con todo en orden.</p>', {}),
   BLOCK('Minutos 1–5', 'Tu ficha de Google', ['Horario al día, festivos incluidos', 'Una foto nueva y real de esta semana']),
   BLOCK('Minutos 5–10', 'Tus clientes', ['Contesta las reseñas de la semana', 'Responde los mensajes pendientes de WhatsApp y redes']),
   BLOCK('Minutos 10–15', 'Tus redes', ['Deja lista una publicación para la semana', 'Apunta la pregunta que más te han hecho: ahí tienes tu próximo vídeo']),
   (cta('¿No te da la vida para <span class="g">el reset</span>?', 'Cuéntanos qué te falta: web, ficha de Google o vídeos para tu negocio.', 'Escríbenos 👇'), {}),
 ]),
]
