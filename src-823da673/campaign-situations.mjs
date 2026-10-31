// Presentation acknowledgements only. No rule, resource or random-state effects.
export const SITUATION_TYPES=Object.freeze(['FIRST_CAPTURE','FIRST_CITY_LOST','ARMY_DESTROYED','CRISIS_DEFEATED','LAST_CITY','ALLIANCE_FORMED']);
const keys=['id','type','turn','factionId'].sort().join(',');
const eventId=(factionId,type)=>`SITUATION:${factionId}:${type}`;
export function initializeSituations(s){
 s.situationBarks??={version:1,seenEvents:[],usedLineIds:[]};
 s.situationEvents??=[];
 return s;
}
export function recordSituationEvent(s,type,factionId){
 if(factionId!==s.playerFactionId)return;
 if(!SITUATION_TYPES.includes(type))throw Error('INVALID_SITUATION_TYPE');
 initializeSituations(s);
 const id=eventId(factionId,type);
 if(!s.situationEvents.some(e=>e.id===id))s.situationEvents.push({id,type,turn:s.turn,factionId});
}
export function situationEventsView(s,factionId=s.playerFactionId){
 if(factionId!==s.playerFactionId)return [];
 return (s.situationEvents??[]).filter(e=>e.factionId===factionId&&!s.situationBarks?.seenEvents.includes(e.id)).map(e=>({...e}));
}
export function markSituationLine(s,{eventId:id,lineId}){
 const e=(s.situationEvents??[]).find(e=>e.id===id&&e.factionId===s.playerFactionId);
 if(!e||typeof lineId!=='string'||!lineId.trim()||lineId.length>512)throw Error('INVALID_SITUATION_LINE');
 initializeSituations(s);const ledger=s.situationBarks;
 if(ledger.seenEvents.includes(id)||ledger.usedLineIds.includes(lineId))throw Error('SITUATION_ALREADY_USED');
 ledger.seenEvents.push(id);ledger.usedLineIds.push(lineId);
}
export function validateSituations(s){
 const l=s.situationBarks,events=s.situationEvents;
 if(l===undefined&&events===undefined)return;
 const fail=()=>{throw Error('INVALID_SITUATION_LEDGER');};
 const strings=a=>Array.isArray(a)&&new Set(a).size===a.length&&a.every(x=>typeof x==='string'&&x.trim()&&x.length<=512);
 if(!l||Object.keys(l).sort().join(',')!=='seenEvents,usedLineIds,version'||l.version!==1||!strings(l.seenEvents)||!strings(l.usedLineIds)||l.seenEvents.length!==l.usedLineIds.length||!Array.isArray(events)||events.length>SITUATION_TYPES.length||new Set(events.map(e=>e?.id)).size!==events.length)fail();
 for(const e of events)if(!e||Object.keys(e).sort().join(',')!==keys||!SITUATION_TYPES.includes(e.type)||e.factionId!==s.playerFactionId||e.id!==eventId(e.factionId,e.type)||!Number.isSafeInteger(e.turn)||e.turn<1||e.turn>s.turn)fail();
 if(l.seenEvents.some(id=>!events.some(e=>e.id===id)))fail();
}
