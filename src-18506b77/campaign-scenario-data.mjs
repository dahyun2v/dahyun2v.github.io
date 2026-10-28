import flowRules from '../data/campaign-flow-v1.json' with {type:'json'};
import v1 from '../../docs/design-data/map-layout-v1.json' with {type:'json'};
import v2 from '../../docs/design-data/map-layout-v2.json' with {type:'json'};
import v3 from '../../docs/design-data/map-layout-v3-hebei.json' with {type:'json'};
import china from '../../docs/design-data/map-layout-china-v1.json' with {type:'json'};

export const DEFAULT_CAMPAIGN_RULES=Object.freeze({turnLimit:26,unificationMajorCities:3});
// China values are provisional and intentionally match v3 pending approval.
export const CAMPAIGN_SCENARIO_RULES=Object.freeze({
 v1:DEFAULT_CAMPAIGN_RULES,
 v2:Object.freeze({...DEFAULT_CAMPAIGN_RULES}),
 v3:Object.freeze({...DEFAULT_CAMPAIGN_RULES}),
 china:Object.freeze({...DEFAULT_CAMPAIGN_RULES}),
});
const FLOW_RULES=Object.freeze({turnLimit:flowRules.gameLength.turns,unificationMajorCities:flowRules.gameLength.unificationMajorCities});
export const campaignScenarioRules=state=>state?.trialRules?.flow==='v1'?FLOW_RULES:state?.china12?{turnLimit:80,unificationMajorCities:12}:CAMPAIGN_SCENARIO_RULES[typeof state==='string'?state:state?.mapId]??CAMPAIGN_SCENARIO_RULES.v1;
const layouts={v1,v2,v3,china};
const dimensions=Object.fromEntries(Object.entries(layouts).map(([id,map])=>{
 const tiles=map.tiles.filter(t=>!t.out),rs=tiles.map(t=>t.at[1]),xs=tiles.map(t=>t.at[0]+(id==='v1'?0:Math.floor(t.at[1]/2)));
 return [id,Object.freeze({tiles:tiles.length,cities:map.cities.length,minR:Math.min(...rs),maxR:Math.max(...rs),minX:Math.min(...xs),maxX:Math.max(...xs)})];
}));
export const campaignMapDimensions=id=>dimensions[id??'v1'];
