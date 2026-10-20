# VISUAL

Visualizador de audio para proyectar en vivo. Toma el sonido del micrófono (o de una
mesa/interfaz USB) y dibuja el espectro sobre un video de fondo opcional.

## Usar
- **Online:** https://cufadev.github.io/visualizador/ (se publica solo con cada push a `main`; funciona YouTube y micrófono desde cualquier dispositivo).
- **Para tocar:** `./iniciar.sh` (sirve `dist/` en `http://localhost:4173` y abre el navegador). Con video local o sin fondo también anda abriendo `dist/index.html` con doble click, sin internet.
- **Desarrollo:** `npm install`, `npm run dev`. Para generar `dist/index.html`: `npm run build`.

## Modos
Barras · Radial · Espiral · Onda · Anillos · Cascada · Túnel · Plasma · Caleidoscopio (los tres últimos son shaders WebGL) · Milkdrop (100 presets, vía Butterchurn).

## Funciones de escenario
- **Escenas:** guardan modo, color, sensibilidad, texto, logo y fondo de YouTube (hasta 9). `⇧1`…`⇧9` las aplica, `,` y `.` van a la anterior y la siguiente.
- **Texto:** mensaje grande que late con el beat; arriba, centro o abajo, o desplazándose. `T` lo muestra u oculta.
- **Logo:** PNG o SVG propio, centrado o en una esquina, que late con los graves. Se guarda en el navegador (hasta ~1,5 MB). `L` lo muestra u oculta.
- **Blackout y flash:** `B` apaga todo y `X` hace un destello.
- **Control remoto:** el celular escanea el QR y maneja modos, escenas, color, texto y blackout. Usa WebRTC (PeerJS) y necesita internet en los dos equipos; solo hay que activarlo en el panel.
- **Grabar:** `R`. Graba esta pestaña (con video, texto, logo e incluso YouTube) más el sonido de la entrada, y descarga un `.webm`.

## Atajos
`H` panel · `M` modo (con Shift, anterior) · `1`–`0` modo directo · `C` color · `V` fondo
· `N` preset Milkdrop · `F` pantalla completa · `+`/`-` sensibilidad · `Espacio` pausa el video
· `⇧1`–`⇧9` escena · `,` `.` escena anterior/siguiente · `T` texto · `L` logo · `B` blackout · `X` flash · `R` grabar.
El panel y el cursor se esconden solos a los 3,5 s sin mover el mouse.

## Estructura
```
src/main.js            arranque y pantalla de inicio
src/state.js           ajustes guardados en localStorage
src/audio/engine.js    entrada, bandas logarítmicas, niveles y beat
src/audio/demo.js      sonido sintético para probar sin micrófono
src/visuals/           renderer, paletas, superficie de shaders y un archivo por modo (modes/)
src/stage/             texto, logo, blackout y flash
src/scenes.js          escenas guardadas
src/remote/            control remoto: host (pantalla), cliente (celular) y protocolo validado
src/record.js          grabación a .webm
src/video/background.js fondo: archivo local o YouTube
src/ui/                panel, atajos, ocultar por inactividad
src/styles/            tokens, base, panel, inicio
```
Para agregar un modo 2D: copiar uno de `src/visuals/modes/`, devolver `{ id, name, icon, draw(g, f) }`
y sumarlo a la lista en `renderer.js`. Para uno con shader, en vez de `draw` se define `frag` (ver `tunnel.js`).

## Notas
- **YouTube necesita `iniciar.sh`** (o cualquier `http://`): abierto con doble click da *error 153*, porque YouTube exige el `Referer` y `file://` no lo manda.
- El micrófono necesita `localhost`, HTTPS o abrir el archivo directamente (no `http://` en la LAN).
- En vivo conviene un video de fondo **local**: el de YouTube depende del wifi.
- Para visualizar el audio de la PC (YouTube, un reproductor), elegí en "Dispositivo" el
  "Monitor de…" de la salida (PipeWire/PulseAudio).
- La versión 1 original (un solo archivo) quedó solo en disco como respaldo; no está en este repo.
