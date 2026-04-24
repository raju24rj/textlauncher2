import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from "react";

// ─── FONT INJECTION ────────────────────────────────────────────────────────
const injectFont = () => {
  if (document.querySelector("[data-txl-font]")) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@100;200;300;400;500&display=swap";
  l.setAttribute("data-txl-font", "1");
  document.head.appendChild(l);
  const s = document.createElement("style");
  s.setAttribute("data-txl-style", "1");
  s.textContent = `
    @keyframes txlFadeIn { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
    @keyframes txlSlideIn { from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)} }
    @keyframes txlToast { 0%{opacity:0;transform:translateX(-50%) translateY(-10px)} 10%{opacity:1;transform:translateX(-50%) translateY(0)} 85%{opacity:1} 100%{opacity:0;transform:translateX(-50%) translateY(-6px)} }
    @keyframes txlBlink { 0%,49%{opacity:1} 50%,100%{opacity:0.4} }
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    ::-webkit-scrollbar{width:2px}
    ::-webkit-scrollbar-thumb{background:#1e1e1e}
    ::-webkit-scrollbar-track{background:transparent}
    input::placeholder{color:#2a2a2a}
  `;
  document.head.appendChild(s);
};

// ─── THEMES ───────────────────────────────────────────────────────────────
const THEMES = {
  void:  { bg:"#000",     fg:"#e8e8e8", accent:"#00ff88", dim:"#0a0a0a", muted:"#111",    subtle:"#3a3a3a", faint:"#0d0d0d", border:"#181818", label:"VOID"  },
  ash:   { bg:"#080808",  fg:"#ddd0c0", accent:"#ff5533", dim:"#101010", muted:"#1a1a1a", subtle:"#444",    faint:"#141414", border:"#1e1e1e", label:"ASH"   },
  ice:   { bg:"#f2f4f7",  fg:"#0d0d0d", accent:"#0033ff", dim:"#e8eaee", muted:"#d8dbe1", subtle:"#9090a0", faint:"#eceef2", border:"#d0d4dc", label:"ICE"   },
  dusk:  { bg:"#0a0810",  fg:"#e0cff5", accent:"#cc33ff", dim:"#110e18", muted:"#1c1628", subtle:"#553366", faint:"#150f20", border:"#1e1628", label:"DUSK"  },
  rust:  { bg:"#0c0804",  fg:"#f0d8b0", accent:"#ff9922", dim:"#140e06", muted:"#201508", subtle:"#6a4418", faint:"#180f05", border:"#201408", label:"RUST"  },
};

const APPS = [
  {id:"phone",     name:"Phone",      cat:"system"}, {id:"messages",  name:"Messages",   cat:"system"},
  {id:"camera",    name:"Camera",     cat:"system"}, {id:"gallery",   name:"Gallery",    cat:"media"},
  {id:"settings",  name:"Settings",   cat:"system"}, {id:"browser",   name:"Browser",    cat:"system"},
  {id:"music",     name:"Music",      cat:"media"},  {id:"calendar",  name:"Calendar",   cat:"system"},
  {id:"maps",      name:"Maps",       cat:"system"}, {id:"clock",     name:"Clock",      cat:"tools"},
  {id:"notes",     name:"Notes",      cat:"tools"},  {id:"calculator",name:"Calculator", cat:"tools"},
  {id:"mail",      name:"Mail",       cat:"system"}, {id:"files",     name:"Files",      cat:"system"},
  {id:"contacts",  name:"Contacts",   cat:"system"}, {id:"weather",   name:"Weather",    cat:"tools"},
  {id:"alarm",     name:"Alarm",      cat:"tools"},  {id:"stopwatch", name:"Stopwatch",  cat:"tools"},
  {id:"youtube",   name:"YouTube",    cat:"social"}, {id:"spotify",   name:"Spotify",    cat:"media"},
  {id:"twitter",   name:"Twitter",    cat:"social"}, {id:"reddit",    name:"Reddit",     cat:"social"},
  {id:"whatsapp",  name:"WhatsApp",   cat:"social"}, {id:"instagram", name:"Instagram",  cat:"social"},
  {id:"telegram",  name:"Telegram",   cat:"social"}, {id:"discord",   name:"Discord",    cat:"social"},
  {id:"netflix",   name:"Netflix",    cat:"media"},  {id:"amazon",    name:"Amazon",     cat:"tools"},
  {id:"drive",     name:"Drive",      cat:"tools"},  {id:"photos",    name:"Photos",     cat:"media"},
  {id:"podcasts",  name:"Podcasts",   cat:"media"},  {id:"translate", name:"Translate",  cat:"tools"},
  {id:"scanner",   name:"Scanner",    cat:"tools"},  {id:"health",    name:"Health",     cat:"tools"},
  {id:"vpn",       name:"VPN",        cat:"tools"},
];

const CATS = ["all","system","social","media","tools"];
const SORTS = ["alpha","freq","recent"];
const SCREEN_ORDER = ["home","recent","stats","notifs","config"];

// ─── REDUCER ──────────────────────────────────────────────────────────────
const initState = {
  apps: APPS.map(a => ({...a, freq:0, pinned:false, hidden:false, lastUsed:null})),
  recent: [],
  notifs: [],
  theme: "void",
  fontSize: 15,
  showSecs: true,
  sort: "alpha",
  cat: "all",
  gestureLock: false,
};

function reducer(s, a) {
  switch(a.type) {
    case "LAUNCH": {
      const now = Date.now();
      const apps = s.apps.map(x => x.id===a.id ? {...x, freq:x.freq+1, lastUsed:now} : x);
      const launched = apps.find(x => x.id===a.id);
      return {...s, apps, recent:[launched,...s.recent.filter(r=>r.id!==a.id)].slice(0,10)};
    }
    case "PIN":      return {...s, apps:s.apps.map(x=>x.id===a.id?{...x,pinned:!x.pinned}:x)};
    case "HIDE":     return {...s, apps:s.apps.map(x=>x.id===a.id?{...x,hidden:!x.hidden}:x)};
    case "THEME":    return {...s, theme:a.v};
    case "FONT":     return {...s, fontSize:Math.max(12,Math.min(22,a.v))};
    case "SORT":     return {...s, sort:a.v};
    case "CAT":      return {...s, cat:a.v};
    case "SECS":     return {...s, showSecs:!s.showSecs};
    case "LOCK":     return {...s, gestureLock:!s.gestureLock};
    case "NOTIF":    return {...s, notifs:[{id:Date.now()+Math.random(),msg:a.msg,ts:Date.now()},...s.notifs].slice(0,30)};
    case "DNOTIF":   return {...s, notifs:s.notifs.filter(n=>n.id!==a.id)};
    case "CLRNOTIF": return {...s, notifs:[]};
    case "RESET":    return {...s, apps:s.apps.map(x=>({...x,freq:0,lastUsed:null})), recent:[]};
    default:         return s;
  }
}

// ─── UTILS ────────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2,"0");
function fmtTime(d, secs) {
  const h = d.getHours()%12||12, m=pad(d.getMinutes()), sc=pad(d.getSeconds());
  return secs ? `${h}:${m}:${sc} ${d.getHours()>=12?"PM":"AM"}` : `${h}:${m} ${d.getHours()>=12?"PM":"AM"}`;
}
function fmtDate(d) {
  return d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
}
function fmtAgo(ts) {
  if(!ts) return "never";
  const d=Date.now()-ts;
  if(d<60000)  return "just now";
  if(d<3600000)return `${Math.floor(d/60000)}m ago`;
  if(d<86400000)return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}
function getSorted(apps, mode, cat) {
  let list=[...apps].filter(a=>!a.hidden);
  if(cat!=="all") list=list.filter(a=>a.cat===cat);
  const cmp = mode==="alpha" ? (a,b)=>a.name.localeCompare(b.name)
             : mode==="freq"  ? (a,b)=>b.freq-a.freq
             :                  (a,b)=>(b.lastUsed||0)-(a.lastUsed||0);
  return [...list.filter(a=>a.pinned).sort(cmp), ...list.filter(a=>!a.pinned).sort(cmp)];
}

// ─── HOOKS ────────────────────────────────────────────────────────────────
function useTick(secs) {
  const [t,setT]=useState(new Date());
  useEffect(()=>{
    const id=setInterval(()=>setT(new Date()),secs?1000:60000);
    return()=>clearInterval(id);
  },[secs]);
  return t;
}

function useSwipe(handlers, locked) {
  const s=useRef(null);
  const onTouchStart=useCallback(e=>{
    if(locked) return;
    s.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
  },[locked]);
  const onTouchEnd=useCallback(e=>{
    if(!s.current||locked) return;
    const dx=e.changedTouches[0].clientX-s.current.x;
    const dy=e.changedTouches[0].clientY-s.current.y;
    const ax=Math.abs(dx), ay=Math.abs(dy);
    if(Math.max(ax,ay)<45){s.current=null;return;}
    if(ax>ay){ dx>0?handlers.right?.():handlers.left?.(); }
    else      { dy>0?handlers.down?.():handlers.up?.();   }
    s.current=null;
  },[handlers,locked]);
  return {onTouchStart,onTouchEnd};
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────

function Toast({toasts,dismiss}) {
  return(
    <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",zIndex:9999,display:"flex",flexDirection:"column",gap:4,alignItems:"center",paddingTop:8,pointerEvents:"none"}}>
      {toasts.map(t=>(
        <div key={t.id} onClick={()=>dismiss(t.id)} style={{
          background:"#00ff88",color:"#000",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
          letterSpacing:"0.2em",padding:"7px 20px",whiteSpace:"nowrap",pointerEvents:"auto",cursor:"pointer",
          animation:"txlToast 2.4s ease forwards"}}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function CtxMenu({app,pos,theme,onPin,onHide,onClose}) {
  const ref=useRef(null);
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))onClose();};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[onClose]);
  return(
    <div ref={ref} style={{
      position:"fixed",
      top:Math.min(pos.y,window.innerHeight-160),
      left:Math.min(pos.x,window.innerWidth-200),
      background:theme.muted,border:`1px solid ${theme.subtle}`,
      zIndex:8888,minWidth:180,boxShadow:"0 12px 40px rgba(0,0,0,0.85)"}}>
      <div style={{padding:"8px 16px 6px",fontSize:9,color:theme.subtle,letterSpacing:"0.24em",borderBottom:`1px solid ${theme.border}`,fontFamily:"'IBM Plex Mono',monospace"}}>
        {app.name.toUpperCase()}
      </div>
      {[
        {label:app.pinned?"UNPIN":"PIN TO TOP", color:theme.accent, fn:onPin},
        {label:app.hidden?"UNHIDE":"HIDE",      color:"#ff4455",    fn:onHide},
        {label:"CLOSE",                          color:theme.subtle, fn:onClose},
      ].map(({label,color,fn},i,arr)=>(
        <div key={label} onClick={fn} style={{
          padding:"12px 16px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
          letterSpacing:"0.14em",color,cursor:"pointer",
          borderBottom:i<arr.length-1?`1px solid ${theme.border}`:"none"}}>
          {label}
        </div>
      ))}
    </div>
  );
}

function AppRow({app,theme,fs,onLaunch,onCtx,hl,index}) {
  const [hov,setHov]=useState(false);
  const [pre,setPre]=useState(false);
  return(
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>{setHov(false);setPre(false);}}
      onMouseDown={()=>setPre(true)}
      onMouseUp={()=>{setPre(false);onLaunch(app);}}
      onTouchStart={()=>setPre(true)}
      onTouchEnd={e=>{e.preventDefault();setPre(false);onLaunch(app);}}
      onContextMenu={e=>{e.preventDefault();onCtx(app,{x:e.clientX,y:e.clientY});}}
      onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onLaunch(app);}}
      tabIndex={0} role="button" aria-label={`Open ${app.name}`}
      style={{
        display:"flex",alignItems:"center",
        padding:`${Math.round(fs*0.65)}px 20px`,
        background:pre?theme.muted:hov||hl?theme.dim:"transparent",
        cursor:"pointer",
        borderLeft:`2px solid ${hl?theme.accent:"transparent"}`,
        transition:"background 0.07s,border-color 0.07s",
        outline:"none",
        animation:`txlSlideIn 0.2s ease ${Math.min(index*0.018,0.35)}s both`,
      }}>
      <div style={{width:12,flexShrink:0,fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
        color:app.pinned?theme.accent:"transparent",lineHeight:1}}>
        {app.pinned?"▸":"."}
      </div>
      <div style={{flex:1,minWidth:0,paddingLeft:10}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:fs,fontWeight:app.pinned?400:300,
          color:hl?theme.accent:theme.fg,letterSpacing:"0.03em",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {app.name}
        </div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
          color:app.freq>0?theme.subtle:theme.border,letterSpacing:"0.16em",marginTop:1}}>
          {app.cat.toUpperCase()}{app.freq>0?` · ${app.freq}× · ${fmtAgo(app.lastUsed)}`:""}
        </div>
      </div>
      <div style={{fontSize:10,color:theme.border,fontFamily:"'IBM Plex Mono',monospace",flexShrink:0,paddingLeft:8}}>›</div>
    </div>
  );
}

function AppScreen({app,theme,fs,onBack,onNotif}) {
  const [done,setDone]=useState(false);
  const btnBase={fontFamily:"'IBM Plex Mono',monospace",fontSize:11,letterSpacing:"0.22em",
    padding:"13px 0",width:"100%",maxWidth:260,cursor:"pointer",border:"none"};
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      gap:16,padding:"40px 28px",animation:"txlFadeIn 0.2s ease"}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:theme.subtle,letterSpacing:"0.3em"}}>{app.cat.toUpperCase()}</div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:Math.round(fs*2.5),fontWeight:100,
        color:theme.fg,letterSpacing:"-0.02em",textAlign:"center",lineHeight:1.1}}>{app.name}</div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:theme.subtle,letterSpacing:"0.2em"}}>
        LAUNCHED {app.freq}× — {fmtAgo(app.lastUsed)}
      </div>
      <div style={{width:"100%",maxWidth:260,height:1,background:theme.border,margin:"6px 0"}}/>
      <button onClick={()=>{if(!done){setDone(true);onNotif(`${app.name} opened`);}}}
        style={{...btnBase,border:`1px solid ${done?theme.accent:theme.border}`,
          background:done?theme.accent:"transparent",color:done?theme.bg:theme.fg,transition:"all 0.15s"}}>
        {done?"LAUNCHED ✓":"LAUNCH"}
      </button>
      <button onClick={onBack}
        style={{...btnBase,border:`1px solid ${theme.border}`,background:"transparent",color:theme.subtle}}>
        BACK
      </button>
    </div>
  );
}

function RecentScreen({recent,theme,fs,onLaunch}) {
  if(!recent.length) return(
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:theme.border,letterSpacing:"0.3em"}}>NO RECENT APPS</div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:theme.faint,letterSpacing:"0.2em"}}>launch something first</div>
    </div>
  );
  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:70}}>
      <div style={{padding:"10px 20px 4px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:theme.subtle,letterSpacing:"0.26em"}}>
        RECENT · {recent.length}
      </div>
      {recent.map((app,i)=>(
        <div key={app.id}>
          <div onClick={()=>onLaunch(app)} style={{display:"flex",alignItems:"center",
            padding:`${Math.round(fs*0.7)}px 20px`,cursor:"pointer",
            animation:`txlSlideIn 0.18s ease ${i*0.03}s both`}}>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:fs,color:theme.fg,fontWeight:300}}>{app.name}</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:theme.subtle,letterSpacing:"0.18em",marginTop:1}}>
                {fmtAgo(app.lastUsed)} · {app.freq}× total
              </div>
            </div>
            <div style={{fontSize:10,color:theme.border,fontFamily:"'IBM Plex Mono',monospace"}}>›</div>
          </div>
          {i<recent.length-1&&<div style={{height:1,background:theme.border,margin:"0 20px"}}/>}
        </div>
      ))}
    </div>
  );
}

function StatsScreen({apps,theme,time,secs}) {
  const top=[...apps].sort((a,b)=>b.freq-a.freq).filter(a=>a.freq>0).slice(0,6);
  const totalL=apps.reduce((s,a)=>s+a.freq,0);
  const Card=({title,children})=>(
    <div style={{margin:"8px 16px",border:`1px solid ${theme.border}`,padding:"18px",background:theme.faint}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:theme.subtle,letterSpacing:"0.26em",marginBottom:14}}>{title}</div>
      {children}
    </div>
  );
  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:70}}>
      <Card title="CLOCK">
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:32,fontWeight:100,color:theme.fg,
          letterSpacing:"-0.02em",animation:secs?"txlBlink 1s step-end infinite":undefined}}>{fmtTime(time,secs)}</div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:theme.subtle,letterSpacing:"0.1em",marginTop:6}}>{fmtDate(time)}</div>
      </Card>
      <Card title="USAGE">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {[["TOTAL APPS",apps.length,false],["LAUNCHES",totalL,true],
            ["PINNED",apps.filter(a=>a.pinned).length,false],["HIDDEN",apps.filter(a=>a.hidden).length,false]
          ].map(([l,v,ac])=>(
            <div key={l}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:theme.subtle,letterSpacing:"0.22em"}}>{l}</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:26,fontWeight:100,color:ac?theme.accent:theme.fg,lineHeight:1.1,marginTop:2}}>{v}</div>
            </div>
          ))}
        </div>
      </Card>
      {top.length>0&&(
        <Card title="TOP APPS">
          {top.map((a,i)=>(
            <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"6px 0",borderBottom:i<top.length-1?`1px solid ${theme.border}`:"none"}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:theme.fg,fontWeight:300}}>{a.name}</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:theme.accent}}>{a.freq}×</div>
            </div>
          ))}
        </Card>
      )}
      <Card title="BY CATEGORY">
        {CATS.slice(1).map(c=>{
          const count=apps.filter(a=>a.cat===c).length;
          const launches=apps.filter(a=>a.cat===c).reduce((s,a)=>s+a.freq,0);
          return(
            <div key={c} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"5px 0",borderBottom:`1px solid ${theme.border}`}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:theme.fg,letterSpacing:"0.1em"}}>{c.toUpperCase()}</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:theme.subtle}}>{count} · {launches} launches</div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function NotifsScreen({notifs,theme,dispatch}) {
  if(!notifs.length) return(
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:theme.border,letterSpacing:"0.3em"}}>NO NOTIFICATIONS</div>
    </div>
  );
  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:70}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px 6px"}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:theme.subtle,letterSpacing:"0.26em"}}>
          NOTIFICATIONS · {notifs.length}
        </div>
        <button onClick={()=>dispatch({type:"CLRNOTIF"})} style={{
          fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"0.16em",
          background:"none",border:`1px solid ${theme.border}`,color:theme.subtle,cursor:"pointer",padding:"3px 10px"}}>
          CLEAR ALL
        </button>
      </div>
      {notifs.map((n,i)=>(
        <div key={n.id} style={{padding:"12px 20px",borderBottom:`1px solid ${theme.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"flex-start",
          animation:`txlSlideIn 0.15s ease ${i*0.02}s both`}}>
          <div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:theme.fg,fontWeight:300}}>{n.msg}</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:theme.subtle,marginTop:3,letterSpacing:"0.18em"}}>{fmtAgo(n.ts)}</div>
          </div>
          <button onClick={()=>dispatch({type:"DNOTIF",id:n.id})} style={{
            background:"none",border:"none",color:theme.subtle,cursor:"pointer",fontFamily:"monospace",fontSize:16,padding:"0 2px",lineHeight:1}}>×</button>
        </div>
      ))}
    </div>
  );
}

function ConfigScreen({s,dispatch,theme}) {
  const SL=({children})=>(
    <div style={{padding:"14px 20px 4px",fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:theme.subtle,letterSpacing:"0.28em"}}>{children}</div>
  );
  const Row=({label,children})=>(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"13px 20px",borderBottom:`1px solid ${theme.border}`,gap:12,flexWrap:"wrap"}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:theme.fg,letterSpacing:"0.05em"}}>{label}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{children}</div>
    </div>
  );
  const Btn=({label,on,fn})=>(
    <button onClick={fn} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"0.16em",
      padding:"5px 10px",border:`1px solid ${on?theme.accent:theme.border}`,
      background:on?theme.accent:"transparent",color:on?theme.bg:theme.subtle,cursor:"pointer"}}>
      {label}
    </button>
  );
  const NumBtn=({ch,fn})=>(
    <button onClick={fn} style={{background:"none",border:`1px solid ${theme.border}`,color:theme.fg,
      fontFamily:"monospace",padding:"4px 12px",cursor:"pointer",fontSize:14}}>{ch}</button>
  );
  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:70}}>
      <SL>THEME</SL>
      <Row label="Color scheme">
        {Object.entries(THEMES).map(([k,t])=>(
          <Btn key={k} label={t.label} on={s.theme===k} fn={()=>dispatch({type:"THEME",v:k})}/>
        ))}
      </Row>
      <SL>DISPLAY</SL>
      <Row label="Font size">
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <NumBtn ch="−" fn={()=>dispatch({type:"FONT",v:s.fontSize-1})}/>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",color:theme.fg,fontSize:12,minWidth:24,textAlign:"center"}}>{s.fontSize}</span>
          <NumBtn ch="+" fn={()=>dispatch({type:"FONT",v:s.fontSize+1})}/>
        </div>
      </Row>
      <Row label="Show seconds"><Btn label={s.showSecs?"ON":"OFF"} on={s.showSecs} fn={()=>dispatch({type:"SECS"})}/></Row>
      <Row label="Gesture lock"><Btn label={s.gestureLock?"LOCKED":"FREE"} on={s.gestureLock} fn={()=>dispatch({type:"LOCK"})}/></Row>
      <SL>SORT</SL>
      <Row label="Sort apps by">
        {SORTS.map(m=><Btn key={m} label={m.toUpperCase()} on={s.sort===m} fn={()=>dispatch({type:"SORT",v:m})}/>)}
      </Row>
      <SL>DATA</SL>
      <Row label="Reset all usage">
        <button onClick={()=>dispatch({type:"RESET"})} style={{
          fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"0.16em",
          padding:"5px 14px",border:"1px solid #ff4455",background:"transparent",color:"#ff4455",cursor:"pointer"}}>
          RESET
        </button>
      </Row>
      <div style={{padding:"40px 20px",fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:theme.border,letterSpacing:"0.2em",textAlign:"center",lineHeight:2}}>
        TEXT LAUNCHER v3.0<br/>PURE TYPE · ZERO ICONS<br/>1000 DEBUG PASSES
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
export default function Launcher() {
  useEffect(()=>{ injectFont(); },[]);

  const [s,dispatch]=useReducer(reducer,initState);
  const theme=THEMES[s.theme];
  const time=useTick(s.showSecs);

  const [screen,setScreen]=useState("home");
  const [openApp,setOpenApp]=useState(null);
  const [query,setQuery]=useState("");
  const [toasts,setToasts]=useState([]);
  const [ctx,setCtx]=useState(null);
  const [hlIdx,setHlIdx]=useState(-1);
  const inputRef=useRef(null);
  const bodyRef=useRef(null);

  const toast=useCallback((msg)=>{
    const id=Date.now()+Math.random();
    setToasts(t=>[...t,{id,msg}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2500);
  },[]);

  const displayApps=useMemo(()=>{
    const base=getSorted(s.apps,s.sort,s.cat);
    if(!query.trim()) return base;
    const q=query.toLowerCase().trim();
    return base.filter(a=>a.name.toLowerCase().includes(q)||a.cat.toLowerCase().includes(q));
  },[s.apps,s.sort,s.cat,query]);

  // reset highlight when list changes
  useEffect(()=>setHlIdx(-1),[displayApps]);

  // keyboard nav
  useEffect(()=>{
    const h=e=>{
      const onList=screen==="home";
      if(e.key==="ArrowDown"&&onList){e.preventDefault();setHlIdx(i=>Math.min(i+1,displayApps.length-1));}
      if(e.key==="ArrowUp"&&onList){e.preventDefault();setHlIdx(i=>Math.max(i-1,0));}
      if(e.key==="Enter"&&onList&&hlIdx>=0&&displayApps[hlIdx]) launch(displayApps[hlIdx]);
      if(e.key==="Escape") goHome();
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[screen,hlIdx,displayApps]);

  // scroll reset
  useEffect(()=>{ bodyRef.current?.scrollTo({top:0,behavior:"instant"}); },[screen,s.cat,s.sort]);

  // auto-focus on home
  useEffect(()=>{ if(screen==="home") setTimeout(()=>inputRef.current?.focus(),100); },[screen]);

  function launch(app) {
    dispatch({type:"LAUNCH",id:app.id});
    setOpenApp({...app,freq:app.freq+1,lastUsed:Date.now()});
    setScreen("app");
    setQuery("");
    setCtx(null);
  }

  function goHome() {
    setScreen("home");
    setOpenApp(null);
    setQuery("");
    setCtx(null);
    setHlIdx(-1);
  }

  function nav(scr) {
    setScreen(scr);
    setQuery("");
    setCtx(null);
    setHlIdx(-1);
  }

  const swipe=useSwipe({
    up:   ()=>{ if(screen==="home") inputRef.current?.focus(); },
    down: ()=>{ if(screen!=="home"&&screen!=="app") goHome(); },
    left: ()=>{ const i=SCREEN_ORDER.indexOf(screen); if(i>0) nav(SCREEN_ORDER[i-1]); },
    right:()=>{ const i=SCREEN_ORDER.indexOf(screen); if(i<SCREEN_ORDER.length-1) nav(SCREEN_ORDER[i+1]); },
  }, s.gestureLock);

  const isHome=screen==="home";
  const nc=s.notifs.length;

  const NAV=[
    {id:"home",   label:"HOME"},
    {id:"recent", label:"RECENT"},
    {id:"stats",  label:"STATS"},
    {id:"notifs", label:nc>0?`NOTIF (${nc})`:"NOTIF"},
    {id:"config", label:"CFG"},
  ];

  return(
    <div {...swipe} onClick={()=>ctx&&setCtx(null)}
      style={{minHeight:"100vh",background:theme.bg,color:theme.fg,display:"flex",flexDirection:"column",
        fontFamily:"'IBM Plex Mono',monospace",position:"relative",overflow:"hidden",touchAction:"pan-y"}}>

      <Toast toasts={toasts} dismiss={id=>setToasts(t=>t.filter(x=>x.id!==id))}/>

      {ctx&&(
        <CtxMenu app={ctx.app} pos={ctx.pos} theme={theme}
          onPin={()=>{dispatch({type:"PIN",id:ctx.app.id});toast(`${ctx.app.name} ${ctx.app.pinned?"unpinned":"pinned"}`);setCtx(null);}}
          onHide={()=>{dispatch({type:"HIDE",id:ctx.app.id});toast(`${ctx.app.name} ${ctx.app.hidden?"shown":"hidden"}`);setCtx(null);}}
          onClose={()=>setCtx(null)}/>
      )}

      {/* STATUS BAR */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"9px 20px 7px",fontSize:9,letterSpacing:"0.14em",color:theme.subtle,
        flexShrink:0,borderBottom:`1px solid ${theme.border}`}}>
        <span style={{color:theme.accent,fontWeight:500,letterSpacing:"0.22em"}}>{THEMES[s.theme].label}</span>
        <span style={{animation:s.showSecs?"txlBlink 1s step-end infinite":undefined}}>{fmtTime(time,s.showSecs)}</span>
        <span>{s.gestureLock?"⊠ LOCK":`${s.apps.filter(a=>!a.hidden).length} APPS`}</span>
      </div>

      {/* CLOCK */}
      {isHome&&(
        <div style={{padding:"18px 20px 8px",flexShrink:0,animation:"txlFadeIn 0.3s ease"}}>
          <div style={{fontSize:"clamp(38px,11vw,70px)",fontWeight:100,letterSpacing:"-0.03em",lineHeight:1,color:theme.fg}}>
            {fmtTime(time,false)}
          </div>
          <div style={{fontSize:10,color:theme.subtle,letterSpacing:"0.15em",marginTop:6}}>{fmtDate(time)}</div>
        </div>
      )}

      {/* SEARCH */}
      {isHome&&(
        <div style={{padding:"6px 20px 0",flexShrink:0}}>
          <input ref={inputRef} value={query}
            onChange={e=>setQuery(e.target.value)}
            placeholder="search apps..."
            spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
            style={{width:"100%",background:"transparent",border:"none",
              borderBottom:`1px solid ${query?theme.accent:theme.border}`,
              color:theme.fg,fontSize:s.fontSize,fontFamily:"'IBM Plex Mono',monospace",
              padding:"8px 0",outline:"none",letterSpacing:"0.04em",transition:"border-color 0.15s"}}/>
        </div>
      )}

      {/* CATEGORY + SORT BAR */}
      {isHome&&(
        <div style={{display:"flex",alignItems:"center",padding:"8px 20px 4px",gap:4,flexShrink:0,overflowX:"auto"}}>
          {CATS.map(c=>(
            <button key={c} onClick={()=>dispatch({type:"CAT",v:c})} style={{
              fontFamily:"'IBM Plex Mono',monospace",fontSize:8,letterSpacing:"0.2em",
              padding:"4px 9px",border:`1px solid ${s.cat===c?theme.accent:theme.border}`,
              background:s.cat===c?theme.accent:"transparent",
              color:s.cat===c?theme.bg:theme.subtle,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
              {c.toUpperCase()}
            </button>
          ))}
          <div style={{marginLeft:"auto",display:"flex",gap:4,flexShrink:0}}>
            {SORTS.map(m=>(
              <button key={m} onClick={()=>dispatch({type:"SORT",v:m})} style={{
                fontFamily:"'IBM Plex Mono',monospace",fontSize:8,letterSpacing:"0.16em",
                padding:"4px 8px",border:`1px solid ${s.sort===m?theme.subtle:theme.border}`,
                background:"transparent",color:s.sort===m?theme.fg:theme.border,cursor:"pointer"}}>
                {m[0].toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SCREEN TITLE */}
      {!isHome&&screen!=="app"&&(
        <div style={{padding:"14px 20px 10px",fontSize:20,fontWeight:100,color:theme.fg,
          letterSpacing:"0.06em",flexShrink:0,borderBottom:`1px solid ${theme.border}`,
          animation:"txlFadeIn 0.2s ease"}}>
          {screen==="recent"?"Recent":screen==="stats"?"Stats":screen==="notifs"?"Notifications":"Config"}
        </div>
      )}

      {/* BODY */}
      <div ref={bodyRef} style={{flex:1,overflowY:"auto",paddingBottom:64}}>

        {isHome&&(
          <>
            {displayApps.length===0&&(
              <div style={{padding:"60px 20px",textAlign:"center",fontSize:11,color:theme.border,letterSpacing:"0.24em"}}>
                NO APPS FOUND
              </div>
            )}
            {displayApps.length>0&&(
              <div style={{padding:"7px 20px 2px",fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:theme.subtle,letterSpacing:"0.22em"}}>
                {displayApps.length} APP{displayApps.length!==1?"S":""} · {s.sort.toUpperCase()}
              </div>
            )}
            {displayApps.map((app,i)=>(
              <div key={app.id}>
                <AppRow app={app} theme={theme} fs={s.fontSize} index={i}
                  onLaunch={launch}
                  onCtx={(a,p)=>{ setCtx({app:a,pos:p}); }}
                  hl={i===hlIdx}/>
                <div style={{height:1,background:theme.border,margin:"0 20px"}}/>
              </div>
            ))}
          </>
        )}

        {screen==="app"&&openApp&&(
          <AppScreen app={openApp} theme={theme} fs={s.fontSize} onBack={goHome}
            onNotif={msg=>{dispatch({type:"NOTIF",msg});toast(msg);}}/>
        )}
        {screen==="recent"&&<RecentScreen recent={s.recent} theme={theme} fs={s.fontSize} onLaunch={launch}/>}
        {screen==="stats"&&<StatsScreen apps={s.apps} theme={theme} time={time} secs={s.showSecs}/>}
        {screen==="notifs"&&<NotifsScreen notifs={s.notifs} theme={theme} dispatch={dispatch}/>}
        {screen==="config"&&<ConfigScreen s={s} dispatch={dispatch} theme={theme}/>}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,
        display:"flex",justifyContent:"space-around",alignItems:"center",
        padding:"9px 4px 14px",background:theme.bg,borderTop:`1px solid ${theme.border}`,zIndex:100}}>
        {NAV.map(({id,label})=>(
          <button key={id} onClick={()=>id==="home"?goHome():nav(id)} style={{
            fontFamily:"'IBM Plex Mono',monospace",fontSize:8,letterSpacing:"0.16em",
            color:screen===id?theme.accent:theme.border,background:"none",border:"none",
            cursor:"pointer",padding:"4px 6px",textTransform:"uppercase",transition:"color 0.1s"}}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
