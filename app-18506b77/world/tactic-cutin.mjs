// Presentation only: public card classification and existing artwork.
export function cutinTiming444({kind='R',repeated=false,ai=false,speed='normal',reduced=false,off=false}={}){
 const parts=off||ai&&speed==='instant'?[0,0,0]:reduced?[0,kind==='E'?180:300,0]:kind==='E'?[60,200,100]:repeated||ai&&speed==='fast'?[80,220,100]:[120,520,160];
 return {enter:parts[0],hold:parts[1],exit:parts[2],total:parts.reduce((a,b)=>a+b,0),reduced};
}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Positions are relative to each original canvas. Never mirror the portrait.
export const cutinCrops444={G06:{x:50,y:0,scale:1.42},G01:{x:44,y:24,scale:1.5}};
// R4: source-art weapon regions. Presentation metadata only; original alpha is untouched.
const weaponRegions444={G06:[[.22,.33,1,.65]],G01:[[.74,.18,1,.49]],G56:[[0,.44,.19,.85],[.75,.43,1,.9]]};
export function cutinRPortraitPlan444(head,officerId){
 if(!head?.size||!head?.head)return null;
 const [w,h]=head.size,[hx,hy,hs]=head.head,cx=hx*w,cy=hy*h,side=hs*w;
 if(!(w>0&&h>0&&side>0))return null;
 const weapons=(weaponRegions444[officerId]??[]).map(([x0,y0,x1,y1])=>({x:x0*w,y:y0*h,width:(x1-x0)*w,height:(y1-y0)*h}));
 let scale=Math.min(180/side,1392/w);
 for(const r of weapons){if(r.y<cy)scale=Math.min(scale,200/(cy-r.y));if(r.y+r.height>cy)scale=Math.min(scale,544/(r.y+r.height-cy));}
 let x=420-cx*scale;const y=224-cy*scale;
 // Keep the weapon's visible ends out from under the DOM title (stage y329..463).
 for(const r of weapons){const top=y+r.y*scale,bottom=top+r.height*scale,right=x+(r.x+r.width)*scale;
  if(top<463&&bottom>329&&right>818)x-=right-802;
 }
 const project=r=>({x:x+r.x*scale,y:y+r.y*scale,width:r.width*scale,height:r.height*scale});
 const face=project({x:cx-side*.62,y:cy-side*.62,width:side*1.24,height:side*1.24});
 return {image:{x,y,width:w*scale,height:h*scale},face,weapons:weapons.map(project),scale,headSize:side*scale,feather:{padding:24,sigma:6}};
}
export function cutinRMaskAlpha444(plan,x,y){
 if([plan.face,...plan.weapons].some(r=>x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height))return 1;
 let alpha=Math.min(1,Math.max(0,x/48))*Math.min(1,Math.max(0,y/32),Math.max(0,(816-y)/196));
 const erf=z=>{const sign=z<0?-1:1,a=Math.abs(z),t=1/(1+.3275911*a);return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a));};
 const {padding:p,sigma}=plan.feather,d=sigma*Math.SQRT2;
 for(const r of [plan.face,...plan.weapons]){
  const fx=.5*(erf((x-r.x+p)/d)-erf((x-r.x-r.width-p)/d)),fy=.5*(erf((y-r.y+p)/d)-erf((y-r.y-r.height-p)/d));
  alpha+=fx*fy*(1-alpha);
 }
 return alpha;
}
export function cutinRPortraitHtml444(art,head,officerId){
 const plan=cutinRPortraitPlan444(head,officerId);
 if(!plan)return `<img class="c444-r-fallback" src="${escape(art)}" alt="">`;
 const prefix='c444-r-'+String(officerId).replace(/[^\w-]/g,''),i=plan.image;
 const rect=r=>`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="white"/>`;
 const protect=r=>`<rect x="${r.x-24}" y="${r.y-24}" width="${r.width+48}" height="${r.height+48}" fill="white" filter="url(#${prefix}-feather)"/>${rect(r)}`;
 return `<svg class="c444-r-art" viewBox="0 0 1440 816" aria-hidden="true"><defs><filter id="${prefix}-feather" x="-48" y="-48" width="1536" height="912" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="6"/></filter><linearGradient id="${prefix}-vertical" x1="0" y1="0" x2="0" y2="816" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset="${32/816}" stop-color="white"/><stop offset="${620/816}" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><linearGradient id="${prefix}-left" x1="0" y1="0" x2="48" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="white"/></linearGradient><mask id="${prefix}-left-mask" x="0" y="0" width="1440" height="816" maskUnits="userSpaceOnUse" style="mask-type:alpha"><rect width="1440" height="816" fill="url(#${prefix}-left)"/></mask><mask id="${prefix}-mask" x="0" y="0" width="1440" height="816" maskUnits="userSpaceOnUse" style="mask-type:alpha"><rect width="1440" height="816" fill="url(#${prefix}-vertical)" mask="url(#${prefix}-left-mask)"/>${protect(plan.face)}${plan.weapons.map(protect).join('')}</mask></defs><image href="${escape(art)}" x="${i.x}" y="${i.y}" width="${i.width}" height="${i.height}" mask="url(#${prefix}-mask)"/></svg>`;
}
// Raster mockup glyph bounds, measured at 1920x1080; the SVG text stays selectable DOM text.
export function cutinText444(title,identity,kind){
 const isE=kind==='E',limit=isE?8:5,letters=[...String(title)],long=letters.length>=9;
 const lines=long?[letters.slice(0,Math.ceil(letters.length/2)).join(''),letters.slice(Math.ceil(letters.length/2)).join('')]:[title];
 const width=Math.min(isE?370:490,(isE?52:122.5)*Math.min(limit,Math.max(...lines.map(s=>[...s.replace(/\s/g,'')].length))));
 const height=long?(isE?72:134):(isE?47:134),row=height/lines.length;
 const svg=(cls,text,w,h,fitWidth=false)=>`<svg class="${cls}" viewBox="0 0 ${w} ${h}" style="--glyph-w:${w};--glyph-h:${h}" aria-label="${escape(text)}"><text data-fit-height="${h}"${fitWidth?` data-fit-width="${w}"`:''}>${escape(text)}</text></svg>`;
 return `<svg class="c444-title${long?' long':''}" viewBox="0 0 ${width} ${height}" style="--glyph-w:${width};--glyph-h:${height}" aria-label="${escape(title)}">${lines.map((line,i)=>`<text data-fit-height="${row}" data-fit-width="${width}" data-fit-y="${i*row}">${escape(line)}</text>`).join('')}</svg>${svg('c444-identity',identity,isE?400:440,isE?21:28)}${svg('c444-skip','넘기기',80,isE?15:22)}`;
}
export function fitCutinText444(host){
 for(const text of host.querySelectorAll?.('text[data-fit-height]')??[]){
  const b=text.getBBox();if(!b.width||!b.height)continue;
  const sy=Number(text.dataset.fitHeight)/b.height,sx=text.dataset.fitWidth?Number(text.dataset.fitWidth)/b.width:sy;
  text.setAttribute('transform',`matrix(${sx} 0 0 ${sy} ${-b.x*sx} ${Number(text.dataset.fitY??0)-b.y*sy})`);
 }
}
export function cutinEPlacement444(width,height,target,occupied=[]){
 const overlap=(a,b)=>b?Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)):0;
 const w=width*784/1920,h=height*280/1080,gap=height*12/1080,min=height*104/1080,max=Math.max(min,height*824/1080-h);
 const tops=[min,max,(min+max)/2,...[...occupied,target].filter(Boolean).flatMap(b=>[b.bottom+gap,b.top-h-gap])].filter(y=>y>=min&&y<=max);
 const candidates=['right','left'].flatMap(side=>tops.map(top=>{const left=side==='right'?width-w:width*64/1920,r={left,right:left+w,top,bottom:top+h},t=overlap(r,target),hud=occupied.reduce((n,b)=>n+overlap(r,b),0);return {side,left,top,width:w,height:h,score:[t>0?1:0,hud>0?1:0,t,hud,top-min,side==='right'?0:1]};}));
 candidates.sort((a,b)=>{for(let i=0;i<a.score.length;i++){if(a.score[i]!==b.score[i])return a.score[i]-b.score[i];}return 0;});
 const {score,...best}=candidates[0];return best;
}
export const cutinESide444=(width,height,target,occupied=[])=>cutinEPlacement444(width,height,target,occupied).side;
export function playCutin444(host,{officerId,kind,timing,art,head,title,identity,factionId,targetRect},onDone=()=>{}){
 host.c444Close?.();
 if(!timing.total){onDone();return;}
 const crop=cutinCrops444[officerId]??{x:50,y:0,scale:1.3},doc=host.ownerDocument,previous=doc.activeElement;
 host.className=`c444-cutin ${timing.reduced?'reduced':''}`;host.dataset.kind=kind;host.dataset.faction=factionId;
 host.dataset.crop=cutinCrops444[officerId]?'curated':'head';
 if(kind==='E'){
  const screen=doc.defaultView,occupied=[...(doc.querySelectorAll?.('.c236-command-list,.c236-objectives,.nb-todo-panel,.ih-notice,.nb-news-peek,.nb-sheet,.nb-top-left,.ih-res,.ih-menu,#c262-report-ticker')??[])].filter(n=>!n.hidden).map(n=>n.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
  const placement=cutinEPlacement444(screen?.innerWidth??1920,screen?.innerHeight??1080,targetRect,occupied);
  host.dataset.side=placement.side;host.style.setProperty('--e-left',placement.left+'px');host.style.setProperty('--e-top',placement.top+'px');
 }
 host.style.setProperty('--enter',timing.enter+'ms');host.style.setProperty('--exit',timing.exit+'ms');
 host.style.setProperty('--crop-x',crop.x+'%');host.style.setProperty('--crop-y',crop.y+'%');host.style.setProperty('--crop-scale',crop.scale);
 host.innerHTML=`<div class="c444-wash"></div><div class="c444-portrait">${art?(kind==='R'?cutinRPortraitHtml444(art,head,officerId):`<img src="${escape(art)}" alt="">`):''}</div><div class="c444-copy">${cutinText444(title,identity,kind)}</div>`;
 host.hidden=false;
 fitCutinText444(host);
 doc.fonts?.ready.then(()=>{if(!host.hidden)fitCutinText444(host);});
 let closed=false,timer,exitTimer;
 const consume=e=>{e?.preventDefault();e?.stopImmediatePropagation();};
 const close=e=>{consume(e);if(closed)return;closed=true;clearTimeout(timer);clearTimeout(exitTimer);const restore=doc.activeElement===host||host.contains(doc.activeElement);host.hidden=true;host.onclick=null;doc.removeEventListener('keydown',key,true);host.innerHTML='';host.c444Close=null;if(restore)previous?.focus?.({preventScroll:true});onDone();};
 const key=e=>{if(['Enter',' ','Escape'].includes(e.key))close(e);};
 host.c444Close=close;host.onclick=close;doc.addEventListener('keydown',key,true);
 host.focus?.({preventScroll:true});
 exitTimer=setTimeout(()=>host.classList.add('leaving'),timing.enter+timing.hold);
 timer=setTimeout(close,timing.total);
 return close;
}
