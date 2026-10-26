// 브라우저판 node:readline 대신 — 표준 입력 한 줄 = 워커가 받은 메시지 한 개(host-worker.mjs 가 globalThis.__sgLineSinks 로 넘김).
// node 처럼 'line' 처리가 붙기 전에 온 줄은 쌓아 두었다가 붙는 순간 차례대로 넘긴다(hud-host 는 ready 를 보낸 뒤 await 하고 나서 붙임).
export function createInterface() {
  const on = {line: [], close: []};
  const queued = [];
  const rl = {
    on(ev, fn) {
      (on[ev] ??= []).push(fn);
      if (ev === 'line' && queued.length) { const q = queued.splice(0); setTimeout(() => { for (const l of q) for (const f of on.line) f(l); }, 0); }
      return rl;
    },
    close() { for (const f of on.close) f(); },
  };
  (globalThis.__sgLineSinks ??= []).push((line) => { if (on.line.length) for (const f of on.line) f(line); else queued.push(line); });
  return rl;
}
export default {createInterface};
