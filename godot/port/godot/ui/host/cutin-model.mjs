// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-25) — 전법 컷인 정보(웹 world.js:734 showTacticCutIn 을 부르는 자리와 같은 판정).
// 공격 · 전법 명령 뒤 전투에 전법 이름(lastCombat.tacticName)이 있으면 { officerId, kind, art, head, title, identity, factionId, tacticKey, ai }.
// kind = 그 전법이 R 칸이거나 고유(signature)면 'R', 아니면 'E'(웹 그대로). 고도 TacticCutin 이 응답의 cutin 을 읽어 띄운다.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {ROOT, officerArt, artHead} from './hud-model.mjs';
import {factionLabel} from './audio-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, Effects, Hud] = await Promise.all([load('prototype/src/campaign-runtime.mjs'), load('prototype/src/campaign-effects.mjs'), load('prototype/app/world/hud-ink.mjs')]);

/** before = 명령 전 판 · after = 명령 뒤 판. 새 전투가 아니거나 전법이 없으면 null. */
export function cutinInfo(before, after) {
  const combat = after?.lastCombat;
  if (!combat?.tacticName || combat === before?.lastCombat) return null;
  if (before?.lastCombat && JSON.stringify(before.lastCombat) === JSON.stringify(combat)) return null;
  const a = before.armies?.[combat.attackerId] ?? after.armies?.[combat.attackerId];
  if (!a) return null;
  const card = Effects.campaignTactics(before, combat.attackerId).find((c) => c.traitId === combat.tacticId);
  const kind = card?.slot === 'R' || card?.signature ? 'R' : 'E';
  const art = officerArt(a.commanderId);
  const name = R.view(after).officers?.[a.commanderId]?.name ?? a.commanderId;
  return {officerId: a.commanderId, kind, art, head: artHead(art), title: Hud.abilityName356({name: combat.tacticName}),
    identity: [name, factionLabel(after, a.factionId)].filter(Boolean).join(' · '), factionId: a.factionId, tacticKey: combat.tacticId ?? combat.tacticName,
    ai: a.factionId !== after.playerFactionId};
}
