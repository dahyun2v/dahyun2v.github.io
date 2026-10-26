// 브라우저판 node:url 대신 — '파일 경로' = 이 사이트의 주소 경로(/...). 원래 파일 주소(import.meta.url)는 http(s) 주소.
export function fileURLToPath(u) { return decodeURIComponent(new URL(String(u)).pathname); }
export function pathToFileURL(p) { return new URL(String(p).split('/').map(encodeURIComponent).join('/'), self.location.origin); }
export default {fileURLToPath, pathToFileURL};
