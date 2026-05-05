import { useState, useRef, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, orderBy, query, serverTimestamp,
} from "firebase/firestore";

// ─── Blinking eye icon ─────────────────────────────────────────────────────────
const BlinkingEyeBtn = ({ active, onClick, blinking }) => (
  <svg
    width="18" height="18" viewBox="0 0 32 32" fill="none"
    onClick={onClick}
    className="sb-eye-btn"
    title="Click to open options"
    style={{
      cursor:"pointer", flexShrink:0,
      filter: active ? "drop-shadow(0 0 6px rgba(135,206,235,0.8))" : "drop-shadow(0 0 0px rgba(135,206,235,0))",
      transition:"filter .2s, transform .15s",
      transform: active ? "scale(1.2)" : "scale(1)",
    }}
  >
    <style>{`
      @keyframes eyeBlinkOnce {
        0%,39%{transform:scaleY(1)}
        40%,60%{transform:scaleY(0.05)}
        61%,100%{transform:scaleY(1)}
      }
    `}</style>
    <ellipse cx="16" cy="16" rx="13" ry="9"
      fill="#0a2a1e" stroke={active?"#87ceeb":"#2d9e6b"} strokeWidth="1"/>
    {/* Iris + pupil — blinks when menu opens */}
    <g style={{
      transformOrigin:"16px 16px",
      animation: blinking ? "eyeBlinkOnce 0.4s ease-in-out forwards" : "none",
    }}>
      <circle cx="16" cy="16" r={active?6:5}
        fill={active?"#87ceeb":"#2d9e6b"} opacity={active?0.9:0.5}/>
      <circle cx="16" cy="16" r="2.5" fill="#050f09"/>
      <circle cx="14.5" cy="14.5" r="1" fill="#fff" fillOpacity={active?0.8:0.4}/>
    </g>
    {/* Eyelid */}
    <path d={active?"M4,16 Q16,7 28,16":"M4,16 Q16,8 28,16"}
      fill="none" stroke={active?"#87ceeb":"#2d9e6b"}
      strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ─── Static eye icon ───────────────────────────────────────────────────────────
const EyeIcon = ({ size=16, active=false }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <ellipse cx="16" cy="16" rx="13" ry="9" fill="#0a2a1e"
      stroke={active?"#87ceeb":"#2d9e6b"} strokeWidth="1"/>
    <circle cx="16" cy="16" r={active?6:5}
      fill={active?"#87ceeb":"#2d9e6b"} opacity={active?0.9:0.5}/>
    <circle cx="16" cy="16" r="2.5" fill="#050f09"/>
    <circle cx="14.5" cy="14.5" r="1" fill="#fff" fillOpacity={active?0.8:0.4}/>
    <path d={active?"M4,16 Q16,7 28,16":"M4,16 Q16,8 28,16"}
      fill="none" stroke={active?"#87ceeb":"#2d9e6b"}
      strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ─── Session item with blink-on-click eye menu ─────────────────────────────────
const SessionItem = ({ s, isActive, onSelect, onRename, onDelete, onMoveToProject, projects }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(s.title || "New Conversation");
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setShowMoveMenu(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (renaming && inputRef.current) inputRef.current.focus();
  }, [renaming]);

  const handleEyeClick = (e) => {
    e.stopPropagation();
    setBlinking(true);
    setTimeout(() => {
      setBlinking(false);
      setMenuOpen(prev => !prev);
    }, 420); // wait for blink animation to finish
  };

  const handleRename = async () => {
    const trimmed = renameVal.trim();
    if (!trimmed) return;
    setRenaming(false);
    setMenuOpen(false);
    await onRename(s.id, trimmed);
  };

  const handleMoveToProject = async (projectId) => {
    setShowMoveMenu(false);
    setMenuOpen(false);
    await onMoveToProject(s.id, projectId);
  };

  return (
    <div style={{position:"relative",marginBottom:2}}>
      <div
        className="sb-item"
        onClick={() => { if (!menuOpen && !renaming) onSelect(s.id); }}
        style={{
          padding:"8px 10px", borderRadius:10, cursor:"pointer",
          display:"flex", alignItems:"center", gap:8,
          background: isActive ? "rgba(135,206,235,0.09)" : "transparent",
          border: isActive ? "1px solid rgba(135,206,235,0.18)" : "1px solid transparent",
          transition:"all .15s",
        }}
      >
        {/* Blinking eye button */}
        <BlinkingEyeBtn
          active={isActive || menuOpen}
          onClick={handleEyeClick}
          blinking={blinking}
        />

        {/* Title / rename input */}
        <div style={{flex:1,minWidth:0}}>
          {renaming ? (
            <input
              ref={inputRef}
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => {
                if (e.key==="Enter") handleRename();
                if (e.key==="Escape") { setRenaming(false); setMenuOpen(false); }
                e.stopPropagation();
              }}
              onClick={e => e.stopPropagation()}
              style={{
                width:"100%", background:"rgba(0,0,0,0.4)",
                border:"1px solid rgba(135,206,235,0.3)",
                borderRadius:6, color:"#87ceeb", fontSize:11,
                padding:"2px 6px", fontFamily:"'DM Mono',monospace",
                caretColor:"#87ceeb",
              }}
            />
          ) : (
            <div style={{fontSize:11,color:isActive?"#87ceeb":"#5a8a6a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:isActive?500:400,lineHeight:1.4}}>
              {s.title || "New Conversation"}
            </div>
          )}
          <div style={{fontSize:9,color:"#2a4535",marginTop:1,letterSpacing:"0.04em"}}>
            {s.projectName ? `📁 ${s.projectName}` : `${s.messageCount||0} msg`}
          </div>
        </div>
      </div>

      {/* Dropdown menu — appears after eye blink */}
      {menuOpen && (
        <div ref={menuRef} style={{
          position:"absolute", left:8, top:"100%", zIndex:100,
          background:"#0a1f15", border:"1px solid rgba(135,206,235,0.2)",
          borderRadius:10, padding:"6px", minWidth:160,
          boxShadow:"0 8px 24px rgba(0,0,0,0.5)",
          animation:"fadeSlideIn 0.15s ease forwards",
        }}>
          {/* Rename */}
          <button onClick={(e) => { e.stopPropagation(); setRenaming(true); setMenuOpen(false); }}
            style={{...menuBtnStyle, color:"#87ceeb"}}>
            ✏️ Rename
          </button>

          {/* Move to project */}
          <div style={{position:"relative"}}>
            <button onClick={(e) => { e.stopPropagation(); setShowMoveMenu(!showMoveMenu); }}
              style={{...menuBtnStyle, color:"#87ceeb"}}>
              📁 Move to Project {showMoveMenu ? "▲" : "▶"}
            </button>
            {showMoveMenu && (
              <div style={{
                position:"absolute", left:"100%", top:0,
                background:"#0a1f15", border:"1px solid rgba(135,206,235,0.2)",
                borderRadius:10, padding:"6px", minWidth:150,
                boxShadow:"0 8px 24px rgba(0,0,0,0.5)", zIndex:101,
              }}>
                <button onClick={() => handleMoveToProject(null)}
                  style={{...menuBtnStyle, color:"#4a7a5a"}}>
                  ✕ No Project
                </button>
                {projects.map(p => (
                  <button key={p.id} onClick={() => handleMoveToProject(p.id)}
                    style={{...menuBtnStyle, color:"#87ceeb"}}>
                    ◫ {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{height:1,background:"rgba(135,206,235,0.08)",margin:"4px 0"}}/>

          {/* Delete */}
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(s.id); }}
            style={{...menuBtnStyle, color:"#e88"}}>
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
};

const menuBtnStyle = {
  width:"100%", textAlign:"left", background:"transparent",
  border:"none", borderRadius:7, padding:"7px 10px",
  fontSize:11, cursor:"pointer", display:"block",
  fontFamily:"'DM Mono',monospace", letterSpacing:"0.04em",
  transition:"background .15s",
};

// ─── Project section ───────────────────────────────────────────────────────────
const ProjectSection = ({ project, sessions, activeSessionId, onSelect, onRename, onDelete, onMoveToProject, projects, onRenameProject, onDeleteProject }) => {
  const [open, setOpen] = useState(true);
  const [renamingProject, setRenamingProject] = useState(false);
  const [projectName, setProjectName] = useState(project.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (renamingProject && inputRef.current) inputRef.current.focus();
  }, [renamingProject]);

  const projectSessions = sessions.filter(s => s.projectId === project.id);

  return (
    <div style={{marginBottom:8}}>
      {/* Project header */}
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:8,cursor:"pointer",marginBottom:2}}
        onClick={() => setOpen(!open)}>
        <span style={{fontSize:11,color:"#87ceeb",opacity:0.6}}>{open?"▼":"▶"}</span>
        <span style={{fontSize:9,color:"#87ceeb",letterSpacing:"0.12em",fontWeight:600,flex:1}}>
          {renamingProject ? (
            <input
              ref={inputRef}
              value={projectName}
              onChange={e=>setProjectName(e.target.value)}
              onKeyDown={async e => {
                if (e.key==="Enter") { await onRenameProject(project.id, projectName); setRenamingProject(false); }
                if (e.key==="Escape") setRenamingProject(false);
                e.stopPropagation();
              }}
              onClick={e=>e.stopPropagation()}
              style={{background:"rgba(0,0,0,0.4)",border:"1px solid rgba(135,206,235,0.3)",borderRadius:4,color:"#87ceeb",fontSize:10,padding:"1px 5px",fontFamily:"'DM Mono',monospace",width:"80%"}}
            />
          ) : `◫ ${project.name.toUpperCase()}`}
        </span>
        <span style={{fontSize:9,color:"#2a4535"}}>{projectSessions.length}</span>
        {/* Project options */}
        <button onClick={e=>{e.stopPropagation();setRenamingProject(true);}}
          style={{background:"transparent",border:"none",color:"#4a7a5a",cursor:"pointer",fontSize:10,padding:"0 3px"}}>✏️</button>
        <button onClick={e=>{e.stopPropagation();if(window.confirm(`Delete project "${project.name}"?`)) onDeleteProject(project.id);}}
          style={{background:"transparent",border:"none",color:"#7a3a3a",cursor:"pointer",fontSize:10,padding:"0 3px"}}>🗑️</button>
      </div>

      {/* Sessions inside project */}
      {open && projectSessions.map(s => (
        <div key={s.id} style={{paddingLeft:12}}>
          <SessionItem s={s} isActive={s.id===activeSessionId}
            onSelect={onSelect} onRename={onRename} onDelete={onDelete}
            onMoveToProject={onMoveToProject} projects={projects}/>
        </div>
      ))}

      {open && projectSessions.length===0 && (
        <div style={{paddingLeft:20,fontSize:9,color:"#2a4535",letterSpacing:"0.08em",padding:"4px 20px"}}>
          No chats yet — move a chat here
        </div>
      )}
    </div>
  );
};

// ─── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ user, sessions, activeSessionId, onNewChat, onSelectSession, onDeleteSession, onRenameSession, onMoveToProject }) {
  const [projects, setProjects] = useState([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const newProjectRef = useRef(null);

  // Load projects from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db,"users",user.uid,"projects"), orderBy("createdAt","asc"));
    return onSnapshot(q, snap => {
      setProjects(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
  }, [user]);

  useEffect(() => {
    if (showNewProject && newProjectRef.current) newProjectRef.current.focus();
  }, [showNewProject]);

  const createProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    await addDoc(collection(db,"users",user.uid,"projects"), {
      name, createdAt:serverTimestamp(),
    });
    setNewProjectName(""); setShowNewProject(false);
  };

  const renameProject = async (projectId, name) => {
    await updateDoc(doc(db,"users",user.uid,"projects",projectId), { name });
  };

  const deleteProject = async (projectId) => {
    // Move all chats out of project first
    const projectSessions = sessions.filter(s => s.projectId === projectId);
    for (const s of projectSessions) {
      await updateDoc(doc(db,"users",user.uid,"sessions",s.id), { projectId:null, projectName:null });
    }
    await deleteDoc(doc(db,"users",user.uid,"projects",projectId));
  };

  // Unassigned sessions (not in any project)
  const unassigned = sessions.filter(s => !s.projectId);
  const grouped = unassigned.reduce((acc, s) => {
    const date = s.updatedAt?.toDate?.() || new Date();
    const diff = Math.floor((new Date()-date)/(1000*60*60*24));
    const g = diff===0?"Today":diff===1?"Yesterday":diff<=7?"This Week":"Older";
    if (!acc[g]) acc[g]=[];
    acc[g].push(s);
    return acc;
  }, {});

  return (
    <div style={{width:268,flexShrink:0,background:"rgba(5,14,9,0.97)",borderRight:"1px solid rgba(135,206,235,0.08)",display:"flex",flexDirection:"column",height:"100vh",fontFamily:"'DM Mono',monospace",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@800&display=swap');
        .sb-item:hover{background:rgba(135,206,235,0.06)!important;}
        .sb-new:hover{background:rgba(135,206,235,0.1)!important;border-color:rgba(135,206,235,0.35)!important;}
        .sb-item:hover svg[title]{filter:drop-shadow(0 0 6px rgba(135,206,235,0.8))!important;transform:scale(1.15)!important;}
        .sb-eye-btn:hover{filter:drop-shadow(0 0 8px rgba(135,206,235,0.9))!important;transform:scale(1.25)!important;}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1a3a2a;border-radius:3px}
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        button:hover{opacity:0.85;}
      `}</style>

      {/* Top header */}
      <div style={{padding:"16px 14px 12px",borderBottom:"1px solid rgba(135,206,235,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <EyeIcon size={20} active/>
          <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,fontWeight:800,background:"linear-gradient(135deg,#87ceeb,#2d9e6b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.12em"}}>HLAED</span>
        </div>

        {/* New chat */}
        <button onClick={onNewChat} className="sb-new" style={{width:"100%",padding:"8px 12px",background:"rgba(135,206,235,0.05)",border:"1px solid rgba(135,206,235,0.18)",borderRadius:9,color:"#87ceeb",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"'DM Mono',monospace",letterSpacing:"0.07em",transition:"all .2s",marginBottom:6}}>
          <span style={{fontSize:15,lineHeight:1}}>＋</span> NEW CONVERSATION
        </button>

        {/* New project */}
        {showNewProject ? (
          <div style={{display:"flex",gap:6,marginTop:4}}>
            <input ref={newProjectRef} value={newProjectName}
              onChange={e=>setNewProjectName(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")createProject();if(e.key==="Escape")setShowNewProject(false);}}
              placeholder="Project name..."
              style={{flex:1,background:"rgba(0,0,0,0.4)",border:"1px solid rgba(135,206,235,0.25)",borderRadius:7,color:"#87ceeb",fontSize:10,padding:"5px 8px",fontFamily:"'DM Mono',monospace",caretColor:"#87ceeb"}}
            />
            <button onClick={createProject} style={{background:"rgba(135,206,235,0.1)",border:"1px solid rgba(135,206,235,0.25)",borderRadius:7,color:"#87ceeb",padding:"5px 10px",fontSize:11,cursor:"pointer"}}>✓</button>
            <button onClick={()=>setShowNewProject(false)} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.06)",borderRadius:7,color:"#4a5a4a",padding:"5px 8px",fontSize:11,cursor:"pointer"}}>✕</button>
          </div>
        ) : (
          <button onClick={()=>setShowNewProject(true)} style={{width:"100%",padding:"7px 12px",background:"transparent",border:"1px solid rgba(135,206,235,0.1)",borderRadius:9,color:"#4a8a6a",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"'DM Mono',monospace",letterSpacing:"0.07em",transition:"all .2s"}}>
            <span style={{fontSize:14,lineHeight:1}}>◫</span> NEW PROJECT
          </button>
        )}
      </div>

      {/* History list */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 6px"}}>

        {/* Projects */}
        {projects.map(p => (
          <ProjectSection
            key={p.id} project={p} sessions={sessions}
            activeSessionId={activeSessionId}
            onSelect={onSelectSession} onRename={onRenameSession}
            onDelete={onDeleteSession} onMoveToProject={onMoveToProject}
            projects={projects} onRenameProject={renameProject}
            onDeleteProject={deleteProject}
          />
        ))}

        {/* Divider if projects exist */}
        {projects.length > 0 && unassigned.length > 0 && (
          <div style={{height:1,background:"rgba(135,206,235,0.06)",margin:"8px 6px"}}/>
        )}

        {/* Ungrouped chats */}
        {unassigned.length===0 && sessions.length===0 && (
          <div style={{textAlign:"center",padding:"40px 16px",color:"#2a4a35",fontSize:10,lineHeight:2,letterSpacing:"0.1em"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:8,opacity:0.4}}><EyeIcon size={24}/></div>
            NO CONVERSATIONS YET<br/>START A NEW CHAT
          </div>
        )}

        {["Today","Yesterday","This Week","Older"].map(group => {
          if (!grouped[group]) return null;
          return (
            <div key={group} style={{marginBottom:10}}>
              <div style={{fontSize:9,color:"#2a4535",letterSpacing:"0.18em",padding:"3px 10px 5px",fontWeight:600}}>
                {group.toUpperCase()}
              </div>
              {grouped[group].map(s => (
                <SessionItem
                  key={s.id} s={s}
                  isActive={s.id===activeSessionId}
                  onSelect={onSelectSession}
                  onRename={onRenameSession}
                  onDelete={onDeleteSession}
                  onMoveToProject={onMoveToProject}
                  projects={projects}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* User footer */}
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
