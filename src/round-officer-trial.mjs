// User-approved identity connection only. All numbers/order/placement remain COMMON TRIAL.
// Identity source: docs/design-data/first3-initial-state-v1.json world.officers/armies.
import {ROUND_MULTI_FIXTURE as virtual} from './round-multi-fixture.mjs';
const identities=[
 {unitId:'U-F01-G24',officerId:'G24',name:'장료',factionId:'F01'},
 {unitId:'U-F02-G02',officerId:'G02',name:'조운',factionId:'F02'},
 {unitId:'U-F01-G07',officerId:'G07',name:'조조',factionId:'F01'},
 {unitId:'U-F02-G05',officerId:'G05',name:'유비',factionId:'F02'},
];
export const ROUND_OFFICER_TRIAL=Object.freeze({
 ...structuredClone(virtual),scenarioId:'TEST-OFFICER-2V2',version:'officer-common-trial-v1',
 statPolicy:'COMMON_TRIAL_VALUES_NOT_OFFICER_STATS',
 approval:'Sentinel_18445a1c137c8191a1e22eb6b588c0aa:identity-and-common-trial-reuse-only',
 initiativeOrder:identities.map(u=>u.unitId),
 roster:virtual.roster.map((u,i)=>({...u,...identities[i]})),
 provenance:'User-approved G24/G07 vs G02/G05 identities. Reuses virtual 2v2 counts, ordinary melee damage, order and placement. No FIRST3 HP/stats/tactics or final officer stats imported.',
});
