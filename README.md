# Flores amarillas — Universo para Verónica

Una experiencia web romántica e interactiva que transforma una carta de amor en un pequeño universo digital: un núcleo dorado, órbitas luminosas, estrellas, polvo cósmico, cometas y flores amarillas holográficas que esconden mensajes.

> **Creado con 💛 para Verónica.**

## Tecnologías

- HTML5 semántico
- CSS3 (glassmorphism, glow, animaciones, responsive design)
- JavaScript vanilla
- Canvas 2D
- Pointer Events para mouse y touch
- Web Audio API para un ambiente sonoro opcional generado en el navegador

No usa React, Vue, Angular, Three.js, Babylon.js ni backend.

## Estructura

```text
flowers-universe/
├── index.html
├── README.md
├── css/
│   └── style.css
└── js/
    ├── main.js
    ├── universe.js
    ├── flowers.js
    └── interaction.js
```

## Cómo ejecutarlo

Abre `index.html` directamente en un navegador moderno. No hace falta servidor local.

La experiencia usa archivos JavaScript clásicos (no módulos ES) precisamente para conservar compatibilidad al abrir el archivo con `file://`.

## Cómo modificar los mensajes

Los mensajes de cada flor están en `js/flowers.js`, dentro del arreglo `MESSAGES`.

El mensaje introductorio y la secuencia final están en `index.html`, por lo que puedes editarlos sin tocar la lógica del Canvas.

## Cómo agregar nuevas flores

En `js/flowers.js`, dentro del método `build()`, agrega otro objeto al arreglo `specs`:

```js
{ radius: 530, tiltX: 0.20, tiltZ: -0.25, speed: 0.032, size: 24 }
```

Cada posición del arreglo genera una flor y una órbita. Si agregas más flores, también puedes agregar nuevas frases a `MESSAGES`.

Parámetros principales:

- `radius`: distancia al centro.
- `tiltX` / `tiltZ`: inclinación 3D de la órbita.
- `speed`: velocidad y dirección orbital. Un valor negativo invierte el giro.
- `size`: tamaño base de la flor.

## Cómo cambiar colores

La paleta principal está centralizada al inicio de `css/style.css` mediante variables CSS:

```css
--space: #02040a;
--gold: #ffd54a;
--gold-bright: #fff2a7;
--amber: #f3aa2f;
--white: #fffdf2;
```

Los efectos de Canvas usan tonos equivalentes en `js/universe.js` y `js/flowers.js`. Busca `rgba(255,` para localizar rápidamente los brillos dorados.

## Cómo ajustar partículas y rendimiento

En `js/universe.js`, el método `resize()` define automáticamente una configuración más ligera para pantallas pequeñas:

- menos estrellas
- menos polvo cósmico
- menor `devicePixelRatio` máximo

Puedes modificar:

```js
this.performance.starCount
this.performance.dustCount
```

En `js/flowers.js`, el número máximo de partículas de estela se limita para evitar acumulación de memoria.

## Controles en PC

- **Click + arrastrar:** rotar el universo.
- **Rueda del mouse:** zoom.
- **Click sobre una flor:** seleccionar la flor, emitir partículas y revelar su mensaje.
- **♫:** activar/desactivar audio ambiental. Nunca comienza automáticamente.

## Controles en móvil

- **Deslizar:** rotar el universo.
- **Pellizcar:** zoom.
- **Tocar una flor:** seleccionar y revelar su mensaje.
- **♫:** activar/desactivar audio ambiental después de una interacción del usuario.

El Canvas utiliza Pointer Events y `touch-action: none`, evitando depender de hover y manteniendo la misma lógica para mouse, stylus y touch.

## Accesibilidad y movimiento

La interfaz incluye etiquetas accesibles, estados `aria-hidden`, mensajes con `aria-live` y soporte para `prefers-reduced-motion`. En dispositivos que solicitan menos movimiento, las secuencias narrativas se aceleran y se reducen las animaciones CSS.

## Notas de diseño

La experiencia está pensada mobile-first para anchos de 360–430 px y luego escala a tablets y escritorio. No existe scroll horizontal y los controles mantienen zonas táctiles amplias.

---

**Creado con 💛 para Verónica.**
