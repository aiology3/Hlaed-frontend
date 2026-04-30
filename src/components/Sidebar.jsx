import { useState } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

const EyeIcon = ({ size=16, active=false }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <ellipse cx="16" cy="16" rx="13" ry="9" fill="#0a2a1e" stroke={active?"#87ceeb":"#2d9e6b"} strokeWidth="1"/>
    <circle cx="16" cy="16" r={active?6:5} fill={active?"#87ceeb":"#2d9e6b"} opacity={active?0.9:0.5}/>
    <circle cx="16" cy="16" r="2.5" fill="#050f09"/>
    <circle cx="14.5" cy="14.5" r="1" fill="#fff" fillOpacity={active?0.8:0.4}/>
    <path d={active?"M4,16 Q16,7 28,16":"M4,16 Q16,8 28,16"} fill="none" stroke={active?"#87ceeb":"#2d9e6b"} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export default function Sidebar({ user, sessions, activeSessionId, onNewChat, onSelectSession, onDeleteSession }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setDeletingId(id);
    await onDeleteSession(id);
    setDeletingId(null);
  };

  const grouped = sessions.reduce((acc, s) => {
    const date = s.updatedAt?.toDate?.() || new Date();
    const diff = Math.floor((new Date() - date)/(1000*60*60*24));
    const g = diff===0?"Today":diff===1?"Yesterday":diff<=7?"This Week":"Older";
    if (!acc[g]) acc[g]=[];
    acc[g].push(s);
    return acc;
  }, {});

  return (
    <div style={{width:260,flexShrink:0,background:"rgba(5,14,9,0.97)",borderRight:"1px solid rgba(135,206,235,0.08)",display:"flex",flexDirection:"column",height:"100vh",fontFamily:"'DM Mono',monospace",overflowX:"hidden"}}>
      <style>{`
        .sb-item:hover{background:rgba(135,206,235,0.06)!important;}
        .sb-new:hover{background:rgba(135,206,235,0.1)!important;border-color:rgba(135,206,235,0.35)!important;}
        .sb-del:hover{background:rgba(200,80,80,0.2)!important;}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1a3a2a;border-radius:3px}
      `}</style>

      {/* Top */}
      <div style={{padding:"18px 14px 14px",borderBottom:"1px solid rgba(135,206,235,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
          <EyeIcon size={20} active/>
          <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,fontWeight:800,background:"linear-gradient(135deg,#87ceeb,#2d9e6b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.12em"}}>HLAED</span>
        </div>
        <button onClick={onNewChat} className="sb-new" style={{width:"100%",padding:"9px 12px",background:"rgba(135,206,235,0.05)",border:"1px solid rgba(135,206,235,0.18)",borderRadius:10,color:"#87ceeb",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",transition:"all .2s"}}>
          <span style={{fontSize:16,lineHeight:1}}>＋</span> NEW CONVERSATION
        </button>
      </div>

      {/* History */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 6px"}}>
        {sessions.length===0&&(
          <div style={{textAlign:"center",padding:"40px 16px",color:"#2a4a35",fontSize:10,lineHeight:2,letterSpacing:"0.1em"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:8,opacity:0.4}}><EyeIcon size={24}/></div>
            NO CONVERSATIONS YET<br/>START A NEW CHAT
          </div>
        )}

        {["Today","Yesterday","This Week","Older"].map(group=>{
          if (!grouped[group]) return null;
          return (
            <div key={group} style={{marginBottom:12}}>
              <div style={{fontSize:9,color:"#2a4535",letterSpacing:"0.2em",padding:"4px 10px 6px",fontWeight:600}}>{group.toUpperCase()}</div>
              {grouped[group].map(s=>{
                const isActive = s.id===activeSessionId;
                const isHov = hoveredId===s.id;
                return (
                  <div key={s.id} className="sb-item"
                    onClick={()=>onSelectSession(s.id)}
                    onMouseEnter={()=>setHoveredId(s.id)}
                    onMouseLeave={()=>setHoveredId(null)}
                    style={{padding:"8px 10px",borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",gap:8,marginBottom:2,background:isActive?"rgba(135,206,235,0.09)":"transparent",border:isActive?"1px solid rgba(135,206,235,0.18)":"1px solid transparent",transition:"all .15s"}}>
                    <div style={{flexShrink:0}}><EyeIcon size={13} active={isActive}/></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,color:isActive?"#87ceeb":"#5a8a6a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:isActive?500:400,lineHeight:1.4}}>
                        {s.title||"New Conversation"}
                      </div>
                      <div style={{fontSize:9,color:"#2a4535",marginTop:1,letterSpacing:"0.04em"}}>
                        {s.messageCount||0} msg
                      </div>
                    </div>
                    {(isHov||isActive)&&(
                      <button onClick={e=>handleDelete(e,s.id)} disabled={deletingId===s.id} className="sb-del"
                        style={{background:"rgba(200,80,80,0.08)",border:"1px solid rgba(200,80,80,0.2)",borderRadius:6,color:"#e88",width:20,height:20,fontSize:10,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                        {deletingId===s.id?"·":"✕"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User */}
      <div style={{padding:"12px 14px",borderTop:"1px solid rgba(135,206,235,0.08)",background:"rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          {user.photoURL
            ? <img src={user.photoURL} alt="" style={{width:28,height:28,borderRadius:"50%",border:"1px solid rgba(135,206,235,0.3)"}}/>
            : <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#0e3d2e,#1a6b4a)",border:"1px solid rgba(135,206,235,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#87ceeb"}}>
                {(user.displayName||user.email||"?")[0].toUpperCase()}
              </div>
          }
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:"#87ceeb",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {user.displayName||user.email}
            </div>
            <div style={{fontSize:9,color:"#2d9e6b",letterSpacing:"0.08em",marginTop:1}}>● ONLINE</div>
          </div>
        </div>
        <button onClick={()=>signOut(auth)} style={{width:"100%",padding:"7px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,color:"#4a5a4a",fontSize:10,cursor:"pointer",fontFamily:"'DM Mono',monospace",letterSpacing:"0.1em",transition:"all .2s"}}>
          SIGN OUT
        </button>
      </div>
    </div>
  );
}
