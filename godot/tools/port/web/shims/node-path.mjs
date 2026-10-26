// 브라우저판 규칙 호스트용 node:path 대신(고도 웹 판 — tools/port/web/README.md). 경로는 사이트 안 '/...' 꼴만 다룬다.
export const sep = '/';
function norm(p) {
  const abs = p.startsWith('/');
  const out = [];
  for (const part of p.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') { if (out.length && out[out.length - 1] !== '..') out.pop(); else if (!abs) out.push('..'); continue; }
    out.push(part);
  }
  return (abs ? '/' : '') + out.join('/');
}
export function resolve(...parts) {
  let p = '';
  for (const q of parts) { if (q == null || q === '') continue; p = String(q).startsWith('/') ? String(q) : (p ? p + '/' : '') + q; }
  if (!p.startsWith('/')) p = '/' + p;
  return norm(p) || '/';
}
export function join(...parts) { return norm(parts.filter((x) => x != null && x !== '').join('/')); }
export function dirname(p) { const s = norm(String(p)); const i = s.lastIndexOf('/'); return i <= 0 ? '/' : s.slice(0, i); }
export function basename(p, ext) { const b = String(p).split('/').filter(Boolean).pop() ?? ''; return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b; }
export function extname(p) { const b = basename(p); const i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; }
export default {sep, resolve, join, dirname, basename, extname};
