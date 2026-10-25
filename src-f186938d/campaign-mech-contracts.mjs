import {cloneCampaign} from './campaign-clone.mjs';

// Code registrations are process-local; saved mechanics data belongs to the
// registering module. No registration means identity, including object identity.
export const MECH_CONTRACTS=Object.freeze(Object.fromEntries(Array.from({length:18},(_,i)=>[`H${String(i+1).padStart(2,'0')}`,i+1])));
const registrations=new Map();
let revision=0;
export const campaignMechRevision=()=>revision;
const numericBounds=new Map([
 ['H01:loss',[0,Infinity]],['H02:healAmount',[0,Infinity]],['H02:permanentLossRatio',[0,1]],
 ['H04:attackRange',[0,Infinity]],['H14:mainActionLimit',[0,Infinity]],['H14:tacticCost',[0,Infinity]],
 ['H15:formationSteps',[-Infinity,Infinity]],['H16:cityDamage',[0,Infinity]],
 ['H17:foodConsumption',[0,Infinity]],['H17:foodFactor',[0,Infinity]],['H18:combatXp',[0,Infinity]],
 ['H08:damageFactor',[0,Infinity]],['H11:structureDamage',[0,Infinity]],['H16:castleDefense',[0,Infinity]],
]);
export function hasCampaignMechQuery(contract){const entries=registrations.get(contract);if(entries)for(const entry of entries.values())if(entry.query)return true;return false;}
export function hasCampaignMechCommit(contract){const entries=registrations.get(contract);if(entries)for(const entry of entries.values())if(entry.commit)return true;return false;}
function freeze(value,seen=new Set()){
 if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);for(const v of Object.values(value))freeze(v,seen);Object.freeze(value);}return value;
}
// A fresh membrane per invocation: no state-identity cache can survive an
// in-place write by an owned transaction. Only visited containers are wrapped.
// Frozen accessor shells also support frozen source properties without Proxy
// get-invariant violations, and never expose a raw value through descriptors.
function queryView(value){
 const seen=new WeakMap();
 const deny=()=>{throw new TypeError('READ_ONLY_MECH_QUERY');};
 function wrap(source){
  if(typeof source==='function'||typeof source==='symbol')return cloneCampaign(source);
  if(!source||typeof source!=='object')return source;
  if(seen.has(source))return seen.get(source);
  const array=Array.isArray(source),proto=Object.getPrototypeOf(source);
  if(!array&&proto!==Object.prototype&&proto!==null){const copy=freeze(cloneCampaign(source));seen.set(source,copy);return copy;}
  const shell=array?new Array(source.length):{};
  const view=new Proxy(shell,{set:deny,deleteProperty:deny,defineProperty:deny,setPrototypeOf:deny});
  seen.set(source,view);
  for(const key of Object.keys(source)){
   Object.defineProperty(shell,key,{enumerable:true,configurable:false,get:()=>wrap(source[key])});
  }
  Object.freeze(shell);return view;
 }
 return wrap(value);
}
export function registerCampaignMech(contract,key,handler){
 const query=typeof handler==='function'?handler:handler?.query,commit=handler?.commit;
 const operations=handler?.operations;
 if(operations!==undefined&&(!Array.isArray(operations)||operations.some(op=>typeof op!=='string')))throw new Error('INVALID_MECH_OPERATIONS');
 if(!Object.hasOwn(MECH_CONTRACTS,contract)||typeof key!=='string'||!key||query!==undefined&&typeof query!=='function'||commit!==undefined&&typeof commit!=='function'||!query&&!commit)throw new Error('INVALID_MECH_REGISTRATION');
 const entries=registrations.get(contract)??new Map();if(entries.has(key))throw new Error('DUPLICATE_MECH_REGISTRATION');
 const entry={query,commit,operations:operations&&new Set(operations)};entries.set(key,entry);registrations.set(contract,entries);revision++;
 return ()=>{if(entries.get(key)===entry){entries.delete(key);revision++;}if(!entries.size&&registrations.get(contract)===entries)registrations.delete(contract);};
}
// Every callback is a pure plan transformer. Input is read-only; returned plans
// are detached. Commit callbacks below retain their complete frozen copies.
export function campaignMechQuery(s,contract,operation,context,value){
 const entries=registrations.get(contract);if(!entries?.size)return value;
 const handlers=[...entries.values()].filter(e=>e.query&&(!e.operations||e.operations.has(operation)));if(!handlers.length)return value;
 const input=queryView({state:s,operation,...context});
 let result=cloneCampaign(value);
 for(const {query} of handlers){
  if(!query)continue;
  const next=query(input,freeze(result));if(next!==undefined)result=cloneCampaign(next);
 }
 const bounds=numericBounds.get(`${contract}:${operation}`);
 if(bounds&&(!Number.isFinite(result)||result<bounds[0]||result>bounds[1])||contract==='H14'&&operation==='actionReason'&&result!==null&&typeof result!=='string')throw new Error('INVALID_MECH_RESULT');
 return result;
}
// A pure commit reducer returns the next complete state. The input is detached
// even when called by a forecast transaction, so shared growth cannot be spent.
// Reducers must deduplicate context.eventId in their own serializable ledger.
export function campaignMechCommit(s,contract,operation,context){
 const entries=registrations.get(contract);if(!entries?.size)return s;
 let result=s;
 for(const {commit,operations} of entries.values())if(commit&&(!operations||operations.has(operation))){
  const next=commit(freeze(cloneCampaign({state:result,operation,...context})));
  if(next!==undefined){if(!next||typeof next!=='object')throw new Error('INVALID_MECH_COMMIT');result=cloneCampaign(next);}
 }
 return result;
}
export function campaignMechAllowed(s,contract,operation,context={}){
 return campaignMechQuery(s,contract,operation,context,true)===true;
}
// Reducers at in-place engine boundaries must preserve army references retained
// by their caller. Empty registrations take the original zero-copy path.
export function campaignMechApply(s,contract,operation,context={}){
 if(!hasCampaignMechCommit(contract))return s;
 const next=campaignMechCommit(s,contract,operation,context);if(next===s)return s;
 for(const [id,a] of Object.entries(s.armies??{}))if(next.armies?.[id]){for(const key of Object.keys(a))if(!Object.hasOwn(next.armies[id],key))delete a[key];Object.assign(a,next.armies[id]);next.armies[id]=a;}
 Object.assign(s,next);return s;
}
export function campaignMechPlan(s,contract,operation,context,baseline){
 const p=campaignMechQuery(s,contract,operation,context,baseline);
 if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('INVALID_MECH_PLAN');
 if(p.budget)campaignMechBudget(s,p.budget,false);
 return p;
}
// A replacement combatant is resolved before any damage formula. It cannot
// invent an army, revive a defeated unit, or expose an unobserved substitute.
export function campaignMechCombatants(s,sourceId,targetId,kind){
 if(!hasCampaignMechQuery('H03'))return {sourceId,targetId};
 const p=campaignMechPlan(s,'H03','combatants',{sourceId,targetId,kind},{sourceId,targetId});
 if(p.sourceId===sourceId&&p.targetId===targetId&&!p.budget)return p;
 if(s.armies[p.sourceId]?.factionId!==s.armies[sourceId]?.factionId||s.armies[p.targetId]?.factionId!==s.armies[targetId]?.factionId)throw new Error('INVALID_MECH_COMBATANT_FACTION');
 for(const id of [p.sourceId,p.targetId]){
  const a=s.armies[id];if(!a||a.hp<=0||a.troopCount<=0||a.morale==='ROUTING')throw new Error('INVALID_MECH_COMBATANT');
  if(id!==sourceId&&id!==targetId&&a.factionId!==s.armies[sourceId].factionId&&s.knowledge[s.armies[sourceId].factionId]?.tiles[a.tileId]!=='VISIBLE')throw new Error('HIDDEN_MECH_COMBATANT');
 }
 return p;
}
// One loss policy signature for normal/Q/tactic/reaction/environment adapters.
// Stage order and finite spending are owned by the registered mechanism; this
// empty engine entry does not invent shields, personnel, tokens or save fields.
export function campaignMechLossPlan(s,sourceId,targetId,loss,context={}){
 const value=campaignMechQuery(s,'H01','loss',{sourceId,targetId,...context},loss);
 if(value!==loss)loss=Math.min(s.armies[targetId]?.troopCount??Infinity,Math.round(value));
 if(!Number.isFinite(value)||value<0)throw new Error('INVALID_MECH_LOSS');
 return campaignMechShieldPlan(s,targetId,loss);
}
export function campaignMechShieldPlan(s,targetId,loss){
 const shields=[];let remaining=loss;
 for(const row of s.mechContracts?.shields?.[targetId]??[]){const amount=Math.min(remaining,row.amount);if(amount>0){shields.push({source:row.source,amount});remaining-=amount;}}
 return {targetId,loss:remaining,shields};
}

export function campaignMechPublicArmy(s,id,viewerFactionId){
 if(!hasCampaignMechQuery('H13'))return {};
 const p=campaignMechQuery(s,'H13','armyDisplay',{targetId:id,viewerFactionId},{});
 if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('INVALID_MECH_PUBLIC_ARMY');
 const out={};
 for(const [key,value] of Object.entries(p)){
  if(['signatureGauge','tacticCost','troopCount'].includes(key)&&Number.isFinite(value)&&value>=0)out[key]=value;
  else if(key==='combatExcluded'&&typeof value==='boolean')out[key]=value;
  else if(key==='statusLabel'&&typeof value==='string'&&value.length<=80)out[key]=value;
  else throw new Error('INVALID_MECH_PUBLIC_ARMY');
 }
 return out;
}

// A cast's power is a detached read snapshot, never a replacement of the live
// army/personnel ledger. It is removed before the cast transaction is returned.
export function campaignMechPowerWorld(s,id){
 const p=s.mechTacticContext;if(p?.sourceId!==id)return s;
 return {...s,armies:{...s.armies,[id]:{...s.armies[id],...p.snapshot}}};
}
export function campaignMechPowerFactor(s,kind,sourceId=s.mechTacticContext?.sourceId){
 const p=s.mechTacticContext;return p&&p.sourceId===sourceId?p[`${kind}Factor`]??1:1;
}

export function campaignMechRemoveStatuses(s,id,predicate,reason,sourceId=null){
 const a=s.armies[id],removed=[];
 a.effectStates=(a.effectStates??[]).filter((effect,index)=>{
  if(!predicate(effect)||!campaignMechAllowed(s,'H15','removeStatus',{sourceId,targetId:id,effect,reason}))return true;
  removed.push({effect,index});return false;
 });
 if(removed.length&&hasCampaignMechCommit('H15')){
  s.mechContracts??={spent:{}};const sequence=s.mechContracts.statusSequence=(s.mechContracts.statusSequence??0)+1;
  campaignMechApply(s,'H15','statusRemoved',{eventId:`STATUS.${s.turn}.${sequence}`,sourceId,targetId:id,reason,removed});
 }
 return removed;
}

export function campaignMechBudget(s,budget,consume=true){
 if(!budget)return;
 if(typeof budget.key!=='string'||!budget.key||!Number.isSafeInteger(budget.uses)||budget.uses<1||!Number.isSafeInteger(budget.expires)||budget.expires<s.turn||budget.generation!==0||(s.mechContracts?.reactionSpent?.[budget.key]??0)>=budget.uses)throw new Error('INVALID_MECH_REACTION_BUDGET');
 if(consume){s.mechContracts??={spent:{}};s.mechContracts.reactionSpent??={};s.mechContracts.reactionSpent[budget.key]=(s.mechContracts.reactionSpent[budget.key]??0)+1;}
}

export function campaignMechStatus(s,sourceId,targetId,effect){
 if(!hasCampaignMechQuery('H15'))return effect;
 const p=campaignMechPlan(s,'H15','statusPlan',{sourceId,targetId,effect},{effect,replace:[]});
 if(!p.effect||p.effect.op!=='STATUS_APPLY'||p.effect.source!==effect.source||typeof p.effect.status!=='string'||!Array.isArray(p.replace)||p.replace.some(x=>typeof x!=='string'))throw new Error('INVALID_MECH_STATUS_PLAN');
 if(p.replace.length)campaignMechRemoveStatuses(s,targetId,e=>p.replace.includes(e.status),'REPLACED',sourceId);
 return p.effect;
}

export function campaignMechLoss(s,sourceId,targetId,loss,context={}){return campaignMechLossPlan(s,sourceId,targetId,loss,context).loss;}
// Sharing is evaluated once from settled primary losses. Rows retain provenance;
// a handler cannot recursively feed its output back into this generation.
export function campaignMechSharedLossRows(s,rows){
 const roots=rows.filter(r=>r.loss>0&&!r.generation);
 const shared=campaignMechQuery(s,'H01','sharedLossRows',{rows:roots},[]);
 if(!Array.isArray(shared))throw Error('INVALID_MECH_SHARED_LOSS');
 for(const r of shared){const root=roots.find(p=>p.targetId===r.originalTargetId&&p.sourceId===r.originalSourceId);
  if(!root||r.generation!==1||!s.armies[r.targetId]||r.targetId===r.originalTargetId||!Number.isSafeInteger(r.loss)||r.loss<0||r.loss>root.loss)throw Error('INVALID_MECH_SHARED_LOSS');
 }
 return shared;
}
export function campaignMechShareSettlement(s,units,context={}){
 if(s.mechContracts?.sharedLossEvents?.[context.eventId])return;
 const rows=campaignMechSharedLossRows(s,units.map(u=>({sourceId:u.unitId===context.sourceId?context.targetId:context.sourceId,targetId:u.unitId,loss:u.casualties})));
 for(const row of rows){const a=s.armies[row.targetId];if(a.troopCount<=0)continue;
  let unit=units.find(u=>u.unitId===row.targetId);if(!unit){unit={unitId:row.targetId,preBattleCount:a.troopCount,postBattleCount:a.troopCount,casualties:0,unitState:'COMMANDABLE'};units.push(unit);}
  const p=campaignMechLossPlan(s,row.originalSourceId,row.targetId,Math.min(unit.postBattleCount,row.loss),{kind:'SHARED',generation:1});campaignMechSpendShields(s,[p]);
  const loss=Math.min(unit.postBattleCount,p.loss);unit.postBattleCount-=loss;unit.casualties+=loss;unit.unitState=unit.postBattleCount?'COMMANDABLE':'ELIMINATED';
  s.mechContracts??={spent:{}};s.mechContracts.sharedLossEvents??={};(s.mechContracts.sharedLossEvents[context.eventId]??=[]).push({...row,loss});
 }
}
export const MECH_LOSS_KINDS=Object.freeze(['DIRECT','DOT']);
export function campaignMechLossKind(s,sourceId,kind,lossKind=kind==='DOT'?'DOT':'DIRECT'){
 const value=campaignMechQuery(s,'H01','lossKind',{sourceId,kind},lossKind);
 if(!MECH_LOSS_KINDS.includes(value))throw Error('INVALID_MECH_LOSS_KIND');return value;
}
// Explicit, serializable source ledger. Preview plans never spend it.
export function campaignMechShield(s,sourceId,targetId,amount,eventId){
 if(!s.armies[sourceId]||!s.armies[targetId]||!Number.isSafeInteger(amount)||amount<0||typeof eventId!=='string'||!eventId)throw Error('INVALID_MECH_SHIELD');
 s.mechContracts??={spent:{}};const m=s.mechContracts;m.shieldEvents??={};if(m.shieldEvents[eventId])return s;
 m.shieldEvents[eventId]=true;m.shields??={};const rows=m.shields[targetId]??=[];
 rows.push({source:eventId,sourceId,amount,factionId:s.armies[targetId].factionId});return s;
}
export function campaignMechSpendShields(s,plans){
 for(const p of plans??[])for(const used of p?.shields??[]){const row=s.mechContracts?.shields?.[p.targetId]?.find(r=>r.source===used.source);if(!row||row.amount<used.amount)throw Error('INVALID_MECH_SHIELD_SPEND');row.amount-=used.amount;}
}
export function campaignMechShieldAmount(s,id){return (s.mechContracts?.shields?.[id]??[]).reduce((n,r)=>n+r.amount,0);}
export function campaignMechStartFaction(s,factionId){
 for(const [id,rows] of Object.entries(s.mechContracts?.shields??{})){s.mechContracts.shields[id]=rows.filter(r=>r.factionId!==factionId);if(!s.mechContracts.shields[id].length)delete s.mechContracts.shields[id];}
}

export function validateCampaignMech(s){
 const m=s.mechContracts;if(!m)return;
 for(const [id,rows] of Object.entries(m.shields??{})){
  if(!s.armies[id]||!Array.isArray(rows)||new Set(rows.map(r=>r.source)).size!==rows.length||rows.some(r=>typeof r.source!=='string'||!r.source||!s.armies[r.sourceId]||!s.factions[r.factionId]||!Number.isSafeInteger(r.amount)||r.amount<0))throw Error('INVALID_MECH_SHIELD_LEDGER');
 }
}
