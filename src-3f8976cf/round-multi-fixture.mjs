// Structural harness only. Virtual units are not officer records or content approval.
import {ROUND_MAP_PILOT_CONFIG as trial} from './round-map-pilot-config.mjs';
export const ROUND_MULTI_FIXTURE=Object.freeze({
  scenarioId:'TEST-VIRTUAL-2V2',version:'multi-structure-test-v1',status:'TEST_ONLY_NOT_CANONICAL',
  arena:trial.arena,movementHexes:trial.movementHexes,contactApproachHexes:trial.contactApproachHexes,
  controlRadius:trial.controlRadius,frontage:trial.frontage,attackCasualties:trial.attackCasualties,
  counterCasualties:trial.counterCasualties,approachCasualties:trial.approachCasualties,
  initiativeOrder:['TEST-P1','TEST-A1','TEST-P2','TEST-A2'],
  roster:[
    {unitId:'TEST-P1',name:'TEST P1',factionId:'TEST-P',controller:'PLAYER',q:3,r:2,count:trial.roster[0].count},
    {unitId:'TEST-A1',name:'TEST A1',factionId:'TEST-A',controller:'AI',q:7,r:2,count:trial.roster[1].count},
    {unitId:'TEST-P2',name:'TEST P2',factionId:'TEST-P',controller:'PLAYER',q:3,r:5,count:trial.roster[0].count},
    {unitId:'TEST-A2',name:'TEST A2',factionId:'TEST-A',controller:'AI',q:7,r:5,count:trial.roster[1].count},
  ],
  objective:'LAST_COMMANDABLE_FACTION',
  aiPolicy:'TEST_NEAREST_THEN_ROSTER_ORDER',
  restrictions:'NORMAL ordinary melee only; one contact per actor; FREE approach target; no third-party approach control; no interception/facing-policy choice.',
  provenance:'Copies existing pilot movement/damage/count fixtures. Virtual placement/order tests coverage only; no real officer/troop balance or 10-minute content.',
});
