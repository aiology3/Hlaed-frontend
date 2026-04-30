// src/components/AuthPage.jsx
import { useState } from "react";
import { auth, googleProvider } from "../firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

const HlaedLogo = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <defs>
      <radialGradient id="al-bg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#0e3d2e"/><stop offset="100%" stopColor="#071a12"/>
      </radialGradient>
      <radialGradient id="al-iris" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#b8e8ff"/><stop offset="40%" stopColor="#87ceeb"/><stop offset="100%" stopColor="#1a6b4a"/>
      </radialGradient>
      <radialGradient id="al-pupil" cx="35%" cy="30%" r="60%">
        <stop offset="0%" stopColor="#1a3a2a"/><stop offset="100%" stopColor="#050f09"/>
      </radialGradient>
      <filter id="al-glow"><feGaussianBlur stdDeviation="2.5" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="al-soft"><feGaussianBlur stdDeviation="1.5" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="al-hex" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#87ceeb" stopOpacity="0.9"/><stop offset="50%" stopColor="#2d9e6b" stopOpacity="0.6"/><stop offset="100%" stopColor="#87ceeb" stopOpacity="0.3"/>
      </linearGradient>
    </defs>
    <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="url(#al-bg)" stroke="url(#al-hex)" strokeWidth="1.5"/>
    <ellipse cx="40" cy="40" rx="18" ry="12" fill="#0a2a1e" stroke="#2d9e6b" strokeWidth="0.8" strokeOpacity="0.5"/>
    <circle cx="40" cy="40" r="9" fill="url(#al-iris)" filter="url(#al-soft)"/>
    <circle cx="40" cy="40" r="4.5" fill="url(#al-pupil)"/>
    <circle cx="38.2" cy="37.8" r="1.4" fill="#fff" fillOpacity="0.7"/>
    <path d="M22,40 Q40,24 58,40" fill="none" stroke="#87ceeb" strokeWidth="1.8" strokeLinecap="round" filter="url(#al-glow)" strokeOpacity="0.9"/>
    <path d="M22,40 Q40,53 58,40" fill="none" stroke="#2d9e6b" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7"/>
    {[[40,4],[72,22],[72,58],[40,76],[8,58],[8,22]].map(([x,y],i)=>(
      <circle key={i} cx={x} cy={y} r="1.8" fill="#87ceeb" fillOpacity="0.5"/>
    ))}
  </svg>
);

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true); setError("");
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleEmailAuth = async () => {
    setLoading(true); setError("");
    try {
      if (mode === "register") {
        if (!name.trim()) { setError("Please enter your name."); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      const msg = e.code === "auth/wrong-password" ? "Incorrect password."
        : e.code === "auth/user-not-found" ? "No account found with this email."
        : e.code === "auth/email-already-in-use" ? "Email already registered. Please login."
        : e.code === "auth/weak-password" ? "Password must be at least 6 characters."
        : e.message;
      setError(msg);
    }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:"#050e09",display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:"'DM Mono','Courier New',monospace",
      position:"relative",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Orbitron:wght@600;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes floatGrid{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanline{0%{top:-10%}100%{top:110%}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        input:focus{outline:none;}
        button:hover{opacity:0.85;}
        button:active{transform:scale(0.97);}
      `}</style>

      {/* BG */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",
        backgroundImage:`linear-gradient(rgba(135,206,235,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(135,206,235,.03) 1px,transparent 1px)`,
        backgroundSize:"40px 40px",animation:"floatGrid 8s ease-in-out infinite"}}/>
      <div style={{position:"fixed",top:"-20%",right:"-10%",width:500,height:500,borderRadius:"50%",
        background:"radial-gradient(circle,rgba(14,92,58,.2) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"-20%",left:"-10%",width:400,height:400,borderRadius:"50%",
        background:"radial-gradient(circle,rgba(135,206,235,.1) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",left:0,right:0,height:"2px",
        background:"linear-gradient(90deg,transparent,rgba(135,206,235,.08),transparent)",
        animation:"scanline 6s linear infinite",pointerEvents:"none"}}/>

      {/* Card */}
      <div style={{
        background:"rgba(10,20,14,0.85)",
        border:"1px solid rgba(135,206,235,0.15)",
        borderRadius:20,padding:"40px 36px",
        width:"100%",maxWidth:420,
        backdropFilter:"blur(20px)",
        boxShadow:"0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(135,206,235,0.05)",
        animation:"fadeIn 0.5s ease forwards",
        position:"relative",zIndex:10,
      }}>
        {/* Logo + title */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,marginBottom:32}}>
          <div style={{filter:"drop-shadow(0 0 20px rgba(135,206,235,0.5))"}}>
            <HlaedLogo size={64}/>
          </div>
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:26,fontWeight:800,
            background:"linear-gradient(135deg,#87ceeb,#2d9e6b)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
            letterSpacing:"0.15em"}}>HLAED</div>
          <div style={{fontSize:10,color:"#2d9e6b",letterSpacing:"0.2em"}}>
            REASONING · PLANNING · AGENT</div>
          <div style={{fontSize:12,color:"#4a7a5a",marginTop:4}}>
            {mode==="login" ? "Welcome back" : "Create your account"}
          </div>
        </div>

        {/* Google button */}
        <button onClick={handleGoogle} disabled={loading} style={{
          width:"100%",padding:"12px",borderRadius:12,
          background:"rgba(255,255,255,0.05)",
          border:"1px solid rgba(135,206,235,0.2)",
          color:"#b8dde8",fontSize:13,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",gap:10,
          marginBottom:20,transition:"all .2s",fontFamily:"'DM Mono',monospace",
          letterSpacing:"0.05em",
        }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.5-11.3-8.2l-6.6 5.1C9.7 39.7 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41 35.3 44 30 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <div style={{flex:1,height:1,background:"rgba(135,206,235,0.1)"}}/>
          <span style={{fontSize:10,color:"#2a4a35",letterSpacing:"0.1em"}}>OR</span>
          <div style={{flex:1,height:1,background:"rgba(135,206,235,0.1)"}}/>
        </div>

        {/* Name field (register only) */}
        {mode==="register" && (
          <input value={name} onChange={e=>setName(e.target.value)}
            placeholder="Full name"
            style={{width:"100%",padding:"12px 14px",borderRadius:10,marginBottom:12,
              background:"rgba(135,206,235,0.04)",border:"1px solid rgba(135,206,235,0.15)",
              color:"#d8eff8",fontSize:13,fontFamily:"'DM Mono',monospace",
              caretColor:"#87ceeb"}}/>
        )}

        {/* Email */}
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
          placeholder="Email address"
          style={{width:"100%",padding:"12px 14px",borderRadius:10,marginBottom:12,
            background:"rgba(135,206,235,0.04)",border:"1px solid rgba(135,206,235,0.15)",
            color:"#d8eff8",fontSize:13,fontFamily:"'DM Mono',monospace",
            caretColor:"#87ceeb"}}/>

        {/* Password */}
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
          placeholder="Password"
          onKeyDown={e=>e.key==="Enter"&&handleEmailAuth()}
          style={{width:"100%",padding:"12px 14px",borderRadius:10,marginBottom:16,
            background:"rgba(135,206,235,0.04)",border:"1px solid rgba(135,206,235,0.15)",
            color:"#d8eff8",fontSize:13,fontFamily:"'DM Mono',monospace",
            caretColor:"#87ceeb"}}/>

        {/* Error */}
        {error && (
          <div style={{background:"rgba(200,80,80,.08)",border:"1px solid rgba(200,80,80,.2)",
            borderRadius:8,padding:"10px 14px",color:"#e88",fontSize:12,marginBottom:14}}>
            ⚠ {error}
          </div>
        )}

        {/* Submit */}
        <button onClick={handleEmailAuth} disabled={loading} style={{
          width:"100%",padding:"13px",borderRadius:12,
          background:"linear-gradient(135deg,#0e5c3a,#1a8a5a)",
          border:"1px solid rgba(135,206,235,0.3)",
          color:"#87ceeb",fontSize:13,cursor:"pointer",
          fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",
          boxShadow:"0 4px 20px rgba(135,206,235,0.15)",
          transition:"all .2s",
        }}>
          {loading ? "PLEASE WAIT..." : mode==="login" ? "LOGIN TO HLAED" : "CREATE ACCOUNT"}
        </button>

        {/* Toggle mode */}
        <div style={{textAlign:"center",marginTop:20,fontSize:12,color:"#4a7a5a"}}>
          {mode==="login" ? "Don't have an account? " : "Already have an account? "}
          <span onClick={()=>{setMode(mode==="login"?"register":"login");setError("");}}
            style={{color:"#87ceeb",cursor:"pointer",letterSpacing:"0.05em"}}>
            {mode==="login" ? "Sign up" : "Login"}
          </span>
        </div>

        {/* Footer */}
        <div style={{textAlign:"center",marginTop:24,fontSize:10,color:"#1a3a2a",letterSpacing:"0.1em"}}>
          BY HLAED — PIONEERING AI & CYBERSECURITY FROM INDIA 🇮🇳
        </div>
      </div>
    </div>
  );
}
