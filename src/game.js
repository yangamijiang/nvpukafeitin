import './game.css';

const COLORS={floor:'#d9aa7f',floor2:'#c9956e',wall:'#f3d9c5',trim:'#9f5f66',wood:'#875542',wood2:'#633d37',cream:'#fff1dc',pink:'#d66f88',pink2:'#f3a8b8',brown:'#68463e',ink:'#49353c',green:'#789a78',gold:'#e0ad5c',white:'#fffaf0'};

export function initPixelGame(){
  const overlay=document.querySelector('#pixel-game');
  const canvas=document.querySelector('#cafe-canvas');
  const ctx=canvas.getContext('2d');
  const dialogue=document.querySelector('#game-dialogue');
  const boardPanel=document.querySelector('#board-game');
  const nearby=document.querySelector('#nearby-hint');
  const keys=new Set();
  let running=false,lastTime=0,animation=0,currentMaid=null,gameMode=null,locked=false;
  const player={x:238,y:219,dir:'up',step:0};
  const maids=[
    {id:'sakura',name:'小樱',label:'SAKURA',x:132,y:113,color:COLORS.pink,game:'tic',line:'欢迎回家！今天想和我下一局「心动三目棋」吗？'},
    {id:'aoi',name:'小葵',label:'AOI',x:350,y:113,color:COLORS.brown,game:'memory',line:'发现你啦！来挑战我的「甜点翻翻乐」吧，赢了有神秘奖励哦！'}
  ];
  const obstacles=[{x:74,y:82,w:112,h:70},{x:294,y:82,w:112,h:70},{x:188,y:28,w:104,h:42},{x:205,y:151,w:70,h:44},{x:0,y:0,w:480,h:24},{x:0,y:252,w:480,h:18}];

  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
  function text(value,x,y,size=7,color=COLORS.ink,align='left'){
    ctx.fillStyle=color;ctx.font=`bold ${size}px monospace`;ctx.textAlign=align;ctx.textBaseline='top';ctx.fillText(value,x,y);
  }
  function drawCafe(){
    rect(0,0,480,270,COLORS.wall);rect(0,22,480,4,COLORS.trim);rect(0,160,480,92,COLORS.floor);
    for(let y=160;y<252;y+=16)for(let x=(y/16)%2?0:8;x<480;x+=16){rect(x,y,8,8,COLORS.floor2);rect(x+8,y+8,8,8,COLORS.floor2)}
    // windows and flower boxes
    for(const x of [22,82,378,438]){rect(x,39,38,57,COLORS.cream);rect(x+3,42,32,50,'#bde0df');rect(x+18,42,3,50,COLORS.white);rect(x+3,66,32,3,COLORS.white);rect(x-2,91,42,6,COLORS.wood);rect(x+2,85,5,7,COLORS.green);rect(x+10,87,6,5,COLORS.pink);rect(x+24,85,6,7,COLORS.green)}
    // counter
    rect(188,28,104,38,COLORS.cream);rect(184,62,112,10,COLORS.wood);rect(191,72,98,10,COLORS.wood2);
    for(let x=198;x<286;x+=22){rect(x,42,12,14,COLORS.pink2);rect(x+2,39,8,4,COLORS.white);rect(x+4,33,4,7,COLORS.gold)}
    text('KOMOREBI',240,12,8,COLORS.trim,'center');
    // rug and central table
    rect(196,199,88,46,'#bd7181');rect(201,204,78,36,'#e7a9af');
    drawTable(240,166,54,30);drawCup(229,155);drawCup(248,155);
    // side tables
    drawTable(130,120,80,48);drawTable(350,120,80,48);
    drawBoardDecor(130,111,'tic');drawBoardDecor(350,111,'cards');
    // plants and door
    rect(10,202,24,34,COLORS.wood);rect(6,190,10,18,COLORS.green);rect(16,182,11,27,COLORS.green);rect(28,190,9,19,COLORS.green);
    rect(433,177,34,63,COLORS.wood2);rect(438,182,24,53,COLORS.cream);rect(443,197,14,25,'#bde0df');rect(455,213,3,3,COLORS.gold);text('EXIT',450,164,7,COLORS.trim,'center');
    // small decor
    text('CAKE',240,84,6,COLORS.cream,'center');rect(217,91,46,3,COLORS.trim);rect(222,95,36,4,COLORS.pink2);
    for(const maid of maids)drawCharacter(maid.x,maid.y,maid.color,true,maid.label);
    drawCharacter(player.x,player.y,'#7697b8',false,'YOU',player.dir,player.step);
    // border
    ctx.strokeStyle=COLORS.wood2;ctx.lineWidth=4;ctx.strokeRect(2,2,476,266);
  }
  function drawTable(cx,cy,w,h){rect(cx-w/2,cy-h/2,w,h,COLORS.wood2);rect(cx-w/2+4,cy-h/2+4,w-8,h-8,'#aa6f55');rect(cx-w/2+7,cy+h/2,w-14,5,COLORS.wood2)}
  function drawCup(x,y){rect(x,y,9,7,COLORS.white);rect(x+2,y+7,5,2,COLORS.gold);ctx.strokeStyle=COLORS.white;ctx.lineWidth=2;ctx.strokeRect(x+7,y+1,4,4)}
  function drawBoardDecor(cx,cy,type){
    if(type==='tic'){rect(cx-15,cy-8,30,18,COLORS.cream);ctx.strokeStyle=COLORS.trim;ctx.lineWidth=1;for(const d of [-5,5]){ctx.beginPath();ctx.moveTo(cx+d,cy-8);ctx.lineTo(cx+d,cy+10);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-15,cy+d+1);ctx.lineTo(cx+15,cy+d+1);ctx.stroke()}text('♡',cx-10,cy-5,7,COLORS.pink)}
    else{for(let i=0;i<4;i++){rect(cx-18+i*10,cy-7+(i%2)*2,8,12,i%2?COLORS.pink:COLORS.green);rect(cx-16+i*10,cy-5+(i%2)*2,4,8,COLORS.cream)}}
  }
  function drawCharacter(x,y,color,isMaid,label,dir='down',step=0){
    const bob=Math.sin(animation/180+(isMaid?x:step))*1;
    x=Math.round(x);y=Math.round(y+bob);
    // shadow
    rect(x-8,y+10,16,4,'#5d403540');
    // legs
    rect(x-6,y+4,4,7,COLORS.cream);rect(x+2,y+4,4,7,COLORS.cream);
    // dress/body
    rect(x-8,y-9,16,15,isMaid?'#342f38':color);rect(x-10,y-3,3,9,isMaid?COLORS.white:color);rect(x+7,y-3,3,9,isMaid?COLORS.white:color);
    if(isMaid){rect(x-5,y-8,10,12,COLORS.white);rect(x-3,y-7,6,8,color);rect(x-8,y+3,16,3,COLORS.white)}
    // head and hair
    rect(x-7,y-21,14,13,'#f4c6aa');rect(x-8,y-23,16,7,isMaid?color:'#4f3f48');rect(x-9,y-20,3,12,isMaid?color:'#4f3f48');rect(x+6,y-20,3,12,isMaid?color:'#4f3f48');
    if(isMaid){rect(x-7,y-26,14,3,COLORS.white);rect(x-5,y-28,3,3,COLORS.white);rect(x+2,y-28,3,3,COLORS.white)}
    if(dir!=='up'){rect(x-4,y-16,2,2,COLORS.ink);rect(x+3,y-16,2,2,COLORS.ink)}
    text(label,x,y+15,5,COLORS.cream,'center');
  }
  function blocked(x,y){
    if(x<17||x>463||y<98||y>235)return true;
    return obstacles.some(o=>x+7>o.x&&x-7<o.x+o.w&&y+10>o.y&&y-15<o.y+o.h);
  }
  function closestMaid(){let nearest=null,distance=Infinity;for(const maid of maids){const d=Math.hypot(player.x-maid.x,player.y-maid.y);if(d<distance){distance=d;nearest=maid}}return distance<58?nearest:null}
  function update(dt){
    if(locked||!boardPanel.hidden)return;
    let dx=0,dy=0;if(keys.has('arrowleft')||keys.has('a'))dx--;if(keys.has('arrowright')||keys.has('d'))dx++;if(keys.has('arrowup')||keys.has('w'))dy--;if(keys.has('arrowdown')||keys.has('s'))dy++;
    if(dx||dy){const length=Math.hypot(dx,dy);dx/=length;dy/=length;const speed=75*dt/1000;const nx=player.x+dx*speed,ny=player.y+dy*speed;if(!blocked(nx,player.y))player.x=nx;if(!blocked(player.x,ny))player.y=ny;player.step+=dt/70;if(Math.abs(dx)>Math.abs(dy))player.dir=dx<0?'left':'right';else player.dir=dy<0?'up':'down'}
    const maid=closestMaid();nearby.hidden=!maid;nearby.textContent='';if(maid)nearby.innerHTML=`<kbd>E</kbd> 和${maid.name}聊聊`;
  }
  function frame(time){if(!running)return;const dt=Math.min(time-lastTime,32)||16;lastTime=time;animation=time;update(dt);ctx.imageSmoothingEnabled=false;drawCafe();requestAnimationFrame(frame)}
  function open(){overlay.hidden=false;document.body.classList.add('game-open');running=true;locked=false;lastTime=performance.now();requestAnimationFrame(frame);canvas.focus();}
  function close(){if(!boardPanel.hidden&&!confirm('正在进行的桌游会结束，确定离开咖啡厅吗？'))return;running=false;keys.clear();overlay.hidden=true;dialogue.hidden=true;boardPanel.hidden=true;document.body.classList.remove('game-open');document.querySelector('#enter-game').focus()}
  function interact(){if(locked||!boardPanel.hidden)return;const maid=closestMaid();if(!maid){showToast('靠近女仆后再按互动键 ♡');return}showDialogue(maid)}
  function showDialogue(maid){
    locked=true;currentMaid=maid;dialogue.hidden=false;dialogue.querySelector('#dialogue-name').textContent=maid.name;dialogue.querySelector('#dialogue-text').textContent=maid.line;
    drawPortrait(dialogue.querySelector('canvas'),maid);
    dialogue.querySelector('#dialogue-actions').innerHTML=`<button data-dialogue="play">♡ 好呀，开始游戏</button><button data-dialogue="chat">先聊聊天</button><button data-dialogue="bye">下次再玩</button>`;
  }
  function drawPortrait(target,maid){const c=target.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,84,84);c.fillStyle='#f4d7ce';c.fillRect(0,0,84,84);const scale=3;c.save();c.scale(scale,scale);const old=ctx;/* dedicated compact portrait */c.fillStyle=maid.color;c.fillRect(7,3,14,9);c.fillStyle='#fffaf0';c.fillRect(7,1,14,3);c.fillRect(9,0,3,2);c.fillRect(16,0,3,2);c.fillStyle='#f4c6aa';c.fillRect(8,8,12,11);c.fillStyle=maid.color;c.fillRect(6,7,3,15);c.fillRect(19,7,3,15);c.fillStyle='#49353c';c.fillRect(11,12,2,2);c.fillRect(16,12,2,2);c.fillStyle='#d66f88';c.fillRect(13,16,3,1);c.fillStyle='#342f38';c.fillRect(5,20,18,8);c.fillStyle='#fffaf0';c.fillRect(10,20,8,8);c.restore()}
  dialogue.querySelector('#dialogue-actions').addEventListener('click',event=>{const action=event.target.closest('[data-dialogue]')?.dataset.dialogue;if(!action)return;if(action==='play'){dialogue.hidden=true;startBoard(currentMaid.game)}else if(action==='chat'){dialogue.querySelector('#dialogue-text').textContent=currentMaid.id==='sakura'?'我最近在研究草莓奶油的新配方。赢过我，就告诉你最好吃的一口在哪里！':'偷偷告诉你：记住翻过的甜点，是赢下翻翻乐的秘诀。你一定可以的！';event.target.remove()}else{dialogue.hidden=true;locked=false;canvas.focus()}});
  function showToast(message){const toast=document.querySelector('#game-toast');toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),1800)}

  // Tic-tac-toe
  let tic=[],ticTurn='player',roundOver=false,scores={player:0,maid:0};
  const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function startBoard(mode){gameMode=mode;locked=true;boardPanel.hidden=false;document.querySelector('#board-kicker').textContent=currentMaid.id==='sakura'?"SAKURA'S TABLE":"AOI'S TABLE";document.querySelector('#board-title').textContent=mode==='tic'?'心动三目棋':'甜点翻翻乐';document.querySelector('#tic-board').hidden=mode!=='tic';document.querySelector('#memory-board').hidden=mode!=='memory';scores={player:0,maid:0};updateScore();newRound()}
  function newRound(){document.querySelector('#next-round').hidden=true;roundOver=false;if(gameMode==='tic')newTic();else newMemory()}
  function newTic(){tic=Array(9).fill('');ticTurn='player';const root=document.querySelector('#tic-board');root.innerHTML=tic.map((_,i)=>`<button data-cell="${i}" aria-label="第 ${i+1} 格"></button>`).join('');setBoardMessage('轮到你了！选择一个格子放下爱心。')}
  function outcome(board){for(const line of wins){const [a,b,c]=line;if(board[a]&&board[a]===board[b]&&board[a]===board[c])return {winner:board[a],line}}return board.every(Boolean)?{winner:'draw',line:[]}:null}
  function chooseAiMove(){
    const empty=tic.map((v,i)=>v?'':i).filter(v=>v!=='');
    for(const symbol of ['maid','player'])for(const index of empty){const copy=[...tic];copy[index]=symbol;if(outcome(copy)?.winner===symbol)return index}
    if(!tic[4])return 4;const corners=[0,2,6,8].filter(i=>!tic[i]);if(corners.length)return corners[Math.floor(Math.random()*corners.length)];return empty[Math.floor(Math.random()*empty.length)]
  }
  function placeTic(index,symbol){if(tic[index]||roundOver)return;tic[index]=symbol;const cell=document.querySelector(`[data-cell="${index}"]`);cell.textContent=symbol==='player'?'♡':'♟';cell.className=symbol;const result=outcome(tic);if(result){finishTic(result);return}if(symbol==='player'){ticTurn='maid';setBoardMessage(`${currentMaid.name}正在认真思考…`);setTimeout(()=>{if(roundOver||gameMode!=='tic')return;placeTic(chooseAiMove(),'maid');if(!roundOver){ticTurn='player';setBoardMessage('轮到你了，落下一颗爱心吧！')}},550)}
  }
  function finishTic(result){roundOver=true;if(result.line.length)for(const i of result.line)document.querySelector(`[data-cell="${i}"]`).classList.add('winning');if(result.winner==='player'){scores.player++;setBoardMessage(`你赢啦！${currentMaid.name}送给你一颗幸运星 ✦`)}else if(result.winner==='maid'){scores.maid++;setBoardMessage(`${currentMaid.name}赢下这一局！再挑战一次吧。`)}else setBoardMessage('平局！你们也太有默契了 ♡');updateScore();document.querySelector('#next-round').hidden=false}
  document.querySelector('#tic-board').addEventListener('click',event=>{const cell=event.target.closest('[data-cell]');if(cell&&ticTurn==='player'&&!roundOver)placeTic(Number(cell.dataset.cell),'player')});

  // Memory matching: player and maid take turns; both remember revealed cards.
  const icons=['🍰','🍓','☕','🍮','🧁','🍪'];
  let memory=[],openCards=[],matched=new Set(),memoryTurn='player',known=new Map(),memoryBusy=false;
  function newMemory(){const values=[...icons,...icons];for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]]}memory=values;openCards=[];matched.clear();known.clear();memoryTurn='player';memoryBusy=false;renderMemory();setBoardMessage('你的回合！翻开两张甜点卡片。')}
  function renderMemory(){document.querySelector('#memory-board').innerHTML=memory.map((icon,i)=>`<button data-card="${i}" aria-label="第 ${i+1} 张卡片" class="${matched.has(i)?'matched':''}"><span class="card-back">♡</span><span class="card-front">${icon}</span></button>`).join('')}
  function reveal(index){const el=document.querySelector(`[data-card="${index}"]`);el.classList.add('open');known.set(index,memory[index]);openCards.push(index)}
  function chooseMaidCards(){
    const available=memory.map((_,i)=>i).filter(i=>!matched.has(i));
    const pairs=new Map();for(const i of available)if(known.has(i)){const val=known.get(i);if(pairs.has(val))return [pairs.get(val),i];pairs.set(val,i)}
    const unknown=available.filter(i=>!known.has(i));const first=unknown.length?unknown[Math.floor(Math.random()*unknown.length)]:available[Math.floor(Math.random()*available.length)];
    const knownMatch=available.find(i=>i!==first&&known.get(i)===memory[first]);const rest=unknown.filter(i=>i!==first);const second=knownMatch??rest[Math.floor(Math.random()*rest.length)]??available.find(i=>i!==first);return [first,second]
  }
  function flipCard(index,actor){if(memoryBusy||matched.has(index)||openCards.includes(index)||roundOver)return;reveal(index);if(openCards.length<2)return;memoryBusy=true;const [a,b]=openCards;if(memory[a]===memory[b]){setTimeout(()=>{matched.add(a);matched.add(b);document.querySelector(`[data-card="${a}"]`).classList.add('matched');document.querySelector(`[data-card="${b}"]`).classList.add('matched');openCards=[];memoryBusy=false;if(actor==='player')scores.player++;else scores.maid++;updateScore();if(matched.size===memory.length){roundOver=true;const message=scores.player>scores.maid?'你找到了更多甜点，挑战成功！ ✦':scores.player<scores.maid?`${currentMaid.name}险胜！她邀请你再玩一局。`:'平分秋色！这就是甜点默契吗？';setBoardMessage(message);document.querySelector('#next-round').hidden=false}else if(actor==='player'){setBoardMessage('配对成功！继续翻两张。')}else{setBoardMessage(`${currentMaid.name}配对成功，继续她的回合…`);setTimeout(maidMemoryTurn,650)}},650)}else{setTimeout(()=>{document.querySelector(`[data-card="${a}"]`).classList.remove('open');document.querySelector(`[data-card="${b}"]`).classList.remove('open');openCards=[];memoryBusy=false;if(actor==='player'){memoryTurn='maid';setBoardMessage(`${currentMaid.name}的回合，她正在回想卡片…`);setTimeout(maidMemoryTurn,700)}else{memoryTurn='player';setBoardMessage('轮到你了！记住刚才的甜点哦。')}},850)}
  }
  function maidMemoryTurn(){if(roundOver||gameMode!=='memory')return;const [a,b]=chooseMaidCards();flipCard(a,'maid');setTimeout(()=>flipCard(b,'maid'),480)}
  document.querySelector('#memory-board').addEventListener('click',event=>{const card=event.target.closest('[data-card]');if(card&&memoryTurn==='player')flipCard(Number(card.dataset.card),'player')});
  function setBoardMessage(value){document.querySelector('#board-message').textContent=value}
  function updateScore(){document.querySelector('#player-score').textContent=scores.player;document.querySelector('#maid-score').textContent=scores.maid}
  document.querySelector('#next-round').addEventListener('click',newRound);
  document.querySelector('#leave-table').addEventListener('click',()=>{boardPanel.hidden=true;gameMode=null;locked=false;showToast(`${currentMaid.name}：下次也要来玩哦 ♡`);canvas.focus()});

  document.querySelector('#enter-game').addEventListener('click',open);
  document.querySelector('#close-game').addEventListener('click',close);
  document.addEventListener('keydown',event=>{
    if(!running)return;const key=event.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','e',' '].includes(key))event.preventDefault();
    if(key==='escape'){if(!boardPanel.hidden)document.querySelector('#leave-table').click();else if(!dialogue.hidden){dialogue.hidden=true;locked=false;canvas.focus()}else close();return}
    if(key==='e'||key===' '){if(!event.repeat)interact();return}keys.add(key)
  });
  document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  document.querySelectorAll('[data-move]').forEach(button=>{const direction=button.dataset.move;const key={up:'arrowup',down:'arrowdown',left:'arrowleft',right:'arrowright'}[direction];const down=event=>{event.preventDefault();keys.add(key)};const up=event=>{event.preventDefault();keys.delete(key)};button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('pointerleave',up)});
  document.querySelector('[data-action="interact"]').addEventListener('click',interact);
  canvas.addEventListener('click',event=>{if(locked)return;const rect=canvas.getBoundingClientRect();const tx=(event.clientX-rect.left)/rect.width*canvas.width,ty=(event.clientY-rect.top)/rect.height*canvas.height;const maid=maids.find(m=>Math.hypot(tx-m.x,ty-m.y)<35);if(maid){player.x=maid.x;player.y=maid.y+45;showDialogue(maid)}});
}
