import { useState, useEffect, useMemo, useRef, useCallback } from "react";

// ─── SEED DATA (FALLBACK IF FETCH FAILS) ──────────────────────────────────────
const now = Date.now();
const H = 3600000, D = 86400000;
const SEED = [
  { id:"s1",  headline:"John Deere ExactShot cuts nitrogen use 60% via single-seed micro-dosing at 8mph planting speed", summary:"Starter fertilizer delivered directly to individual seeds eliminates broadcast waste — 40,000+ commercial acres validated in 2025 season across US Midwest.", url:"#", category:"Field Robotics", entities:["John Deere","ExactShot","VRT"], confidence:"high", timestamp:new Date(now-0.6*H).toISOString() },
  { id:"s2",  headline:"Carbon Robotics Gen-4 LaserWeeder achieves 200,000 weed kills/hr with RT-DETR on Jetson Orin NX at 1.2ms latency", summary:"256-nozzle AI vision array validated at 98.4% precision across 120 commercial farms in CA/OR/WA — zero herbicide on enrolled acres.", url:"#", category:"Vision AI", entities:["Carbon Robotics","RT-DETR","Jetson Orin"], confidence:"high", timestamp:new Date(now-2.3*H).toISOString() },
  { id:"s3",  headline:"Indigo Ag SAR-fusion soil carbon MRV reaches ±0.08% SOC precision at 10m resolution across 2.1M monitored acres", summary:"Multi-spectral pipeline secures $12M USDA NIFA validation grant; enables direct integration with voluntary carbon markets at $50/tonne verified credit.", url:"#", category:"Soil Informatics", entities:["Indigo Ag","USDA NIFA","SAR","SOC"], confidence:"high", timestamp:new Date(now-4.1*H).toISOString() },
  { id:"s4",  headline:"Halter virtual fencing logs 2M+ cattle-hours at <0.3% breach rate across 1,200 NZ/AU farms — Series C at $100M closes", summary:"GPS collar edge-inference system now manages 180,000 head; behavioral model trained on 4B+ GPS waypoints enables automated rotational grazing prescription.", url:"#", category:"Livestock Automation", entities:["Halter","Virtual Fencing","Edge AI"], confidence:"high", timestamp:new Date(now-7.2*H).toISOString() },
  { id:"s5",  headline:"Bowery Farming Chapter 7 assets acquired at $6.5M — third major vertical farm collapse in 18 months as unit energy costs remain unresolved", summary:"CEA sector energy economics breach 4 kWh/kg threshold for leafy greens in controlled environments; AppHarvest restructuring entity absorbs IP portfolio.", url:"#", category:"CEA", entities:["Bowery Farming","AppHarvest","Vertical Farming"], confidence:"high", timestamp:new Date(now-10.5*H).toISOString() }
];

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id:"all",               label:"All Feed" },
  { id:"Field Robotics",    label:"Field Robotics" },
  { id:"Vision AI",         label:"Vision AI" },
  { id:"Soil Informatics",  label:"Soil" },
  { id:"Livestock Automation", label:"Livestock" },
  { id:"CEA",               label:"CEA" },
  { id:"Pollinator Intel",  label:"Pollinator" },
  { id:"Remote Sensing",    label:"Satellite" },
  { id:"Markets",           label:"Markets" },
  { id:"Policy",            label:"Policy" },
  { id:"Digital Twins",     label:"Dig. Twins" },
  { id:"Synthetic Bio",     label:"Syn. Bio" },
  { id:"Climate AgTech",    label:"Climate" },
];

const VIEW_MODES = ["4h","day","week","month","year"];
const VIEW_LABELS = { "4h":"4H", day:"DAY", week:"WK", month:"MO", year:"YR" };

const CAT_ACCENT = {
  "Field Robotics":       "#10b981",
  "Vision AI":            "#06b6d4",
  "Soil Informatics":     "#d97706",
  "Livestock Automation": "#f59e0b",
  "CEA":                  "#8b5cf6",
  "Pollinator Intel":     "#eab308",
  "Remote Sensing":       "#3b82f6",
  "Markets":              "#f97316",
  "Policy":               "#ec4899",
  "Digital Twins":        "#6366f1",
  "Synthetic Bio":        "#14b8a6",
  "Climate AgTech":       "#22c55e",
};

const CONF = {
  high:   { c:"#34d399", bg:"rgba(52,211,153,0.1)",  bd:"rgba(52,211,153,0.22)" },
  medium: { c:"#60a5fa", bg:"rgba(96,165,250,0.1)",  bd:"rgba(96,165,250,0.22)" },
  low:    { c:"#f87171", bg:"rgba(248,113,113,0.1)", bd:"rgba(248,113,113,0.22)" },
};

// ─── TEMPORAL GROUPING ────────────────────────────────────────────────────────
const bucket = (ts, mode) => {
  const diff = Date.now() - new Date(ts).getTime();
  const H2 = 3600000, D2 = 86400000;
  const date = new Date(ts);
  const fmt  = d => d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  const fmtD = (d, o) => d.toLocaleDateString([], o);

  if (mode === "4h") {
    const bi = Math.floor(diff / (4*H2));
    const s  = new Date(Date.now() - (bi+1)*4*H2);
    const e  = new Date(Date.now() - bi*4*H2);
    const labels = ["0–4H // LIVE","4–8H WINDOW","8–12H WINDOW","12–16H","16–20H","20–24H"];
    return { key:`b${bi}`, label:labels[bi]||`${bi*4}H AGO`, sub:`${fmt(s)} → ${fmt(e)}`, order:bi };
  }
  if (mode === "day") {
    const di = Math.floor(diff / D2);
    if (di===0) return { key:"today",     label:"TODAY",     sub:fmtD(date,{weekday:"long",month:"long",day:"numeric"}), order:0 };
    if (di===1) return { key:"yesterday", label:"YESTERDAY", sub:fmtD(date,{weekday:"long",month:"long",day:"numeric"}), order:1 };
    return { key:`d${di}`, label:`${di}D AGO`, sub:fmtD(date,{weekday:"short",month:"short",day:"numeric"}), order:di };
  }
  if (mode === "week") {
    const wi = Math.floor(diff / (7*D2));
    const s  = new Date(Date.now() - (wi+1)*7*D2);
    const e  = new Date(Date.now() - wi*7*D2);
    const fw = d => fmtD(d,{month:"short",day:"numeric"});
    if (wi===0) return { key:"wk0", label:"THIS WEEK", sub:`${fw(s)} – ${fw(e)}`, order:0 };
    if (wi===1) return { key:"wk1", label:"LAST WEEK", sub:`${fw(s)} – ${fw(e)}`, order:1 };
    return { key:`wk${wi}`, label:`W-${wi}`, sub:`${fw(s)} – ${fw(e)}`, order:wi };
  }
  if (mode === "month") {
    const n2 = new Date();
    const mi = (n2.getFullYear()-date.getFullYear())*12 + (n2.getMonth()-date.getMonth());
    const sub = fmtD(date,{month:"long",year:"numeric"}).toUpperCase();
    if (mi===0) return { key:"m0", label:"THIS MONTH", sub, order:0 };
    if (mi===1) return { key:"m1", label:"LAST MONTH", sub, order:1 };
    return { key:`m${mi}`, label:`${mi}MO AGO`, sub, order:mi };
  }
  if (mode === "year") {
    const yr = date.getFullYear();
    const yi = new Date().getFullYear() - yr;
    if (yi===0) return { key:`y${yr}`, label:`${yr} // THIS YEAR`, sub:"Current annual index", order:0 };
    if (yi===1) return { key:`y${yr}`, label:`${yr} // LAST YEAR`, sub:"Full annual archive", order:1 };
    return { key:`y${yr}`, label:String(yr), sub:`${yr} archive`, order:yi };
  }
  return { key:"all", label:"ALL TIME", sub:"", order:0 };
};

const relTime = ts => {
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d/60000);
  if (m<1)  return "just now";
  if (m<60) return `${m}m`;
  const h = Math.floor(m/60);
  if (h<24) return `${h}h`;
  const dy = Math.floor(h/24);
  if (dy<7) return `${dy}d`;
  const w = Math.floor(dy/7);
  if (w<5)  return `${w}w`;
  const mo = Math.floor(dy/30);
  if (mo<12) return `${mo}mo`;
  return `${Math.floor(mo/12)}y`;
};

// ─── ARTICLE CARD ─────────────────────────────────────────────────────────────
function Card({ item, idx }) {
  const [open, setOpen] = useState(false);
  const [hov, setHov]   = useState(false);
  const conf = CONF[(item.confidence||"high").toLowerCase()] || CONF.high;
  const acc  = CAT_ACCENT[item.category] || "#94a3b8";

  return (
    <div
      onClick={() => setOpen(v => !v)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:"relative", borderRadius:22, cursor:"pointer", overflow:"hidden",
        background: hov
          ? "linear-gradient(145deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.025) 100%)"
          : "linear-gradient(145deg, rgba(255,255,255,0.052) 0%, rgba(255,255,255,0.014) 100%)",
        backdropFilter:"blur(32px) saturate(240%)",
        WebkitBackdropFilter:"blur(32px) saturate(240%)",
        border:`1px solid ${hov ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.09)"}`,
        boxShadow: hov
          ? `inset 0 1px 0 rgba(255,255,255,0.25), 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${acc}22`
          : "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 24px rgba(0,0,0,0.4)",
        transition:"all 0.28s cubic-bezier(0.4,0,0.2,1)",
        animationDelay:`${idx*60}ms`,
      }}
    >
      <div style={{
        position:"absolute", left:0, top:0, bottom:0, width:3, borderRadius:"22px 0 0 22px",
        background:`linear-gradient(180deg, ${acc} 0%, ${acc}44 60%, transparent 100%)`,
      }}/>

      <div style={{
        position:"absolute", top:0, left:"5%", right:"5%", height:1,
        background:"linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.28) 50%, transparent 100%)",
        opacity: hov ? 1 : 0.5, transition:"opacity 0.3s",
      }}/>

      {hov && (
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none",
          background:`radial-gradient(ellipse 60% 40% at 50% 0%, ${acc}0d 0%, transparent 70%)`,
        }}/>
      )}

      <div style={{ padding:"18px 20px 18px 23px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:10 }}>
          <span style={{
            fontSize:9, fontFamily:"'JetBrains Mono',monospace", fontWeight:700,
            letterSpacing:"0.12em", textTransform:"uppercase", color:acc,
            background:`${acc}18`, border:`1px solid ${acc}33`,
            borderRadius:8, padding:"3px 9px",
            maxWidth:170, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>
            {item.category}
          </span>
          <span style={{
            fontSize:9, fontFamily:"'JetBrains Mono',monospace", fontWeight:700,
            letterSpacing:"0.1em", textTransform:"uppercase", color:conf.c,
            background:conf.bg, border:`1px solid ${conf.bd}`,
            borderRadius:6, padding:"3px 9px", flexShrink:0,
          }}>
            {item.confidence}
          </span>
        </div>

        <h3 style={{
          fontSize:14.5, fontWeight:700, color:"#f1f5f9", lineHeight:1.4,
          letterSpacing:"-0.026em", marginBottom:9,
          fontFamily:"'Epilogue',system-ui,sans-serif",
        }}>
          {item.headline}
        </h3>

        <div style={{
          overflow:"hidden",
          maxHeight: open ? 200 : 36,
          transition:"max-height 0.4s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <p style={{
            fontSize:12, color:"#94a3b8", lineHeight:1.65, marginBottom:0,
            fontFamily:"'Epilogue',system-ui,sans-serif",
          }}>
            {item.summary}
          </p>
        </div>

        {item.entities?.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:10 }}>
            {item.entities.map(e => (
              <span key={e} style={{
                fontSize:9.5, fontFamily:"'JetBrains Mono',monospace", color:"#475569",
                background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:6, padding:"2px 7px",
              }}>#{e}</span>
            ))}
          </div>
        )}

        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          borderTop:"1px solid rgba(255,255,255,0.06)", marginTop:13, paddingTop:11,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:9, fontFamily:"'JetBrains Mono',monospace", color:"#334155", letterSpacing:"0.06em" }}>
              {relTime(item.timestamp)} AGO
            </span>
            {item.discovered_by && (
              <span style={{
                fontSize:8, fontFamily:"'JetBrains Mono',monospace", color:"#1e293b",
                background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)",
                borderRadius:4, padding:"1px 5px",
              }}>
                via {item.discovered_by}
              </span>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ fontSize:9, fontFamily:"'JetBrains Mono',monospace", color:"#334155" }}>
              {open ? "▲" : "▼"}
            </span>
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                fontSize:11, fontWeight:600, letterSpacing:"-0.01em", color:"#e2e8f0",
                background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.13)",
                borderRadius:11, padding:"5px 13px", textDecoration:"none",
                fontFamily:"'Epilogue',system-ui,sans-serif",
                transition:"all 0.18s",
              }}
            >
              Open ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GROUP HEADER ─────────────────────────────────────────────────────────────
function GroupHeader({ b, count }) {
  const live = b.order === 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:11, padding:"14px 0 7px", userSelect:"none" }}>
      <div style={{ position:"relative", width:12, height:12, flexShrink:0 }}>
        <div style={{
          position:"absolute", inset:0, borderRadius:"50%",
          background: live ? "#34d399" : "#1e293b",
          boxShadow: live ? "0 0 0 3px rgba(52,211,153,0.15), 0 0 14px rgba(52,211,153,0.5)" : "none",
        }}/>
        {live && <div style={{
          position:"absolute", inset:3, borderRadius:"50%", background:"#f0fdf4",
          animation:"npulse 2s ease-in-out infinite",
        }}/>}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
          <span style={{
            fontSize:10.5, fontFamily:"'JetBrains Mono',monospace", fontWeight:700,
            letterSpacing:"0.18em", textTransform:"uppercase",
            color: live ? "#34d399" : "#334155",
          }}>
            {b.label}
          </span>
          <span style={{
            fontSize:8.5, fontFamily:"'JetBrains Mono',monospace", color:"#1e293b",
            background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)",
            borderRadius:4, padding:"1px 6px",
          }}>
            {count} NODES
          </span>
        </div>
        {b.sub && (
          <div style={{ fontSize:9, fontFamily:"'JetBrains Mono',monospace", color:"#1e293b", letterSpacing:"0.07em", marginTop:1 }}>
            {b.sub}
          </div>
        )}
      </div>

      <div style={{
        flex:1, height:1, maxWidth:80,
        background:`linear-gradient(90deg, ${live ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.06)"}, transparent)`,
      }}/>
    </div>
  );
}

// ─── SCAN LOADER ──────────────────────────────────────────────────────────────
function Loader({ status }) {
  return (
    <div style={{ padding:"60px 0", display:"flex", flexDirection:"column", alignItems:"center", gap:18 }}>
      <div style={{ position:"relative", width:64, height:64 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            position:"absolute", inset: i*8, borderRadius:"50%",
            border:`1px solid rgba(52,211,153,${0.3-i*0.08})`,
            animation:`scanring ${1.6+i*0.5}s linear infinite ${i%2?"reverse":""}`,
          }}/>
        ))}
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{
            width:8, height:8, borderRadius:"50%", background:"#34d399",
            boxShadow:"0 0 16px #34d399, 0 0 32px rgba(52,211,153,0.4)",
            animation:"npulse 1.2s ease-in-out infinite",
          }}/>
        </div>
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:9, fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.18em", color:"#34d399", marginBottom:5 }}>
          TELEMETRY CACHE STREAM ACTIVE
        </div>
        <div style={{ fontSize:8, fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.12em", color:"#334155" }}>
          {status}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData]         = useState(SEED);
  const [mode, setMode]         = useState("day");
  const [cat, setCat]           = useState("all");
  const [q, setQ]               = useState("");
  const [clock, setClock]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState("");
  const [aiLive, setAiLive]     = useState(false);
  const [err, setErr]           = useState(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toISOString().slice(11,19) + " UTC");
    tick(); const iv = setInterval(tick,1000); return () => clearInterval(iv);
  }, []);

  // Optimized Fetch to sync with your automated JSON matrix database
  const sweep = useCallback(async () => {
    setLoading(true); setErr(null);
    setStatus("INITIALIZING DATA MATRIX TARGET...");
    try {
      setStatus("FETCHING RECENT TELEMETRY STORAGE...");
      const res = await fetch("/agtech-intelligence-system/data/manifest.json");
      
      if (!res.ok) throw new Error(`HTTP Matrix Missing: ${res.status}`);
      const parsed = await res.json();
      
      setStatus("PARSING SYSTEM VECTOR NODES...");
      if (Array.isArray(parsed) && parsed.length > 0) {
        setData(parsed.map((x, i) => ({
          ...x, 
          id: x.id || `ai-${i}`,
          timestamp: x.timestamp || new Date(Date.now() - i * 5 * H).toISOString(),
        })));
        setAiLive(true);
      } else {
        throw new Error("Empty storage structure.");
      }
    } catch(e) {
      console.error(e);
      setErr("Live matrix pipeline initializing — showing standard cache framework.");
      setData(SEED);
    } { setLoading(false); setStatus(""); }
  }, []);

  useEffect(() => { sweep(); }, [sweep]);

  const filtered = useMemo(() => {
    const sq = q.toLowerCase();
    return data.filter(x => {
      const cm = cat==="all" || x.category===cat;
      const qm = !sq || [x.headline,x.summary,x.category,...(x.entities||[])].join(" ").toLowerCase().includes(sq);
      return cm && qm;
    });
  }, [data, cat, q]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(x => {
      const b = bucket(x.timestamp, mode);
      if (!map[b.key]) map[b.key] = { b, items:[] };
      map[b.key].items.push(x);
    });
    return Object.values(map).sort((a,bv) => a.b.order - bv.b.order);
  }, [filtered, mode]);

  const highCt = data.filter(x=>(x.confidence||"").toLowerCase()==="high").length;

  return (
    <div style={{ minHeight:"100vh", background:"#030712", color:"#f8fafc", overflowX:"hidden" }}>
      <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", background:"linear-gradient(145deg,#0f172a,#020617,#022c22)" }}>
        <div style={{
          position:"absolute", top:"-15%", left:"-15%", width:"80vw", height:"80vw", borderRadius:"50%",
          background:"radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)",
          animation:"blobA 22s ease-in-out infinite alternate", mixBlendMode:"screen", opacity:0.6,
        }}/>
        <div style={{
          position:"absolute", bottom:"-22%", right:"-12%", width:"85vw", height:"85vw", borderRadius:"50%",
          background:"radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)",
          animation:"blobB 30s ease-in-out infinite alternate-reverse", mixBlendMode:"screen", opacity:0.5,
        }}/>
        <div style={{
          position:"absolute", top:"40%", left:"30%", width:"40vw", height:"40vw", borderRadius:"50%",
          background:"radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
          animation:"blobA 18s ease-in-out 5s infinite alternate",
        }}/>
        <div style={{
          position:"absolute", inset:0, opacity:0.035,
          backgroundImage:"radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize:"28px 28px",
        }}/>
      </div>

      <div style={{
        position:"sticky", top:0, zIndex:50,
        backdropFilter:"blur(32px) saturate(220%)", WebkitBackdropFilter:"blur(32px) saturate(220%)",
        background:"rgba(3,7,18,0.65)", borderBottom:"1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{
          padding:"5px 16px", display:"flex", justifyContent:"space-between", alignItems:"center",
          borderBottom:"1px solid rgba(255,255,255,0.04)", background:"rgba(0,0,0,0.25)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{
              width:6, height:6, borderRadius:"50%",
              background: loading?"#fbbf24":"#34d399",
              boxShadow: loading?"0 0 10px #fbbf24":"0 0 10px rgba(52,211,153,0.9)",
              animation:"npulse 2s ease-in-out infinite",
            }}/>
            <span style={{ fontSize:8.5, fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.14em", color:"#334155", textTransform:"uppercase" }}>
              {loading ? "DATA_STREAM_ACTIVE" : aiLive ? "AUTOMATED_CORE // LIVE" : "SYSTEM_READY // OFFLINE"}
            </span>
          </div>
          <span style={{ fontSize:9, fontFamily:"'JetBrains Mono',monospace", color:"#34d399", fontWeight:700 }}>
            {clock}
          </span>
        </div>

        <div style={{ padding:"14px 16px 10px", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div>
            <div style={{ fontSize:17, fontWeight:900, letterSpacing:"-0.04em", color:"#fff", textTransform:"uppercase", fontFamily:"'Epilogue',system-ui,sans-serif" }}>
              AG-AI <span style={{ color:"#34d399" }}>//</span> OS
            </div>
            <div style={{ fontSize:8.5, fontFamily:"'JetBrains Mono',monospace", color:"#334155", letterSpacing:"0.12em", marginTop:2 }}>
              INTELLIGENCE MATRIX INFRASTRUCTURE // 2026
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[
              { l:"NODES", v:String(data.length).padStart(2,"0"), c:"#fff" },
              { l:"HIGH",  v:String(highCt).padStart(2,"0"),      c:"#34d399" },
            ].map(s=>(
              <div key={s.l} style={{
                background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:12, padding:"6px 10px", textAlign:"right",
              }}>
                <div style={{ fontSize:7.5, fontFamily:"'JetBrains Mono',monospace", color:s.c==="white"?"#334155":s.c, letterSpacing:"0.08em" }}>{s.l}</div>
                <div style={{ fontSize:14, fontWeight:800, color:s.c, fontFamily:"'JetBrains Mono',monospace", marginTop:1 }}>{s.v}</div>
              </div>
            ))}
            <button onClick={sweep} disabled={loading} style={{
              background:loading?"rgba(255,255,255,0.02)":"rgba(52,211,153,0.08)",
              border:`1px solid ${loading?"rgba(255,255,255,0.06)":"rgba(52,211,153,0.22)"}`,
              borderRadius:12, padding:"6px 11px", cursor:loading?"not-allowed":"pointer",
              fontSize:8.5, fontFamily:"'JetBrains Mono',monospace",
              color:loading?"#1e293b":"#34d399", letterSpacing:"0.1em", fontWeight:700,
              transition:"all 0.2s",
            }}>
              {loading ? "···" : "↺ SYNC"}
            </button>
          </div>
        </div>

        {err && (
          <div style={{
            margin:"0 16px 8px", fontSize:8.5, fontFamily:"'JetBrains Mono',monospace", color:"#fbbf24",
            background:"rgba(251,191,36,0.05)", border:"1px solid rgba(251,191,36,0.15)",
            borderRadius:9, padding:"5px 11px", letterSpacing:"0.06em",
          }}>▲ {err}</div>
        )}

        <div style={{ padding:"0 16px 10px", position:"relative" }}>
          <span style={{
            position:"absolute", left:28, top:"50%", transform:"translateY(-50%)",
            fontSize:8.5, fontFamily:"'JetBrains Mono',monospace",
            color:"rgba(52,211,153,0.22)", letterSpacing:"0.12em", pointerEvents:"none",
          }}>SEARCH//</span>
          <input
            type="text" value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Filter vectors, anomalies, entities..."
            style={{
              width:"100%", boxSizing:"border-box",
              background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.09)",
              borderRadius:14, padding:"11px 16px 11px 82px",
              fontSize:11.5, fontFamily:"'JetBrains Mono',monospace", color:"#f8fafc",
              outline:"none", letterSpacing:"0.02em",
              transition:"border-color 0.2s, background 0.2s",
            }}
          />
        </div>

        <div style={{ display:"flex", gap:5, padding:"0 16px 9px", overflowX:"auto", scrollbarWidth:"none" }}>
          {CATEGORIES.map(c2 => {
            const ac = CAT_ACCENT[c2.id] || "#94a3b8";
            const active = cat === c2.id;
            return (
              <button key={c2.id} onClick={()=>setCat(c2.id)} style={{
                flexShrink:0, padding:"6px 14px", borderRadius:12,
                fontSize:11, fontWeight:600, letterSpacing:"-0.01em", cursor:"pointer",
                fontFamily:"'Epilogue',system-ui,sans-serif", transition:"all 0.2s",
                background: active
                  ? "linear-gradient(135deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.04) 100%)"
                  : "rgba(255,255,255,0.015)",
                color: active ? "#fff" : "#334155",
                border:`1px solid ${active ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.05)"}`,
                boxShadow: active ? `inset 0 1px 0 rgba(255,255,255,0.2), 0 0 16px ${ac}22` : "none",
              }}>
                {c2.label}
              </button>
            );
          })}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:4, padding:"0 16px 13px" }}>
          <span style={{ fontSize:7.5, fontFamily:"'JetBrains Mono',monospace", color:"#1e293b", letterSpacing:"0.14em", marginRight:5 }}>
            GROUP//
          </span>
          {VIEW_MODES.map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{
              padding:"4px 11px", borderRadius:8, fontSize:9.5, fontWeight:700,
              fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.1em", cursor:"pointer",
              transition:"all 0.18s",
              background: mode===m ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.015)",
              color: mode===m ? "#34d399" : "#1e293b",
              border:`1px solid ${mode===m ? "rgba(52,211,153,0.28)" : "rgba(255,255,255,0.05)"}`,
            }}>
              {VIEW_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <main style={{ maxWidth:480, margin:"0 auto", padding:"16px 16px 88px", position:"relative", zIndex:1 }}>
        {loading ? (
          <Loader status={status}/>
        ) : grouped.length === 0 ? (
          <div style={{
            textAlign:"center", padding:"72px 20px",
            background:"rgba(255,255,255,0.015)", border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:20, fontFamily:"'JetBrains Mono',monospace",
            fontSize:9.5, color:"#1e293b", letterSpacing:"0.14em", textTransform:"uppercase",
          }}>
            NO MATCHING LOG VECTORS IN MATRIX CACHE
          </div>
        ) : (
          grouped.map(g => (
            <div key={g.b.key} style={{ marginBottom:28 }}>
              <GroupHeader b={g.b} count={g.items.length}/>
              <div style={{ position:"relative" }}>
                <div style={{
                  position:"absolute", left:5, top:0, bottom:0, width:1,
                  background:"linear-gradient(180deg, rgba(52,211,153,0.15), transparent)",
                }}/>
                <div style={{ display:"flex", flexDirection:"column", gap:10, paddingLeft:20 }}>
                  {g.items.map((item,i)=>(
                    <Card key={item.id||i} item={item} idx={i}/>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      <footer style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:40,
        background:"rgba(3,7,18,0.9)", backdropFilter:"blur(24px)",
        borderTop:"1px solid rgba(255,255,255,0.05)",
        padding:"10px 16px", textAlign:"center",
        fontFamily:"'JetBrains Mono',monospace", fontSize:7.5,
        color:"#1e293b", letterSpacing:"0.16em", textTransform:"uppercase",
      }}>
        REFRACTIVE UX CORE // STRUCTURAL AG-AI LAYER THREE
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{margin:0;}
        input::placeholder{color:rgba(255,255,255,0.18)!important;}
        input:focus{border-color:rgba(52,211,153,0.28)!important;background:rgba(255,255,255,0.05)!important;}
        ::-webkit-scrollbar{display:none;}
        @keyframes npulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes blobA{0%{transform:translate(0,0) scale(1) rotate(0deg)}33%{transform:translate(40px,-55px) scale(1.12) rotate(120deg)}66%{transform:translate(-28px,32px) scale(0.91) rotate(240deg)}100%{transform:translate(0,0) scale(1) rotate(360deg)}}
        @keyframes blobB{0%{transform:translate(0,0) scale(1)}33%{transform:translate(-32px,42px) scale(1.09)}66%{transform:translate(18px,-24px) scale(0.94)}100%{transform:translate(0,0) scale(1)}}
        @keyframes scanring{from{transform:rotate(0deg);opacity:0.7}to{transform:rotate(360deg);opacity:0.05}}
      `}</style>
    </div>
  );
}
