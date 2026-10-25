// TEST ONLY. Replace this adapter/config before any production or balance use.
export const ROUND_MAP_PILOT_CONFIG=Object.freeze({
  version:'round-map-test-v1',status:'TEST_ONLY_NOT_CANONICAL',mapSource:'/data/map.json',
  // Chat-generated PNGs may be attached later. Null means debug markers only.
  visuals:Object.freeze({background:'/assets/dev-round/map-background.png',unitImages:Object.freeze({'U-F01-G24':'/assets/dev-round/G24-marker.png','U-F02-G02':'/assets/dev-round/G02-marker.png'})}),
  arena:Object.freeze({minQ:2,maxQ:8,minR:2,maxR:5}),movementHexes:2,contactApproachHexes:1,
  controlRadius:1,frontage:3,attackCasualties:30,counterCasualties:10,approachCasualties:0,
  initiativeOrder:Object.freeze(['U-F01-G24','U-F02-G02']),
  roster:Object.freeze([
    Object.freeze({unitId:'U-F01-G24',officerId:'G24',name:'장료',factionId:'F01',controller:'PLAYER',q:3,r:3,count:100}),
    Object.freeze({unitId:'U-F02-G02',officerId:'G02',name:'조운',factionId:'F02',controller:'AI',q:7,r:3,count:80}),
  ]),
  sources:Object.freeze({
    countsDamageFrontage:'prototype/test-support/new-core-fixtures.mjs: counts100/80, attack30/counter10, contactWidth3',
    initiative:'Existing fixture a→b resolved order; NOT an ability/Initiative formula',
    movementGeometry:'User-authorized temporary axial hex adapter: movement2, approach1, control1, single-cell footprint, arena bounds',
    terrain:'Arena tiles use test-only equal movement cost; original map/terrain is displayed and never changed',
    visibility:'Both fixture units disclosed for comparison only; not a production fog-of-war rule',
    consequences:'Ordinary test melee has no extra Formation/Morale events; actual condition bridge still commits the empty resolved event set',
    unresolved:'THREATENED first Facing excluded; blocked Major CONSUME/RETAIN selectable comparison only',
    result:'Fixture battle ends when only one side has COMMANDABLE troops; not campaign/city settlement',
  }),
});
