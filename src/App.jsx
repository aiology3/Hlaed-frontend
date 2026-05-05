import { useState, useRef, useEffect, useCallback } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, orderBy, query, serverTimestamp, getDoc,
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

// ─── Mermaid chart — copy as PNG image ────────────────────────────────────────
const MermaidChart = ({ code }) => {
  const [svg, setSvg] = useState("");
  const [err, setErr] = useState("");
  const [dlState, setDlState] = useState(null); // null | "png" | "svg"
  const svgRef = useRef(null);

  useEffect(() => {
    loadMermaid().then(async m => {
      try {
        const id = `m${Math.random().toString(36).substr(2,9)}`;
        const { svg: r } = await m.render(id, code);
        setSvg(r);
      } catch { setErr("Could not render flowchart."); }
    });
  }, [code]);

  // ── Download as PNG ───────────────────────────────────────────────────────
  const downloadPNG = () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current.querySelector("svg");
    if (!svgEl) return;

    // Clone SVG and inline all computed styles for accurate rendering
    const cloned = svgEl.cloneNode(true);
    const allEls = cloned.querySelectorAll("*");
    const origEls = svgEl.querySelectorAll("*");
    origEls.forEach((el, i) => {
      const styles = window.getComputedStyle(el);
      const fill = styles.fill; const stroke = styles.stroke;
      if (fill && fill !== "none") allEls[i].setAttribute("fill", fill);
      if (stroke && stroke !== "none") allEls[i].setAttribute("stroke", stroke);
    });

    // Set explicit white background
    cloned.setAttribute("style", "background:#ffffff;");
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg","rect");
    bgRect.setAttribute("width","100%"); bgRect.setAttribute("height","100%");
    bgRect.setAttribute("fill","#ffffff");
    cloned.insertBefore(bgRect, cloned.firstChild);

    const scale = 3;
    const width = svgEl.viewBox?.baseVal?.width || svgEl.getBoundingClientRect().width || 900;
    const height = svgEl.viewBox?.baseVal?.height || svgEl.getBoundingClientRect().height || 500;
    cloned.setAttribute("width", width);
    cloned.setAttribute("height", height);

    const svgData = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(cloned));
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png", 1.0);
      a.download = "hlaed-flowchart.png";
      a.click();
      setDlState("png");
      setTimeout(() => setDlState(null), 2500);
    };
    img.onerror = () => {
      // Ultimate fallback: download SVG instead
      downloadSVG();
    };
    img.src = svgData;
  };

  // ── Download as SVG (vector — perfect quality at any size) ───────────────
  const downloadSVG = () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hlaed-flowchart.svg";
    a.click();
    URL.revokeObjectURL(url);
    setDlState("svg");
    setTimeout(() => setDlState(null), 2500);
  };

  if (err) return <div style={{color:"#e88",fontSize:12,padding:"8px 12px",background:"rgba(200,80,80,.08)",borderRadius:8,marginTop:8}}>{err}</div>;
  if (!svg) return <div style={{color:"#4a9a6a",fontSize:11,padding:"8px",letterSpacing:"0.1em"}}>RENDERING FLOWCHART...</div>;

  const btnBase = {
    display:"flex", alignItems:"center", gap:5,
    borderRadius:8, padding:"5px 12px", fontSize:10, cursor:"pointer",
    fontFamily:"'DM Mono',monospace", letterSpacing:"0.07em", transition:"all .2s",
  };

  return (
    <div style={{marginTop:12,padding:16,background:"rgba(135,206,235,0.04)",border:"1px solid rgba(135,206,235,0.15)",borderRadius:12,overflowX:"auto",boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:10,color:"#2d9e6b",letterSpacing:"0.15em"}}>◈ FLOWCHART</div>
        <div style={{display:"flex",gap:8}}>
          {/* Download PNG — use in Word, PowerPoint, WhatsApp */}
          <button onClick={downloadPNG} style={{
            ...btnBase,
            background: dlState==="png" ? "rgba(45,158,107,0.2)" : "rgba(135,206,235,0.08)",
            border: `1px solid ${dlState==="png" ? "rgba(45,158,107,0.4)" : "rgba(135,206,235,0.2)"}`,
            color: dlState==="png" ? "#2d9e6b" : "#87ceeb",
          }}>
            <span>{dlState==="png" ? "✓" : "↓"}</span>
            {dlState==="png" ? "DOWNLOADED!" : "DOWNLOAD PNG"}
          </button>
          {/* Download SVG — vector, perfect quality */}
          <button onClick={downloadSVG} style={{
            ...btnBase,
            background: dlState==="svg" ? "rgba(45,158,107,0.2)" : "rgba(135,206,235,0.05)",
            border: `1px solid ${dlState==="svg" ? "rgba(45,158,107,0.4)" : "rgba(135,206,235,0.15)"}`,
            color: dlState==="svg" ? "#2d9e6b" : "#4a9a6a",
          }}>
            <span>{dlState==="svg" ? "✓" : "↓"}</span>
            {dlState==="svg" ? "DOWNLOADED!" : "DOWNLOAD SVG"}
          </button>
        </div>
      </div>
      <div ref={svgRef} dangerouslySetInnerHTML={{__html:svg}} style={{display:"flex",justifyContent:"center"}}/>
    </div>
  );
};

// ─── Markdown renderer — converts ** ## tables --- to clean HTML ───────────────
const renderMarkdown = (text, isStreaming) => {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  let keyCounter = 0;
  const key = () => keyCounter++;

  while (i < lines.length) {
    const line = lines[i];

    // ── Table detection ──────────────────────────────────────────────────────
    if (line.includes("|") && i + 1 < lines.length && lines[i+1].replace(/[\|\-\:\s]/g,"").length === 0 && lines[i+1].includes("-")) {
      const tableLines = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      // Parse header
      const headers = tableLines[0].split("|").filter(c => c.trim() !== "").map(c => c.trim());
      // Skip separator line (---)
      const rows = tableLines.slice(2).map(row =>
        row.split("|").filter(c => c.trim() !== "").map(c => c.trim())
      );
      elements.push(
        <div key={key()} style={{overflowX:"auto",marginBottom:16,marginTop:8}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"'DM Mono',monospace"}}>
            <thead>
              <tr>
                {headers.map((h,hi) => (
                  <th key={hi} style={{
                    padding:"10px 14px", textAlign:"left",
                    background:"rgba(135,206,235,0.1)",
                    borderBottom:"2px solid rgba(135,206,235,0.3)",
                    color:"#87ceeb", fontSize:11, letterSpacing:"0.08em",
                    fontWeight:600, whiteSpace:"nowrap",
                  }}>{cleanInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row,ri) => (
                <tr key={ri} style={{background: ri%2===0 ? "rgba(135,206,235,0.02)" : "transparent"}}>
                  {row.map((cell,ci) => (
                    <td key={ci} style={{
                      padding:"9px 14px",
                      borderBottom:"1px solid rgba(135,206,235,0.08)",
                      color: ci===0 ? "#87ceeb" : "#8ab8c8",
                      fontSize:12, lineHeight:1.6,
                    }}>{cleanInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // ── Heading H1 ───────────────────────────────────────────────────────────
    if (line.startsWith("# ")) {
      elements.push(<h1 key={key()} style={{fontSize:18,fontWeight:700,color:"#87ceeb",marginBottom:12,marginTop:16,letterSpacing:"0.05em",borderBottom:"1px solid rgba(135,206,235,0.2)",paddingBottom:6}}>{cleanInline(line.slice(2))}</h1>);
      i++; continue;
    }

    // ── Heading H2 ───────────────────────────────────────────────────────────
    if (line.startsWith("## ")) {
      elements.push(<h2 key={key()} style={{fontSize:15,fontWeight:600,color:"#87ceeb",marginBottom:10,marginTop:18,letterSpacing:"0.04em"}}>{cleanInline(line.slice(3))}</h2>);
      i++; continue;
    }

    // ── Heading H3 ───────────────────────────────────────────────────────────
    if (line.startsWith("### ")) {
      elements.push(<h3 key={key()} style={{fontSize:13,fontWeight:600,color:"#87ceeb",marginBottom:8,marginTop:14,letterSpacing:"0.04em"}}>{cleanInline(line.slice(4))}</h3>);
      i++; continue;
    }

    // ── Horizontal rule --- ───────────────────────────────────────────────────
    if (line.trim() === "---" || line.trim() === "***") {
      elements.push(<hr key={key()} style={{border:"none",borderTop:"1px solid rgba(135,206,235,0.12)",margin:"16px 0"}}/>);
      i++; continue;
    }

    // ── Bullet list * or - ────────────────────────────────────────────────────
    if (line.match(/^[\*\-] /) || line.match(/^\s+[\*\-] /)) {
      const listItems = [];
      while (i < lines.length && (lines[i].match(/^[\*\-] /) || lines[i].match(/^\s+[\*\-] /))) {
        const indent = lines[i].match(/^(\s*)/)[1].length;
        const content = lines[i].replace(/^\s*[\*\-] /, "");
        listItems.push({ content, indent });
        i++;
      }
      elements.push(
        <ul key={key()} style={{marginBottom:10,marginTop:4,paddingLeft:0,listStyle:"none"}}>
          {listItems.map((item,li) => (
            <li key={li} style={{
              display:"flex", alignItems:"flex-start", gap:8,
              marginBottom:6, paddingLeft: item.indent > 0 ? 20 : 0,
              color:"#b8dde8", fontSize:13, lineHeight:1.7,
            }}>
              <span style={{color:"#2d9e6b",flexShrink:0,marginTop:2}}>
                {item.indent > 0 ? "◦" : "◈"}
              </span>
              <span>{cleanInlineJSX(item.content)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Numbered list 1. 2. ───────────────────────────────────────────────────
    if (line.match(/^\d+\. /)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        const num = lines[i].match(/^(\d+)\. /)[1];
        const content = lines[i].replace(/^\d+\. /, "");
        listItems.push({ num, content });
        i++;
      }
      elements.push(
        <ol key={key()} style={{marginBottom:10,marginTop:4,paddingLeft:0,listStyle:"none"}}>
          {listItems.map((item,li) => (
            <li key={li} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:6,color:"#b8dde8",fontSize:13,lineHeight:1.7}}>
              <span style={{color:"#87ceeb",flexShrink:0,minWidth:20,fontWeight:600}}>{item.num}.</span>
              <span>{cleanInlineJSX(item.content)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Code block ────────────────────────────────────────────────────────────
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={key()} style={{background:"rgba(0,0,0,0.4)",border:"1px solid rgba(135,206,235,0.15)",borderRadius:8,padding:"12px 14px",marginBottom:10,marginTop:4,overflowX:"auto"}}>
          {lang && <div style={{fontSize:9,color:"#2d9e6b",marginBottom:6,letterSpacing:"0.15em"}}>{lang.toUpperCase()}</div>}
          <pre style={{margin:0,color:"#87ceeb",fontSize:12,fontFamily:"'DM Mono',monospace",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{codeLines.join("\n")}</pre>
        </div>
      );
      continue;
    }

    // ── Blockquote > ─────────────────────────────────────────────────────────
    if (line.startsWith("> ")) {
      elements.push(
        <div key={key()} style={{borderLeft:"3px solid #2d9e6b",paddingLeft:12,marginBottom:8,color:"#7ab8a8",fontSize:13,fontStyle:"italic",lineHeight:1.7}}>
          {cleanInlineJSX(line.slice(2))}
        </div>
      );
      i++; continue;
    }

    // ── Empty line → spacing ──────────────────────────────────────────────────
    if (line.trim() === "") {
      elements.push(<div key={key()} style={{height:8}}/>);
      i++; continue;
    }

    // ── Regular paragraph ─────────────────────────────────────────────────────
    elements.push(
      <p key={key()} style={{marginBottom:6,color:"#b8dde8",fontSize:13,lineHeight:1.75}}>
        {cleanInlineJSX(line)}
        {isStreaming && i === lines.length - 1 && <StreamCursor/>}
      </p>
    );
    i++;
  }

  return elements;
};

// ─── Clean inline markdown (*bold*, _italic_, `code`, [link]) ─────────────────
const cleanInline = (text) => {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")  // **bold** → plain
    .replace(/\*(.+?)\*/g, "$1")       // *italic* → plain
    .replace(/__(.+?)__/g, "$1")       // __bold__ → plain
    .replace(/_(.+?)_/g, "$1")         // _italic_ → plain
    .replace(/`(.+?)`/g, "$1")         // `code` → plain
    .replace(/\[(.+?)\]\(.+?\)/g, "$1"); // [text](url) → text
};

// ─── Clean inline markdown but return JSX with styled bold/italic/code ────────
const cleanInlineJSX = (text) => {
  // Split on **bold**, *italic*, `code`
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push({ type:"text", content:text.slice(last, m.index) });
    if (m[0].startsWith("**")) parts.push({ type:"bold", content:m[2] });
    else if (m[0].startsWith("*")) parts.push({ type:"italic", content:m[3] });
    else if (m[0].startsWith("`")) parts.push({ type:"code", content:m[4] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type:"text", content:text.slice(last) });

  if (parts.length === 0) return text;

  return parts.map((p,i) => {
    if (p.type === "bold") return <strong key={i} style={{color:"#87ceeb",fontWeight:600}}>{p.content}</strong>;
    if (p.type === "italic") return <em key={i} style={{color:"#7ab8c8",fontStyle:"italic"}}>{p.content}</em>;
    if (p.type === "code") return <code key={i} style={{background:"rgba(135,206,235,0.1)",color:"#87ceeb",padding:"1px 5px",borderRadius:4,fontSize:"0.9em",fontFamily:"'DM Mono',monospace"}}>{p.content}</code>;
    return <span key={i}>{p.content}</span>;
  });
};

// ─── Parse content into mermaid + text blocks ──────────────────────────────────
const parseContent = (rawContent) => {
  const content = (rawContent || "").replace(/\[GENERATE_IMAGE:[^\]]*\]/gi, "").trim();
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

const StreamCursor = () => (
  <span style={{display:"inline-block",width:2,height:"1em",background:"#87ceeb",marginLeft:2,verticalAlign:"middle",animation:"cursorBlink 0.7s steps(1) infinite"}}/>
);

// ─── Generated image component ─────────────────────────────────────────────────
const GeneratedImage = ({ imageUrl, prompt }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hlaed-image-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, "_blank");
    }
    setDownloading(false);
  };

  if (error) return (
    <div style={{padding:"12px 16px",background:"rgba(200,80,80,.08)",border:"1px solid rgba(200,80,80,.2)",borderRadius:12,color:"#e88",fontSize:12,marginTop:8}}>
      ⚠ Image could not be loaded. Please try again.
    </div>
  );

  return (
    <div style={{marginTop:12,borderRadius:14,overflow:"hidden",border:"1px solid rgba(135,206,235,0.15)",boxShadow:"0 8px 30px rgba(0,0,0,0.4)",maxWidth:480}}>
      {/* Loading shimmer */}
      {!loaded && !error && (
        <div style={{width:"100%",height:300,background:"linear-gradient(90deg,#0a1f15 25%,#0e2d1e 50%,#0a1f15 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
          <div style={{fontSize:28,animation:"pulse 1s infinite"}}>🎨</div>
          <div style={{fontSize:10,color:"#4a9a6a",letterSpacing:"0.15em",animation:"textPulse 1s infinite"}}>GENERATING IMAGE...</div>
        </div>
      )}
      {/* Image */}
      <img
        src={imageUrl}
        alt={prompt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{
          width:"100%", display: loaded ? "block" : "none",
          borderRadius:"14px 14px 0 0",
        }}
      />
      {/* Footer with download */}
      {loaded && (
        <div style={{background:"rgba(5,14,9,0.95)",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div style={{fontSize:10,color:"#4a7a5a",letterSpacing:"0.05em",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            ◈ {prompt.slice(0,60)}{prompt.length>60?"...":""}
          </div>
          <button onClick={handleDownload} disabled={downloading} style={{
            display:"flex",alignItems:"center",gap:6,
            background:"linear-gradient(135deg,#0e5c3a,#1a8a5a)",
            border:"1px solid rgba(135,206,235,0.3)",
            borderRadius:8, color:"#87ceeb",
            padding:"5px 14px", fontSize:10, cursor:"pointer",
            fontFamily:"'DM Mono',monospace", letterSpacing:"0.08em",
            flexShrink:0, transition:"all .2s",
            boxShadow:"0 2px 8px rgba(135,206,235,0.15)",
          }}>
            {downloading ? "..." : "↓"} {downloading ? "DOWNLOADING" : "DOWNLOAD"}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Copy answer button ────────────────────────────────────────────────────────
const stripMarkdown = (text) => {
  return text
    .replace(/\[GENERATE_IMAGE:[^\]]*\]/gi, "")
    .replace(/```mermaid[\s\S]*?```/g, "[Flowchart diagram]")
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g,"").replace(/```/g,"").trim())
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*>\s+/gm, "")
    .replace(/---+/g, "─────────────")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const clean = stripMarkdown(text);
    navigator.clipboard.writeText(clean).then(() => { setCopied(true); setTimeout(()=>setCopied(false),2000); });
  };
  return (
    <button onClick={handleCopy} style={{display:"flex",alignItems:"center",gap:4,background:"transparent",border:"1px solid rgba(135,206,235,0.12)",borderRadius:6,color:copied?"#2d9e6b":"#4a7a5a",padding:"3px 8px",fontSize:9,cursor:"pointer",fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",transition:"all .2s",marginTop:6,alignSelf:"flex-start"}}>
      {copied ? "✓ COPIED" : "⎘ COPY ANSWER"}
    </button>
  );
};

// ─── Search indicator ──────────────────────────────────────────────────────────
const SearchIndicator = ({ status, query: q }) => {
  if (!status) return null;
  const cfg = {
    searching:{ icon:"🔍", text:`SEARCHING: "${(q||"").slice(0,40)}..."`, color:"#87ceeb", pulse:true },
    done:     { icon:"✓",  text:"SEARCH COMPLETE", color:"#2d9e6b", pulse:false },
    failed:   { icon:"⚠",  text:"SEARCH UNAVAILABLE — USING AI KNOWLEDGE", color:"#e8a84a", pulse:false },
  };
  const c = cfg[status]; if (!c) return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 14px",background:"rgba(135,206,235,0.06)",border:"1px solid rgba(135,206,235,0.18)",borderRadius:20,marginLeft:44,marginBottom:6,width:"fit-content",animation:"fadeSlideIn 0.2s ease forwards"}}>
      <span style={{fontSize:12}}>{c.icon}</span>
      <span style={{fontSize:10,color:c.color,letterSpacing:"0.1em",animation:c.pulse?"textPulse 1s infinite":"none"}}>{c.text}</span>
    </div>
  );
};

// ─── Message block ─────────────────────────────────────────────────────────────
const MessageBlock = ({ msg, isLatest, isStreaming }) => {
  const isUser = msg.role==="user";
  const parts = isUser ? null : parseContent(msg.content);

  return (
    <div style={{display:"flex",justifyContent:isUser?"flex-end":"flex-start",marginBottom:"20px",animation:"fadeSlideIn 0.3s ease forwards"}}>
      {!isUser&&<div style={{marginRight:10,flexShrink:0,marginTop:2,filter:isLatest?"drop-shadow(0 0 10px rgba(135,206,235,0.5))":"none",transition:"filter 0.5s ease"}}><SmilingEye size={34}/></div>}

      <div style={{maxWidth:"78%"}}>
        {isUser ? (
          <div style={{background:"linear-gradient(135deg,#0e5c3a,#0a3d28)",border:"1px solid rgba(135,206,235,0.25)",borderRadius:"18px 18px 4px 18px",padding:"12px 16px",color:"#d8f4e8",fontSize:14,lineHeight:1.75,whiteSpace:"pre-wrap",fontFamily:"'DM Mono',monospace",boxShadow:"0 4px 20px rgba(14,92,58,0.35)"}}>
            {msg.content}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column"}}>
            {parts.map((p,i) => p.type==="mermaid"
              ? <MermaidChart key={i} code={p.content}/>
              : (
                <div key={i}>
                  <div style={{background:"rgba(135,206,235,0.05)",border:"1px solid rgba(135,206,235,0.12)",borderRadius:"4px 18px 18px 18px",padding:"14px 18px",marginBottom:parts.length>1?8:0,boxShadow:"0 2px 12px rgba(0,0,0,0.25)"}}>
                    {renderMarkdown(p.content, isStreaming && isLatest && i===parts.length-1)}
                  </div>
                  {!isStreaming && msg.content.length > 100 && i===0 && (
                    <CopyButton text={msg.content}/>
                  )}
                </div>
              )
            )}
            {/* Show generating indicator */}
            {msg.generatingImage && (
              <div style={{marginTop:10,padding:"12px 16px",background:"rgba(135,206,235,0.04)",border:"1px solid rgba(135,206,235,0.12)",borderRadius:12,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18,animation:"pulse 1s infinite"}}>🎨</span>
                <span style={{fontSize:10,color:"#4a9a6a",letterSpacing:"0.15em",animation:"textPulse 1s infinite"}}>CREATING YOUR IMAGE...</span>
              </div>
            )}
            {/* Show generated image */}
            {msg.imageUrl && (
              <GeneratedImage imageUrl={msg.imageUrl} prompt={msg.imagePrompt||"Generated image"}/>
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchStatus, setSearchStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [streamingText, setStreamingText] = useState("");
  const [pendingImagePrompt, setPendingImagePrompt] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const activeSessionRef = useRef(null);

  useEffect(() => { activeSessionRef.current = activeSessionId; }, [activeSessionId]);
  useEffect(() => { return onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); }); }, []);

  useEffect(() => {
    if (!user) { setSessions([]); return; }
    const q = query(collection(db,"users",user.uid,"sessions"), orderBy("updatedAt","desc"));
    return onSnapshot(q, snap => { setSessions(snap.docs.map(d=>({id:d.id,...d.data()}))); });
  }, [user]);

  useEffect(() => {
    if (!user||!activeSessionId) { setMessages([]); return; }
    const q = query(collection(db,"users",user.uid,"sessions",activeSessionId,"messages"), orderBy("createdAt","asc"));
    return onSnapshot(q, snap => { setMessages(snap.docs.map(d=>({id:d.id,...d.data()}))); });
  }, [user, activeSessionId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages, isLoading, streamingText]);

  const handleNewChat = async () => {
    if (!user) return;
    const ref = await addDoc(collection(db,"users",user.uid,"sessions"),{ title:"New Conversation",messageCount:0,createdAt:serverTimestamp(),updatedAt:serverTimestamp() });
    setActiveSessionId(ref.id); setMessages([]); setError(null); setStreamingText("");
  };

  const handleSelectSession = (id) => { setActiveSessionId(id); setError(null); setStreamingText(""); };

  const handleDeleteSession = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db,"users",user.uid,"sessions",id));
    if (activeSessionId===id) { setActiveSessionId(null); setMessages([]); setStreamingText(""); }
  };

  const handleRenameSession = async (id, newTitle) => {
    if (!user) return;
    await updateDoc(doc(db,"users",user.uid,"sessions",id), { title: newTitle });
  };

  const handleMoveToProject = async (sessionId, projectId) => {
    if (!user) return;
    if (!projectId) {
      await updateDoc(doc(db,"users",user.uid,"sessions",sessionId), { projectId:null, projectName:null });
      return;
    }
    // Get project name
    const { getDoc } = await import("firebase/firestore");
    const projectSnap = await getDoc(doc(db,"users",user.uid,"projects",projectId));
    const projectName = projectSnap.data()?.name || "";
    await updateDoc(doc(db,"users",user.uid,"sessions",sessionId), { projectId, projectName });
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed||isLoading||isStreaming||!user) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      const ref = await addDoc(collection(db,"users",user.uid,"sessions"),{ title:trimmed.slice(0,40),messageCount:0,createdAt:serverTimestamp(),updatedAt:serverTimestamp() });
      sessionId = ref.id; setActiveSessionId(sessionId);
    }

    setInput(""); setIsLoading(true); setIsStreaming(false);
    setSearchStatus(null); setSearchQuery(""); setError(null); setStreamingText("");

    await addDoc(collection(db,"users",user.uid,"sessions",sessionId,"messages"),{ role:"user",content:trimmed,createdAt:serverTimestamp() });
    const history = [...messages,{role:"user",content:trimmed}];

    try {
      const res = await fetch(`${API_URL}/api/chat`,{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history.map(m=>({role:m.role,content:m.content}))}) });
      if (!res.ok) throw new Error("Server error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ""; let fullText = ""; let streamStarted = false;
      setIsLoading(false);
      let pendingImageUrl = null;
      let pendingImagePrompt = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value,{stream:true});
        const lines = buffer.split("\n"); buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim(); if (!jsonStr) continue;
          try {
            const ev = JSON.parse(jsonStr);
            if (ev.type==="searching") { setSearchStatus("searching"); setSearchQuery(ev.query||""); }
            else if (ev.type==="search_done") { setSearchStatus("done"); setTimeout(()=>setSearchStatus(null),2000); }
            else if (ev.type==="search_failed") { setSearchStatus("failed"); setTimeout(()=>setSearchStatus(null),3000); }
            else if (ev.type==="chunk") {
              if (!streamStarted) { setIsStreaming(true); streamStarted=true; }
              fullText+=ev.text; setStreamingText(fullText);
            }
            else if (ev.type==="generate_image") {
              // Backend sends ready-made image URL and prompt
              pendingImageUrl = ev.imageUrl;
              pendingImagePrompt = ev.prompt;
            }
            else if (ev.type==="done") {
              setIsStreaming(false); setStreamingText(""); setSearchStatus(null);
              const sid = activeSessionRef.current||sessionId;
              // Save message — include image if generated
              const msgData = {
                role:"assistant", content:fullText, createdAt:serverTimestamp(),
                ...(pendingImageUrl ? { imageUrl:pendingImageUrl, imagePrompt:pendingImagePrompt } : {}),
              };
              await addDoc(collection(db,"users",user.uid,"sessions",sid,"messages"), msgData);
              const sessionRef = doc(db,"users",user.uid,"sessions",sid);
              const snap = await getDoc(sessionRef);
              const count = (snap.data()?.messageCount||0)+2;
              await updateDoc(sessionRef,{ updatedAt:serverTimestamp(),messageCount:count,title:snap.data()?.title==="New Conversation"?trimmed.slice(0,40):snap.data()?.title });
              pendingImageUrl = null; pendingImagePrompt = null;
            }
            else if (ev.type==="error") { setError(ev.message); setIsStreaming(false); }
          } catch(_) {}
        }
      }
    } catch(err) { setError(err.message); setIsLoading(false); setIsStreaming(false); }
  };

  const handleKeyDown = e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} };
  const latestAsstIdx = messages.reduce((acc,m,i)=>m.role==="assistant"?i:acc,-1);
  const suggestions = ["What are the latest AI trends in 2026?","Generate an image of a futuristic Indian city","Create a flowchart for user login"];

  if (authLoading) return <div style={{minHeight:"100vh",background:"#050e09",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:"#2d9e6b",fontFamily:"'DM Mono',monospace",fontSize:12,letterSpacing:"0.2em",animation:"pulse 1.5s infinite"}}>LOADING HLAED...</div></div>;
  if (!user) return <LoginPage/>;

  const displayMessages = isStreaming&&streamingText ? [...messages,{id:"streaming",role:"assistant",content:streamingText}] : messages;
  const displayLatestIdx = displayMessages.reduce((acc,m,i)=>m.role==="assistant"?i:acc,-1);

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
        @keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}} @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        textarea:focus{outline:none} button{transition:all .2s} button:hover{opacity:.85} button:active{transform:scale(.97)}
        table{border-collapse:collapse;width:100%}
      `}</style>

      <Sidebar user={user} sessions={sessions} activeSessionId={activeSessionId} onNewChat={handleNewChat} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession} onRenameSession={handleRenameSession} onMoveToProject={handleMoveToProject}/>

      <div style={{flex:1,display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",backgroundImage:`linear-gradient(rgba(135,206,235,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(135,206,235,.03) 1px,transparent 1px)`,backgroundSize:"40px 40px",animation:"floatGrid 8s ease-in-out infinite"}}/>
        <div style={{position:"absolute",top:"-15%",right:"-10%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(14,92,58,.15) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",left:0,right:0,height:"2px",background:"linear-gradient(90deg,transparent,rgba(135,206,235,.08),transparent)",animation:"scanline 6s linear infinite",pointerEvents:"none",zIndex:1}}/>

        {/* Header */}
        <div style={{padding:"14px 24px",borderBottom:"1px solid rgba(135,206,235,.1)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(5,14,9,.85)",backdropFilter:"blur(16px)",position:"relative",zIndex:10}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{filter:"drop-shadow(0 0 12px rgba(135,206,235,.4))"}}><HlaedLogo size={42}/></div>
            <div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,fontWeight:800,background:"linear-gradient(135deg,#87ceeb,#2d9e6b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.12em"}}>HLAED</div>
              <div style={{fontSize:9,color:"#2d9e6b",letterSpacing:"0.2em",marginTop:1}}>REASONING · PLANNING · RESEARCH · AGENT</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:(isLoading||isStreaming)?"#87ceeb":"#2d9e6b",boxShadow:`0 0 8px ${(isLoading||isStreaming)?"#87ceeb":"#2d9e6b"}`,animation:(isLoading||isStreaming)?"pulse 1s infinite":"none"}}/>
            <span style={{fontSize:10,color:(isLoading||isStreaming)?"#87ceeb":"#2d9e6b",letterSpacing:"0.1em"}}>
              {isLoading?"SEARCHING...":isStreaming?"RESPONDING...":"ONLINE"}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:"auto",padding:"28px 24px",display:"flex",flexDirection:"column",position:"relative",zIndex:5,minHeight:0}}>
          {displayMessages.length===0&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,paddingBottom:40,animation:"fadeSlideIn .5s ease forwards"}}>
              <div style={{filter:"drop-shadow(0 0 30px rgba(135,206,235,.5))"}}><HlaedLogo size={72}/></div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:26,fontWeight:800,background:"linear-gradient(135deg,#87ceeb 30%,#2d9e6b 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.15em"}}>HLAED</div>
              <div style={{fontSize:12,color:"#4a9a6a",textAlign:"center",maxWidth:400,lineHeight:1.9,letterSpacing:"0.04em"}}>
                Professional AI research, reasoning & planning agent.<br/>
                Built by Hlaed — pioneering AI & cybersecurity from India 🇮🇳
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginTop:4}}>
                {suggestions.map(s=>(<button key={s} onClick={()=>setInput(s)} style={{background:"rgba(135,206,235,.06)",border:"1px solid rgba(135,206,235,.18)",borderRadius:20,color:"#87ceeb",padding:"7px 18px",fontSize:11,cursor:"pointer",letterSpacing:"0.06em",fontFamily:"'DM Mono',monospace"}}>{s}</button>))}
              </div>
            </div>
          )}

          {displayMessages.map((msg,i)=>(<MessageBlock key={msg.id||i} msg={msg} isLatest={i===displayLatestIdx} isStreaming={isStreaming&&msg.id==="streaming"}/>))}

          {(isLoading||searchStatus)&&(
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
              <SearchIndicator status={searchStatus} query={searchQuery}/>
              {isLoading&&<BlinkingEyes/>}
            </div>
          )}

          {error&&<div style={{background:"rgba(200,80,80,.08)",border:"1px solid rgba(200,80,80,.2)",borderRadius:10,padding:"12px 16px",color:"#e88",fontSize:13,marginBottom:16,animation:"fadeSlideIn .3s ease forwards"}}>⚠ {error}</div>}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{padding:"16px 24px",borderTop:"1px solid rgba(135,206,235,.08)",background:"rgba(5,14,9,.9)",backdropFilter:"blur(16px)",position:"relative",zIndex:10}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-end",background:"rgba(135,206,235,.04)",border:"1px solid rgba(135,206,235,.15)",borderRadius:16,padding:"10px 14px"}}>
            <textarea ref={textareaRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Ask Hlaed anything — research, planning, flowcharts..."
              rows={1} style={{flex:1,background:"transparent",border:"none",color:"#d8eff8",fontSize:14,resize:"none",fontFamily:"'DM Mono',monospace",lineHeight:1.6,maxHeight:140,overflowY:"auto",caretColor:"#87ceeb"}}
              onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,140)+"px";}}/>
            <button onClick={sendMessage} disabled={!input.trim()||isLoading||isStreaming} style={{background:input.trim()&&!isLoading&&!isStreaming?"linear-gradient(135deg,#0e5c3a,#1a8a5a)":"rgba(255,255,255,.04)",border:`1px solid ${input.trim()&&!isLoading&&!isStreaming?"rgba(135,206,235,.3)":"rgba(255,255,255,.06)"}`,borderRadius:12,color:input.trim()&&!isLoading&&!isStreaming?"#87ceeb":"#2a4a35",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",cursor:input.trim()&&!isLoading&&!isStreaming?"pointer":"not-allowed",fontSize:18,flexShrink:0,boxShadow:input.trim()&&!isLoading&&!isStreaming?"0 4px 16px rgba(135,206,235,.2)":"none"}}>↑</button>
          </div>
          <div style={{fontSize:10,color:"#1a4a2a",marginTop:8,textAlign:"center",letterSpacing:"0.1em"}}>SHIFT+ENTER NEW LINE · ENTER SEND · HLAED v3.0 · BY HLAED COMPANY</div>
        </div>
      </div>
    </div>
  );
}
