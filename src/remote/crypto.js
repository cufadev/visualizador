// Cifrado de punta a punta para el control remoto. Los mensajes pasan por brokers MQTT
// publicos, asi que van cifrados (AES-GCM) con una clave que solo viaja en el QR, dentro
// del fragmento de la URL (#k=...), que el navegador nunca manda a ningun servidor.
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (u8) => {
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s);
};
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toUrl = (s) => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromUrl = (s) => s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);

export function newSecret(bytes) {
  return toUrl(b64(crypto.getRandomValues(new Uint8Array(bytes))));
}

export function importSecret(secret) {
  const raw = unb64(fromUrl(secret));
  if (raw.length !== 16) throw new Error('clave invalida');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function seal(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj))));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return b64(out);
}

// Devuelve el objeto, o null si el mensaje esta alterado, es de otra clave o no es nuestro
export async function open(key, str) {
  try {
    const raw = unb64(str);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12));
    return JSON.parse(dec.decode(pt));
  } catch {
    return null;
  }
}
