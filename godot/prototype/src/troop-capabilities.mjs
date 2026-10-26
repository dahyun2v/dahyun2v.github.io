// 40 §§0–2, 6, 13 and 22. These are the four approved functional bases,
// not historical troop names or assignments for the existing six troop strings.
import {invariant,jsonData,shape,unique,id,clone,frozen} from './contract-data.mjs';
const BASES=frozen([
  {baseTroopId:'BT01',functionalName:'FOOT_CLOSE',capabilities:['MELEE_ACCESS']},
  {baseTroopId:'BT02',functionalName:'FOOT_REACH',capabilities:['MELEE_ACCESS','REACH','PREEMPT_APPROACH']},
  {baseTroopId:'BT03',functionalName:'FOOT_RANGED',capabilities:['RANGE_ACCESS']},
  {baseTroopId:'BT04',functionalName:'MOUNTED',capabilities:['MELEE_ACCESS','MOUNTED_MOVEMENT','MOMENTUM_ACCESS']},
]);
export function getBaseTroopContracts() {return clone(BASES);}
export function validateExplicitTroopBindings(bindings,knownUnitIds) {
  jsonData(bindings);jsonData(knownUnitIds);unique(bindings,'unitId');
  invariant(Array.isArray(knownUnitIds)&&knownUnitIds.every(id)&&new Set(knownUnitIds).size===knownUnitIds.length,'INVALID_KNOWN_UNITS');
  for (const binding of bindings) {
    shape(binding,['unitId','baseTroopId','specialTroopId','sourceRef']);
    invariant(knownUnitIds.includes(binding.unitId),'UNKNOWN_BINDING_UNIT');
    invariant(BASES.some(b=>b.baseTroopId===binding.baseTroopId),'INVALID_BASE_TROOP');
    invariant(binding.specialTroopId===null || id(binding.specialTroopId),'INVALID_SPECIAL_REF');
    invariant(id(binding.sourceRef),'EXPLICIT_ASSIGNMENT_SOURCE_REQUIRED');
  }
  return bindings;
}
// Read-only migration preparation, no existing troopType/save is rewritten.
// Special metadata must come from an issued content contract, never a seed.
export function prepareTroopBindings(existingUnits,bindings,specialContracts=[]) {
  jsonData(existingUnits);unique(existingUnits,'unitId');
  validateExplicitTroopBindings(bindings,existingUnits.map(u=>u.unitId));
  jsonData(specialContracts);unique(specialContracts,'specialTroopId');
  for(const s of specialContracts) {
    shape(s,['specialTroopId','parentBaseTroopId','capabilities','sourceRef']);
    invariant(BASES.some(b=>b.baseTroopId===s.parentBaseTroopId)&&id(s.sourceRef),'INVALID_SPECIAL_CONTRACT');
    invariant(Array.isArray(s.capabilities)&&s.capabilities.every(id)&&new Set(s.capabilities).size===s.capabilities.length,'INVALID_SPECIAL_CAPABILITIES');
  }
  return existingUnits.map(unit=>{
    const binding=bindings.find(b=>b.unitId===unit.unitId);
    if(!binding)return {unitId:unit.unitId,status:'INPUT_REQUIRED',binding:null,capabilities:[]};
    const base=BASES.find(b=>b.baseTroopId===binding.baseTroopId);
    const special=specialContracts.find(s=>s.specialTroopId===binding.specialTroopId);
    invariant(binding.specialTroopId===null || special,'SPECIAL_CONTENT_CONTRACT_REQUIRED');
    invariant(!special || special.parentBaseTroopId===base.baseTroopId,'SPECIAL_PARENT_MISMATCH');
    return {unitId:unit.unitId,status:'EXPLICIT_BINDING_VALIDATED',binding:clone(binding),
      capabilities:[...new Set([...base.capabilities,...(special?.capabilities??[])])]};
  });
}
// Only the already specified basic ranged legality. Range and LOS are evaluated
// outside this function. OBSCURED does not create a hit-chance formula.
export function queryBasicRangedAccess({capabilities,contactState,inRange,los}) {
  jsonData({capabilities,contactState,inRange,los});
  invariant(Array.isArray(capabilities)&&capabilities.every(id),'INVALID_CAPABILITIES');
  invariant(['FREE','THREATENED','ENGAGED','UNKNOWN'].includes(contactState),'INVALID_CONTACT_STATE');
  invariant([true,false,'UNKNOWN'].includes(inRange)&&['CLEAR','OBSCURED','BLOCKED','UNKNOWN'].includes(los),'INVALID_RANGED_INPUT');
  if(!capabilities.includes('RANGE_ACCESS'))return {allowed:false,reason:'NO_RANGE_ACCESS'};
  if(contactState==='ENGAGED')return {allowed:false,reason:'ENGAGED_RESTRICTS_BASIC_RANGED'};
  if(inRange===false || los==='BLOCKED')return {allowed:false,reason:los==='BLOCKED'?'LOS_BLOCKED':'OUT_OF_RANGE'};
  if([contactState,inRange,los].includes('UNKNOWN'))return {allowed:'UNKNOWN',reason:'INPUT_REQUIRED'};
  return {allowed:true,reason:los==='OBSCURED'?'OBSCURED_EFFICIENCY_INPUT_REQUIRED':'CLEAR'};
}
