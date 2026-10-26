import {cityReinforcementText} from '../../../../prototype/app/world/hud-ink.mjs';
import {troopText} from '../../../../prototype/src/troop-display.mjs';
import {BUILDINGS, cityPeople, cityFacilityRoles} from '../../../../prototype/app/world/city-stage.mjs';
import {relation, relationCityOfficers, socialReason, RELATIONS} from '../../../../prototype/src/campaign-relations.mjs';
import {cityRecruitCost} from '../../../../prototype/src/campaign-policy.mjs';
import {officerArt, artHead} from './hud-model.mjs';
import {errorText} from './city-v3-model.mjs';
import {readFileSync} from '../../../../tools/port/web/shims/node-fs.mjs';
const json = path => JSON.parse(readFileSync(new URL('../../../../' + path, import.meta.url), 'utf8'));
const cutouts = json('prototype/assets/officer-art/cutout/source.json');
const portraits = Object.fromEntries([...json('prototype/assets/officer-art/provisional-old.json').officers, ...json('prototype/assets/officer-art/adopted.json').officers].map(o=>[o.officerId,o.path]));
const memoryLines = {...Object.fromEntries(Object.values(json('docs/design-data/officer-pack/redesign-50-v0.1.json').officers).filter(o=>o.memorableLine).map(o=>[o.id,o.memorableLine])), ...Object.fromEntries(json('docs/design-data/officer-pack/trial-51-100-v0.1.json').officers.filter(o=>o.memoryLine).map(o=>[o.id,o.memoryLine]))};

// Web world.js:2622-2657, 2782-2783, 2925. Owned public city only;
// permissions use engine queries, never speculative mutations of the canonical state.
// 머리 줄 산출 표기(새 내정은 곡식이 '석' 단위라 만 단위로 — 성 화면 '곡식 1.1만'과 같게)
const yieldText=(n)=>{const v=Number(n)||0,a=Math.abs(v);return (v<0?'−':'+')+(a>=10000?(a/10000).toFixed(1).replace(/\.0$/,'')+'만':Math.round(a).toLocaleString('ko-KR'));};
export function facilityModel(state, v, c) {
  if (!v.ownCities[c.cityId]) return [];
  const people = cityPeople(v, c), roles = cityFacilityRoles(state, c.cityId);
  const person = o => {
    if (!o) return null;
    const cut = officerArt(o.officerId), art = cut?.includes('/cutout/') ? cut : (portraits[o.officerId]?.replace(/^\//,'') ?? cut);
    const r = v.social && v.officers[o.officerId] ? relation(state,v.social.lordId,o.officerId) : null;
    return {id:o.officerId, name:o.name, art, head:artHead(art), wanderer:!!o.wanderer, seat:cutouts[o.officerId]?.seat?.file ? `assets/officer-art/cutout/${cutouts[o.officerId].seat.file}` : null,
      role:o.officerId===v.social?.lordId?'군주':o.officerId===(c.governorSlot?.officerId??c.governorId)?'태수':'',
      affinity:r?.value??null, relation:r?.displayName??'', stats:o.baseStats??{}};
  };
  const city = state.cities[c.cityId];
  const feastIds = v.social ? relationCityOfficers(state, city, {commanders:true}).filter(id=>v.officers[id]) : [];
  const visits = v.social ? relationCityOfficers(state, city).filter(id=>id!==v.social.lordId && v.officers[id]) : [];
  const visit = id => ({label:`찾아가기 · ${v.officers[id].name}`, command:{type:'VISIT',officerId:id,choice:1}, reason:socialReason(state,{type:'VISIT',officerId:id,choice:1}) || null});
  return Object.entries(BUILDINGS).map(([id,b])=> {
    const residents=visits.map(id=>person(v.officers[id])), governor=person(people.office);
    const guestIds=visits.filter(id=>id!==people.tavern?.officerId);
    const guest=person(v.officers[guestIds.find(id=>cutouts[id]?.seat?.file)??guestIds[0]]);
    const military={reserve:troopText(c.reserveTroops??0),wounded:troopText(c.woundedTroops??0),food:c.foodStock??null,
      nearby:Object.values(v.ownArmies).filter(a=>{const [q,r]=a.tileId.split(',').map(Number),[cq,cr]=c.tileId.split(',').map(Number);return a.troopCount>0 && Math.max(Math.abs(q-cq),Math.abs(r-cr),Math.abs(q-cq+r-cr))<=2;}).length,
      reinforcement:cityReinforcementText(c),canTransfer:Object.keys(v.ownCities).length>1};
    const who = people[id] ?? (['market','granary','workshop','gate'].includes(id)?people.office:null);
    const commands = [];
    if(id==='tavern') for(const w of c.wanderers??[]) {
      const cost=cityRecruitCost(state,c.cityId,v.factionId,w.officerId);
      const available=(v.faction.prestige??0)-(state.captiveRecruitment?.factions?.[v.factionId]?.reservedPrestige??0);
      const negotiating=Object.values(state.captiveRecruitment?.proposals??{}).some(p=>p.targetOfficerId===w.officerId&&p.status==='NEGOTIATING');
      commands.push({label:`등용 · ${w.name}`,cost:`등용 협의 1턴 · 인망 ${cost} 소모`, reason:negotiating?'이미 협의 중입니다':available<cost?errorText(`INSUFFICIENT_RECRUITMENT_PRESTIGE:${v.factionId}:required=${cost}:available=${available}`):null,command:{type:'WANDERER_RECRUIT',officerId:w.officerId,cityId:c.cityId}});
    }
    if(id==='residence') commands.push(...visits.map(visit));
    const feast = id==='tavern' && v.social ? {
      title:`성마다 한 달에 한 번 · 함께한 모든 짝 친밀도 +${RELATIONS.gains.feast.value} · 인망 ${RELATIONS.gains.feast.costPrestige} 소모`,
      people:feastIds.map(id=>person(v.officers[id])),
      // Every legal 2/3-seat choice has its engine permission; UI only selects one.
      options:feastIds.flatMap((a,i)=>feastIds.slice(i+1).flatMap((b,j)=>[[a,b],...feastIds.slice(i+j+2).map(d=>[a,b,d])])).map(ids=>({command:{type:'FEAST',cityId:c.cityId,officerIds:ids},reason:socialReason(state,{type:'FEAST',cityId:c.cityId,officerIds:ids})||null})),
      visits:feastIds.filter(id=>id!==v.social.lordId).map(visit),
      reason:v.social.feastUsed?.[c.cityId]?'이번 달 이 성의 술자리는 이미 열었습니다. 다음 달에 다시 열 수 있습니다.':feastIds.length<2?'이 성에 장수가 두 명 이상 있어야 합니다.':null
    }:null;
    const role=roles[id==='gate'?'repair':id];
    return {overview:{wall:`${c.durability??0} / ${c.durabilityMax??0}`,food:`${c.foodStock??0} / ${c.foodCapacity??0}`,reserve:troopText(c.reserveTroops??0),production:c.economyForecast?.production??0,security:c.securityName??''},residents,governor,guest,military,yields:c.economyForecast??{},yieldsText:Object.fromEntries(['food','production','science','prestige'].map(k=>[k,yieldText(c.economyForecast?.[k]??0)])),governorPolitics:people.office?.baseStats?.politics??null,id,name:b.name,hanja:b.hanja,sub:b.sub,mark:b.mark,role:role?`${role.label} · ${role.text}`:({office:'성의 일 · 인사 → 내정 운영',gate:'성벽 · 출입 → 성 방어',residence:'머무는 장수 → 방문 · 대화',tavern:'소문 · 재야 인재 → 만남 · 등용'}[id]??b.fn),officer:person(who),line:memoryLines[who?.officerId]??({tavern:'이곳엔 소문이 먼저 닿습니다.',residence:'오셨습니까.'}[id]??''),others:[people.office,people.barracks,people.tavern,people.residence].filter(o=>o&&o!==who).slice(0,3).map(o=>({name:o.name,note:BUILDINGS[Object.keys(people).find(k=>people[k]===o)]?.name??''})),bg:`assets/ui-v3/city-stage-ink/facility-${id}.webp`,route:['office','granary','market','workshop','gate'].includes(id)?'domestic':id==='barracks'?'barracks':'scene',commands,feast,lede:id==='tavern'?'떠돌이 인재와 소문이 모이는 곳. 마음 맞는 장수들과 술자리를 열 수도 있다.':id==='residence'?'장수들이 머무는 곳. 찾아가 이야기를 나눌 수 있다.':'',empty:id==='tavern'?'이 성에 재야 장수가 없습니다.':'이 성에 찾아갈 장수가 없습니다.'};
  });
}
