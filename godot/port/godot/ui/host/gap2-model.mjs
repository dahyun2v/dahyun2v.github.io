// Presentation adapters: reuse the web tracker, voice selector and crisis copy.
import {readFileSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {createSituationTracker} from '../../../../prototype/app/world/c207-info.mjs';
import {crisisRewardText, josa, officerMomentVoice, injuryReturnText, LEVELUP_ASSETS} from '../../../../prototype/app/world/hud-ink.mjs';
import {pendingCampaignDraft} from '../../../../prototype/src/campaign-growth.mjs';
import {CAMPAIGN_TURN_LIMIT} from '../../../../prototype/src/campaign-runtime.mjs';
import {C31_DATA} from '../../../../prototype/src/campaign-events.mjs';
import {UNIQUE_OFFICERS} from '../../../../prototype/src/campaign-rule-registry.mjs';
const json = p => JSON.parse(readFileSync(new URL('../../../../' + p, import.meta.url), 'utf8'));
const voice = json('prototype/data/officer-voice-v0.1.json');
const first = json('docs/design-data/officer-pack/redesign-50-v0.1.json');
const more = json('docs/design-data/officer-pack/trial-51-100-v0.1.json');
const memories = {...Object.fromEntries(Object.values(first.officers ?? {}).map(o => [o.id, o.memorableLine])), ...Object.fromEntries((more.officers ?? []).map(o => [o.id, o.memoryLine]))};
const names = Object.fromEntries(UNIQUE_OFFICERS.map(o => [o.id, o.name]));
export const playText = t => String(t ?? '').replace(/\s*\(C\d+[^)]*\)/g, '').replace(/Crisis\s*를/g, '위기를').replace(/Crisis/g, '위기').replace(/AI 는/g, 'AI는').replace(/(\d+)턴(이|을|은|과)?/g, (_, n, j) => n + '차례' + ({이:'가', 을:'를', 은:'는', 과:'와'}[j] ?? ''));

// Stateless snapshots expose the web queue. Godot retains the active displayed
// item across host refreshes and advances after seven seconds; only display acks
// become MARK_SITUATION_LINE commands. No campaign/ledger/RNG mutation here.
export function advisorModel(v, art, head) {
  const tracker = createSituationTracker();
  const lines = [];
  for (let b = tracker.update(v); b; b = tracker.advance()) {
    const image = art(b.speakerId);
    lines.push({...b, name: `${v.officers[b.speakerId]?.name ?? names[b.speakerId] ?? '군사'} · 군사`, art: image, head: head(image)});
  }
  return {scope: v.factionId, turn: v.turn, interval: 7, lines};
}

export function momentModel(c, units) {
  const m = officerMomentVoice(c, units, voice);
  return m ? {kind: m.kind, name: m.speaker.name, line: m.line} : null;
}

export function crisisModel(s, v, art, head) {
  const x = v.c31;
  if (!x) return null;
  // The announced crisis card uses precisely the web openCrisisCard read set;
  // it does not export the actor's private growth record or army location.
  const actor = s.officers[x.actorId], rec = s.campaignGrowth?.officers?.[x.actorId];
  const name = actor?.name ?? names[x.actorId] ?? '', resolver = s.officers[s.c31?.resolverId];
  const end = {ROUTED:'패주시켰다', ELIMINATED:'무너뜨렸다', CAPTURED:'사로잡았다', TIMEOUT:'버텨 냈다 — 8차례가 지났다'};
  const reward = crisisRewardText(C31_DATA, name), warn = playText(x.warnText);
  const resolved = !!x.resolved, timeout = x.resolved === 'TIMEOUT';
  const ownWin = resolved && !timeout && resolver?.allegianceFactionId === v.factionId;
  const factionId = actor?.allegianceFactionId;
  const factionName = s.factions[factionId]?.name ?? '';
  const rows = resolved ? [{label: timeout ? '결과' : '보상', text: timeout
    ? `${s.factions[s.c31?.factionId]?.name ?? '위기 세력'} 인망 +${C31_DATA.end.timeoutFame}. 위기 동안의 효과는 사라지고, ${josa(name + '이(가)')} 얻은 레벨·칭호·카드는 남는다.`
    : ownWin ? reward.replace('해결한 플레이어 장수', resolver.name) : resolver ? `${resolver.name}의 세력이 해결했습니다 — 우리 세력에는 해결 보상이 지급되지 않습니다` : '해결한 플레이어 장수가 없어 우리 세력에는 해결 보상이 지급되지 않습니다'}]
    : [{label:'달라지는 것', text:playText(x.type === 'RAMPAGE' ? x.warnText : C31_DATA.types.find(t => t.id === x.type)?.effect)},
      {label:'막는 법', text:'그 장수 부대를 무너뜨리거나 사로잡으면 막는다\n' + (x.turnsLeft > Math.max(0, CAMPAIGN_TURN_LIMIT - v.turn + 1) ? '그 장수 부대를 패주·소멸시키거나 사로잡으면 해결 · 시간 경과만 기다리면 이번 판이 끝날 때까지 이어집니다' : playText(C31_DATA.end.text))},
      {label:'보상', text:reward}];
  const image = art(x.actorId);
  return {key:`${x.actorId}:${x.startTurn}:${resolved ? 'end' : 'start'}`, actorId:x.actorId, name, type:x.name,
    title:resolved ? timeout ? '위기가 지나갔다' : '위기를 막았다' : '위기 인물 등장', resolved,
    warn:resolved ? `${name}의 ${x.name} — ${resolver ? josa(`${resolver.name}이(가) ${end[x.resolved] ?? '막았다'}`) : end[x.resolved] ?? '끝났다'}` : warn,
    advice:warn, turns:x.turnsLeft, rows, art:image, head:head(image), background:'assets/ui-v3/events-ink/CRISIS.webp',
    factionName, level:rec?.track?.growthStates?.[x.actorId]?.level ?? '—', memory:memories[x.actorId] ?? '', gauge:Math.round(rec?.c29?.gauge ?? 0),
    autoOpen:s.phase === 'PLAYER' && !v.pendingEvent && !pendingCampaignDraft(s) && (!resolved || (s.c31?.endTurn ?? -1) >= s.turn - 1), button:resolved ? '확인' : '알겠다'};
}

// The command payloads below are the web pendingChoice contract. The UI only
// retains a card selection; every target and effect comes from the public view.
import {existsSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {runStatusText} from '../../../../prototype/app/world/c211-run-ui.mjs';
const asset = p => existsSync(new URL('../../../../prototype/assets/ui-v3/' + p, import.meta.url)) ? 'assets/ui-v3/' + p : null;
export function choiceModel(s, v) {
  if (s.phase !== 'PLAYER' || s.gameResult || v.pendingEvent || pendingCampaignDraft(s)) return null;
  const a = v.achievements?.pending;
  if (a) return {key:`achievement:${a.achievementId}`, kind:'주요 성과', title:a.name,
    place:a.queued ? `대기 중인 성과 ${a.queued}개 더` : '', text:'보상 하나를 고르세요. 판 안에서만 유지됩니다.', turnsLeft:a.turnsLeft,
    art:asset('scenes/chronicle-bg.webp'), choices:a.cards.map(c => {
      const command = {type:'ACHIEVEMENT_CHOICE', achievementId:a.achievementId, cardId:c.cardId};
      const targets = c.targets ?? [], targetKey = c.target === 'CITY' ? 'cityId' : 'officerId';
      return {id:c.cardId, name:c.name, label:`${c.name} · ${{boost:'강화',special:'전문화',open:'개방'}[c.category] ?? ''}`, preview:c.effectLine ?? '',
        command: {...command, ...(targets.length === 1 ? {[targetKey]:targets[0].id} : {})},
        targets:targets.length > 1 ? targets.map(t => ({id:t.id, label:t.name, preview:t.effectLine ?? '', command:{...command,[targetKey]:t.id}})) : []};
    })};
  const x = v.exploration?.pending;
  if (!x) return null;
  const layer = {E01:'像 상적',E02:'傳 전적',E05:'傳 전적',E08:'史 사적',E03:'史 사적',E04:'史 사적'}[x.eventId];
  // Web v3Asset prefers the -ink sibling for the default ink/kit map.
  const scene = asset(`discovery-ink/${x.eventId}.webp`) ?? asset(`discovery/${x.eventId}.webp`);
  return {key:`explore:${x.placeId}:${x.eventId}`,kind:'흔적을 발견했습니다' + (layer ? ` · ${layer}` : ''), title:x.name ?? '빈 곳',
    place:[x.officerName,x.placeId].filter(Boolean).join(' · '),text:x.scene ?? '',turnsLeft:x.turnsLeft,
    art:scene ?? (asset('discovery-ink/unknown.webp') ?? asset('discovery/unknown.webp')), prop:scene ? null : asset(`sites/${{'성소':'shrine','은거지':'hermitage','옛 진지':'old-camp','군마 산지':'horse-ranch'}[x.placeId] ?? 'unknown'}.png`),
    choices:(x.choices ?? []).map(c => ({id:c.choiceId,label:c.text,preview:c.effectLine ?? '',targets:[],command:{type:'EXPLORE_CHOICE',placeId:x.placeId,choiceId:c.choiceId}}))};
}
export function dejaVuModel(s, v, art, head) {
  const list = [...(v.dejaVu?.recent ?? []), ...(v.injury?.recent ?? []).map(x => ({
    ...x,id:`inj:${x.kind}:${x.officerId}:${x.turn}`,name:x.kind === 'INJURED' ? '부대가 무너졌습니다 — 중상' : x.kind === 'RETURNED' ? '복귀' : x.kind,
    scene:'',label:x.kind === 'RETURNED' ? '복귀' : '부상',foot:x.kind === 'RETURNED' ? '군주와 친밀도 +5 · 경험치 +10' : injuryReturnText(v.turn,v.officers[x.officerId]?.injury)
  }))];
  return {scope:v.factionId,turn:v.turn,busy:s.phase !== 'PLAYER' || !!v.pendingEvent || !!pendingCampaignDraft(s) || !!s.gameResult,
    recent:list.map(x => ({...x,officerName:x.officerName ?? v.officers[x.officerId]?.name ?? '',label:x.label ?? '기시감',
      foot:x.foot ?? `전생의 기억 조각 · 경험치 +${Number(x.xp) || 15}`,art:art(x.officerId),head:head(art(x.officerId))}))};
}
export function runModel(s,v,art,head) {
  const offered = s.phase === 'PLAYER' && !s.gameResult && !v.ambition?.canChoose ? v.blessing?.offered ?? [] : [];
  const blessing = offered.length ? {key:`${v.factionId}:${v.turn}:${offered.map(b=>b.id).join(',')}`, title:v.blessing.title,
    background:LEVELUP_ASSETS.background.replace(/^\//,''), cards:offered.map(b => {
      const key = {CARRIED_FOOD_MAX:'grain',SIGHT_BONUS:'banner',FREE_UNIQUE_FACILITY:'seal'}[b.effect.type];
      return {...b,art:(key ? LEVELUP_ASSETS.art[key] : art(b.officerId))?.replace(/^\//,''),head:head(art(b.officerId))};
    })} : null;
  const memory = v.rewind?.last?.turn === v.turn ? v.rewind.last : null;
  return {status:runStatusText(v),blessing,rewind:{...v.rewind,available:!!v.rewind?.available && s.phase === 'PLAYER' && !s.gameResult && !blessing},
    memory:memory ? {...memory,name:v.officers[memory.officerId]?.name ?? '장수',art:art(memory.officerId),head:head(art(memory.officerId))} : null};
}

import {ambitionScreenOffer, ambitionArt, campaignHorizonText, noFieldArmyText, particle} from '../../../../prototype/app/world/hud-ink.mjs';
import {AMBITIONS} from '../../../../prototype/src/campaign-ambitions.mjs';
import {COUNCIL, COUNCIL_ADOPTION_AFFINITY, councilCandidates} from '../../../../prototype/src/campaign-council.mjs';
import {campaignDate} from '../../../../prototype/src/campaign-map-model.mjs';
export function ambitionModel(s, v, art) {
  const offer = ambitionScreenOffer(v, false, s.phase);
  const faces = Object.fromEntries(Object.keys(v.officers).map(id => [id, art(id)]));
  const status = x => x === 'ACHIEVED' ? '이룸' : x === 'FAILED' ? '닿지 못함' : '진행 중';
  const a = v.ambition?.selected;
  const bands = a ? [{key:a.id, title:`뜻 · ${a.title}`, progress:`${a.conditions.filter(c=>c.met).length}/${a.conditions.length} · ${CAMPAIGN_TURN_LIMIT}차례까지`, status:status(a.status), detail:a.conditions.map(c=>`${c.met?'✓':'✗'} ${c.text}`).join('\n')}] : [];
  for (const o of v.orders?.history ?? []) bands.push({key:`${o.id}.${o.signedTurn}`,title:`군령 · ${o.title}`,progress:`${o.progress.count}/${o.progress.target} · ${o.turnsLeft}차례`,status:status(o.status),detail:`${o.goalText}\n${o.rewardLine??''}${o.progress.violated?' · 유지 조건을 지키지 못했습니다.':''}`});
  return {scope:v.factionId,turn:v.turn,canChoose:!!v.ambition?.canChoose,chooseUntil:v.ambition?.chooseUntilTurn,bands:v.gameResult?[]:bands,
    offer:offer?{...offer,key:`${v.factionId}:${offer.key}`,rulerArt:art(v.faction.rulerId),background:LEVELUP_ASSETS.background.replace(/^\//,''),
      intro:offer.kind==='ambition'?`이번 생에는 무엇을 다르게 할 것인가 · ${v.ambition.chooseUntilTurn}차례까지 고를 수 있습니다`:`${v.orders.offer.deadline}차례 말까지 · 하나를 고르거나 이번 군령을 넘기세요`,
      choices:offer.choices.map(c=>({...c,images:ambitionArt(c,faces).map(p=>p.src?.replace(/^\//,'')),rewardText:AMBITIONS.orders.rewards[c.reward]?.label??''}))}:null};
}
export function councilModel(s,v,art,head) {
  const c=v.council;if(!c)return null;
  const name=id=>v.officers[id]?.name??'—', short=t=>campaignDate(t).split('년 ')[1]??campaignDate(t);
  const open=c.status==='OPEN'&&c.turn===v.turn&&s.phase==='PLAYER'&&!s.gameResult;
  const fx=COUNCIL.decision.fulfilled.effects,bx=COUNCIL.decision.broken.effects;
  const report=(open?c.report:[c.advisorLine??'변경은 조용합니다.']).map(l=>campaignHorizonText(l,v.turn,CAMPAIGN_TURN_LIMIT));
  const noArmy=noFieldArmyText(v);if(noArmy)report.push(noArmy);
  return {...c,open,scope:v.factionId,factionName:v.faction.name,date:campaignDate(v.turn),report,
    background:'assets/ui-v3/scenes/plate-council.webp',strategistName:name(c.strategistId),
    appointText:`첫 평정이다. 곁에서 보고하고 계책을 낼 군사를 고른다. 고르지 않으면 ${particle(name(c.strategistId))} 맡는다.`,
    appointNote:`지략 ${COUNCIL.strategist.foresight.intelligenceAtLeast} 이상이면 보고에 적의 다음 수를 짐작하는 한 줄이 붙는다.`,
    pool:(c.candidates.length?c.candidates:councilCandidates(s).slice(0,3).map(o=>o.officerId)).map(id=>({id,name:name(id),art:art(id),head:head(art(id)),stats:v.officers[id]?.baseStats??{}})),
    cast:[...new Set([c.strategistId,...c.proposals.map(p=>p.proposerId)])].filter(Boolean).slice(0,4).map(id=>({id,name:name(id),art:art(id),head:head(art(id))})),
    proposals:c.proposals.map(p=>({...p,label:COUNCIL.proposals.kinds[p.kind]?.label??p.kind,name:name(p.proposerId),what:josa(p.what),
      deadline:short(c.turn+2),facts:[['기대',josa(p.expected)],['위험',p.risk],['채택하면',`${name(p.proposerId)} · 군주와 친밀 +${COUNCIL_ADOPTION_AFFINITY}`],['지키면',`${name(p.proposerId)} 경험 +${fx.proposerExperience} · 친밀 +${fx.rulerAffinity}`],['어기면',`군주와 친밀 ${bx.rulerAffinity}`]],
      opinions:(p.opinions??[]).map(o=>({...o,name:name(o.officerId),art:art(o.officerId),label:o.officerId===p.proposerId?'제안자':o.stance==='FOR'?'찬성':'반대'}))})),
    followups:(c.resolutions??[]).filter(r=>r.status==='ACTIVE'&&['CITY_DEVELOP','RECRUIT'].includes(r.kind)).map(r=>({...r,text:r.kind==='CITY_DEVELOP'?'결의를 지키려면 그 성에서 생산을 바꾸세요.':'재야 장수는 그 성 주점에서 부를 수 있습니다.',label:r.kind==='CITY_DEVELOP'?'생산 바꾸기':'주점으로'}))};
}
import {ACHIEVEMENTS} from '../../../../prototype/src/campaign-achievements.mjs';
export function achievementRecordsModel(v) {
  return {title:'업적 기록',rows:(v.achievements?.earned??[]).map(e=>({...e,name:ACHIEVEMENTS.achievements.find(a=>a.id===e.achievementId)?.name??e.achievementId,officerName:v.officers[e.officerId]?.name??names[e.officerId]??'—'}))};
}

// B4: public presentation queries only; no live state/RNG mutations.
import {campaignCaptives, captiveRecruitmentReason, captiveActionPreview} from '../../../../prototype/src/campaign-captives.mjs';
import {occupationDisplay, occupationMethodReason, OCCUPATION_METHODS} from '../../../../prototype/src/campaign-occupation.mjs';
import {relation, socialReason} from '../../../../prototype/src/campaign-relations.mjs';
import {ritualBarkLines} from '../../../../prototype/app/world/ritual-ui.mjs';
const talks = json('docs/design-data/officer-pack/visit-talks-v0.1.json');
const visitHeads = json('prototype/assets/officer-art/cutout/heads.json').files;
const relationRules = json('docs/design-data/officer-pack/relations-v0.3.json');
const ritualBarks = json('prototype/data/ritual-barks-v0.1.json');
export function captiveModel(s,v) {
  return {title:'포로',locked:s.phase!=='PLAYER'||!!s.gameResult,rows:campaignCaptives(s).map(p=>({...p,homeName:v.diplomacy?.factions?.find(f=>f.factionId===p.homeFactionId)?.name??s.factions[p.homeFactionId]?.name??'',
    actions:[['hold','억류'],['release','무상 석방'],['recruit','조건부 등용']].map(([action,label])=>({action,label,
      reason:p.negotiating?'등용 협의 중':action==='recruit'?captiveRecruitmentReason(s,p):null,
      preview:captiveActionPreview(s,p.prisonerId,action).lines.map(playText),command:{type:'CAPTIVE_ACTION',prisonerId:p.prisonerId,action}}))}))};
}
export function occupationModel(s,v) {
  return {title:'점령 처리',locked:s.phase!=='PLAYER'||!!s.gameResult,rows:Object.values(v.ownCities).map(c=>({id:c.cityId,name:c.name,...occupationDisplay(s,c)})).filter(c=>c.stage!=='NORMAL').map(c=>({...c,
    stageName:{CAPTURED:'함락',OCCUPATION:'점령 처리',STABILIZING:'안정화'}[c.stage],
    methods:['CAPTURED','OCCUPATION'].includes(c.stage)?Object.entries(OCCUPATION_METHODS).map(([method,label])=>({method,label,
      reason:occupationMethodReason(s,s.cities[c.id],method),text:playText({conciliation:'주민 유지식량 · 1턴',military:'현역 50% 주둔 · 2턴',plunder:'재고 30% · 인망 −20 · 시설 손상 → 군정'}[method]),
      command:{type:'OCCUPATION_METHOD',cityId:c.id,method}})):[]}))};
}
export function visitModel(s,v,art,head) {
  const lord=v.social?.lordId??v.faction.rulerId;
  // Preserve the web head fractions here: integer pixel rounding changes the
  // 18%-of-screen head fit enough to move the full body several pixels.
  const preciseHead = path => {
    const e=path && visitHeads[path.split('/').pop()];
    return e ? {w:e.size[0],h:e.size[1],cx:e.head[0]*e.size[0],cy:e.head[1]*e.size[1],side:e.head[2]*e.size[0]} : head(path);
  };
  return {scope:`${v.factionId}:${s.campaignSeed}`,turn:v.turn,lordId:lord,lordArt:art(lord),lordHead:preciseHead(art(lord)),background:'assets/ui-v3/scenes/plate-visit.webp',
    officers:Object.values(v.officers).filter(o=>o.allegianceFactionId===v.factionId&&o.officerId!==lord).map(o=>{
      const id=o.officerId,r=relation(s,lord,id),own=talks.officers[id],pack=own?.lord===lord?own:talks.generic;
      const min=t=>relationRules.tiers.find(x=>x.id===t).min,tier=r.value>=min('CLOSE')?'CLOSE':r.value>=min('TRUST')?'TRUST':'NORMAL';
      const talk=pack.talks.find(t=>t.tier===tier)??pack.talks[0], fill=t=>String(t??'').replaceAll('{name}',o.name);
      return {id,name:o.name,art:art(id),head:preciseHead(art(id)),value:r.value,tier:r.tier,tierName:r.displayName,bound:fill(pack.bound),scene:fill(talk.scene),line:fill(talk.line),
        reason:s.phase!=='PLAYER'||s.gameResult?'지금은 대화할 수 없습니다':socialReason(s,{type:'VISIT',officerId:id,choice:0}),choices:talk.choices.map(c=>({...c,text:fill(c.text),reply:fill(c.reply),command:{type:'VISIT',officerId:id,choice:c.gain}}))};
    })};
}
export function ritualModel(s,v,art) {
  const scene=v.relationScene;
  return {scope:`${v.factionId}:${s.campaignSeed}`,enabled:true,busy:s.phase!=='PLAYER'||!!s.gameResult||!!v.pendingEvent||!!pendingCampaignDraft(s)||!!v.achievements?.pending||!!v.exploration?.pending,
    // Godot applies the web tracker to successive public snapshots, including exits.
    factionId:v.factionId,rulerId:v.faction.rulerId,relationScene:scene,
    officers:Object.values(v.officers).map(o=>({officerId:o.officerId,name:o.name,lifeState:o.lifeState,allegianceFactionId:o.allegianceFactionId,art:art(o.officerId)})),
    enemies:(v.diplomacy?.factions??[]).filter(f=>f.state==='WAR').map(f=>f.factionId),
    scene:scene?ritualEventModel({key:scene.officers.map(o=>o.officerId).sort().join('|'),kind:scene.tier==='RIVAL'?'rival':scene.tier==='BOUND'?'bound':'bond',officers:scene.officers,line:scene.title,
      title:scene.tier==='RIVAL'?'宿敵':({SWORN:'義兄弟',LORD:'君臣',FRIEND:'知己',BLOOD:'血緣',SPOUSE:'連理',MENTOR:'師弟'})[scene.kind]},art):null,
    generic:ritualBarks.generic};
}
export function ritualEventModel(e,art) {
  return {...e,barkKey:`ritual.${e.kind}.${e.key}`,background:`assets/ui-v3/ritual/ritual-${({bond:'bond',bound:'brother',rival:'rival',death:'fallen',betrayal:'betray',departure:'bond'})[e.kind]}.webp`,
    officers:e.officers.map(o=>({...o,art:art(o.officerId)})),lines:ritualBarkLines({...e,barkKey:`ritual.${e.kind}.${e.key}`},ritualBarks)};
}
