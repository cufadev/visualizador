#!/usr/bin/env bash
# Sirve dist/ en http://localhost:4173 y abre el navegador. Ctrl+C para cerrar.
# Hace falta para el fondo de YouTube (por file:// da error 153).
cd "$(dirname "$0")" || exit 1
[ -f dist/index.html ] || { echo "Falta dist/. Corré: npm install && npm run build"; exit 1; }
URL=http://localhost:4173
(sleep 1; xdg-open "$URL" >/dev/null 2>&1 || true) &
echo "VISUAL en $URL  (Ctrl+C para cerrar)"
exec python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
