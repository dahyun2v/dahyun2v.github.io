// 고도 웹 판의 규칙 호스트 워커 — 데스크톱의 'node hud-host.mjs' 자식 프로세스 자리.
// 표준 출력 한 줄 = postMessage(문자열) 하나, 표준 입력 한 줄 = 받은 메시지 하나(규약 그대로 — PROTOCOL.md).
// node: 모듈은 serve.mjs · build-web.mjs 가 shims/ 로 바꿔 내보낸다(호스트 · 규칙 엔진 파일은 고치지 않음).
const hostUrl = new URL(self.location.href).searchParams.get('host');
let pending = '';
const write = (s, cb) => {
  pending += String(s);
  let i;
  while ((i = pending.indexOf('\n')) >= 0) {
    const line = pending.slice(0, i);
    pending = pending.slice(i + 1);
    if (line) postMessage(line);
  }
  if (typeof cb === 'function') cb();
  return true;
};
globalThis.process = {
  pid: 1, version: 'web', platform: 'web', env: {}, argv: ['node', decodeURIComponent(new URL(hostUrl).pathname)],
  cwd: () => '/', exit() {}, stdin: {}, stdout: {write}, stderr: {write: (s) => { console.error(String(s)); return true; }},
};
self.onmessage = (e) => { for (const f of globalThis.__sgLineSinks ?? []) f(String(e.data)); };
import(hostUrl).catch((e) => {
  console.error(e);
  postMessage(JSON.stringify({id: null, event: 'closed', message: String(e?.stack ?? e)}));
});
