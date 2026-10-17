// FIRST3 I2 line-of-sight rules. This module is independent from the I1 core.
const DIRECTIONS=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
const EXPECTED={width:18,height:14,tiles:252,edges:693};
const EPS=1e-9;
const geometryInternals=new WeakMap();
const rulesInternals=new WeakMap();

function dataError(code,id){
  const error=new Error(`DATA_VALIDATION_ERROR:${code}${id===undefined?'':`:${id}`}`);
  error.code='DATA_VALIDATION_ERROR';
  error.detailCode=code;
  if(id!==undefined)error.itemId=String(id);
  return error;
}
function fail(code,id){throw dataError(code,id);}
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const coordId=([q,r])=>`${q},${r}`;
const parseId=id=>{
  if(typeof id!=='string'||!/^\-?\d+,\-?\d+$/.test(id))return null;
  const [q,r]=id.split(',').map(Number);
  return Number.isSafeInteger(q)&&Number.isSafeInteger(r)?[q,r]:null;
};
const compareCoord=(a,b)=>a[0]-b[0]||a[1]-b[1];
const canonicalEdgeId=(a,b)=>compareCoord(a,b)<=0?`${coordId(a)}|${coordId(b)}`:`${coordId(b)}|${coordId(a)}`;
const hexDistance=(a,b)=>(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[0]+a[1]-b[0]-b[1]))/2;
const sorted=(items)=>[...items].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function fingerprint(value){
  let hash=0x811c9dc5;
  for(const char of stable(value))hash=Math.imul(hash^char.charCodeAt(0),0x01000193)>>>0;
  return hash.toString(16).padStart(8,'0');
}
function readonlyLookup(source){
  const values=new Map(source);
  return Object.freeze({
    size:values.size,
    has:id=>values.has(id),
    get:id=>values.get(id),
    entries:()=>Object.freeze([...values.entries()].map(([id,value])=>Object.freeze([id,value])))
  });
}
function center([q,r]){return {x:Math.sqrt(3)*(q+r/2),y:1.5*r};}
function polygon(at){
  const c=center(at),points=[];
  for(let index=0;index<6;index++){
    const angle=(30+60*index)*Math.PI/180;
    points.push({x:c.x+Math.cos(angle),y:c.y+Math.sin(angle)});
  }
  return points;
}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function onSegment(a,b,p){
  return Math.abs(cross(a,b,p))<=EPS&&p.x>=Math.min(a.x,b.x)-EPS&&p.x<=Math.max(a.x,b.x)+EPS&&p.y>=Math.min(a.y,b.y)-EPS&&p.y<=Math.max(a.y,b.y)+EPS;
}
function segmentsIntersect(a,b,c,d){
  const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
  if(((abC>EPS&&abD< -EPS)||(abC< -EPS&&abD>EPS))&&((cdA>EPS&&cdB< -EPS)||(cdA< -EPS&&cdB>EPS)))return true;
  return (Math.abs(abC)<=EPS&&onSegment(a,b,c))||(Math.abs(abD)<=EPS&&onSegment(a,b,d))||(Math.abs(cdA)<=EPS&&onSegment(c,d,a))||(Math.abs(cdB)<=EPS&&onSegment(c,d,b));
}
function pointInPolygon(point,points){
  let sign=0;
  for(let index=0;index<points.length;index++){
    const value=cross(points[index],points[(index+1)%points.length],point);
    if(Math.abs(value)<=EPS)continue;
    const next=Math.sign(value);
    if(sign&&next!==sign)return false;
    sign=next;
  }
  return true;
}
function segmentTouchesPolygon(a,b,points){
  if(pointInPolygon(a,points)||pointInPolygon(b,points))return true;
  for(let index=0;index<points.length;index++)if(segmentsIntersect(a,b,points[index],points[(index+1)%points.length]))return true;
  return false;
}
function matchingEdge(aPoints,bPoints){
  const shared=[];
  for(const a of aPoints)for(const b of bPoints)if((a.x-b.x)**2+(a.y-b.y)**2<=EPS**2){shared.push(a);break;}
  if(shared.length!==2)fail('GEOMETRY_EDGE_MISMATCH');
  return shared;
}
function positiveCollinearOverlap(a,b,c,d){
  const dx=b.x-a.x,dy=b.y-a.y,lengthSquared=dx*dx+dy*dy;
  if(lengthSquared<=EPS)return false;
  const scale=Math.sqrt(lengthSquared);
  if(Math.abs(cross(a,b,c))>EPS*scale||Math.abs(cross(a,b,d))>EPS*scale)return false;
  const tc=((c.x-a.x)*dx+(c.y-a.y)*dy)/lengthSquared;
  const td=((d.x-a.x)*dx+(d.y-a.y)*dy)/lengthSquared;
  return Math.min(1,Math.max(tc,td))-Math.max(0,Math.min(tc,td))>EPS;
}
function validateMap(map){
  if(!object(map)||map.width!==EXPECTED.width||map.height!==EXPECTED.height)fail('BOARD_MISMATCH');
  if(!Array.isArray(map.tiles))fail('SOURCE_TILES_REQUIRED');
  const coords=new Map();
  for(const tile of map.tiles){
    if(!object(tile)||!Array.isArray(tile.at)||tile.at.length!==2||!tile.at.every(Number.isSafeInteger))fail('INVALID_SOURCE_TILE');
    const id=coordId(tile.at);
    if(coords.has(id))fail('DUPLICATE_SOURCE_TILE',id);
    if(tile.at[0]<0||tile.at[0]>=map.width||tile.at[1]<0||tile.at[1]>=map.height)fail('SOURCE_TILE_OUT_OF_BOARD',id);
    coords.set(id,Object.freeze({at:Object.freeze([...tile.at]),terrainType:tile.type,polygon:Object.freeze(polygon(tile.at).map(Object.freeze))}));
  }
  if(coords.size!==EXPECTED.tiles)fail('SOURCE_TILE_COUNT',coords.size);
  const edges=new Map();
  for(const [id,record] of coords)for(const [dq,dr] of DIRECTIONS){
    const other=[record.at[0]+dq,record.at[1]+dr],otherId=coordId(other);
    if(!coords.has(otherId))continue;
    const edgeId=canonicalEdgeId(record.at,other);
    if(edges.has(edgeId))continue;
    const boundary=matchingEdge(record.polygon,coords.get(otherId).polygon);
    edges.set(edgeId,Object.freeze({a:id,b:otherId,boundary:Object.freeze(boundary.map(Object.freeze))}));
  }
  if(edges.size!==EXPECTED.edges)fail('SOURCE_EDGE_COUNT',edges.size);
  return {coords,edges};
}
function createGeometry(coords,edges){
  const geometry=Object.freeze({
    width:EXPECTED.width,
    height:EXPECTED.height,
    tileCount:coords.size,
    edgeCount:edges.size,
    hasTile:id=>coords.has(id),
    hasEdge:id=>edges.has(id),
    coordinate:id=>{
      const at=coords.get(id)?.at;
      return at?Object.freeze({q:at[0],r:at[1]}):undefined;
    }
  });
  geometryInternals.set(geometry,{coords,edges});
  return geometry;
}
function checkSummary(manifest,tileValues,edgeValues){
  const trueTileIds=sorted([...tileValues].filter(([,value])=>value).map(([id])=>id));
  const trueEdgeIds=sorted([...edgeValues].filter(([,value])=>value).map(([id])=>id));
  const summary=manifest.summary;
  if(!object(summary)||summary.tileCount!==EXPECTED.tiles||summary.edgeCount!==EXPECTED.edges||summary.blockingTileCount!==trueTileIds.length||summary.blockingEdgeCount!==trueEdgeIds.length)fail('SUMMARY_MISMATCH');
  if(stable(sorted(summary.trueTileIds??[]))!==stable(trueTileIds)||stable(sorted(summary.trueEdgeIds??[]))!==stable(trueEdgeIds))fail('SUMMARY_MISMATCH');
}
export function loadCanonicalLosRules({manifest,map}={}){
  if(!object(manifest))fail('UNSUPPORTED_SCHEMA');
  if(manifest.status!=='approved_first3_trial')fail('INACTIVE_MANIFEST');
  if(manifest.schema!=='first3-los-canonical-v1'||manifest.version!==1)fail('UNSUPPORTED_SCHEMA');
  if(manifest.contentPolicy?.runtimeInferenceForbidden!==true)fail('RUNTIME_INFERENCE_NOT_FORBIDDEN');
  if(manifest.board?.width!==EXPECTED.width||manifest.board?.height!==EXPECTED.height||manifest.board?.coordinateSystem!=='axial q,r')fail('BOARD_MISMATCH');
  const {coords,edges}=validateMap(map);
  if(!Array.isArray(manifest.tiles))fail('TILES_REQUIRED');
  if(!Array.isArray(manifest.edges))fail('EDGES_REQUIRED');
  const tileValues=new Map();
  for(const tile of manifest.tiles){
    if(!object(tile)||typeof tile.tileId!=='string')fail('INVALID_TILE_ID');
    if(tileValues.has(tile.tileId))fail('DUPLICATE_TILE',tile.tileId);
    if(!Array.isArray(tile.at)||tile.at.length!==2||!tile.at.every(Number.isSafeInteger)||coordId(tile.at)!==tile.tileId)fail('INVALID_TILE_COORDINATE',tile.tileId);
    const source=coords.get(tile.tileId);
    if(!source)fail('EXTRA_TILE',tile.tileId);
    if(tile.terrainType!==source.terrainType)fail('TERRAIN_MISMATCH',tile.tileId);
    if(typeof tile.blocksLOS!=='boolean')fail('INVALID_TILE_BOOLEAN',tile.tileId);
    tileValues.set(tile.tileId,tile.blocksLOS);
  }
  for(const id of coords.keys())if(!tileValues.has(id))fail('MISSING_TILE',id);
  if(tileValues.size!==coords.size)fail('TILE_SET_MISMATCH');
  const edgeValues=new Map();
  for(const edge of manifest.edges){
    if(!object(edge)||typeof edge.edgeId!=='string')fail('INVALID_EDGE_ID');
    if(edgeValues.has(edge.edgeId))fail('DUPLICATE_EDGE',edge.edgeId);
    if(!Array.isArray(edge.endpoints)||edge.endpoints.length!==2||!edge.endpoints.every(at=>Array.isArray(at)&&at.length===2&&at.every(Number.isSafeInteger)))fail('INVALID_ENDPOINT',edge.edgeId);
    const [a,b]=edge.endpoints,aId=coordId(a),bId=coordId(b);
    if(!coords.has(aId)||!coords.has(bId))fail('INVALID_ENDPOINT',edge.edgeId);
    if(aId===bId||hexDistance(a,b)!==1)fail('NON_ADJACENT_EDGE',edge.edgeId);
    const expectedId=canonicalEdgeId(a,b);
    if(edge.edgeId!==expectedId)fail('NON_CANONICAL_EDGE',edge.edgeId);
    if(!edges.has(expectedId))fail('EXTRA_EDGE',edge.edgeId);
    if(typeof edge.blocksLOS!=='boolean')fail('INVALID_EDGE_BOOLEAN',edge.edgeId);
    edgeValues.set(edge.edgeId,edge.blocksLOS);
  }
  for(const id of edges.keys())if(!edgeValues.has(id))fail('MISSING_EDGE',id);
  if(edgeValues.size!==edges.size)fail('EDGE_SET_MISMATCH');
  checkSummary(manifest,tileValues,edgeValues);
  const normalized={schema:manifest.schema,version:manifest.version,status:manifest.status,board:manifest.board,tiles:sorted(tileValues.keys()).map(id=>[id,tileValues.get(id)]),edges:sorted(edgeValues.keys()).map(id=>[id,edgeValues.get(id)])};
  const manifestFingerprint=fingerprint(normalized),geometry=createGeometry(coords,edges);
  const rules=Object.freeze({
    schemaVersion:1,
    manifestFingerprint,
    geometry,
    tileBlocksLOS:readonlyLookup(tileValues),
    edgeBlocksLOS:readonlyLookup(edgeValues)
  });
  rulesInternals.set(rules,{tileValues:new Map(tileValues),edgeValues:new Map(edgeValues),geometry});
  return rules;
}
function traceGeometry(geometry,sourceTileId,targetTileId){
  const internal=geometryInternals.get(geometry);
  if(!internal)throw new TypeError('LOS geometry is required.');
  const source=internal.coords.get(sourceTileId),target=internal.coords.get(targetTileId);
  if(!source)fail('UNKNOWN_QUERY_TILE',sourceTileId);
  if(!target)fail('UNKNOWN_QUERY_TILE',targetTileId);
  const distance=hexDistance(source.at,target.at);
  if(distance===0)return {distance,layers:[[sourceTileId]],next:new Map(),commonEdges:[]};
  const a=center(source.at),b=center(target.at),eligible=new Map();
  for(const [id,record] of internal.coords){
    const from=hexDistance(source.at,record.at),to=hexDistance(record.at,target.at);
    if(from+to===distance&&segmentTouchesPolygon(a,b,record.polygon))eligible.set(id,{from,to});
  }
  const layers=Array.from({length:distance+1},()=>[]);
  for(const [id,value] of eligible)layers[value.from].push(id);
  for(const layer of layers)layer.sort((x,y)=>x.localeCompare(y,undefined,{numeric:true}));
  if(!eligible.has(sourceTileId)||!eligible.has(targetTileId))fail('GEOMETRY_TRACE_FAILED');
  const next=new Map();
  for(let depth=0;depth<distance;depth++)for(const id of layers[depth]){
    const options=[];
    for(const other of layers[depth+1]){
      const edgeId=canonicalEdgeId(internal.coords.get(id).at,internal.coords.get(other).at);
      if(internal.edges.has(edgeId))options.push(Object.freeze({tileId:other,edgeId}));
    }
    if(options.length)next.set(id,Object.freeze(options));
  }
  const commonEdges=[];
  for(const [edgeId,edge] of internal.edges)if(positiveCollinearOverlap(a,b,edge.boundary[0],edge.boundary[1]))commonEdges.push(edgeId);
  return {distance,layers,next,commonEdges:sorted(commonEdges)};
}
function combine(category,values){
  if(category==='BLOCKED'||values.some(value=>value===true))return 'BLOCKED';
  if(category==='UNKNOWN'||values.some(value=>value===undefined))return 'UNKNOWN';
  return 'OPEN';
}
function classify(geometry,tileGet,edgeGet,sourceTileId,targetTileId){
  const trace=traceGeometry(geometry,sourceTileId,targetTileId);
  if(trace.distance===0)return {status:'CLEAR',distance:0};
  let initial='OPEN';
  initial=combine(initial,trace.commonEdges.map(edgeGet));
  const states=new Map([[sourceTileId,new Set([initial])]]);
  for(let depth=0;depth<trace.distance;depth++)for(const id of trace.layers[depth]){
    const current=states.get(id);
    if(!current)continue;
    for(const step of trace.next.get(id)??[]){
      const values=[edgeGet(step.edgeId)];
      if(step.tileId!==targetTileId)values.push(tileGet(step.tileId));
      const destination=states.get(step.tileId)??new Set();
      for(const category of current)destination.add(combine(category,values));
      states.set(step.tileId,destination);
    }
  }
  const results=states.get(targetTileId);
  if(!results?.size)fail('GEOMETRY_TRACE_FAILED');
  if(results.has('OPEN'))return {status:'CLEAR',distance:trace.distance};
  if([...results].every(value=>value==='BLOCKED'))return {status:'BLOCKED',distance:trace.distance};
  return {status:'UNKNOWN',distance:trace.distance};
}
export function queryCanonicalLineOfSight(rules,{sourceTileId,targetTileId}={}){
  const internal=rulesInternals.get(rules);
  if(!internal)throw new TypeError('CanonicalLosRules are required.');
  const result=classify(internal.geometry,id=>internal.tileValues.get(id),id=>internal.edgeValues.get(id),sourceTileId,targetTileId);
  if(result.status==='UNKNOWN')fail('CANONICAL_VALUE_MISSING');
  return Object.freeze(result);
}
function validateKnownState(geometry,knownState){
  if(!object(knownState)||!object(knownState.tileBlocksLOS)||!object(knownState.edgeBlocksLOS))throw new TypeError('KnownLosState is required.');
  for(const [id,value] of Object.entries(knownState.tileBlocksLOS)){
    if(!geometry.hasTile(id))fail('UNKNOWN_KNOWN_TILE',id);
    if(typeof value!=='boolean')fail('INVALID_KNOWN_TILE_BOOLEAN',id);
  }
  for(const [id,value] of Object.entries(knownState.edgeBlocksLOS)){
    if(!geometry.hasEdge(id))fail('UNKNOWN_KNOWN_EDGE',id);
    if(typeof value!=='boolean')fail('INVALID_KNOWN_EDGE_BOOLEAN',id);
  }
}
export function queryKnownLineOfSight(geometry,knownState,{sourceTileId,targetTileId}={}){
  if(!geometryInternals.has(geometry))throw new TypeError('LOS geometry is required.');
  validateKnownState(geometry,knownState);
  return Object.freeze(classify(geometry,id=>knownState.tileBlocksLOS[id],id=>knownState.edgeBlocksLOS[id],sourceTileId,targetTileId));
}
export function createLosSaveBinding(rules){
  if(!rulesInternals.has(rules))throw new TypeError('CanonicalLosRules are required.');
  return Object.freeze({schema:'first3-los-binding-v1',version:1,manifestFingerprint:rules.manifestFingerprint});
}
export function restoreLosSaveBinding(binding,rules){
  if(!rulesInternals.has(rules))throw new TypeError('CanonicalLosRules are required.');
  if(!object(binding)||binding.schema!=='first3-los-binding-v1'||binding.version!==1||typeof binding.manifestFingerprint!=='string')fail('INVALID_SAVE_BINDING');
  if(binding.manifestFingerprint!==rules.manifestFingerprint)fail('LOS_FINGERPRINT_MISMATCH');
  return createLosSaveBinding(rules);
}
