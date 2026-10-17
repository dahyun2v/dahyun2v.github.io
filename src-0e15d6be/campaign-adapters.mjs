export const ABILITY_NAMES = Object.freeze({
  leadership: '지휘', might: '무용', intelligence: '지략', politics: '정무', charisma: '감화',
});
const ENGINE_NAMES = Object.freeze(Object.fromEntries(Object.entries(ABILITY_NAMES).map(([key, label]) => [label, key])));
import {SPECIAL_TROOPS} from './campaign-special-troops.mjs';
export const TROOP_TYPES = Object.freeze({
  ...Object.fromEntries(Object.entries(SPECIAL_TROOPS).map(([key,d])=>[key,({militia:'BT01',spear:'BT02',bow:'BT03',cavalry:'BT04'})[d.parent]])),
  militia: 'BT01', spear: 'BT02', bow: 'BT03', cavalry: 'BT04', engineer: 'BT01', mystic: 'BT03',
});

function mapped(mapping, key) {
  if (!Object.hasOwn(mapping, key)) throw new Error(`알 수 없는 매핑: ${key}`);
  return mapping[key];
}
export const abilityToDisplay = key => mapped(ABILITY_NAMES, key);
export const abilityToEngine = label => mapped(ENGINE_NAMES, label);
export const troopToCampaign = type => mapped(TROOP_TYPES, type);
export const statsToOfficerPack = stats => Object.fromEntries(Object.entries(stats).map(([key, value]) => [abilityToDisplay(key), value]));
export const statsFromOfficerPack = stats => Object.fromEntries(Object.entries(stats).map(([label, value]) => [abilityToEngine(label), value]));
