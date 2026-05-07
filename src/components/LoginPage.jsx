import { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

const HlaedLogo = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <defs>
      <radialGradient id="l-bg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#0e3d2e"/><stop offset="100%" stopColor="#071a12"/></radialGradient>
      <radialGradient id="l-iris" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#b8e8ff"/><stop offset="40%" stopColor="#87ceeb"/><stop offset="100%" stopColor="#1a6b4a"/></radialGradient>
      <radialGradient id="l-pupil" cx="35%" cy="30%" r="60%"><stop offset="0%" stopColor="#1a3a2a"/><stop offset="100%" stopColor="#050f09"/></radialGradient>
      <filter id="l-glow"><feGaussianBlur stdDeviation="2.5" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="l-soft"><feGaussianBlur stdDeviation="1.5" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="l-hex" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#87ceeb" stopOpacity="0.9"/><stop offset="50%" stopColor="#2d9e6b" stopOpacity="0.6"/><stop offset="100%" stopColor="#87ceeb" stopOpacity="0.3"/></linearGradient>
    </defs>
    <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="url(#l-bg)" stroke="url(#l-hex)" strokeWidth="1.5"/>
    <ellipse cx="40" cy="40" rx="18" ry="12" fill="#0a2a1e" stroke="#2d9e6b" strokeWidth="0.8" strokeOpacity="0.5"/>
    <circle cx="40" cy="40" r="9" fill="url(#l-iris)" filter="url(#l-soft)"/>
    <circle cx="40" cy="40" r="4.5" fill="url(#l-pupil)"/>
    <circle cx="38.2" cy="37.8" r="1.4" fill="#fff" fillOpacity="0.7"/>
    <path d="M22,40 Q40,24 58,40" fill="none" stroke="#87ceeb" strokeWidth="1.8" strokeLinecap="round" filter="url(#l-glow)" strokeOpacity="0.9"/>
    <path d="M22,40 Q40,53 58,40" fill="none" stroke="#2d9e6b" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7"/>
    {[[40,4],[72,22],[72,58],[40,76],[8,58],[8,22]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="1.8" fill="#87ceeb" fillOpacity="0.5"/>))}
  </svg>
);

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try { await signInWithPopup(auth, googleProvider); }
    catch(e) {
      const code = e.code || "";
      if (code === "auth/popup-closed-by-user") setError("Google sign-in was cancelled.");
      else if (code === "auth/network-request-failed") setError("Network error. Check your internet connection.");
      else setError(e.message.replace("Firebase: ","").replace(/\(auth.*\)/,"").trim() || "Google sign-in failed.");
    }
    finally { setLoading(false); }
  };

  const handleEmail = async () => {
    if (!email||!password) return;
    setError(""); setLoading(true);
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch(e) {
      const code = e.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") setError("Email or password is incorrect.");
      else if (code === "auth/email-already-in-use") setError("This email is already registered. Please sign in.");
      else if (code === "auth/weak-password") setError("Password must be at least 6 characters.");
      else if (code === "auth/invalid-email") setError("Please enter a valid email address.");
      else if (code === "auth/too-many-requests") setError("Too many attempts. Please try again later.");
      else if (code === "auth/operation-not-allowed") setError("Email/Password login is not enabled. Please contact support.");
      else if (code === "auth/network-request-failed") setError("Network error. Check your internet connection.");
      else setError(e.message.replace("Firebase: ","").replace(/\(auth.*\)/,"").trim() || "Authentication failed.");
    }
    finally { setLoading(false); }
  };

  const inp = {
    width:"100%", padding:"12px 14px",
    background:"rgba(0,0,0,0.3)",
    border:"1px solid rgba(135,206,235,0.15)",
    borderRadius:10, color:"#d8eff8", fontSize:13,
    marginBottom:10, fontFamily:"'DM Mono',monospace",
    caretColor:"#87ceeb", display:"block",
  };

  return (
    <div style={{minHeight:"100vh",background:"#050e09",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace",position:"relative",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Orbitron:wght@600;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes floatGrid{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanline{0%{top:-10%}100%{top:110%}}
        input:focus{outline:none;border-color:rgba(135,206,235,0.4) !important;}
        button{transition:all .2s;} button:hover{opacity:0.85;} button:active{transform:scale(0.97);}
      `}</style>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",backgroundImage:`linear-gradient(rgba(135,206,235,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(135,206,235,.03) 1px,transparent 1px)`,backgroundSize:"40px 40px",animation:"floatGrid 8s ease-in-out infinite"}}/>
      <div style={{position:"fixed",top:"-20%",right:"-10%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(14,92,58,.2) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"-20%",left:"-10%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(135,206,235,.08) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",left:0,right:0,height:"2px",background:"linear-gradient(90deg,transparent,rgba(135,206,235,.1),transparent)",animation:"scanline 6s linear infinite",pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:420,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(135,206,235,0.15)",borderRadius:20,padding:"40px 36px",boxShadow:"0 20px 60px rgba(0,0,0,0.5),0 0 40px rgba(135,206,235,0.05)",animation:"fadeIn 0.5s ease forwards",position:"relative",zIndex:10}}>

        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:16,filter:"drop-shadow(0 0 20px rgba(135,206,235,0.5))"}}>
            <HlaedLogo size={64}/>
          </div>
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:26,fontWeight:800,background:"linear-gradient(135deg,#87ceeb,#2d9e6b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.15em",marginBottom:6}}>HLAED</div>
          <div style={{fontSize:11,color:"#2d9e6b",letterSpacing:"0.2em"}}>REASONING · PLANNING · AGENT</div>
          <div style={{fontSize:12,color:"#4a7a5a",marginTop:12}}>{isSignUp?"Create your account":"Welcome back"}</div>
        </div>

        <button onClick={handleGoogle} disabled={loading} style={{width:"100%",padding:"12px",background:"rgba(135,206,235,0.06)",border:"1px solid rgba(135,206,235,0.2)",borderRadius:12,color:"#87ceeb",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16,fontFamily:"'DM Mono',monospace",letterSpacing:"0.06em"}}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{flex:1,height:1,background:"rgba(135,206,235,0.1)"}}/>
          <span style={{fontSize:11,color:"#2a4a35",letterSpacing:"0.1em"}}>OR</span>
          <div style={{flex:1,height:1,background:"rgba(135,206,235,0.1)"}}/>
        </div>

        <input type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} style={inp}/>
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleEmail()} style={{...inp,marginBottom:16}}/>

        {error&&<div style={{fontSize:11,color:"#e88",marginBottom:12,background:"rgba(200,80,80,.08)",padding:"8px 12px",borderRadius:8,border:"1px solid rgba(200,80,80,.2)"}}>⚠ {error}</div>}

        <button onClick={handleEmail} disabled={loading||!email||!password} style={{width:"100%",padding:"13px",background:email&&password?"linear-gradient(135deg,#0e5c3a,#1a8a5a)":"rgba(255,255,255,.04)",border:`1px solid ${email&&password?"rgba(135,206,235,.3)":"rgba(255,255,255,.06)"}`,borderRadius:12,color:email&&password?"#87ceeb":"#2a4a35",fontSize:13,cursor:email&&password?"pointer":"not-allowed",fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",boxShadow:email&&password?"0 4px 16px rgba(135,206,235,.15)":"none",marginBottom:16}}>
          {loading?"PLEASE WAIT...":isSignUp?"CREATE ACCOUNT":"SIGN IN"}
        </button>

        <div style={{textAlign:"center",fontSize:12,color:"#4a7a5a"}}>
          {isSignUp?"Already have an account? ":"New to Hlaed? "}
          <span onClick={()=>{setIsSignUp(!isSignUp);setError("");}} style={{color:"#87ceeb",cursor:"pointer"}}>
            {isSignUp?"Sign In":"Create Account"}
          </span>
        </div>

        <div style={{textAlign:"center",marginTop:24,fontSize:10,color:"#1a3a2a",letterSpacing:"0.1em"}}>
          HLAED · BUILT BY HLAED COMPANY · INDIA 🇮🇳
        </div>
      </div>
    </div>
  );
}
