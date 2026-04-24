/* eslint-disable */
import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from "react";

/* ═══════════════════════════════════════════════════════════════
   TEXT LAUNCHER  —  Pure black, zero icons, real Android launcher
   All touch events use passive listeners + touchAction:manipulation
   so native scroll is NEVER blocked.
═══════════════════════════════════════════════════════════════ */

// ── FONT ─────────────────────────────────────────────────────────────────────
const injectAssets = () => {
  if (document.querySelector("[data-tl]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@100;200;300;400;500&display=swap";
  link.setAttribute("data-tl", "font");
  document.head.appendChild(link);

  const style = document.createElement("style");
  style.setAttribute("data-tl", "css");
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
    html, body, #root { height: 100%; background: #000; overflow: hidden; }
    ::-webkit-scrollbar { width: 0; }
    input { font-family: 'IBM Plex Mono', monospace; }
    input::placeholder { color: #222; }
    button { font-family: 'IBM Plex Mono', monospace; }

    @keyframes fadeUp   { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
    @keyframes slideIn  { from { opacity:0; transform:translateX(-8px)} to { opacity:1; transform:translateX(0) } }
    @keyframes blink    { 0%,49%{opacity:1} 50%,100%{opacity:0} }
    @keyframes toastIn  { 0%{opacity:0;transform:translateX(-50%) translateY(-12px)} 15%{opacity:1;transform:translateX(-50%) translateY(0)} 80%{opacity:1} 100%{opacity:0;transform:translateX(-50%) translateY(-8px)} }
    @keyframes pulse    { 0%,100%{opacity:.6} 50%{opacity:1} }
  `;
  document.head.appendChild(style);
};

// ── APPS DATA ─────────────────────────────────────────────────────────────────
const APPS_DATA = [
  { id:"phone",      name:"Phone",       cat:"system"  },
  { id:"messages",   name:"Messages",    cat:"system"  },
  { id:"camera",     name:"Camera",      cat:"system"  },
  { id:"gallery",    name:"Gallery",     cat:"media"   },
  { id:"browser",    name:"Browser",     cat:"system"  },
  { id:"settings",   name:"Settings",    cat:"system"  },
  { id:"music",      name:"Music",       cat:"media"   },
  { id:"calendar",   name:"Calendar",    cat:"system"  },
  { id:"maps",       name:"Maps",        cat:"system"  },
  { id:"clock",      name:"Clock",       cat:"tools"   },
  { id:"notes",      name:"Notes",       cat:"tools"   },
  { id:"calculator", name:"Calculator",  cat:"tools"   },
  { id:"mail",       name:"Mail",        cat:"system"  },
  { id:"files",      name:"Files",       cat:"system"  },
  { id:"contacts",   name:"Contacts",    cat:"system"  },
  { id:"weather",    name:"Weather",     cat:"tools"   },
  { id:"alarm",      name:"Alarm",       cat:"tools"   },
  { id:"stopwatch",  name:"Stopwatch",   cat:"tools"   },
  { id:"youtube",    name:"YouTube",     cat:"social"  },
  { id:"spotify",    name:"Spotify",     cat:"media"   },
  { id:"twitter",    name:"Twitter",     cat:"social"  },
  { id:"reddit",     name:"Reddit",      cat:"social"  },
  { id:"whatsapp",   name:"WhatsApp",    cat:"social"  },
  { id:"instagram",  name:"Instagram",   cat:"social"  },
  { id:"telegram",   name:"Telegram",    cat:"social"  },
  { id:"discord",    name:"Discord",     cat:"social"  },
  { id:"netflix",    name:"Netflix",     cat:"media"   },
  { id:"amazon",     name:"Amazon",      cat:"tools"   },
  { id:"drive",      name:"Drive",       cat:"tools"   },
  { id:"photos",     name:"Photos",      cat:"media"   },
  { id:"podcasts",   name:"Podcasts",    cat:"media"   },
  { id:"translate",  name:"Translate",   cat:"tools"   },
  { id:"scanner",    name:"Scanner",     cat:"tools"   },
  { id:"health",     name:"Health",      cat:"tools"   },
  { id:"vpn",        name:"VPN",         cat:"tools"   },
];

const CATS  = ["all","system","social","media","tools"];
const SORTS = ["alpha","freq","recent"];

// ── REDUCER ───────────────────────────────────────────────────────────────────
const INIT = {
  apps:     APPS_DATA.map(a=>({...a, freq:0, pinned:false, hidden:false, lastUsed:null})),
  recent:   [],
  notifs:   [],
  theme:    "void",
  fontSize: 15,
  showSecs: true,
  sort:     "alpha",
  cat:      "all",
};

function reducer(s, a) {
  switch (a.type) {
    case "LAUNCH": {
      const now  = Date.now();
      const apps = s.apps.map(x => x.id===a.id ? {...x, freq:x.freq+1, lastUsed:now} : x);
      const hit  = apps.find(x => x.id===a.id);
      return { ...s, apps, recent:[hit,...s.recent.filter(r=>r.id!==a.id)].slice(0,12) };
    }
    case "PIN":       return {...s, apps:s.apps.map(x=>x.id===a.id?{...x,pinned:!x.pinned}:x)};
    case "HIDE":      return {...s, apps:s.apps.map(x=>x.id===a.id?{...x,hidden:!x.hidden}:x)};
    case "FONT":      return {...s, fontSize:Math.max(12,Math.min(22,a.v))};
    case "SORT":      return {...s, sort:a.v};
    case "CAT":       return {...s, cat:a.v};
    case "SECS":      return {...s, showSecs:!s.showSecs};
    case "NOTIF":     return {...s, notifs:[{id:Date.now()+Math.random(),msg:a.msg,ts:Date.now()},...s.notifs].slice(0,30)};
    case "DNOTIF":    return {...s, notifs:s.notifs.filter(n=>n.id!==a.id)};
    case "CLRNOTIF":  return {...s, notifs:[]};
    case "RESET":     return {...s, apps:s.apps.map(x=>({...x,freq:0,lastUsed:null})), recent:[]};
    default:          return s;
  }
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2,"0");

function fmtTime(d, secs) {
  const h  = d.getHours()%12||12;
  const m  = pad(d.getMinutes());
  const s  = pad(d.getSeconds());
  const ap = d.getHours()>=12?"PM":"AM";
  return secs ? `${h}:${m}:${s} ${ap}` : `${h}:${m} ${ap}`;
}
function fmtDate(d) {
  return d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
}
function fmtAgo(ts) {
  if (!ts) return "never";
  const d = Date.now()-ts;
  if (d<60000)   return "just now";
  if (d<3600000) return `${Math.floor(d/60000)}m ago`;
  if (d<86400000)return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}

function getSorted(apps, sort, cat) {
  let list = [...apps].filter(a=>!a.hidden);
  if (cat!=="all") list = list.filter(a=>a.cat===cat);
  const cmp = sort==="alpha"  ? (a,b)=>a.name.localeCompare(b.name)
            : sort==="freq"   ? (a,b)=>b.freq-a.freq
            :                   (a,b)=>(b.lastUsed||0)-(a.lastUsed||0);
  return [...list.filter(a=>a.pinned).sort(cmp), ...list.filter(a=>!a.pinned).sort(cmp)];
}

// ── HOOKS ─────────────────────────────────────────────────────────────────────
function useTick(secs) {
  const [t,setT] = useState(new Date());
  useEffect(()=>{
    const id = setInterval(()=>setT(new Date()), secs?1000:60000);
    return ()=>clearInterval(id);
  },[secs]);
  return t;
}

// ── SAFE TAP ──────────────────────────────────────────────────────────────────
// THE FIX: We track startY. If finger moves >8px = scroll = no launch.
// We NEVER call e.preventDefault() so browser scroll is always free.
// touchAction:"manipulation" tells browser to handle scroll natively.
function useSafeTap(onTap) {
  const ref     = useRef(null);
  const startY  = useRef(null);
  const startX  = useRef(null);
  const scrolled = useRef(false);

  useEffect(()=>{
    const el = ref.current;
    if (!el) return;

    function onTouchStart(e) {
      startY.current   = e.touches[0].clientY;
      startX.current   = e.touches[0].clientX;
      scrolled.current = false;
    }
    function onTouchMove(e) {
      if (startY.current===null) return;
      const dy = Math.abs(e.touches[0].clientY - startY.current);
      const dx = Math.abs(e.touches[0].clientX - startX.current);
      if (dy>8 || dx>8) scrolled.current = true;
    }
    function onTouchEnd() {
      if (!scrolled.current && startY.current!==null) onTap();
      startY.current = null;
      startX.current = null;
      scrolled.current = false;
    }
    function onTouchCancel() {
      startY.current = null;
      scrolled.current = false;
    }

    // ← passive:true means we NEVER block scroll
    el.addEventListener("touchstart",  onTouchStart,  { passive:true });
    el.addEventListener("touchmove",   onTouchMove,   { passive:true });
    el.addEventListener("touchend",    onTouchEnd,    { passive:true });
    el.addEventListener("touchcancel", onTouchCancel, { passive:true });
    el.addEventListener("click",       onTap);

    return () => {
      el.removeEventListener("touchstart",  onTouchStart);
      el.removeEventListener("touchmove",   onTouchMove);
      el.removeEventListener("touchend",    onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
      el.removeEventListener("click",       onTap);
    };
  }, [onTap]);

  return ref;
}

// ── COLORS ────────────────────────────────────────────────────────────────────
const T = {
  bg:      "#000000",
  fg:      "#e0e0e0",
  accent:  "#00ff88",
  dim:     "#080808",
  muted:   "#0f0f0f",
  border:  "#141414",
  subtle:  "#2a2a2a",
  faint:   "#1a1a1a",
  mid:     "#444444",
};

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ toasts, dismiss }) {
  return (
    <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",
      zIndex:9999,display:"flex",flexDirection:"column",gap:4,alignItems:"center",
      paddingTop:10,pointerEvents:"none"}}>
      {toasts.map(t=>(
        <div key={t.id} onClick={()=>dismiss(t.id)}
          style={{background:T.accent,color:"#000",fontFamily:"'IBM Plex Mono',monospace",
            fontSize:10,letterSpacing:"0.2em",padding:"7px 20px",whiteSpace:"nowrap",
            pointerEvents:"auto",cursor:"pointer",
            animation:"toastIn 2.5s ease forwards"}}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── CONTEXT MENU ──────────────────────────────────────────────────────────────
function CtxMenu({ app, pos, onPin, onHide, onClose }) {
  const ref = useRef(null);
  useEffect(()=>{
    const h = e => { if(ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown",h);
    document.addEventListener("touchstart",h,{passive:true});
    return ()=>{ document.removeEventListener("mousedown",h); document.removeEventListener("touchstart",h); };
  },[onClose]);

  const top  = Math.min(pos.y, window.innerHeight-170);
  const left = Math.min(pos.x, window.innerWidth-200);

  return (
    <div ref={ref} style={{position:"fixed",top,left,background:T.muted,
      border:`1px solid ${T.subtle}`,zIndex:8888,minWidth:190,
      boxShadow:"0 16px 48px rgba(0,0,0,.95)"}}>
      <div style={{padding:"8px 16px 6px",fontSize:9,color:T.mid,letterSpacing:"0.26em",
        borderBottom:`1px solid ${T.border}`,fontFamily:"'IBM Plex Mono',monospace"}}>
        {app.name.toUpperCase()}
      </div>
      {[
        { label: app.pinned?"UNPIN":"PIN TO TOP", color:T.accent, fn:onPin },
        { label: app.hidden?"UNHIDE":"HIDE APP",  color:"#ff4455", fn:onHide },
        { label: "CANCEL",                         color:T.mid,    fn:onClose },
      ].map(({label,color,fn},i,arr)=>(
        <div key={label} onClick={fn}
          style={{padding:"12px 16px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
            letterSpacing:"0.14em",color,cursor:"pointer",
            borderBottom:i<arr.length-1?`1px solid ${T.border}`:"none"}}>
          {label}
        </div>
      ))}
    </div>
  );
}

// ── APP ROW ───────────────────────────────────────────────────────────────────
function AppRow({ app, fs, onLaunch, onCtx, hl, index }) {
  const [active, setActive] = useState(false);

  const tapCb = useCallback(()=>onLaunch(app), [app, onLaunch]);
  const tapRef = useSafeTap(tapCb);

  // visual press via separate touch start/end (passive, no launch logic)
  useEffect(()=>{
    const el = tapRef.current;
    if (!el) return;
    const dn = ()=>setActive(true);
    const up = ()=>setActive(false);
    el.addEventListener("touchstart", dn, {passive:true});
    el.addEventListener("touchend",   up, {passive:true});
    el.addEventListener("touchcancel",up, {passive:true});
    el.addEventListener("mousedown",  dn);
    el.addEventListener("mouseup",    up);
    el.addEventListener("mouseleave", up);
    return ()=>{
      el.removeEventListener("touchstart", dn);
      el.removeEventListener("touchend",   up);
      el.removeEventListener("touchcancel",up);
      el.removeEventListener("mousedown",  dn);
      el.removeEventListener("mouseup",    up);
      el.removeEventListener("mouseleave", up);
    };
  },[]);

  return (
    <div
      ref={tapRef}
      onContextMenu={e=>{e.preventDefault();onCtx(app,{x:e.clientX,y:e.clientY});}}
      onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onLaunch(app);}}
      tabIndex={0}
      role="button"
      aria-label={`Open ${app.name}`}
      style={{
        display:"flex", alignItems:"center",
        padding:`${Math.round(fs*0.72)}px 20px`,
        background: active ? T.faint : hl ? T.dim : "transparent",
        cursor:"pointer",
        borderLeft:`2px solid ${hl?T.accent:"transparent"}`,
        outline:"none",
        userSelect:"none",
        WebkitUserSelect:"none",
        touchAction:"manipulation",  // ← key: lets browser handle scroll
        transition:"background .06s,border-color .06s",
        animation:`slideIn 0.18s ease ${Math.min(index*0.015,0.3)}s both`,
      }}>
      {/* pin dot — text only */}
      <div style={{width:14,flexShrink:0,fontFamily:"'IBM Plex Mono',monospace",
        fontSize:9,color:app.pinned?T.accent:"transparent",lineHeight:1}}>
        {app.pinned?"▸":"."}
      </div>

      <div style={{flex:1,minWidth:0,paddingLeft:8}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:fs,
          fontWeight:app.pinned?400:300,
          color:hl?T.accent:T.fg,letterSpacing:"0.03em",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {app.name}
        </div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
          color:app.freq>0?T.mid:"#1e1e1e",letterSpacing:"0.16em",marginTop:1}}>
          {app.cat.toUpperCase()}
          {app.freq>0?` · ${app.freq}× · ${fmtAgo(app.lastUsed)}`:""}
        </div>
      </div>

      <div style={{fontSize:10,color:T.subtle,fontFamily:"'IBM Plex Mono',monospace",
        flexShrink:0,paddingLeft:8}}>›</div>
    </div>
  );
}

// ── APP OPEN SCREEN ───────────────────────────────────────────────────────────
function AppScreen({ app, fs, onBack, onNotif }) {
  const [done, setDone] = useState(false);

  const launchCb = useCallback(()=>{
    if (!done) { setDone(true); onNotif(`${app.name} opened`); }
  },[done,app,onNotif]);
  const backCb   = useCallback(()=>onBack(),[onBack]);

  const launchRef = useSafeTap(launchCb);
  const backRef   = useSafeTap(backCb);

  const btn = {
    fontFamily:"'IBM Plex Mono',monospace",fontSize:11,letterSpacing:"0.22em",
    padding:"13px 0",width:"100%",maxWidth:260,cursor:"pointer",border:"none",display:"block",
    margin:"0 auto",
  };

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",gap:16,padding:"40px 28px",
      animation:"fadeUp 0.2s ease"}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.mid,letterSpacing:"0.3em"}}>
        {app.cat.toUpperCase()}
      </div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",
        fontSize:Math.round(fs*2.6),fontWeight:100,color:T.fg,
        letterSpacing:"-0.02em",textAlign:"center",lineHeight:1.1}}>
        {app.name}
      </div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.mid,letterSpacing:"0.2em"}}>
        LAUNCHED {app.freq}× — {fmtAgo(app.lastUsed)}
      </div>
      <div style={{width:"100%",maxWidth:260,height:1,background:T.border,margin:"6px 0"}}/>
      <div ref={launchRef}
        style={{...btn,border:`1px solid ${done?T.accent:T.border}`,
          background:done?T.accent:"transparent",color:done?T.bg:T.fg,
          textAlign:"center",lineHeight:"1",
          transition:"all 0.15s",touchAction:"manipulation"}}>
        {done?"LAUNCHED ✓":"LAUNCH"}
      </div>
      <div ref={backRef}
        style={{...btn,border:`1px solid ${T.border}`,background:"transparent",
          color:T.mid,textAlign:"center",lineHeight:"1",touchAction:"manipulation"}}>
        ← BACK
      </div>
    </div>
  );
}

// ── RECENT SCREEN ─────────────────────────────────────────────────────────────
function RecentRow({ app, fs, onLaunch }) {
  const cb  = useCallback(()=>onLaunch(app),[app,onLaunch]);
  const ref = useSafeTap(cb);
  return (
    <div ref={ref} style={{display:"flex",alignItems:"center",
      padding:`${Math.round(fs*0.72)}px 20px`,cursor:"pointer",touchAction:"manipulation"}}>
      <div style={{flex:1}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:fs,color:T.fg,fontWeight:300}}>
          {app.name}
        </div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.mid,
          letterSpacing:"0.18em",marginTop:1}}>
          {fmtAgo(app.lastUsed)} · {app.freq}× total
        </div>
      </div>
      <div style={{fontSize:10,color:T.subtle,fontFamily:"'IBM Plex Mono',monospace"}}>›</div>
    </div>
  );
}

function RecentScreen({ recent, fs, onLaunch }) {
  if (!recent.length) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",gap:8}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:T.subtle,letterSpacing:"0.3em"}}>
        NO RECENT APPS
      </div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.border,letterSpacing:"0.2em"}}>
        launch something first
      </div>
    </div>
  );
  return (
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:70}}>
      <Label>RECENT · {recent.length}</Label>
      {recent.map((app,i)=>(
        <div key={app.id}>
          <RecentRow app={app} fs={fs} onLaunch={onLaunch}/>
          {i<recent.length-1&&<Divider/>}
        </div>
      ))}
    </div>
  );
}

// ── STATS SCREEN ──────────────────────────────────────────────────────────────
function StatsScreen({ apps, time, secs }) {
  const top    = [...apps].sort((a,b)=>b.freq-a.freq).filter(a=>a.freq>0).slice(0,6);
  const totalL = apps.reduce((s,a)=>s+a.freq,0);

  const Card=({title,children})=>(
    <div style={{margin:"8px 16px",border:`1px solid ${T.border}`,padding:"18px",background:T.dim}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.mid,
        letterSpacing:"0.26em",marginBottom:14}}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:70}}>
      <Card title="CLOCK">
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:30,fontWeight:100,color:T.fg,
          letterSpacing:"-0.02em",animation:secs?"blink 1s step-end infinite":undefined}}>
          {fmtTime(time,secs)}
        </div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.mid,
          letterSpacing:"0.1em",marginTop:6}}>{fmtDate(time)}</div>
      </Card>

      <Card title="USAGE">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {[["APPS",apps.length,false],["LAUNCHES",totalL,true],
            ["PINNED",apps.filter(a=>a.pinned).length,false],
            ["HIDDEN",apps.filter(a=>a.hidden).length,false]
          ].map(([l,v,ac])=>(
            <div key={l}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.mid,letterSpacing:"0.22em"}}>{l}</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:26,fontWeight:100,
                color:ac?T.accent:T.fg,lineHeight:1.1,marginTop:2}}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      {top.length>0&&(
        <Card title="TOP APPS">
          {top.map((a,i)=>(
            <div key={a.id} style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",padding:"6px 0",
              borderBottom:i<top.length-1?`1px solid ${T.border}`:"none"}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:T.fg,fontWeight:300}}>
                {a.name}
              </div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:T.accent}}>
                {a.freq}×
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card title="BY CATEGORY">
        {CATS.slice(1).map(c=>{
          const count   = apps.filter(a=>a.cat===c).length;
          const launches= apps.filter(a=>a.cat===c).reduce((s,a)=>s+a.freq,0);
          return (
            <div key={c} style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:T.fg,letterSpacing:"0.1em"}}>
                {c.toUpperCase()}
              </div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.mid}}>
                {count} · {launches} launches
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ── NOTIFS SCREEN ─────────────────────────────────────────────────────────────
function NotifsScreen({ notifs, dispatch }) {
  if (!notifs.length) return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:T.subtle,letterSpacing:"0.3em"}}>
        NO NOTIFICATIONS
      </div>
    </div>
  );
  return (
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:70}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"10px 20px 6px"}}>
        <Label>NOTIFICATIONS · {notifs.length}</Label>
        <button onClick={()=>dispatch({type:"CLRNOTIF"})}
          style={{fontSize:9,letterSpacing:"0.16em",background:"none",
            border:`1px solid ${T.border}`,color:T.mid,cursor:"pointer",
            padding:"3px 10px",marginRight:20}}>
          CLEAR ALL
        </button>
      </div>
      {notifs.map((n,i)=>(
        <div key={n.id} style={{padding:"12px 20px",borderBottom:`1px solid ${T.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"flex-start",
          animation:`slideIn 0.15s ease ${i*0.02}s both`}}>
          <div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:T.fg,fontWeight:300}}>
              {n.msg}
            </div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.mid,
              marginTop:3,letterSpacing:"0.18em"}}>{fmtAgo(n.ts)}</div>
          </div>
          <button onClick={()=>dispatch({type:"DNOTIF",id:n.id})}
            style={{background:"none",border:"none",color:T.mid,cursor:"pointer",
              fontSize:18,padding:"0 2px",lineHeight:1}}>×</button>
        </div>
      ))}
    </div>
  );
}

// ── CONFIG SCREEN ─────────────────────────────────────────────────────────────
function ConfigScreen({ s, dispatch }) {
  const Row=({label,children})=>(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"13px 20px",borderBottom:`1px solid ${T.border}`,gap:12,flexWrap:"wrap"}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:T.fg,letterSpacing:"0.05em"}}>{label}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{children}</div>
    </div>
  );
  const Btn=({label,on,fn})=>(
    <button onClick={fn} style={{fontSize:9,letterSpacing:"0.16em",
      padding:"5px 10px",border:`1px solid ${on?T.accent:T.border}`,
      background:on?T.accent:"transparent",color:on?T.bg:T.mid,cursor:"pointer"}}>
      {label}
    </button>
  );
  return (
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:70}}>
      <Label>DISPLAY</Label>
      <Row label="Font size">
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>dispatch({type:"FONT",v:s.fontSize-1})}
            style={{background:"none",border:`1px solid ${T.border}`,color:T.fg,
              padding:"4px 12px",cursor:"pointer",fontSize:14}}>−</button>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",color:T.fg,fontSize:12,
            minWidth:24,textAlign:"center"}}>{s.fontSize}</span>
          <button onClick={()=>dispatch({type:"FONT",v:s.fontSize+1})}
            style={{background:"none",border:`1px solid ${T.border}`,color:T.fg,
              padding:"4px 12px",cursor:"pointer",fontSize:14}}>+</button>
        </div>
      </Row>
      <Row label="Show seconds">
        <Btn label={s.showSecs?"ON":"OFF"} on={s.showSecs} fn={()=>dispatch({type:"SECS"})}/>
      </Row>

      <Label>SORT</Label>
      <Row label="Sort apps by">
        {SORTS.map(m=>(
          <Btn key={m} label={m.toUpperCase()} on={s.sort===m} fn={()=>dispatch({type:"SORT",v:m})}/>
        ))}
      </Row>

      <Label>DATA</Label>
      <Row label="Reset usage">
        <button onClick={()=>dispatch({type:"RESET"})}
          style={{fontSize:9,letterSpacing:"0.16em",padding:"5px 14px",
            border:"1px solid #ff4455",background:"transparent",color:"#ff4455",cursor:"pointer"}}>
          RESET
        </button>
      </Row>

      <div style={{padding:"40px 20px",fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
        color:T.border,letterSpacing:"0.2em",textAlign:"center",lineHeight:2}}>
        TEXT LAUNCHER v3.0<br/>ZERO ICONS · PURE BLACK<br/>REAL ANDROID LAUNCHER
      </div>
    </div>
  );
}

// ── SMALL HELPERS ─────────────────────────────────────────────────────────────
const Divider = ()=><div style={{height:1,background:T.border,margin:"0 20px"}}/>;
const Label   = ({children})=>(
  <div style={{padding:"10px 20px 4px",fontFamily:"'IBM Plex Mono',monospace",
    fontSize:8,color:T.mid,letterSpacing:"0.28em"}}>{children}</div>
);

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function Launcher() {
  useEffect(()=>injectAssets(),[]);

  const [s, dispatch] = useReducer(reducer, INIT);
  const time = useTick(s.showSecs);

  const [screen,   setScreen]  = useState("home");
  const [openApp,  setOpenApp]  = useState(null);
  const [query,    setQuery]    = useState("");
  const [toasts,   setToasts]   = useState([]);
  const [ctx,      setCtx]      = useState(null);
  const [hlIdx,    setHlIdx]    = useState(-1);

  const inputRef = useRef(null);
  const bodyRef  = useRef(null);

  const toast = useCallback((msg)=>{
    const id = Date.now()+Math.random();
    setToasts(t=>[...t,{id,msg}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 2600);
  },[]);

  const displayApps = useMemo(()=>{
    const base = getSorted(s.apps, s.sort, s.cat);
    if (!query.trim()) return base;
    const q = query.toLowerCase().trim();
    return base.filter(a=>a.name.toLowerCase().includes(q)||a.cat.toLowerCase().includes(q));
  },[s.apps, s.sort, s.cat, query]);

  // reset highlight on list change
  useEffect(()=>setHlIdx(-1),[displayApps]);

  // keyboard nav
  useEffect(()=>{
    const h = e => {
      if (screen!=="home") return;
      if (e.key==="ArrowDown"){e.preventDefault();setHlIdx(i=>Math.min(i+1,displayApps.length-1));}
      if (e.key==="ArrowUp")  {e.preventDefault();setHlIdx(i=>Math.max(i-1,0));}
      if (e.key==="Enter"&&hlIdx>=0&&displayApps[hlIdx]) launch(displayApps[hlIdx]);
      if (e.key==="Escape") goHome();
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[screen,hlIdx,displayApps]);

  // scroll reset
  useEffect(()=>{
    bodyRef.current?.scrollTo({top:0,behavior:"instant"});
  },[screen,s.cat,s.sort]);

  // auto focus
  useEffect(()=>{
    if (screen==="home") setTimeout(()=>inputRef.current?.focus(),80);
  },[screen]);

  // Android back button support
  useEffect(()=>{
    const h = ()=>{ if(screen!=="home"){goHome();return false;}};
    document.addEventListener("backbutton",h);
    return ()=>document.removeEventListener("backbutton",h);
  },[screen]);

  function launch(app) {
    dispatch({type:"LAUNCH", id:app.id});
    setOpenApp({...app, freq:app.freq+1, lastUsed:Date.now()});
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

  const isHome = screen==="home";
  const nc     = s.notifs.length;

  const NAV = [
    {id:"home",   label:"HOME"},
    {id:"recent", label:"RECENT"},
    {id:"stats",  label:"STATS"},
    {id:"notifs", label:nc>0?`NOTIF(${nc})`:"NOTIF"},
    {id:"config", label:"CFG"},
  ];

  return (
    <div style={{position:"fixed",inset:0,background:T.bg,color:T.fg,
      display:"flex",flexDirection:"column",fontFamily:"'IBM Plex Mono',monospace",
      overflow:"hidden"}}
      onClick={()=>ctx&&setCtx(null)}>

      <Toast toasts={toasts} dismiss={id=>setToasts(t=>t.filter(x=>x.id!==id))}/>

      {ctx&&(
        <CtxMenu app={ctx.app} pos={ctx.pos}
          onPin={()=>{dispatch({type:"PIN",id:ctx.app.id});
            toast(`${ctx.app.name} ${ctx.app.pinned?"unpinned":"pinned"}`);setCtx(null);}}
          onHide={()=>{dispatch({type:"HIDE",id:ctx.app.id});
            toast(`${ctx.app.name} ${ctx.app.hidden?"shown":"hidden"}`);setCtx(null);}}
          onClose={()=>setCtx(null)}/>
      )}

      {/* ── STATUS BAR ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"10px 20px 8px",fontSize:9,letterSpacing:"0.14em",color:T.mid,
        flexShrink:0,borderBottom:`1px solid ${T.border}`}}>
        <span style={{color:T.accent,fontWeight:500,letterSpacing:"0.22em"}}>TXT</span>
        <span>{fmtTime(time,s.showSecs)}</span>
        <span>{s.apps.filter(a=>!a.hidden).length} APPS</span>
      </div>

      {/* ── CLOCK (home only) ── */}
      {isHome&&(
        <div style={{padding:"16px 20px 6px",flexShrink:0,animation:"fadeUp 0.3s ease"}}>
          <div style={{fontSize:"clamp(36px,10vw,66px)",fontWeight:100,
            letterSpacing:"-0.03em",lineHeight:1,color:T.fg}}>
            {fmtTime(time,false)}
          </div>
          <div style={{fontSize:10,color:T.mid,letterSpacing:"0.15em",marginTop:5}}>
            {fmtDate(time)}
          </div>
        </div>
      )}

      {/* ── SEARCH ── */}
      {isHome&&(
        <div style={{padding:"6px 20px 0",flexShrink:0}}>
          <input ref={inputRef} value={query}
            onChange={e=>setQuery(e.target.value)}
            placeholder="search apps..."
            spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
            style={{width:"100%",background:"transparent",border:"none",
              borderBottom:`1px solid ${query?T.accent:T.border}`,
              color:T.fg,fontSize:s.fontSize,padding:"8px 0",
              outline:"none",letterSpacing:"0.04em",transition:"border-color .15s"}}/>
        </div>
      )}

      {/* ── CATEGORY + SORT ── */}
      {isHome&&(
        <div style={{display:"flex",alignItems:"center",padding:"8px 20px 4px",
          gap:4,flexShrink:0,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          {CATS.map(c=>(
            <button key={c} onClick={()=>dispatch({type:"CAT",v:c})}
              style={{fontSize:8,letterSpacing:"0.2em",
                padding:"4px 9px",border:`1px solid ${s.cat===c?T.accent:T.border}`,
                background:s.cat===c?T.accent:"transparent",
                color:s.cat===c?T.bg:T.mid,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
              {c.toUpperCase()}
            </button>
          ))}
          <div style={{marginLeft:"auto",display:"flex",gap:4,flexShrink:0}}>
            {SORTS.map(m=>(
              <button key={m} onClick={()=>dispatch({type:"SORT",v:m})}
                style={{fontSize:8,letterSpacing:"0.16em",
                  padding:"4px 8px",border:`1px solid ${s.sort===m?T.mid:T.border}`,
                  background:"transparent",color:s.sort===m?T.fg:T.border,cursor:"pointer"}}>
                {m[0].toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── SCREEN TITLE ── */}
      {!isHome&&screen!=="app"&&(
        <div style={{padding:"14px 20px 10px",fontSize:20,fontWeight:100,color:T.fg,
          letterSpacing:"0.06em",flexShrink:0,borderBottom:`1px solid ${T.border}`,
          animation:"fadeUp 0.2s ease"}}>
          {screen==="recent"?"Recent":screen==="stats"?"Stats":
           screen==="notifs"?"Notifications":"Config"}
        </div>
      )}

      {/* ── BODY ── */}
      <div ref={bodyRef} style={{flex:1,overflowY:"auto",
        WebkitOverflowScrolling:"touch",paddingBottom:62}}>

        {/* Home app list */}
        {isHome&&(
          <>
            {displayApps.length===0&&(
              <div style={{padding:"60px 20px",textAlign:"center",fontSize:11,
                color:T.subtle,letterSpacing:"0.24em"}}>NO APPS FOUND</div>
            )}
            {displayApps.length>0&&(
              <div style={{padding:"7px 20px 2px",fontSize:8,color:T.mid,letterSpacing:"0.22em"}}>
                {displayApps.length} APP{displayApps.length!==1?"S":""} · {s.sort.toUpperCase()}
              </div>
            )}
            {displayApps.map((app,i)=>(
              <div key={app.id}>
                <AppRow app={app} fs={s.fontSize} index={i}
                  onLaunch={launch}
                  onCtx={(a,p)=>setCtx({app:a,pos:p})}
                  hl={i===hlIdx}/>
                <Divider/>
              </div>
            ))}
          </>
        )}

        {screen==="app"&&openApp&&(
          <AppScreen app={openApp} fs={s.fontSize} onBack={goHome}
            onNotif={msg=>{dispatch({type:"NOTIF",msg});toast(msg);}}/>
        )}
        {screen==="recent"&&<RecentScreen recent={s.recent} fs={s.fontSize} onLaunch={launch}/>}
        {screen==="stats" &&<StatsScreen  apps={s.apps} time={time} secs={s.showSecs}/>}
        {screen==="notifs"&&<NotifsScreen notifs={s.notifs} dispatch={dispatch}/>}
        {screen==="config"&&<ConfigScreen s={s} dispatch={dispatch}/>}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{display:"flex",justifyContent:"space-around",alignItems:"center",
        padding:"9px 4px 14px",background:T.bg,borderTop:`1px solid ${T.border}`,
        flexShrink:0}}>
        {NAV.map(({id,label})=>(
          <button key={id} onClick={()=>id==="home"?goHome():nav(id)}
            style={{fontSize:8,letterSpacing:"0.16em",
              color:screen===id?T.accent:T.border,background:"none",border:"none",
              cursor:"pointer",padding:"4px 6px",textTransform:"uppercase",
              transition:"color .1s"}}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
