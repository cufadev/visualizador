# VISUAL

Visualizador de audio para proyectar en vivo. Toma el sonido del micrófono (o de una
mesa/interfaz USB) y dibuja el espectro sobre un video de fondo opcional.

## Usar
- **Online:** https://cufadev.github.io/visualizador/ (se publica solo con cada push a `main`; funciona YouTube y micrófono desde cualquier dispositivo).
- **Para tocar:** `./iniciar.sh` (sirve `dist/` en `http://localhost:4173` y abre el navegador). Con video local o sin fondo también anda abriendo `dist/index.html` con doble click, sin internet.
- **Desarrollo:** `npm install`, `npm run dev`. Para generar `dist/index.html`: `npm run build`.

## Modos
Barras · Radial · Espiral · Onda · Anillos · Cascada · Milkdrop (100 presets, vía Butterchurn).

## Atajos
`H` panel · `M` modo (con Shift, anterior) · `1`–`7` modo directo · `C` color · `V` fondo
· `N` preset Milkdrop · `F` pantalla completa · `+`/`-` sensibilidad · `Espacio` pausa el video.
El panel y el cursor se esconden solos a los 3,5 s sin mover el mouse.

## Estructura
```
src/main.js            arranque y pantalla de inicio
src/state.js           ajustes guardados en localStorage
src/audio/engine.js    entrada, bandas logarítmicas, niveles y beat
src/audio/demo.js      sonido sintético para probar sin micrófono
src/visuals/           renderer, paletas y un archivo por modo (modes/)
src/video/background.js fondo: archivo local o YouTube
src/ui/                panel, atajos, ocultar por inactividad
src/styles/            tokens, base, panel, inicio
```
Para agregar un modo: copiar uno de `src/visuals/modes/`, devolver `{ id, name, icon, draw(g, f) }`
y sumarlo a la lista en `renderer.js`.

## Notas
- **YouTube necesita `iniciar.sh`** (o cualquier `http://`): abierto con doble click da *error 153*, porque YouTube exige el `Referer` y `file://` no lo manda.
- El micrófono necesita `localhost`, HTTPS o abrir el archivo directamente (no `http://` en la LAN).
- En vivo conviene un video de fondo **local**: el de YouTube depende del wifi.
- Para visualizar el audio de la PC (YouTube, un reproductor), elegí en "Dispositivo" el
  "Monitor de…" de la salida (PipeWire/PulseAudio).
- La versión 1 original (un solo archivo) quedó solo en disco como respaldo; no está en este repo.
