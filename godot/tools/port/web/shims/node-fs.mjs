// 브라우저판 node:fs 대신 — 읽기는 같은 사이트에서 동기 요청(워커 안이라 화면은 안 멈춤), 쓰기는 메모리에만(판 끝 기록 같은 캐시).
const written = new Map();
const cache = new Map();
function url(p) {
  const s = String(p);
  if (/^(https?|file):/.test(s)) return new URL(new URL(s).pathname, self.location.origin).href;   // URL 로 넘긴 경우(readFileSync(new URL(...)))
  return new URL(s.split('/').map(encodeURIComponent).join('/'), self.location.origin).href;
}
function fetchSync(p) {
  if (written.has(p)) return written.get(p);
  if (cache.has(p)) return cache.get(p);
  const x = new XMLHttpRequest();
  x.open('GET', p, false);
  x.send();
  const body = x.status >= 200 && x.status < 300 ? x.responseText : null;
  cache.set(p, body);
  return body;
}
function enoent(p) { const e = new Error(`ENOENT: no such file, open '${p}'`); /** @type {any} */ (e).code = 'ENOENT'; return e; }
export function readFileSync(p, _enc) { const t = fetchSync(url(p)); if (t == null) throw enoent(p); return t; }
export function existsSync(p) { return fetchSync(url(p)) != null; }
export function writeFileSync(p, data) { written.set(url(p), String(data)); }
export function mkdirSync() {}
export function readdirSync() { return []; }
export default {readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync};
