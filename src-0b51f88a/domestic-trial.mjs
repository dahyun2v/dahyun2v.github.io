// Independent trial namespace. No FIRST3 runtime/tick/combat/save mutation.
export const FORMAT='sangoku-domestic-trial',VERSION=1,SCENARIO='FIRST3-DOMESTIC-SLICE-v1';
export const slotKey=faction=>`${FORMAT}:v${VERSION}:${SCENARIO}:${faction}`;
export const JOBS=Object.freeze({FOOD:'식량 관리',CIVIL:'민생 현황'});
const need=(v,m)=>{if(!v)throw Error(m);},copy=v=>structuredClone(v),obj=v=>v&&typeof v==='object'&&!Array.isArray(v),integer=v=>Number.isSafeInteger(v)&&v>=0;
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),keys=(o,expected)=>obj(o)&&Object.keys(o).sort().join('|')===[...expected].sort().join('|');
function initial(inputs,faction){
 need(inputs?.initialData?.scenarioId==='FIRST3-fixed-v1'&&inputs.initialData.status==='director_approved_fixed_test_fixture_not_balanced_campaign','INITIAL_SOURCE_REQUIRED');
 const w=inputs.initialData.world;need(Object.hasOwn(w.factions,faction),'UNKNOWN_FACTION');
 const cities=Object.fromEntries(Object.entries(w.cities).filter(([,c])=>c.ownerFactionId===faction).map(([id,c])=>[id,{cityId:id,name:c.name,population:c.population,food:c.foodStock,reserved:c.reservedResources.food,task:null}]));
 return {format:FORMAT,version:VERSION,scenario:SCENARIO,faction,revision:0,turn:1,cities,journal:[],reports:[]};
}
export const createDomestic=(inputs,faction='F01')=>initial(inputs,faction);
export function eligibility(inputs,state,cityId,officerId){
 const o=inputs.initialData.world.officers[officerId];
 if(!state.cities[cityId])return 'OWN_CITY_REQUIRED';if(!o)return 'OFFICER_MISSING';
 if(o.allegianceFactionId!==state.faction)return 'FOREIGN_OFFICER';
 if(o.lifeState!=='ALIVE'||o.conditionState!=='NORMAL'||o.captivityState!=='FREE'||o.travelState!=='STATIONARY')return 'OFFICER_UNAVAILABLE';
 if(o.locationRef?.kind!=='CITY'||o.locationRef.id!==cityId)return 'OFFICER_ABSENT';
 if(Object.values(state.cities).some(c=>c.task?.officerId===officerId&&c.cityId!==cityId))return 'OFFICER_ALREADY_ASSIGNED';
 return null;
}
function apply(state,cmd,inputs,contract){
 need(keys(cmd,['id','expectedRevision','kind','cityId','officerId','job','amount']),'INVALID_COMMAND_SHAPE');
 need(typeof cmd.id==='string'&&/^[A-Za-z0-9:_-]{1,100}$/.test(cmd.id),'INVALID_COMMAND_ID');
 need(integer(cmd.expectedRevision)&&cmd.expectedRevision===state.revision,'STALE_INPUT');
 need(['ASSIGN','CANCEL','RESERVE','TURN'].includes(cmd.kind),'UNKNOWN_COMMAND');
 const n=copy(state),city=Object.hasOwn(n.cities,cmd.cityId)?n.cities[cmd.cityId]:null;
 if(cmd.kind!=='TURN')need(city,'OWN_CITY_REQUIRED');
 if(cmd.kind==='ASSIGN'){
  need(cmd.amount===null&&Object.hasOwn(JOBS,cmd.job),'INVALID_JOB');
  need(!eligibility(inputs,n,cmd.cityId,cmd.officerId),eligibility(inputs,n,cmd.cityId,cmd.officerId));
  need(!eq(city.task,{officerId:cmd.officerId,job:cmd.job}),'DUPLICATE_ASSIGNMENT');
  city.task={officerId:cmd.officerId,job:cmd.job};if(cmd.job!=='FOOD')city.reserved=0;
 }else if(cmd.kind==='CANCEL'){
  need(cmd.officerId===null&&cmd.job===null&&cmd.amount===null,'INVALID_CANCEL');need(city.task,'NO_ASSIGNMENT');city.task=null;city.reserved=0;
 }else if(cmd.kind==='RESERVE'){
  need(cmd.officerId===null&&cmd.job===null&&integer(cmd.amount),'INVALID_RESERVE');
  need(city.task?.job==='FOOD','FOOD_MANAGER_REQUIRED');need(cmd.amount<=city.food,'INSUFFICIENT_FOOD');need(cmd.amount!==city.reserved,'UNCHANGED_RESERVE');city.reserved=cmd.amount;
 }else{
  need(cmd.cityId===null&&cmd.officerId===null&&cmd.job===null&&cmd.amount===null,'INVALID_TURN');
  need(contract?.status==='APPROVED_TRIAL','SETTLEMENT_APPROVAL_REQUIRED');
  need(contract.id==='EXISTING-FOOD-TRIAL-v1'&&contract.days===10&&contract.food===4&&contract.citizenFood===2,'UNSUPPORTED_TRIAL_CONTRACT');
  const report={turn:n.turn,contract:contract.id,cities:[]};
  for(const c of Object.values(n.cities)){
   const before=c.food,produced=contract.food,required=c.population*contract.citizenFood,available=before+produced-c.reserved;
   const consumed=Math.min(required,available),after=before+produced-consumed;
   need(Number.isFinite(after)&&after>=c.reserved,'FOOD_CONSERVATION_FAILED');
   report.cities.push({cityId:c.cityId,before,produced,required,consumed,shortage:required-consumed,reserved:c.reserved,after,officerId:c.task?.officerId??null,job:c.task?.job??null});c.food=after;
  }
  n.reports.push(report);n.turn++;
 }
 n.revision++;n.journal.push(copy(cmd));return n;
}
function replay(inputs,faction,journal,contract){
 need(Array.isArray(journal)&&journal.length<=300,'INVALID_JOURNAL');let s=initial(inputs,faction);const ids=new Set();
 for(const cmd of journal){need(!ids.has(cmd?.id),'DUPLICATE_JOURNAL_ID');ids.add(cmd.id);s=apply(s,cmd,inputs,contract);}return s;
}
export function validateDomestic(s,inputs,contract){
 need(keys(s,['format','version','scenario','faction','revision','turn','cities','journal','reports']),'INVALID_STATE_SHAPE');
 need(s.format===FORMAT&&s.version===VERSION&&s.scenario===SCENARIO,'WRONG_SCENARIO_OR_VERSION');
 need(eq(s,replay(inputs,s.faction,s.journal,contract)),'STATE_REPLAY_MISMATCH');return s;
}
export function domesticCommand(s,cmd,inputs,contract){
 validateDomestic(s,inputs,contract);const seen=s.journal.find(c=>c.id===cmd?.id);
 if(seen){need(eq(seen,cmd),'OPERATION_ID_CONFLICT');return copy(s);}
 need(s.journal.length<300,'TRIAL_COMMAND_LIMIT');return apply(s,cmd,inputs,contract);
}
export function serializeDomestic(s,inputs,contract){validateDomestic(s,inputs,contract);return JSON.stringify({format:FORMAT,version:VERSION,scenario:SCENARIO,source:inputs.initialData,faction:s.faction,journal:s.journal});}
export function deserializeDomestic(raw,inputs,contract,faction){
 need(typeof raw==='string'&&raw.length<=2_000_000,'INVALID_SAVE_LENGTH');let p;try{p=JSON.parse(raw);}catch{throw Error('INVALID_SAVE_JSON');}
 need(keys(p,['format','version','scenario','source','faction','journal'])&&p.format===FORMAT&&p.version===VERSION&&p.scenario===SCENARIO,'WRONG_SCENARIO_OR_VERSION');
 need(p.faction===faction,'WRONG_FACTION_SLOT');need(eq(p.source,inputs.initialData),'INITIAL_SOURCE_CHANGED');
 return replay(inputs,p.faction,p.journal,contract);
}
