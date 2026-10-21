const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const PORT = process.env.PORT || 8080;
const server = http.createServer((req,res)=>{
  let file = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const full = path.join(__dirname,file);
  if(!full.startsWith(__dirname)){res.writeHead(403);return res.end("Forbidden");}
  fs.readFile(full,(err,data)=>{
    if(err){res.writeHead(404);return res.end("Not found");}
    const ext=path.extname(full);
    const type=ext===".html"?"text/html; charset=utf-8":ext===".js"?"text/javascript; charset=utf-8":"application/octet-stream";
    res.writeHead(200,{"Content-Type":type});res.end(data);
  });
});
const wss = new WebSocket.Server({server});
const rooms = new Map();
function code(){return Math.random().toString(36).slice(2,8).toUpperCase();}
function send(ws,obj){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));}
function broadcast(room,obj,except){
 const r=rooms.get(room);if(!r)return;
 for(const p of r.players)if(p!==except)send(p,obj);
}
wss.on("connection",ws=>{
 ws.room=null;ws.role=null;
 ws.on("message",raw=>{
  let m;try{m=JSON.parse(raw)}catch{return}
  if(m.type==="create"){
   let id;do{id=code()}while(rooms.has(id));
   rooms.set(id,{players:[ws],started:false});ws.room=id;ws.role="left";
   send(ws,{type:"created",room:id,role:"left"});send(ws,{type:"waiting",players:1});return;
  }
  if(m.type==="join"){
   const id=String(m.room||"").toUpperCase(),r=rooms.get(id);
   if(!r){send(ws,{type:"error",message:"そのルームコードは見つかりません。"});return}
   if(r.players.length>=2){send(ws,{type:"error",message:"この部屋は満員です。"});return}
   if(r.players.includes(ws))return;
   r.players.push(ws);ws.room=id;ws.role="right";
   send(ws,{type:"joined",room:id,role:"right"});broadcast(id,{type:"waiting",players:2});
   r.started=true;for(const p of r.players)send(p,{type:"start",room:id});return;
  }
  if(!ws.room||m.room!==ws.room)return;
  const r=rooms.get(ws.room);if(!r)return;
  if(m.type==="shot"){
   if(!r.started||m.from!==ws.role)return;
   broadcast(ws.room,{type:"shot",from:ws.role,vx:Number(m.vx),vy:Number(m.vy)},ws);return;
  }
  if(m.type==="settle"){
   if(!r.started||m.from!==ws.role)return;
   broadcast(ws.room,{type:"settle",from:ws.role,x:Number(m.x),y:Number(m.y),nextTurn:m.nextTurn==="right"?"right":"left"},ws);return;
  }
 });
 ws.on("close",()=>{
  if(!ws.room)return;const id=ws.room,r=rooms.get(id);if(!r)return;
  r.players=r.players.filter(p=>p!==ws);broadcast(id,{type:"error",message:"相手が切断しました。部屋を作り直してください。"});
  if(r.players.length===0)rooms.delete(id);else r.started=false;
 });
});
server.listen(PORT,()=>console.log("おはじきバトル Online: http://localhost:"+PORT));
