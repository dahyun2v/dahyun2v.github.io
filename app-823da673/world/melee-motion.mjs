// C465 R2: gesture and pressure math transcribed from the supplied battle-visual.
// Public presentation units only. Distances returned as fractions of unit width.
export const MELEE_TIMING=Object.freeze({player:4200,ai:2000,reduced:480,approach:800,release:800,playerBeats:6,aiBeats:3,rankDelay:105,soldierPhase:.173,gesturePeriod:1960,pressurePeriod:6400,trail:110,spark:60});
const clamp=x=>Math.max(0,Math.min(1,x));
const clamp01=clamp,ease=n=>{const k=clamp(n);return k*k*(3-2*k);},mix=(a,b,k)=>a+(b-a)*clamp(k);
export function meleePlan({ai=false,reduced=false}={}){
 const duration=reduced?MELEE_TIMING.reduced:ai?MELEE_TIMING.ai:MELEE_TIMING.player,beats=reduced?1:ai?MELEE_TIMING.aiBeats:MELEE_TIMING.playerBeats;
 const factor=duration/MELEE_TIMING.player,approach=reduced?120:MELEE_TIMING.approach*factor,release=reduced?100:MELEE_TIMING.release*factor;
 const hits=reduced?[180]:ai?[1000,1960,2920].map(t=>t*factor):[1000,1480,1960,2440,2920,3400];
 return {duration,beats,approach,release,period:MELEE_TIMING.gesturePeriod*factor,hits};
}
export function meleeDamage(total,plan,time,{skip=false}={}){
 const count=skip?plan.beats:plan.hits.filter(t=>t<=time).length;
 return Math.floor(Math.max(0,total)*count/plan.beats);
}
export function meleeAudioEvents(plan){
 if(plan.beats===1)return [];
 const short=plan.duration/MELEE_TIMING.player;
 const events=[{at:0,name:'march',gain:.35,duration:.18},{at:0,name:'charge-rumble',gain:.15,duration:1.1*short,fade:.25},{at:0,name:'warcry',gain:.12,duration:1.4*short,fade:.35},{at:plan.approach,name:'melee',gain:.18,duration:3.2*short,fade:.45}];
 for(const [i,at] of plan.hits.entries()){
  const pan=(i%2?-.6:1)*.3,tail=i===plan.beats-1?.65:1;
  events.push({at,name:i%3===1?'blade-edge':'clash',gain:(i%3===0?.6:.48)*tail,pitch:.85+(i%4)*.09,pan,duration:.18,fade:.04},
   {at,name:'counter',gain:.4*tail,pitch:.92+(i%3)*.08,pan:-pan*.5,duration:.14,fade:.04});
 }
 return events.sort((a,b)=>a.at-b.at);
}
export function contactPressure(time,reduced=false){
 if(reduced)return {offset:0,speed:0};
 // Steps forward, a held line, then a counter-push; no drifting sine-wave.
 // Both sides share the displacement, so accepted soldier spacing is retained.
 const t=((time%6400)+6400)%6400,keys=[[0,0],[450,0],[1250,25],[2200,25],[3150,-24],[4100,-24],[4950,19],[5500,19],[6400,0]];
 const i=keys.findIndex((p,j)=>j<keys.length-1&&t>=p[0]&&t<keys[j+1][0]);
 const a=keys[Math.max(0,i)],b=keys[Math.max(0,i)+1],k=(t-a[0])/(b[0]-a[0]);
 return {offset:mix(a[1],b[1],ease(k)),speed:(b[1]-a[1])*6*k*(1-k)/(b[0]-a[0])};
}
export function combatGesture(phase,slash=false,reduced=false){
 if(reduced)return {stage:'ready',strike:false,guard:false,thrust:0,recoil:0,lean:0,bodyY:0,handX:7,handY:0,bladeAngle:-.5,trail:0,impact:0,weaponFrame:0};
 let stage='ready',thrust=0,recoil=0,lean=0,bodyY=0,handX=7,handY=0,bladeAngle=-.5,trail=0,impact=0,weaponFrame=0;
 const strike=phase>=.18&&phase<.34,guard=phase>=.53&&phase<.97;
 if(phase>=.03&&phase<.18){
  const k=ease((phase-.03)/.15);stage='windup';thrust=-4*k;lean=-.12*k;bodyY=2*k;handX=mix(7,-4,k);handY=-8*k;bladeAngle=mix(-.5,slash?-2.1:-.85,k);weaponFrame=2;
 }else if(strike){
  const k=ease((phase-.18)/.055);stage=phase<.235?'swing':'impact';thrust=mix(-4,17,k);lean=mix(-.12,.17,k);bodyY=mix(2,-2,k);handX=mix(-4,16,k);handY=mix(-8,slash?3:-2,k);bladeAngle=mix(slash?-2.1:-.85,slash?.32:-.12,k);weaponFrame=1;
  trail=phase<.31?1:0;impact=phase>=.235&&phase<.30?1:0;
 }else if(phase>=.34&&phase<.49){
  const k=ease((phase-.34)/.15);stage='recover';thrust=17*(1-k);lean=.17*(1-k);bodyY=-2*(1-k);handX=mix(16,7,k);handY=mix(slash?3:-2,0,k);bladeAngle=mix(slash?.32:-.12,-.5,k);
 }else if(guard){
  const brace=ease((phase-.53)/.1),hit=phase>=.735&&phase<.84,relax=ease((phase-.84)/.13);
  stage=hit?'block-impact':phase<.735?'brace':'guard-recover';weaponFrame=2;
  recoil=phase<.735?0:10*(1-relax);lean=-.15*(recoil/10);bodyY=2*brace+3*(recoil/10);
  handX=mix(7,15,brace)*(1-relax)+7*relax;handY=-5*brace*(1-relax);bladeAngle=mix(-.5,-1.25,brace*(1-relax));
  impact=phase>=.735&&phase<.80?1:0;
 }
 return {stage,strike,guard,thrust,recoil,lean,bodyY,handX,handY,bladeAngle,trail,impact,weaponFrame};
}

export function meleePose(time,index,rank,plan,{defending=false,reduced=false}={}){
 const active=time>=0&&time<plan.duration,front=rank===0;
 const envelope=Math.min(clamp((time-rank*MELEE_TIMING.rankDelay)/plan.approach),clamp((plan.duration-time)/plan.release));
 const localTime=time*MELEE_TIMING.player/plan.duration;
 const phase=(localTime/MELEE_TIMING.gesturePeriod+index*MELEE_TIMING.soldierPhase+(defending?.5:0))%1;
 const slash=(index+(defending?1:0))%2===0,gesture=combatGesture((phase+1)%1,slash,reduced||!active);
 const pressure=contactPressure(localTime*MELEE_TIMING.pressurePeriod/MELEE_TIMING.player-rank*MELEE_TIMING.rankDelay,reduced||!active);
 const push=pressure.offset/500*(defending?-1:1),gain=front?1:.3;
 const reach=envelope*(front?.27+push+(gesture.thrust-gesture.recoil)*.0012:.035+push*.35);
 const trailAge=(phase-.18)*MELEE_TIMING.gesturePeriod,blockAge=(phase-.735)*MELEE_TIMING.gesturePeriod;
 const stepping=active&&!reduced&&Math.abs(pressure.speed)>.008;
 return {...gesture,active,front,reach:reduced?0:reach,stroke:gesture.thrust/17,rotation:gesture.lean*180/Math.PI*gain,
  bodyY:reduced?0:(gesture.bodyY+(stepping?Math.sin(localTime/95+index*1.3)*1.4:0))*gain,
  trail:active&&front&&!reduced&&gesture.trail>0&&trailAge>=0&&trailAge<MELEE_TIMING.trail,
  spark:active&&front&&!reduced&&gesture.guard&&gesture.impact>0&&blockAge>=0&&blockAge<MELEE_TIMING.spark,
  dust:stepping?((localTime/260+index*.31)%1):null,pressure:pressure.offset,pushSpeed:pressure.speed,slash,gain,
  phase:gesture.strike?'strike':gesture.guard?'brace':gesture.stage==='recover'?'recover':'ready'};
}

// Reference app.mjs arm/blade/arc/spark drawing expressed as portable SVG paths.
// Each path is relative to a soldier's feet, before facing is mirrored.
export function meleeInkPaths(p,height=50,kind='militia'){
 const k=height/50,gain=p.gain??1,body=p.bodyY*k,shoulder=(kind==='cavalry'?-36:-30)*k+body;
 const hx=p.handX*k*gain,hy=shoulder+p.handY*k*gain,blade=(p.guard?22:24)*k;
 const bx=hx+Math.cos(p.bladeAngle)*blade,by=hy+Math.sin(p.bladeAngle)*blade;
 const arm=p.active&&p.stage!=='ready'?`M ${-3*k} ${shoulder+2*k} L ${hx*.35} ${hy+6*k} L ${hx} ${hy}`:'';
 const weapon=arm?`M ${hx} ${hy} L ${bx} ${by}`:'';
 const arc=(radius,start,end)=>{const r=radius*k;return `M ${hx+Math.cos(start)*r} ${hy+Math.sin(start)*r} A ${r} ${r} 0 0 1 ${hx+Math.cos(end)*r} ${hy+Math.sin(end)*r}`;};
 const trail=p.trail?arc(25,p.bladeAngle-.85,p.bladeAngle):'',edge=p.trail?arc(29,p.bladeAngle-1,p.bladeAngle-.1):'';
 let sparks='';if(p.spark)for(let ray=0;ray<4;ray++){const a=ray*Math.PI/2+.45;sparks+=`M ${bx+Math.cos(a)*2*k} ${by+Math.sin(a)*2*k} L ${bx+Math.cos(a)*6*k} ${by+Math.sin(a)*6*k} `;}
 let dust='';if(p.dust!==null&&p.active)for(let j=0;j<2;j++){const x=-(9+j*7+p.dust*7)*k,y=(3+j*2)*k,rx=(3+p.dust*5)*k,ry=(1.5+p.dust*2)*k;dust+=`M ${x-rx} ${y} a ${rx} ${ry} 0 1 0 ${rx*2} 0 a ${rx} ${ry} 0 1 0 ${-rx*2} 0 `;}
 return {arm,weapon,trail,edge,sparks,dust};
}
