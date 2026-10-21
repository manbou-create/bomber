(function(){
"use strict";
function hitRect(px,py,o,R){const a=-(o.angle||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=px-o.x,dy=py-o.y,lx=dx*c-dy*s,ly=dx*s+dy*c,qx=Math.max(-o.w/2,Math.min(lx,o.w/2)),qy=Math.max(-o.h/2,Math.min(ly,o.h/2));return(lx-qx)**2+(ly-qy)**2<R*R;}
function rectClearance(px,py,o,R){const a=-(o.angle||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=px-o.x,dy=py-o.y,lx=dx*c-dy*s,ly=dx*s+dy*c;const qx=Math.max(-o.w/2,Math.min(lx,o.w/2)),qy=Math.max(-o.h/2,Math.min(ly,o.h/2));return Math.hypot(lx-qx,ly-qy)-R;}
function simulate(ctx,angle,pull){const{w,h,R,POWER_SCALE,FRICTION,STOP_SPEED}=ctx,BR=ctx.BR||35;let x=ctx.x,y=ctx.y,vx=Math.cos(angle)*pull*POWER_SCALE,vy=Math.sin(angle)*pull*POWER_SCALE,steps=0,crossed=false,hitCount=0,minClearance=Infinity;const left=w*.325,right=w*.675,obstacles=(ctx.obstacles||[]).filter(o=>o.placed!==false);let enteredOpponent=false,edgeRisk=0;
for(;steps<900;steps++){x+=vx;y+=vy;vx*=FRICTION;vy*=FRICTION;
if(x<-R/2||x>w+R/2||y<-R/2||y>h+R/2)return{score:-30000,x,y,steps,crossed,hitCount,minClearance,edgeRisk:1};
if((y<=R||y>=h-R)&&x>=left&&x<=right){if(y<=R){y=R;vy=Math.abs(vy)*.68}else{y=h-R;vy=-Math.abs(vy)*.68}}
const dx=x-w/2,dy=y-h/2,d=Math.hypot(dx,dy),md=R+BR;if(d<md){const nx=dx/(d||1),ny=dy/(d||1),dot=vx*nx+vy*ny;x=w/2+nx*(md+.2);y=h/2+ny*(md+.2);if(dot<0){vx=(vx-2*dot*nx)*.72;vy=(vy-2*dot*ny)*.72;hitCount++}}
for(const o of obstacles){const clear=rectClearance(x,y,o,R);if(clear<minClearance)minClearance=clear;if(clear<0){const a=-(o.angle||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),rx=x-o.x,ry=y-o.y,lx=rx*c-ry*s,ly=rx*s+ry*c,qx=Math.max(-o.w/2,Math.min(lx,o.w/2)),qy=Math.max(-o.h/2,Math.min(ly,o.h/2));let nx=lx-qx,ny=ly-qy,dn=Math.hypot(nx,ny);if(dn<.001){if(Math.abs(lx/o.w)>Math.abs(ly/o.h)){nx=Math.sign(lx||1);ny=0}else{nx=0;ny=Math.sign(ly||1)}dn=1}nx/=dn;ny/=dn;const push=R-dn+.3,nlx=lx+nx*push,nly=ly+ny*push;x=o.x+nlx*c+nly*s;y=o.y-nlx*s+nly*c;let lvx=vx*c-vy*s,lvy=vx*s+vy*c,dot=lvx*nx+lvy*ny;if(dot<0){lvx-=(1+.78)*dot*nx;lvy-=(1+.78)*dot*ny;vx=lvx*c+lvy*s;vy=-lvx*s+lvy*c;hitCount++}}}
if(x<w/2)enteredOpponent=true;
// Penalize risky paths near the table edge, while still allowing legitimate bank shots.
const edgeDist=Math.min(x,y,w-x,h-y);if(edgeDist<R*1.5)edgeRisk+=1;
if(Math.hypot(vx,vy)<STOP_SPEED)break;}
const targetX=w*.25,targetY=h*.5,dist=Math.hypot(x-targetX,y-targetY);let score=0;
if(enteredOpponent)score+=18000;else score-=7000;
if(x<w/2)score+=Math.max(0,w*.5-x)*9;else score-=Math.max(0,x-w*.5)*8;
score-=Math.abs(y-h*.5)*1.8;score-=dist*.9;score-=hitCount*1150;score-=steps*.12;score-=edgeRisk*3;
// Prefer genuinely clear routes; slight positive clearance bonus rewards passing through the middle of gaps.
if(minClearance!==Infinity)score+=Math.min(30,Math.max(-100,minClearance))*5;
const speed=Math.hypot(vx,vy);return{score,x,y,steps,crossed:enteredOpponent,hitCount,minClearance,edgeRisk,speed};}
function chooseShot(ctx){const difficulty=ctx.difficulty||"normal",angleStep=difficulty==="easy"?2:difficulty==="normal"?1.2:.65,pulls=difficulty==="easy"?[65,85,105,125,145,165,180]:difficulty==="normal"?[50,60,70,80,90,100,110,120,130,140,150,160,170,180]:[45,52,59,66,73,80,87,94,101,108,115,122,129,136,143,150,157,164,171,178,185];let best=null,routeCount=0,clearCount=0,reachCount=0;const obs=(ctx.obstacles||[]).filter(o=>o.placed!==false);
// AI is on the right and needs to reach the player's (left) territory. Explore a broad set of trajectories and power levels.
for(let deg=100;deg<=260;deg+=angleStep){const angle=deg*Math.PI/180;if(Math.cos(angle)>=-.02)continue;for(const pull of pulls){routeCount++;const sim=simulate(ctx,angle,pull);if(sim.hitCount===0)clearCount++;if(sim.crossed)reachCount++;const noise=difficulty==="easy"?Math.random()*380:difficulty==="normal"?Math.random()*45:Math.random()*4;const score=sim.score+noise;if(!best||score>best.score)best={angle,pull,hand:"none",score,sim};}}
const angleDeg=Math.round(best.angle*180/Math.PI),lines=[];lines.push(`盤面を分析：障害物 ${obs.length} 個と中央の水筒を避ける進路を探索しました。`);lines.push(`角度と力加減を組み合わせて ${routeCount} 通りを試算しました。`);lines.push(`障害物に接触しなかった候補は ${clearCount} 通り、相手側へ到達した候補は ${reachCount} 通りです。`);if(best.sim.hitCount===0)lines.push("障害物を避けられるルートを優先しました。");else lines.push(`完全に避けられる候補が少ないため、衝突 ${best.sim.hitCount} 回のルートを選びました。`);lines.push(best.sim.crossed?"相手の陣地へ進入できると予測しました。":"相手側への到達が難しい盤面です。最も前進できる候補を選びました。");lines.push(`選択：角度 ${angleDeg}°、引く強さ ${best.pull}。予測停止位置 ( ${Math.round(best.sim.x)}, ${Math.round(best.sim.y)} )。`);best.thought={routes:routeCount,clearRoutes:clearCount,gaps:obs.length,lines};delete best.sim;return best;}
window.OhajikiAI={chooseShot};
})();
