// @ts-check
// 교전 장면(기준 그림 final-battle) — 내가 건 부대 대 부대 공격이 벌어지는 1.7초 동안, 시안의 그림 위에 두 장수의 판과 병력 변화를 보여 준다.
// 전투 규칙·결과는 이미 계산돼 지도에 반영돼 있다(전투는 지도 위에서 — 정본 20 v3.5). 이것은 그 순간을 보여 주는 그림 한 장일 뿐이고, 누르면 바로 넘어간다.
// 자리는 시안을 잰 값: 적 판 = 오른쪽 위(72.5~97% × 9~30%), 아군 판 = 왼쪽 아래(1~27.5% × 72~97%), 수치 판 = 28.5% · 23.5%, 깃대 초상 = 붉은 군 (46.5%, 39%) · 청록 군 (70%, 53%).
// 2026-10-11(Codex 반박 리뷰): 공격 방향 화살(아군 쪽 61%,71% → 맞붙는 곳 53.5%,53%), 아래 명령 띠(내린 명령의 기록 — 누를 수 없다), 판의 줄 아이콘. 위 자원 띠는 HUD 것을 그대로 보이게 한다(CSS).
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const H = '/assets/ui-v3/hud/';
const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
/** @type {(() => void)|null} */ let closeNow = null;

/**
 * @param {HTMLElement} host #clash
 * @param {{ally:{name:string,face?:string,emblem?:string,pre:number,post:number,troop?:string}, foe:{name:string,face?:string,emblem?:string,pre:number,post:number,troop?:string}, counter?:boolean, attackerIsAlly?:boolean, duration?:number}} d
 */
export function showClash(host, d) {
  closeNow?.();
  const dur = d.duration ?? 1700;
  const side = (/** @type {'ally'|'foe'} */ k) => { const u = d[k], max = Math.max(1, u.pre);
    return `<div class="cl-panel cl-${k}"><i class="pic">${u.face ? `<img src="${esc(u.face)}" alt="">` : ''}</i><img class="art" src="${H}battle-${k === 'ally' ? 'ally' : 'enemy'}.png" alt="">${u.emblem ? `<img class="em" src="${esc(u.emblem)}" alt="" onerror="this.remove()">` : ''}<b class="nm">${esc(u.name)}</b><i class="bar b1"><u style="width:100%" data-to="${(u.post / max * 100).toFixed(1)}"></u><em data-from="${u.pre}" data-to="${u.post}">${fmt(u.pre)}</em></i><i class="bar b2"><u style="width:${u.pre ? 100 : 0}%"></u><em>${esc(u.troop ?? '')}</em></i></div>`; };
  const cell = (/** @type {'ally'|'foe'} */ k) => { const u = d[k], loss = Math.max(0, u.pre - u.post); return `<span class="cl-cell cl-c-${k}"><b data-from="${u.pre}" data-to="${u.post}">${fmt(u.pre)}</b><em>${loss ? `−${fmt(loss)}` : '피해 없음'}</em></span>`; };
  const flag = (/** @type {'ally'|'foe'} */ k) => d[k].face ? `<i class="cl-flag cl-f-${k}"><img class="fc" src="${esc(d[k].face)}" alt=""><img class="fr" src="${H}map-unit-frame-${k === 'ally' ? 'green' : 'red'}.png" alt=""></i>` : '';
  host.innerHTML = `<div class="cl" role="img" aria-label="${esc(d.ally.name)} 대 ${esc(d.foe.name)} 교전">
    <div class="cl-scene"></div>${flag('foe')}${flag('ally')}
    ${side('foe')}${side('ally')}
    <svg class="cl-arrow${d.attackerIsAlly === false ? ' foe' : ''}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${d.attackerIsAlly === false ? 'M42.1 31.1 L42.8 30.8 L48 43.45 L49.1 43 L49.4 47.8 L46.2 44.2 L47.3 43.75 Z' : 'M60.9 71.67 L60.2 71.93 L55.2 57.25 L54.1 57.7 L53.6 52.9 L57 56.3 L55.85 56.75 Z'}"/></svg>
    <div class="cl-order" aria-hidden="true"><img class="bar" src="${H}battle-cmd.png" alt=""><i class="ring r1"><img src="${H}icons/cmd-tactic.png" alt=""></i><i class="ring r2"><img src="${H}icons/cmd-brace.png" alt=""></i><i class="ring r3"><img src="${H}icons/u-cavalry.png" alt=""></i><b class="atk"><img src="${H}icons/cmd-attack.png" alt="">${d.attackerIsAlly === false ? '맞선다' : '공격'}</b></div>
    <div class="cl-num"><img class="art" src="${H}battle-clash.png" alt="">${cell('ally')}${cell('foe')}<small>${d.attackerIsAlly === false ? `${esc(d.foe.name)}의 공격` : `${esc(d.ally.name)}의 공격`}${d.counter ? ' · 반격' : ''}</small></div>
  </div>`;
  host.hidden = false;
  const root = /** @type {HTMLElement} */ (host.firstElementChild);
  const t0 = performance.now(); let raf = 0, done = false;
  const tick = () => {
    const t = performance.now() - t0, k = Math.max(0, Math.min(1, (t - dur * .32) / (dur * .3))), e = 1 - (1 - k) ** 3;
    for (const el of /** @type {NodeListOf<HTMLElement>} */ (root.querySelectorAll('[data-from]'))) { const a = Number(el.dataset.from), b = Number(el.dataset.to); el.textContent = fmt(a + (b - a) * e); }
    for (const el of /** @type {NodeListOf<HTMLElement>} */ (root.querySelectorAll('u[data-to]'))) el.style.width = `${100 + (Number(el.dataset.to) - 100) * e}%`;
    root.classList.toggle('hit', k > 0);
    if (!done && t < dur) raf = requestAnimationFrame(tick);
  };
  const end = () => { if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(timer); host.removeEventListener('pointerdown', end); document.removeEventListener('keydown', end, true); closeNow = null; root.classList.add('out'); setTimeout(() => { if (host.firstElementChild === root) { host.hidden = true; host.innerHTML = ''; } }, 220); };
  const timer = setTimeout(end, dur);
  host.addEventListener('pointerdown', end); document.addEventListener('keydown', end, true);
  closeNow = end; raf = requestAnimationFrame(tick);
}
