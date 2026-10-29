# Contenido de los carruseles 3 – 8 nov 2026 (Agencia JS)
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

POSTS = [
 ('2026-11-03-red-flags', [
   ('<div class="tag">Red flags 🚩 vs green flags 💚</div><h1>¿La web de tu negocio <span class="g">vende</span> o <span class="g">espanta</span>?</h1><p style="margin-top:44px">5 señales que el cliente ve en los primeros segundos.</p>', {}),
   F('01', 'Tarda una eternidad en abrir en el móvil', 'Se abre rápido y se lee sin hacer zoom'),
   F('02', 'Para contactar hay que rellenar un formulario larguísimo', 'Botón de WhatsApp y de llamar siempre a mano'),
   F('03', 'Fotos de banco de imágenes que salen en mil webs', 'Fotos reales de tu local, tu equipo y tu producto'),
   F('04', 'No aparece ni el horario ni la dirección', 'Horario, mapa y cómo llegar en un vistazo'),
   F('05', 'La última novedad es de hace años', 'Ofertas y novedades al día'),
   (cta('¿Cuántas <span class="g">red flags</span> tiene la tuya?', 'Te revisamos gratis la web y la ficha de Google y te decimos qué mejorar.', 'Comenta AUDITORIA 👇'), {}),
 ]),
 ('2026-11-05-nfc-3-pasos', [
   ('<div class="tag">Tarjetas NFC de reseñas</div><h1>Cómo funcionan <span class="g">en 3 pasos</span></h1><p style="margin-top:44px">Sin descargar apps y sin buscar tu negocio en Google.</p>', {}),
   STEP('01', 'El cliente acerca el móvil a la tarjeta', 'En el mostrador, en la mesa o junto a la caja. Un gesto y listo.'),
   STEP('02', 'Se abre tu ficha de Google para opinar', 'Directo a dejar su reseña, sin pasos intermedios ni búsquedas.'),
   STEP('03', 'Él decide qué escribir', 'La opinión siempre es del cliente. La tarjeta solo le quita la pereza de buscarte.'),
   ('<h2>3 consejos para sacarle partido 💡</h2>'
    '<div class="check"><i>1</i><span>Colócala donde el cliente espera: caja, mesa o recepción</span></div>'
    '<div class="check"><i>2</i><span>Pídela en el buen momento: al cobrar o al despedirte</span></div>'
    '<div class="check"><i>3</i><span>Responde a todas las reseñas, también a las mejorables</span></div>', {}),
   (cta('¿Quieres tus <span class="g">tarjetas NFC</span>?', 'Las preparamos con el enlace a tu ficha de Google.', 'Escríbenos 👇'), {}),
 ]),
 ('2026-11-07-esto-o-esto', [
   ('<div class="tag">Esto o esto 👀</div><h1>Como cliente, <span class="g">¿qué prefieres?</span></h1><p style="margin-top:44px">Responde en comentarios con tus letras. Ejemplo: A B A B B</p>', {}),
   ('<h2 style="font-size:64px">Elige una de cada 👇</h2>'
    '<div class="pair"><div><b>A</b>Carta en PDF</div><em>o</em><div class="b"><b>B</b>Carta en la web</div></div>'
    '<div class="pair"><div><b>A</b>Formulario de contacto</div><em>o</em><div class="b"><b>B</b>Botón de WhatsApp</div></div>'
    '<div class="pair"><div><b>A</b>Llamar para reservar</div><em>o</em><div class="b"><b>B</b>Reservar online</div></div>'
    '<div class="pair"><div><b>A</b>Fotos de stock</div><em>o</em><div class="b"><b>B</b>Fotos reales</div></div>'
    '<div class="pair"><div><b>A</b>Buscar en Instagram</div><em>o</em><div class="b"><b>B</b>Buscar en Google Maps</div></div>', {}),
   (cta('Lo que prefieres tú, <span class="g">lo prefieren tus clientes</span>', '¿Tu negocio lo pone fácil? Te lo revisamos gratis.', 'Comenta tus letras 👇'), {}),
 ]),
 ('2026-11-08-ideas-video', [
   ('<div class="tag">Consejos rápidos 🎬</div><h1>5 vídeos que tu negocio puede grabar <span class="g">esta semana</span></h1><p style="margin-top:44px">Solo con el móvil. Guárdalo para tu próxima idea.</p>', {}),
   V('01', 'Antes y después', 'Un corte de pelo, un plato emplatado, una reparación o un escaparate nuevo.', 'Mismo encuadre en las dos tomas para que el cambio se note.'),
   V('02', 'Tu día en 15 segundos', 'Subir la persiana, preparar, el primer cliente, cerrar.', 'Clips cortos de 1–2 segundos cada uno.'),
   V('03', 'Responde una pregunta frecuente', '«¿Hacéis encargos?», «¿Hay aparcamiento?», «¿Aceptáis tarjeta?»', 'Pon la pregunta en texto en el primer segundo.'),
   V('04', 'Presenta a tu equipo', 'Quién es quién y qué hace cada uno. La gente compra a personas.', 'Que cada uno diga una frase, no un discurso.'),
   V('05', 'El proceso de tu producto estrella', 'Cómo se hace, de principio a fin.', 'Graba en vertical y con buena luz, mejor de día.'),
   (cta('¿Prefieres un vídeo <span class="g">publicitario profesional</span>?', 'Guion, grabación y edición para tu negocio. Lo hacemos nosotros.', 'Escríbenos 👇'), {}),
 ]),
]
