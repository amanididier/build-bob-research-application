const $=id=>document.getElementById(id),api=window.bobAssistant,updates=window.bobDesktopUpdates,motion=window.bobAssistantMotion;
let state,requestId=null,isExpanded=false;
const active=()=>state?.chats?.items?.find(c=>c.id===state.chats.activeId);
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2600)}
function expandView(){if(isExpanded)return;isExpanded=true;document.getElementById('shell').classList.add('expanded');api.expand();$('disclaimer').style.display='block'}
function render(){
 if(!state)return;
 const c=active(),m=$('messages');m.replaceChildren();
 $('welcome').classList.toggle('hidden',!!c?.messages?.length);
 for(const x of c?.messages||[]){const d=document.createElement('div');d.className='message '+x.role;const s=document.createElement('span');s.textContent=x.content||'';d.append(s);m.append(d)}
 $('chat').scrollTop=$('chat').scrollHeight;
 const p=state.settings.provider;if(!requestId)$('providerLabel').textContent='Bob · '+p;$('status').textContent=state.providers[p]?.hasKey?'Ready':'Set up provider';
}
function openSettings(){
 const c=state.settings;$('settings').classList.add('visible');$('chat').style.visibility='hidden';$('form').style.visibility='hidden';$('provider').value=c.provider;$('model').value=c.model;$('base').value=c.baseUrl;$('baseLabel').style.display=['openai','openai-compatible'].includes(c.provider)?'':'none';$('key').value='';$('keyStatus').textContent=state.providers[c.provider]?.hasKey?'Key saved securely':'No key saved';$('note').textContent=state.secureStorageAvailable?'Keys are encrypted by Windows.':'Secure storage unavailable; cannot save keys.';$('save').disabled=!state.secureStorageAvailable;
}
function closeSettings(){$('settings').classList.remove('visible');$('chat').style.visibility='';$('form').style.visibility=''}
async function save(){
 try{const p={provider:$('provider').value,model:$('model').value.trim(),baseUrl:$('base').value.trim()};if($('key').value.trim())p.apiKey=$('key').value.trim();state=await api.saveSettings(p);$('key').value='';render();openSettings();toast('Provider saved')}
 catch(e){toast(e.message)}
}
function resize(){const t=$('prompt');t.style.height='auto';t.style.height=Math.min(t.scrollHeight,105)+'px'}
async function send(t){
 if(requestId||!t.trim())return;
 requestId=Date.now().toString(36);const id=requestId,text=t.trim();
 $('prompt').value='';resize();$('providerLabel').textContent='Bob is thinking…';
 if(!active())state=await api.newChat();
 active().messages.push({role:'user',content:text},{id,role:'assistant',content:''});
 render();$('send').disabled=true;$('status').textContent='Thinking…';
 try{const r=await api.send({text,requestId:id});state=r.state||state;if(!isExpanded)expandView();if(!r.ok)toast(r.error||'Bob could not complete that request.')}
 catch(e){expandView();const pending=active()?.messages.find(x=>x.id===id);if(pending)pending.content='I could not complete that request. '+e.message;toast(e.message)}
 finally{requestId=null;$('send').disabled=false;render();$('status').textContent='Ready';$('prompt').focus()}
}
$('form').onsubmit=e=>{e.preventDefault();send($('prompt').value)};
$('prompt').oninput=resize;
$('prompt').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('form').requestSubmit()}};
$('new').onclick=async()=>{state=await api.newChat();closeSettings();render();$('prompt').focus()};
$('settingsTop').onclick=openSettings;$('back').onclick=closeSettings;$('hide').onclick=()=>api.hide();
$('provider').onchange=()=>{const p=$('provider').value;$('baseLabel').style.display=['openai','openai-compatible'].includes(p)?'':'none';$('model').value=({gemini:'gemini-3.8-flash',openai:'gpt-4.1-mini',anthropic:'claude-sonnet-4-20250514','openai-compatible':''})[p];$('key').value='';$('keyStatus').textContent=state.providers[p]?.hasKey?'Key saved securely':'No key saved'};
$('save').onclick=save;
$('test').onclick=async()=>{await save();closeSettings();await send('Reply with exactly: Connection successful.');openSettings()};
$('checkUpdates').onclick=async()=>{$('updateStatus').textContent='Checking for updates…';try{await updates.check();setTimeout(async()=>{const s=await updates.state();$('updateStatus').textContent=s.message||s.status;$('downloadUpdate').style.display=s.status==='available'?'':'none';$('installUpdate').style.display=s.status==='ready'?'':'none'},1800)}catch(e){$('updateStatus').textContent=e.message}};
$('downloadUpdate').onclick=async()=>{await updates.download();$('updateStatus').textContent='Downloading update…';const timer=setInterval(async()=>{const s=await updates.state();$('updateStatus').textContent=s.message||s.status;if(s.status==='ready'){$('installUpdate').style.display='';clearInterval(timer)}},1200)};
$('installUpdate').onclick=()=>updates.install();
api.onChunk(payload=>{if(payload.requestId!==requestId)return;expandView();const m=active()?.messages.find(x=>x.id===payload.requestId);if(m){m.content+=payload.chunk;render()}});
motion.onShown(()=>{const shell=$('shell');shell.classList.remove('enter','expanded');isExpanded=false;$('providerLabel').textContent='Bob · Ctrl + Space';$('settings').classList.remove('visible');$('chat').style.visibility='';$('form').style.visibility='';$('disclaimer').style.display='none';void shell.offsetWidth;shell.classList.add('enter');$('prompt').value='';resize();$('prompt').focus()});
window.onkeydown=e=>{if(e.key==='Escape'){api.hide();e.preventDefault()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('new').click()}};
(async()=>{state=await api.getState();render();$('prompt').focus()})();