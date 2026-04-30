import { useState, useRef, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, orderBy, query, serverTimestamp, getDoc, setDoc,
} from "firebase/firestore";
import LoginPage from "./components/LoginPage";
import Sidebar from "./components/Sidebar";

const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

// ─── Mermaid loader ────────────────────────────────────────────────────────────
let mermaidLoaded = false;
const loadMermaid = () => new Promise((resolve) => {
  if (mermaidLoaded) { resolve(window.mermaid); return; }
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
  s.onload = () => {
    window.mermaid.initialize({
      startOnLoad: false, theme: "base",
      themeVariables: {
        primaryColor:"#0e3d2e", primaryTextColor:"#87ceeb",
        primaryBorderColor:"#87ceeb", lineColor:"#2d9e6b",
        secondaryColor:"#071a12", background:"#050e09",
        mainBkg:"#0e3d2e", nodeBorder:"#87ceeb",
        fontFamily:"DM Mono, monospace",
      },
    });
    mermaidLoaded = true; resolve(window.mermaid);
  };
  document.head.appendChild(s);
});

const MermaidChart = ({ code }) => {
  const [svg, setSvg] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    loadMermaid().then(async m => {
      try {
        const id = `m${Math.random().toString(36).substr(2,9)}`;
        const { svg: r } = await m.render(id, code);
        setSvg(r);
      } catch { setErr("Could not render flowchart."); }
    });
  }, [code]);
  if (err) return <div style={{color:"#e88",fontSize:12,padding:"8px 12px",background:"rgba(200,80,80,.08)",borderRadius:8,marginTop:8}}>{err}</div>;
  if (!svg) return <div style={{color:"#4a9a6a",fontSize:11,padding:"8px",letterSpacing:"0.1em"}}>RENDERING...</div>;
  return (
    <div style={{marginTop:12,padding:16,background:"rgba(135,206,235,0.04)",border:"1px solid rgba(135,206,235,0.15)",borderRadius:12,overflowX:"auto",boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}>
      <div style={{fontSize:10,color:"#2d9e6b",letterSpacing:"0.15em",marginBottom:10}}>◈ FLOWCHART</div>
      <div dangerouslySetInnerHTML={{__html:svg}} style={{display:"flex",justifyContent:"center"}}/>
    </div>
  );
};

const parseMermaid = (content) => {
  const parts=[]; const regex=/```mermaid\n([\s\S]*?)```/g; let last=0, m;
  while((m=regex.exec(content))!==null){
    if(m.index>last) parts.push({type:"text",content:content.slice(last,m.index)});
    parts.push({type:"mermaid",content:m[1].trim()});
    last=m.index+m[0].length;
  }
  if(last<content.length) parts.push({type:"text",content:content.slice(last)});
  return parts.length>0?parts:[{type:"text",content}];
};

// ─── Logo ──────────────────────────────────────────────────────────────────────
const HlaedLogo = ({ size=40 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <defs>
      <radialGradient id="lg-bg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#0e3d2e"/><stop offset="100%" stopColor="#071a12"/></radialGradient>
      <radialGradient id="lg-iris" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#b8e8ff"/><stop offset="40%" stopColor="#87ceeb"/><stop offset="100%" stopColor="#1a6b4a"/></radialGradient>
      <radialGradient id="lg-pupil" cx="35%" cy="30%" r="60%"><stop offset="0%" stopColor="#1a3a2a"/><stop offset="100%" stopColor="#050f09"/></radialGradient>
      <filter id="lg-glow"><feGaussianBlur stdDeviation="2.5" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="lg-soft"><feGaussianBlur stdDeviation="1.5" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="lg-hex" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#87ceeb" stopOpacity="0.9"/><stop offset="50%" stopColor="#2d9e6b" stopOpacity="0.6"/><stop offset="100%" stopColor="#87ceeb" stopOpacity="0.3"/></linearGradient>
    </defs>
    <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="url(#lg-bg)" stroke="url(#lg-hex)" strokeWidth="1.5"/>
    <ellipse cx="40" cy="40" rx="18" ry="12" fill="#0a2a1e" stroke="#2d9e6b" strokeWidth="0.8" strokeOpacity="0.5"/>
    <circle cx="40" cy="40" r="9" fill="url(#lg-iris)" filter="url(#lg-soft)"/>
    <circle cx="40" cy="40" r="4.5" fill="url(#lg-pupil)"/>
    <circle cx="38.2" cy="37.8" r="1.4" fill="#fff" fillOpacity="0.7"/>
    <path d="M22,40 Q40,24 58,40" fill="none" stroke="#87ceeb" strokeWidth="1.8" strokeLinecap="round" filter="url(#lg-glow)" strokeOpacity="0.9"/>
    <path d="M22,40 Q40,53 58,40" fill="none" stroke="#2d9e6b" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7"/>
    {[[40,4],[72,22],[72,58],[40,76],[8,58],[8,22]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="1.8" fill="#87ceeb" fillOpacity="0.5"/>))}
  </svg>
);

const BlinkEye = ({ id, delay }) => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
    <defs>
      <radialGradient id={`iris-${id}`} cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#b8e8ff"/><stop offset="50%" stopColor="#87ceeb"/><stop offset="100%" stopColor="#1a6b4a"/></radialGradient>
      <filter id={`glow-${id}`}><feGaussianBlur stdDeviation="1.5" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <ellipse cx="19" cy="19" rx="17" ry="17" fill="#081510" stroke="#1a5c3a" strokeWidth="1"/>
    <ellipse cx="19" cy="19" rx="13" ry="9" fill="#0a1f14"/>
    <g style={{transformOrigin:"19px 19px",animation:`blink-${id} 3s ${delay}s ease-in-out infinite`}}>
      <circle cx="19" cy="19" r="7" fill={`url(#iris-${id})`} filter={`url(#glow-${id})`}/>
      <circle cx="19" cy="19" r="3.5" fill="#050f09"/>
      <circle cx="17.2" cy="17.2" r="1.2" fill="#fff" fillOpacity="0.8"/>
    </g>
    <path d="M6,19 Q19,9 32,19" fill="none" stroke="#87ceeb" strokeWidth="1.8" strokeLinecap="round" filter={`url(#glow-${id})`} strokeOpacity="0.9"/>
    <ellipse cx="19" cy="19" rx="13" ry="0" fill="#081510" style={{transformOrigin:"19px 19px",animation:`lid-${id} 3s ${delay}s ease-in-out infinite`}}/>
    <ellipse cx="19" cy="19" rx="16" ry="16" fill="none" stroke="#87ceeb" strokeWidth="0.5" strokeOpacity="0.15" style={{animation:`ring-pulse 3s ${delay}s ease-in-out infinite`}}/>
  </svg>
);

const BlinkingEyes = () => (
  <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:"rgba(135,206,235,0.04)",border:"1px solid rgba(135,206,235,0.12)",borderRadius:"4px 18px 18px 18px"}}>
    <BlinkEye id="L" delay={0}/><BlinkEye id="R" delay={0.4}/>
    <span style={{fontSize:10,color:"#4a9a6a",letterSpacing:"0.15em",marginLeft:4,fontFamily:"'DM Mono',monospace",animation:"textPulse 1.5s ease-in-out infinite"}}>THINKING...</span>
  </div>
);

const SmilingEye = ({ size=34 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <defs>
      <radialGradient id="sm-bg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#0e3d2e"/><stop offset="100%" stopColor="#071a12"/></radialGradient>
      <radialGradient id="sm-iris" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#b8e8ff"/><stop offset="40%" stopColor="#87ceeb"/><stop offset="100%" stopColor="#1a6b4a"/></radialGradient>
      <radialGradient id="sm-pupil" cx="35%" cy="30%" r="60%"><stop offset="0%" stopColor="#1a3a2a"/><stop offset="100%" stopColor="#050f09"/></radialGradient>
      <filter id="sm-glow"><feGaussianBlur stdDeviation="2.5" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="sm-soft"><feGaussianBlur stdDeviation="1.5" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="sm-hex" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#87ceeb" stopOpacity="0.9"/><stop offset="50%" stopColor="#2d9e6b" stopOpacity="0.6"/><stop offset="100%" stopColor="#87ceeb" stopOpacity="0.3"/></linearGradient>
    </defs>
    <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="url(#sm-bg)" stroke="url(#sm-hex)" strokeWidth="1.5"/>
    <ellipse cx="40" cy="39" rx="18" ry="10" fill="#0a2a1e" stroke="#2d9e6b" strokeWidth="0.8" strokeOpacity="0.4"/>
    <circle cx="40" cy="39" r="8" fill="url(#sm-iris)" filter="url(#sm-soft)"/>
    <circle cx="40" cy="39" r="3.8" fill="url(#sm-pupil)"/>
    <circle cx="38" cy="37" r="1.3" fill="#fff" fillOpacity="0.75"/>
    <path d="M22,39 Q40,21 58,39" fill="none" stroke="#87ceeb" strokeWidth="2.2" strokeLinecap="round" filter="url(#sm-glow)" strokeOpacity="0.95"/>
    <path d="M22,39 Q40,31 58,39" fill="#0a2a1e"/>
    <path d="M22,39 Q40,31 58,39" fill="none" stroke="#87ceeb" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.6"/>
    <ellipse cx="24" cy="48" rx="5" ry="3" fill="#87ceeb" fillOpacity="0.1"/>
    <ellipse cx="56" cy="48" rx="5" ry="3" fill="#87ceeb" fillOpacity="0.1"/>
    <path d="M15,22 L16.4,26 L20,27 L16.4,28 L15,32 L13.6,28 L10,27 L13.6,26 Z" fill="#87ceeb" fillOpacity="0.65" filter="url(#sm-soft)"/>
    <path d="M65,22 L66.4,26 L70,27 L66.4,28 L65,32 L63.6,28 L60,27 L63.6,26 Z" fill="#2d9e6b" fillOpacity="0.65" filter="url(#sm-soft)"/>
    {[[40,4],[72,22],[72,58],[40,76],[8,58],[8,22]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="1.8" fill="#87ceeb" fillOpacity="0.5"/>))}
  </svg>
);

const MessageBlock = ({ msg, isLatest }) => {
  const isUser = msg.role==="user";
  const parts = isUser ? null : parseMermaid(msg.content);
  return (
    <div style={{display:"flex",justifyContent:isUser?"flex-end":"flex-start",marginBottom:"20px",animation:"fadeSlideIn 0.3s ease forwards"}}>
      {!isUser&&<div style={{marginRight:10,flexShrink:0,marginTop:2,filter:isLatest?"drop-shadow(0 0 10px rgba(135,206,235,0.5))":"none",transition:"filter 0.5s ease"}}><SmilingEye size={34}/></div>}
      <div style={{maxWidth:"75%"}}>
        {isUser ? (
          <div style={{background:"linear-gradient(135deg,#0e5c3a,#0a3d28)",border:"1px solid rgba(135,206,235,0.25)",borderRadius:"18px 18px 4px 18px",padding:"12px 16px",color:"#d8f4e8",fontSize:14,lineHeight:1.75,whiteSpace:"pre-wrap",fontFamily:"'DM Mono',monospace",boxShadow:"0 4px 20px rgba(14,92,58,0.35)"}}>
            {msg.content}
          </div>
        ) : (
          <div>
            {parts.map((p,i) => p.type==="mermaid"
              ? <MermaidChart key={i} code={p.content}/>
              : <div key={i} style={{background:"rgba(135,206,235,0.05)",border:"1px solid rgba(135,206,235,0.12)",borderRadius:"4px 18px 18px 18px",padding:"12px 16px",color:"#b8dde8",fontSize:14,lineHeight:1.75,whiteSpace:"pre-wrap",fontFamily:"'DM Mono',monospace",boxShadow:"0 2px 12px rgba(0,0,0,0.25)",marginBottom:parts.length>1?8:0}}>{p.content}</div>
            )}
          </div>
        )}
      </div>
      {isUser&&<div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#0e3d2e,#1a6b4a)",border:"1px solid rgba(135,206,235,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,marginLeft:10,flexShrink:0,marginTop:2,color:"#87ceeb"}}>◈</div>}
    </div>
  );
};

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); });
  }, []);

  // Load sessions from Firestore
  useEffect(() => {
    if (!user) { setSessions([]); return; }
    const q = query(collection(db,"users",user.uid,"sessions"), orderBy("updatedAt","desc"));
    return onSnapshot(q, snap => {
      setSessions(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
  }, [user]);

  // Load messages when session changes
  useEffect(() => {
    if (!user||!activeSessionId) { setMessages([]); return; }
    const q = query(collection(db,"users",user.uid,"sessions",activeSessionId,"messages"), orderBy("createdAt","asc"));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
  }, [user, activeSessionId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages, isLoading]);

  // New session
  const handleNewChat = async () => {
    if (!user) return;
    const ref = await addDoc(collection(db,"users",user.uid,"sessions"), {
      title:"New Conversation",
      messageCount:0,
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp(),
    });
    setActiveSessionId(ref.id);
    setMessages([]);
    setError(null);
  };

  // Select session
  const handleSelectSession = (id) => {
    setActiveSessionId(id);
    setError(null);
  };

  // Delete session
  const handleDeleteSession = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db,"users",user.uid,"sessions",id));
    if (activeSessionId===id) { setActiveSessionId(null); setMessages([]); }
  };

  // Send message
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed||isLoading||!user) return;

    let sessionId = activeSessionId;

    // Auto-create session if none active
    if (!sessionId) {
      const ref = await addDoc(collection(db,"users",user.uid,"sessions"), {
        title: trimmed.slice(0,40),
        messageCount:0,
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp(),
      });
      sessionId = ref.id;
      setActiveSessionId(sessionId);
    }

    const userMsg = {role:"user",content:trimmed,createdAt:serverTimestamp()};
    setInput(""); setIsLoading(true); setError(null);

    // Save user message to Firestore
    await addDoc(collection(db,"users",user.uid,"sessions",sessionId,"messages"), userMsg);

    // Build history for API
    const history = [...messages,{role:"user",content:trimmed}];

    try {
      const res = await fetch(`${API_URL}/api/chat`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:history.map(m=>({role:m.role,content:m.content}))}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"Server error");
      const text = data.content.filter(b=>b.type==="text").map(b=>b.text).join("\n");

      // Save assistant message
      await addDoc(collection(db,"users",user.uid,"sessions",sessionId,"messages"),{
        role:"assistant",content:text,createdAt:serverTimestamp(),
      });

      // Update session metadata
      const sessionRef = doc(db,"users",user.uid,"sessions",sessionId);
      const sessionSnap = await getDoc(sessionRef);
      const count = (sessionSnap.data()?.messageCount||0)+2;
      await updateDoc(sessionRef,{
        updatedAt:serverTimestamp(),
        messageCount:count,
        title: sessionSnap.data()?.title==="New Conversation" ? trimmed.slice(0,40) : sessionSnap.data()?.title,
      });

    } catch(err) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const handleKeyDown = e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} };
  const latestAsstIdx = messages.reduce((acc,m,i)=>m.role==="assistant"?i:acc,-1);

  if (authLoading) return (
    <div style={{minHeight:"100vh",background:"#050e09",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#2d9e6b",fontFamily:"'DM Mono',monospace",fontSize:12,letterSpacing:"0.2em",animation:"pulse 1.5s infinite"}}>
        LOADING HLAED...
      </div>
    </div>
  );

  if (!user) return <LoginPage/>;

  const suggestions = ["Create a flowchart for user login process","Plan a product roadmap","Design a system architecture"];

  return (
    <div style={{height:"100vh",background:"#050e09",display:"flex",fontFamily:"'DM Mono',monospace",color:"#b8dde8",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Orbitron:wght@600;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1a5c3a;border-radius:3px}
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes floatGrid{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes scanline{0%{top:-10%}100%{top:110%}}
        @keyframes textPulse{0%,100%{opacity:0.45}50%{opacity:1}}
        @keyframes ring-pulse{0%,100%{opacity:0.15;transform:scale(1)}50%{opacity:0.5;transform:scale(1.06)}}
        @keyframes blink-L{0%,35%,50%,100%{transform:scaleY(1)}41%,45%{transform:scaleY(0.06)}}
        @keyframes lid-L{0%,35%,50%,100%{ry:0}41%,45%{ry:9}}
        @keyframes blink-R{0%,38%,54%,100%{transform:scaleY(1)}44%,48%{transform:scaleY(0.06)}}
        @keyframes lid-R{0%,38%,54%,100%{ry:0}44%,48%{ry:9}}
        textarea:focus{outline:none} button{transition:all .2s} button:hover{opacity:.85} button:active{transform:scale(.97)}
      `}</style>

      {/* Sidebar */}
      <Sidebar user={user} sessions={sessions} activeSessionId={activeSessionId}
        onNewChat={handleNewChat} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession}/>

      {/* Main chat area */}
      <div style={{flex:1,display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>

        {/* BG */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none",backgroundImage:`linear-gradient(rgba(135,206,235,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(135,206,235,.03) 1px,transparent 1px)`,backgroundSize:"40px 40px",animation:"floatGrid 8s ease-in-out infinite"}}/>
        <div style={{position:"absolute",top:"-15%",right:"-10%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(14,92,58,.15) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",left:0,right:0,height:"2px",background:"linear-gradient(90deg,transparent,rgba(135,206,235,.08),transparent)",animation:"scanline 6s linear infinite",pointerEvents:"none",zIndex:1}}/>

        {/* Header */}
        <div style={{padding:"14px 24px",borderBottom:"1px solid rgba(135,206,235,.1)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(5,14,9,.85)",backdropFilter:"blur(16px)",position:"relative",zIndex:10}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{filter:"drop-shadow(0 0 12px rgba(135,206,235,.4))"}}><HlaedLogo size={42}/></div>
            <div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,fontWeight:800,background:"linear-gradient(135deg,#87ceeb,#2d9e6b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.12em"}}>HLAED</div>
              <div style={{fontSize:9,color:"#2d9e6b",letterSpacing:"0.2em",marginTop:1}}>REASONING · PLANNING · AGENT</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:isLoading?"#87ceeb":"#2d9e6b",boxShadow:`0 0 8px ${isLoading?"#87ceeb":"#2d9e6b"}`,animation:isLoading?"pulse 1s infinite":"none"}}/>
            <span style={{fontSize:10,color:isLoading?"#87ceeb":"#2d9e6b",letterSpacing:"0.1em"}}>{isLoading?"THINKING":"ONLINE"}</span>
          </div>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:"auto",padding:"28px 24px",display:"flex",flexDirection:"column",position:"relative",zIndex:5,minHeight:0}}>
          {messages.length===0&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,paddingBottom:40,animation:"fadeSlideIn .5s ease forwards"}}>
              <div style={{filter:"drop-shadow(0 0 30px rgba(135,206,235,.5))"}}><HlaedLogo size={72}/></div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:26,fontWeight:800,background:"linear-gradient(135deg,#87ceeb 30%,#2d9e6b 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.15em"}}>HLAED</div>
              <div style={{fontSize:12,color:"#4a9a6a",textAlign:"center",maxWidth:380,lineHeight:1.9,letterSpacing:"0.04em"}}>
                Multi-step reasoning, planning & flowchart agent.<br/>Built by Hlaed — pioneering AI & cybersecurity from India.
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginTop:4}}>
                {suggestions.map(s=>(
                  <button key={s} onClick={()=>setInput(s)} style={{background:"rgba(135,206,235,.06)",border:"1px solid rgba(135,206,235,.18)",borderRadius:20,color:"#87ceeb",padding:"7px 18px",fontSize:11,cursor:"pointer",letterSpacing:"0.06em",fontFamily:"'DM Mono',monospace"}}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg,i)=>(<MessageBlock key={msg.id||i} msg={msg} isLatest={i===latestAsstIdx}/>))}

          {isLoading&&<div style={{display:"flex",alignItems:"flex-start",marginBottom:20}}><BlinkingEyes/></div>}

          {error&&<div style={{background:"rgba(200,80,80,.08)",border:"1px solid rgba(200,80,80,.2)",borderRadius:10,padding:"12px 16px",color:"#e88",fontSize:13,marginBottom:16,animation:"fadeSlideIn .3s ease forwards"}}>⚠ {error}</div>}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{padding:"16px 24px",borderTop:"1px solid rgba(135,206,235,.08)",background:"rgba(5,14,9,.9)",backdropFilter:"blur(16px)",position:"relative",zIndex:10}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-end",background:"rgba(135,206,235,.04)",border:"1px solid rgba(135,206,235,.15)",borderRadius:16,padding:"10px 14px"}}>
            <textarea ref={textareaRef} value={input}
              onChange={e=>setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Ask Hlaed anything or say 'create a flowchart for...'"
              rows={1} style={{flex:1,background:"transparent",border:"none",color:"#d8eff8",fontSize:14,resize:"none",fontFamily:"'DM Mono',monospace",lineHeight:1.6,maxHeight:140,overflowY:"auto",caretColor:"#87ceeb"}}
              onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,140)+"px";}}/>
            <button onClick={sendMessage} disabled={!input.trim()||isLoading} style={{background:input.trim()&&!isLoading?"linear-gradient(135deg,#0e5c3a,#1a8a5a)":"rgba(255,255,255,.04)",border:`1px solid ${input.trim()&&!isLoading?"rgba(135,206,235,.3)":"rgba(255,255,255,.06)"}`,borderRadius:12,color:input.trim()&&!isLoading?"#87ceeb":"#2a4a35",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",cursor:input.trim()&&!isLoading?"pointer":"not-allowed",fontSize:18,flexShrink:0,boxShadow:input.trim()&&!isLoading?"0 4px 16px rgba(135,206,235,.2)":"none"}}>↑</button>
          </div>
          <div style={{fontSize:10,color:"#1a4a2a",marginTop:8,textAlign:"center",letterSpacing:"0.1em"}}>
            SHIFT+ENTER NEW LINE · ENTER SEND · HLAED v2.0 · BY HLAED COMPANY</div>
        </div>
      </div>
    </div>
  );
}
