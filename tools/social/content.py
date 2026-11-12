# Contenido de los carruseles 16 – 22 nov 2026 (Agencia JS)
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

POSTS = [
 ('2026-11-16-checklist-bf', [
   ('<div class="tag">Black Friday · 27 de noviembre</div><h1>Checklist para que tu negocio <span class="g">llegue a punto</span></h1><p style="margin-top:44px">Queda una semana y media. Revísalo hoy y ahórrate sustos.</p>', {}),
   BLOCK('Tu ficha de Google', 'Lo primero que ven', ['Horario de esos días actualizado', 'Una publicación con tu oferta o tu detalle', 'Fotos recientes del local o del producto']),
   BLOCK('Tu web', 'Pruébala desde el móvil', ['Que cargue rápido y se lea sin hacer zoom', 'Botón de llamar o WhatsApp a la vista', 'La oferta en la portada, no escondida']),
   BLOCK('Tus redes', 'Avisa antes, no el mismo día', ['Un vídeo corto contando qué preparas', 'Aviso a tus clientes por WhatsApp unos días antes', 'Bio con el enlace a tu web o tu oferta']),
   (cta('¿Cuántos <span class="g">tienes marcados</span>?', 'Si te falta alguno, te echamos una mano con la web, la ficha de Google o el vídeo.', 'Escríbenos 👇'), {}),
 ]),
 ('2026-11-18-test-web-3-min', [
   ('<div class="tag">Consejo rápido ⏱️</div><h1>Haz este test a tu web <span class="g">en 3 minutos</span></h1><p style="margin-top:44px">Solo necesitas tu móvil. Sin saber nada técnico.</p>', {}),
   V('01', 'Ábrela con datos móviles', 'Desconecta el wifi y entra como lo haría un cliente por la calle.', '¿Tarda en verse algo? Eso es lo primero que hay que mirar.', 'Fíjate'),
   V('02', 'Busca tu teléfono', 'Cuenta cuántos toques necesitas para poder llamarte o escribirte.', 'Debería estar a un toque, desde la primera pantalla.', 'Fíjate'),
   V('03', 'Lee la primera pantalla', '¿Se entiende qué haces y dónde estás sin bajar?', 'Una frase clara vale más que un «Bienvenidos a nuestra web».', 'Fíjate'),
   V('04', 'Mira el candado', 'Junto a la dirección debe salir el candado de conexión segura.', 'Si sale «No seguro», muchos clientes se van sin entrar.', 'Fíjate'),
   V('05', 'Compártela por WhatsApp', 'Mándate el enlace a ti mismo y mira cómo se ve la vista previa.', 'Debería salir tu nombre, una imagen y una descripción.', 'Fíjate'),
   (cta('¿Cuántas <span class="g">ha aprobado</span> tu web?', 'Si suspende alguna, te la revisamos gratis y sin compromiso.', 'Cuéntanos 👇'), {}),
 ]),
 ('2026-11-20-fotos-si-no', [
   ('<div class="tag">Fotos de tu negocio 📸</div><h1>Fotos que atraen clientes <span class="g">y fotos que los espantan</span></h1><p style="margin-top:44px">Para tu web, tu ficha de Google y tus redes. Hechas con el móvil.</p>', {}),
   SINO('01', 'La fachada', 'De noche, con la persiana bajada o tapada por un coche.', 'De día, de frente y con el cartel bien visible.'),
   SINO('02', 'El interior', 'Con cajas por medio y la luz del techo amarillenta.', 'Ordenado, con luz natural y desde una esquina para ver el espacio.'),
   SINO('03', 'Tu producto o servicio', 'Sacada de internet o con un fondo lleno de cosas.', 'Tu trabajo real, de cerca y con un fondo limpio.'),
   SINO('04', 'Tu equipo', 'Ninguna foto: nadie sabe quién le va a atender.', 'Una foto natural trabajando. Da confianza antes de entrar.'),
   (cta('¿Qué foto <span class="g">cambiarías</span> hoy?', 'Te ayudamos a que tu web y tu ficha de Google den la mejor imagen.', 'Escríbenos 👇'), {}),
 ]),
 ('2026-11-22-encuentra-fallos', [
   ('<div class="tag">Juego del domingo 🔎</div><h1 style="font-size:84px;margin-bottom:34px">Encuentra los <span class="g">5 fallos</span> de esta web</h1>' + MOCK() + '<p style="margin-top:30px;font-size:32px">Comenta cuántos ves antes de deslizar 👉</p>', {'foot': 'Solución →'}),
   ('<div class="tag">Solución</div>' + MOCK(True), {}),
   ('<div class="step">Los 5 fallos</div>'
    '<div class="check"><i>1</i><span>«No seguro»: le falta el candado de conexión segura</span></div>'
    '<div class="check"><i>2</i><span>El horario de verano, en pleno noviembre</span></div>'
    '<div class="check"><i>3</i><span>Una foto vieja que no enseña nada</span></div>'
    '<div class="check"><i>4</i><span>Texto genérico que no dice qué haces ni dónde</span></div>'
    '<div class="check"><i>5</i><span>El contacto escondido en la página 3</span></div>', {}),
   (cta('¿Cuántos <span class="g">acertaste</span>?', '¿Y la tuya? Te la revisamos gratis y te decimos qué cambiar primero.', 'Comenta 👇'), {}),
 ]),
]
