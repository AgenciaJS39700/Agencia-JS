# Contenido de los carruseles 21 oct – 1 nov 2026 (Agencia JS)
def M(myth, real, n):
    return (f'<div class="num">{n}</div><div class="myth">Mito</div><h2>«{myth}»</h2>'
            f'<div class="real"><b>Realidad</b><span>{real}</span></div>', {})

def W(n, title, text, fix):
    return (f'<div class="num">{n}</div><h2>{title}</h2><p>{text}</p>'
            f'<div class="fix"><b>Mejor</b><span>{fix}</span></div>', {})

def G(sign, text):
    return (f'<div class="ghost"><div class="emoji" style="margin:0">👻</div><div class="sign">{sign}</div></div>'
            f'<p>{text}</p>', {})

def R(room, title, text, fix):
    return (f'<div class="room">{room}</div><h2>{title}</h2><p>{text}</p>'
            f'<div class="fix"><b>Arreglo</b><span>{fix}</span></div>', {})

POSTS = [
 ('2026-10-21-mitos', [
   ('<div class="tag">Mito o realidad</div><h1>5 mitos que frenan a tu negocio <span class="g">en internet</span></h1><p style="margin-top:44px">El tercero lo escuchamos cada semana.</p>', {}),
   M('Con Instagram me basta', 'Cuando alguien busca en Google «peluquería cerca de mí», Instagram no aparece. Tu ficha de Google y tu web, sí.', '01'),
   M('Una web cuesta una fortuna', 'Hoy hay webs profesionales a precios de negocio local. Lo caro es perder clientes cada día porque no te encuentran.', '02'),
   M('Las reseñas malas hay que esconderlas', 'Responder con educación da más confianza que no tener ninguna. El cliente valora cómo reaccionas.', '03'),
   M('Si tengo web, ya salgo en Google', 'Sin SEO local y sin la ficha de Google completa, tu web puede no aparecer en tu zona.', '04'),
   M('Eso es para negocios grandes', 'Los clientes de un bar, una tienda o una barbería también buscan en el móvil antes de ir.', '05'),
   (cta('¿Cuál de estos <span class="g">te frenaba</span>?', 'Te revisamos gratis la web y la ficha de Google y te decimos qué mejorar.', 'Comenta AUDITORIA 👇'), {}),
 ]),
 ('2026-10-22-que-es-esto', [
   ('<div class="tag">Pero… ¿qué es esto? 😳</div><h1>Cosas que aún vemos en webs de negocios <span class="g">en 2026</span></h1><p style="margin-top:44px">Si tu web tiene alguna, te están costando clientes.</p>', {}),
   W('01', 'La carta en un PDF gigante', 'En el móvil tarda en abrir y hay que hacer zoom para leer un precio.', 'Carta en la propia web, rápida y fácil de leer.'),
   W('02', 'El teléfono dentro de una imagen', 'Se ve, pero no se puede pulsar para llamar. El cliente tiene que copiarlo a mano… o se va.', 'Botón de llamar y de WhatsApp siempre visibles.'),
   W('03', '«Web en construcción» desde hace años', 'Para el cliente, un negocio que parece abandonado no inspira confianza.', 'Una web sencilla y terminada vale más que una perfecta a medias.'),
   W('04', 'Un formulario que nadie contesta', 'El cliente escribe, espera… y acaba llamando a otro.', 'WhatsApp directo y respuesta el mismo día.'),
   (cta('¿Tu web tiene <span class="g">alguna de estas</span>?', 'Te la revisamos gratis y te decimos qué cambiar.', 'Comenta AUDITORIA 👇'), {}),
 ]),
 ('2026-10-23-checklist', [
   ('<div class="tag">Checklist de viernes</div><h1>Antes del finde: <span class="g">5 minutos</span> para que te encuentren</h1><p style="margin-top:44px">Revísalo en tu ficha de Google desde el móvil.</p>', {}),
   ('<h2>Tu checklist ✅</h2>'
    '<div class="check"><i>1</i><span>Horario del fin de semana correcto (y festivos marcados)</span></div>'
    '<div class="check"><i>2</i><span>Teléfono y botón de WhatsApp o web funcionando</span></div>'
    '<div class="check"><i>3</i><span>Al menos 1 foto nueva de esta semana</span></div>'
    '<div class="check"><i>4</i><span>Reseñas de la semana respondidas</span></div>'
    '<div class="check"><i>5</i><span>Una publicación con tu oferta o novedad del finde</span></div>', {}),
   (cta('¿Prefieres que <span class="g">lo revisemos</span> nosotros?', 'Te decimos gratis qué le falta a tu ficha y a tu web.', 'Escríbenos 👇'), {}),
 ]),
 ('2026-10-25-encuesta', [
   ('<div class="tag">Encuesta de domingo 👇</div><h1 style="font-size:84px">¿Dónde te encuentran <span class="g">tus clientes</span>?</h1>'
    '<p style="margin-top:30px;font-size:32px">Responde en comentarios con un número:</p>'
    '<div class="opt"><b>1</b>Me buscan en Google o Maps</div>'
    '<div class="opt"><b>2</b>Me ven en Instagram o TikTok</div>'
    '<div class="opt"><b>3</b>Me recomiendan (boca a boca)</div>', {'foot': 'agencia-js.com'}),
 ]),
 ('2026-10-27-grr-mondays', [
   ('<div class="tag">#GrrMondays 😩</div><h1 style="font-size:84px">Lunes, 9:00. El teléfono <span class="g">no suena</span>…</h1>'
    '<div class="gcard"><h3>Tu Negocio</h3><div class="stars">★★★★☆ <span style="color:#5f6368;font-size:28px">· 23 reseñas</span></div>'
    '<div class="st"><b>Cerrado</b> · Abre el martes a las 10:00</div></div>'
    '<p>…porque tu ficha de Google dice que hoy estás cerrado.</p>', {}),
   ('<h2>Cómo evitar este lunes 👇</h2>'
    '<div class="check"><i>1</i><span>Revisa el horario de tu ficha de Google cada vez que cambie</span></div>'
    '<div class="check"><i>2</i><span>Marca los festivos y vacaciones con antelación</span></div>'
    '<div class="check"><i>3</i><span>Pon el mismo horario en tu web e Instagram</span></div>'
    + '<div class="cta" style="font-size:34px">¿Lo revisamos gratis? 👉 agencia-js.com</div>' + CONTACT, {}),
 ]),
 ('2026-10-28-ghostear', [
   ('<div class="tag">Especial Halloween 🎃</div><div class="emoji">👻</div><h1>Cosas que tu negocio debería <span class="g">ghostear</span></h1><p style="margin-top:36px">Ya. Antes de que te asusten a los clientes.</p>', {}),
   G('Contestar el WhatsApp a los 3 días', 'El cliente que pregunta hoy, compra hoy. Si tardas, compra en otro sitio.'),
   G('La web que tarda una eternidad en cargar', 'En el móvil nadie espera: se vuelven a Google y entran en la siguiente.'),
   G('Las fotos de hace 10 años en Google', 'Si el local ha cambiado, el cliente se lleva una sorpresa (y no buena).'),
   G('Las reseñas sin responder', 'Cada opinión sin contestar es una conversación que dejas a medias delante de todos.'),
   G('Depender solo de Instagram', 'Si mañana cambia el algoritmo, tu web y tu ficha de Google siguen siendo tuyas.'),
   (cta('¿Qué tienes que <span class="g">ghostear</span> tú? 👻', 'Te hacemos una auditoría gratis de tu web y tu ficha de Google.', 'Comenta AUDITORIA 👇'), {}),
 ]),
 ('2026-10-30-web-encantada', [
   ('<div class="tag">Tour de Halloween 🎃</div><h1>Bienvenido a la <span class="g">web encantada</span> 🕸️</h1><p style="margin-top:44px">Recorremos sus habitaciones… y dejamos la peor para el final.</p>', {}),
   R('Entrada', 'Un pop-up que tapa toda la pantalla', 'Antes de ver nada, el cliente ya está buscando la X para cerrarlo.', 'Que lo primero que vea sea qué ofreces y cómo contactarte.'),
   R('Salón', 'Una música que suena sola', 'El cliente la abre en el trabajo o en el bus… y la cierra del susto.', 'Nada de sonido automático: que el cliente decida.'),
   R('Cocina', 'Fotos borrosas o robadas de internet', 'Si no se ve tu producto real, el cliente no sabe qué va a encontrar.', 'Fotos reales, bien iluminadas y actuales.'),
   R('Sótano (la peor) 💀', 'No hay forma de contactarte', 'Ni teléfono, ni WhatsApp, ni dirección. El cliente se va… para siempre.', 'Botón de WhatsApp y de llamar visibles en todas las páginas.'),
   (cta('¿Tu web da <span class="g">miedo</span>? 🎃', 'Te la revisamos gratis y te decimos qué arreglar.', 'Comenta AUDITORIA 👇'), {}),
 ]),
 ('2026-11-01-navidad', [
   ('<div class="tag">Ya es noviembre</div><h1>4 cosas que tu negocio necesita <span class="g">antes de diciembre</span></h1><p style="margin-top:44px">Black Friday y Navidad se preparan ahora, no el 20 de diciembre.</p>', {}),
   W('01', 'Horarios especiales en Google', 'Festivos, puentes y aperturas extra marcados en tu ficha.', 'Actualízalos ya y evita clientes en la puerta cerrada.'),
   W('02', 'Tus ofertas visibles en la web', 'Si la oferta solo está en una historia de 24 horas, se pierde.', 'Una sección de ofertas o regalos en tu web.'),
   W('03', 'Reseñas recientes', 'En diciembre mucha gente compra a un negocio que no conoce y se fía de las opiniones.', 'Pide reseñas a tus clientes de este mes.'),
   W('04', 'Pedidos y reservas fáciles', 'Menos llamadas sin contestar en las semanas de más trabajo.', 'Botón de WhatsApp, reservas o pedido online.'),
   (cta('¿Preparamos tu negocio <span class="g">para diciembre</span>?', 'Empezamos con una auditoría gratis de tu web y tu ficha de Google.', 'Escríbenos 👇'), {}),
 ]),
]
