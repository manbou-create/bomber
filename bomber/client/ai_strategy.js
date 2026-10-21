
/* おはじきバトル：戦略AI専用 */
(function(){
'use strict';

function simulate(ctx,angle,pull,chosenHand){
 const {w,h,R,BR,POWER_SCALE,FRICTION,STOP_SPEED,obstaclePlaced,obstacleX,obstacleY,obstacleAngle,OW,OH,x,y}=ctx;
 let px=x,py=y,vx=Math.cos(angle)*pull*POWER_SCALE,vy=Math.sin(angle)*pull*POWER_SCALE;
 let spin=(chosenHand==='right'?1:chosenHand==='left'?-1:0)*(pull/180)*2.2;
 let collisions=0,steps=0,fallen=false;
 const left=w*.325,right=w*.675;
 for(;steps<360;steps++){
  px+=vx;py+=vy;
  const curve=spin*.0022,ovx=vx,ovy=vy;
  vx+=-ovy*curve;vy+=ovx*curve;
  vx*=FRICTION;vy*=FRICTION;spin*=.985;
  if(px< -R||px>w+R||py< -R||py>h+R){fallen=true;break}
  if(py<=R&&px>=left&&px<=right){py=R;vy=Math.abs(vy)*.68;collisions++}
  if(py>=h-R&&px>=left&&px<=right){py=h-R;vy=-Math.abs(vy)*.68;collisions++}
  let dx=px-w/2,dy=py-h/2,d=Math.hypot(dx,dy),min=R+BR;
  if(d<min){
   const nx=dx/(d||1),ny=dy/(d||1),dot=vx*nx+vy*ny;
   px=w/2+nx*(min+.1);py=h/2+ny*(min+.1);
   if(dot<0){vx=(vx-2*dot*nx)*.72;vy=(vy-2*dot*ny)*.72}
   collisions++;
  }
  if(obstaclePlaced){
   const a=-obstacleAngle*Math.PI/180,c=Math.cos(a),sn=Math.sin(a),dx=px-obstacleX,dy=py-obstacleY;
   const lx=dx*c-dy*sn,ly=dx*sn+dy*c;
   const qx=Math.max(-OW/2,Math.min(lx,OW/2)),qy=Math.max(-OH/2,Math.min(ly,OH/2));
   if((lx-qx)**2+(ly-qy)**2<R*R){
    collisions+=2;
    let nx=lx-qx,ny=ly-qy,dn=Math.hypot(nx,ny)||1;
    nx/=dn;ny/=dn;
    const nlx=lx+nx*2,nly=ly+ny*2;
    px=obstacleX+nlx*c+nly*sn;py=obstacleY-nlx*sn+nly*c;
    let lvx=vx*c-vy*sn,lvy=vx*sn+vy*c,dot=lvx*nx+lvy*ny;
    if(dot<0){lvx-=1.65*dot*nx;lvy-=1.65*dot*ny;vx=lvx*c+lvy*sn;vy=-lvx*sn+lvy*c}
   }
  }
  if(Math.hypot(vx,vy)<STOP_SPEED)break;
 }
 const onRight=px>w/2;
 let score=onRight?3500:900;
 if(fallen)score-=8000;
 score-=collisions*260+steps*.55;
 if(onRight)score+=Math.max(0,px-w/2)*1.5;
 else score-=Math.max(0,w/2-px)*.3;
 score-=Math.abs(py-h/2)*.12;
 return {x:px,y:py,score,fallen,collisions};
}

function chooseShot(ctx){
 const diff=ctx.difficulty||'normal';
 const angleStep=diff==='easy'?Math.PI/14:diff==='normal'?Math.PI/28:Math.PI/48;
 const pulls=diff==='easy'?[85,115,145]:diff==='normal'?[70,95,120,145,170]:[60,75,90,105,120,135,150,165,180];
 const hands=diff==='easy'?['none','right']:['none','right','left'];
 let best=null;
 for(let angle=-Math.PI;angle<=Math.PI;angle+=angleStep){
  for(const pull of pulls){
   for(const hand of hands){
    const result=simulate(ctx,angle,pull,hand);
    const noise=Math.random()*(diff==='easy'?750:diff==='normal'?120:12);
    const score=result.score+noise;
    if(!best||score>best.score)best={angle,pull,hand,score,result};
   }
  }
 }
 return best||{angle:Math.PI,pull:120,hand:'none',score:0};
}

function chooseObstacle(ctx){
 const {w,L,OW,OH,x,y,validObstacle}=ctx;
 const choices=[];
 for(let px=L.left+OW/2+2;px<=L.right-OW/2-2;px+=12){
  for(let py=L.top+OH/2+2;py<=L.bottom-OH/2-2;py+=12){
   for(const angle of [0,15,30,45,60,75,90,105,120,135,150,165]){
    if(!validObstacle(px,py,angle))continue;
    const playerLane=Math.abs(py-y);
    const centerDistance=Math.abs(px-w/2);
    const score=playerLane*.8+centerDistance*.35-Math.hypot(px-x,py-y)*.08+Math.random()*5;
    choices.push({x:px,y:py,angle,score});
   }
  }
 }
 if(!choices.length)return null;
 choices.sort((a,b)=>b.score-a.score);
 return choices[Math.floor(Math.random()*Math.min(8,choices.length))];
}

window.OhajikiAI={chooseShot,chooseObstacle};
})();
