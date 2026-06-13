import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import SimplePeer from "simple-peer";

const SERVER_URL = "htts://werfolf-production-4524.up.railway.app";

const ALLE_ROLLEN = [
  { id:"werwolf",        name:"Werwolf",          team:"wolf",    emoji:"🐺", farbe:"#534AB7", hell:"#EEEDFE", dunkel:"#26215C", kategorie:"Werwolf",        nachtPhase:"werwolf_waehlt", beschreibung:"Töte jede Nacht gemeinsam mit deinen Artgenossen einen Dorfbewohner.", tipp:"Tarnt euch tagsüber und koordiniert euch nachts." },
  { id:"alphawolf",      name:"Alpha-Wolf",        team:"wolf",    emoji:"👑", farbe:"#534AB7", hell:"#EEEDFE", dunkel:"#26215C", kategorie:"Werwolf",        nachtPhase:"werwolf_waehlt", beschreibung:"Werwolf + einmal pro Spiel kannst du ein Opfer bekehren statt töten.", tipp:"Bekehre den Seher oder die Hexe für maximalen Schaden." },
  { id:"weiserwolf",     name:"Weiser Wolf",       team:"wolf",    emoji:"🔮", farbe:"#534AB7", hell:"#EEEDFE", dunkel:"#26215C", kategorie:"Werwolf",        nachtPhase:"werwolf_waehlt", beschreibung:"Werwolf + einmal pro Spiel die Rolle eines Spielers erfahren.", tipp:"Finde den Seher und schalte ihn zuerst aus." },
  { id:"grosserwolf",    name:"Gr. Böser Wolf",    team:"wolf",    emoji:"😈", farbe:"#534AB7", hell:"#EEEDFE", dunkel:"#26215C", kategorie:"Werwolf",        nachtPhase:"werwolf_waehlt", beschreibung:"Solange alle Werwölfe leben, töte jede Nacht ein Extra-Opfer.", tipp:"Vorsicht – Extra-Tötung fällt weg sobald ein Wolf stirbt." },
  { id:"weisser_werwolf",name:"Weißer Werwolf",    team:"neutral", emoji:"🤍", farbe:"#993C1D", hell:"#FAECE7", dunkel:"#4A1B0C", kategorie:"Neutral",        nachtPhase:"werwolf_waehlt", beschreibung:"Spielt mit den Werwölfen, tötet aber alle anderen Wölfe. Gewinnt alleine.", tipp:"Vertrauen aufbauen, dann von innen heraus vernichten." },
  { id:"seher",          name:"Seher",             team:"dorf",    emoji:"👁️", farbe:"#0F6E56", hell:"#E1F5EE", dunkel:"#04342C", kategorie:"Dorf (Spezial)", nachtPhase:"seher",          beschreibung:"Schau jede Nacht die Rolle eines Mitspielers an.", tipp:"Teile dein Wissen klug mit – du bist ein Hauptziel." },
  { id:"hexe",           name:"Hexe",              team:"dorf",    emoji:"🧙", farbe:"#0F6E56", hell:"#E1F5EE", dunkel:"#04342C", kategorie:"Dorf (Spezial)", nachtPhase:"hexe",           beschreibung:"Heiltrank: rette das Nacht-Opfer. Gifttrank: töte jemanden. Je einmal.", tipp:"Spare den Heiltrank nicht zu lang." },
  { id:"amor",           name:"Amor",              team:"dorf",    emoji:"💘", farbe:"#0F6E56", hell:"#E1F5EE", dunkel:"#04342C", kategorie:"Dorf (Spezial)", nachtPhase:"amor",           beschreibung:"Erste Nacht: verliebe zwei Spieler. Stirbt einer, stirbt der andere.", tipp:"Liebende auf verschiedenen Seiten = dritte Partei!" },
  { id:"schutzengel",    name:"Schutzengel",       team:"dorf",    emoji:"😇", farbe:"#0F6E56", hell:"#E1F5EE", dunkel:"#04342C", kategorie:"Dorf (Spezial)", nachtPhase:"schutzengel",    beschreibung:"Schütze jede Nacht eine Person vor dem Tod. Nicht zweimal dieselbe.", tipp:"Beschütze den Seher wenn du ihn kennst." },
  { id:"medium",         name:"Medium",            team:"dorf",    emoji:"🕯️", farbe:"#0F6E56", hell:"#E1F5EE", dunkel:"#04342C", kategorie:"Dorf (Spezial)", nachtPhase:"medium",         beschreibung:"Einmal pro Spiel: stelle einem toten Spieler eine Ja/Nein-Frage.", tipp:"Frag tote Dorfbewohner nach dem Werwolf-Verdächtigen." },
  { id:"jaeger",         name:"Jäger",             team:"dorf",    emoji:"🏹", farbe:"#0F6E56", hell:"#E1F5EE", dunkel:"#04342C", kategorie:"Dorf (Spezial)", nachtPhase:null,             beschreibung:"Wirst du getötet, reißt du sofort jemanden mit dir.", tipp:"Beobachte gut – dein letzter Schuss sollte einen Wolf treffen." },
  { id:"buergermeister", name:"Bürgermeister",     team:"dorf",    emoji:"🎖️", farbe:"#0F6E56", hell:"#E1F5EE", dunkel:"#04342C", kategorie:"Dorf (Spezial)", nachtPhase:null,             beschreibung:"Deine Stimme zählt doppelt. Stirbst du, bestimmst du deinen Nachfolger.", tipp:"Nutze deinen Einfluss behutsam – du bist ein hohes Ziel." },
  { id:"dorfdepp",       name:"Dorfdepp",          team:"dorf",    emoji:"🤪", farbe:"#0F6E56", hell:"#E1F5EE", dunkel:"#04342C", kategorie:"Dorf (Spezial)", nachtPhase:null,             beschreibung:"Wirst du gelyncht, überlebst du, verlierst aber dein Stimmrecht.", tipp:"Spiele verdächtig genug um gelyncht zu werden." },
  { id:"altefrau",       name:"Alte Frau",         team:"dorf",    emoji:"👵", farbe:"#0F6E56", hell:"#E1F5EE", dunkel:"#04342C", kategorie:"Dorf (Spezial)", nachtPhase:null,             beschreibung:"Überlebt den ersten Werwolf-Angriff. Wird sie gelyncht, greifen Wölfe nächste Nacht nicht an.", tipp:"Bleib still – dein Überleben verwirrt die Werwölfe." },
  { id:"hexenjaeger",    name:"Hexenjäger",        team:"dorf",    emoji:"🔥", farbe:"#0F6E56", hell:"#E1F5EE", dunkel:"#04342C", kategorie:"Dorf (Spezial)", nachtPhase:null,             beschreibung:"Einmal: kläre jemanden als Werwolf an. Ist er es, stirbt er sofort.", tipp:"Nutze deinen Anklage-Schuss weise." },
  { id:"serienkiller",   name:"Serienkiller",      team:"neutral", emoji:"🔪", farbe:"#993C1D", hell:"#FAECE7", dunkel:"#4A1B0C", kategorie:"Neutral",        nachtPhase:"serienkiller",   beschreibung:"Töte jede Nacht alleine eine Person. Gewinnt als letzter Überlebender.", tipp:"Lass Wölfe und Dorf sich gegenseitig aufreiben." },
  { id:"flötenspieler",  name:"Flötenspieler",     team:"neutral", emoji:"🎵", farbe:"#993C1D", hell:"#FAECE7", dunkel:"#4A1B0C", kategorie:"Neutral",        nachtPhase:"flötenspieler",  beschreibung:"Verzaubere jede Nacht 2 Spieler. Gewinnt wenn alle Lebenden verzaubert sind.", tipp:"Verzaubere unauffällig – niemand darf dich erkennen." },
  { id:"dorfbewohner",   name:"Dorfbewohner",      team:"dorf",    emoji:"🧑", farbe:"#185FA5", hell:"#E6F1FB", dunkel:"#042C53", kategorie:"Dorfbewohner",   nachtPhase:null,             beschreibung:"Keine Sonderfähigkeit. Deine Waffe: Beobachtung und Überzeugung.", tipp:"Analysiere das Verhalten anderer und argumentiere überzeugend." },
];

const DEFAULT_CFG = { werwolf:2,dorfbewohner:4,seher:1,hexe:1,jaeger:1,amor:1,buergermeister:0,medium:0,schutzengel:0,dorfdepp:0,altefrau:0,alphawolf:0,weiserwolf:0,grosserwolf:0,hexenjaeger:0,serienkiller:0,weisser_werwolf:0,flötenspieler:0 };
const KATEGORIEN = ["Werwolf","Dorf (Spezial)","Neutral","Dorfbewohner"];

const NACHT_ORDER = [
  { phase:"amor",           label:"Amor erwacht",          emoji:"💘", nurErstNacht:true,  rolleId:"amor" },
  { phase:"werwolf_waehlt", label:"Werwölfe erwachen",     emoji:"🐺", nurErstNacht:false, rolleId:null },
  { phase:"seher",          label:"Seher erwacht",         emoji:"👁️", nurErstNacht:false, rolleId:"seher" },
  { phase:"schutzengel",    label:"Schutzengel erwacht",   emoji:"😇", nurErstNacht:false, rolleId:"schutzengel" },
  { phase:"hexe",           label:"Hexe erwacht",          emoji:"🧙", nurErstNacht:false, rolleId:"hexe" },
  { phase:"medium",         label:"Medium erwacht",        emoji:"🕯️", nurErstNacht:false, rolleId:"medium" },
  { phase:"serienkiller",   label:"Serienkiller erwacht",  emoji:"🔪", nurErstNacht:false, rolleId:"serienkiller" },
  { phase:"flötenspieler",  label:"Flötenspieler erwacht", emoji:"🎵", nurErstNacht:false, rolleId:"flötenspieler" },
];

function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function genCode(){ return "WOLF-"+Math.random().toString(36).slice(2,6).toUpperCase(); }

// S = styles shorthand
const S={
  page:{maxWidth:540,margin:"0 auto",padding:"16px 14px 48px",fontFamily:"var(--font-sans)",minHeight:"100vh",background:"radial-gradient(circle at 50% 0%, #2a2a4a 0%, #14141f 55%, #0a0a12 100%)",color:"#EDEBFA"},
  card:{background:"rgba(255,255,255,0.045)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:16,marginBottom:10,backdropFilter:"blur(6px)",boxShadow:"0 2px 12px rgba(0,0,0,0.25)"},
  label:{fontSize:11,color:"#9C97C4",marginBottom:5,fontWeight:600,letterSpacing:0.4,textTransform:"uppercase"},
  inp:{width:"100%",padding:"11px 13px",borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(0,0,0,0.25)",color:"#fff",fontSize:14,boxSizing:"border-box",outline:"none"},
  btnP:{width:"100%",padding:"13px",borderRadius:12,background:"linear-gradient(135deg,#7C6FE8,#A85FD0)",color:"#fff",border:"none",fontWeight:600,fontSize:14,cursor:"pointer",boxShadow:"0 4px 16px rgba(124,111,232,0.35)",letterSpacing:0.2},
  btnG:{width:"100%",padding:"12px",borderRadius:12,background:"rgba(255,255,255,0.04)",color:"#EDEBFA",border:"1px solid rgba(255,255,255,0.12)",fontWeight:500,fontSize:13,cursor:"pointer"},
  btnS:{padding:"7px 13px",borderRadius:99,background:"rgba(255,255,255,0.05)",color:"#EDEBFA",border:"1px solid rgba(255,255,255,0.12)",fontSize:13,cursor:"pointer"},
  badge:{display:"inline-block",padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:600},
  step:{width:30,height:30,borderRadius:9,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.04)",color:"#EDEBFA",fontSize:17,cursor:"pointer",fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center"},
  tabBar:{display:"flex",gap:6,marginBottom:12},
  tab:{flex:1,padding:"8px 4px",fontSize:12,borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.02)",color:"#9C97C4",cursor:"pointer",fontWeight:500},
  tabA:{background:"linear-gradient(135deg,#7C6FE8,#A85FD0)",color:"#fff",borderColor:"transparent"},
  back:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,fontSize:18,cursor:"pointer",color:"#EDEBFA",padding:"4px 10px"},
};

function Toast({msg,ok}){
  return <div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:ok?"#E1F5EE":"#FCEBEB",color:ok?"#04342C":"#501313",padding:"10px 20px",borderRadius:24,fontSize:13,fontWeight:500,pointerEvents:"none",whiteSpace:"nowrap"}}>{msg}</div>;
}
function InfoBox({children}){return <div style={{...S.card,color:"#9C97C4",fontSize:13,textAlign:"center",padding:16}}>{children}</div>;}

function PhaseBar({phase,runde,aktNachtPhase}){
  const isNacht=phase==="nacht_phase"||phase==="warten";
  const lbl=phase==="warten"?"Bereit für Runde "+runde:phase==="tag"?"Tag · Runde "+runde:phase==="abstimmung"?"Abstimmung · Runde "+runde:(aktNachtPhase?.label||"Nacht")+" · Runde "+runde;
  return <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderRadius:14,marginBottom:12,background:isNacht?"linear-gradient(135deg,#1f1f3a,#13131f)":"linear-gradient(135deg,#5b3a0f,#3a2408)",border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>
    <span style={{fontSize:18}}>{isNacht?"🌙":"☀️"}</span>
    <span style={{fontWeight:600,fontSize:13,color:isNacht?"#C9C4F0":"#FFD9A0"}}>{lbl}</span>
  </div>;
}

function CamSlot({s,meineId,zeigeRolle,tot,stream}){
  const f=s.rolle?.farbe||"#7C6FE8";
  const videoRef=useRef(null);
  useEffect(()=>{
    if(videoRef.current&&stream){videoRef.current.srcObject=stream;}
  },[stream]);
  return <div style={{border:s.id===meineId?`2px solid ${f}`:"1px solid rgba(255,255,255,0.08)",borderRadius:12,aspectRatio:"4/3",background:"linear-gradient(160deg,#23233a,#15151f)",position:"relative",overflow:"hidden",display:"flex",alignItems:"flex-end",filter:tot?"grayscale(100%) brightness(0.35)":"none",boxShadow:s.id===meineId?`0 0 16px ${f}66`:"none"}}>
    {stream?
      <video ref={videoRef} autoPlay playsInline muted={s.id===meineId} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
    :
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-65%)",width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg, ${f}, ${f}aa)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:13,boxShadow:`0 2px 10px ${f}55`}}>
        {tot?"💀":s.name.slice(0,2).toUpperCase()}
      </div>
    }
    {zeigeRolle&&s.rolle&&<div style={{position:"absolute",top:5,left:5,background:"rgba(0,0,0,0.55)",color:"#fff",fontSize:9,padding:"3px 6px",borderRadius:99,fontWeight:600,lineHeight:1.4,border:`1px solid ${f}66`}}>{s.rolle.emoji}{s.rolle.name}</div>}
    <div style={{background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:9.5,padding:"3px 5px",width:"100%",textAlign:"center",fontWeight:500}}>{s.name}{s.id===meineId?" ✦":""}</div>
  </div>;
}

function CamGrid({sp,meineId,zeigeRollen,tot,streams}){
  return <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>{sp.map(s=><CamSlot key={s.id} s={s} meineId={meineId} zeigeRolle={zeigeRollen||s.id===meineId} tot={tot||s.tot} stream={streams?.[s.id]}/>)}</div>;
}

// ─── ACTION COMPONENTS ────────────────────────────────────────────────────────
function WolfAktion({lebendig,meineId,meineRolle,istGM,ne,setNe,onWeiter}){
  const isWolf=meineRolle?.team==="wolf"||meineRolle?.id==="weisser_werwolf";
  const ziele=lebendig.filter(s=>s.id!==meineId&&s.rolle?.team!=="wolf"&&s.rolle?.id!=="weisser_werwolf");
  if(!isWolf&&!istGM) return <InfoBox>Du schläfst…</InfoBox>;
  return <div style={S.card}>
    <p style={{fontWeight:500,marginBottom:4,color:"#F5F3FF"}}>🐺 Werwölfe – wählt euer Opfer</p>
    <p style={{fontSize:12,color:"#9C97C4",marginBottom:10}}>Alle Werwölfe stimmen gemeinsam ab.</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:12}}>
      {ziele.map(s=><button key={s.id} style={{...S.btnS,...(ne.wolfOpfer===s.id?{background:"#EEEDFE",color:"#26215C",borderColor:"#534AB7"}:{})}} onClick={()=>{setNe(p=>({...p,wolfOpfer:s.id}));emit("night_action",{action:"wolfOpfer",payload:{targetId:s.id}});}}>{s.name}</button>)}
    </div>
    {(isWolf||istGM)&&<button style={S.btnP} disabled={!ne.wolfOpfer} onClick={onWeiter}>Opfer bestätigen &amp; weiter</button>}
  </div>;
}

function AmorAktion({lebendig,meineId,onWaehlen}){
  const [a,setA]=useState(null);const [b,setB]=useState(null);
  const and=lebendig.filter(s=>s.id!==meineId);
  return <div style={S.card}>
    <p style={{fontWeight:500,marginBottom:4,color:"#F5F3FF"}}>💘 Wähle zwei Liebende</p>
    <p style={{fontSize:12,color:"#9C97C4",marginBottom:10}}>Die beiden sind für immer verbunden – stirbt einer, stirbt der andere.</p>
    <p style={{fontSize:11,color:"#9C97C4",marginBottom:5}}>Erste Person:</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{and.map(s=><button key={s.id} style={{...S.btnS,...(a===s.id?{background:"#FBEAF0",color:"#4B1528",borderColor:"#D4537E"}:{})}} onClick={()=>setA(s.id)}>{s.name}</button>)}</div>
    <p style={{fontSize:11,color:"#9C97C4",marginBottom:5}}>Zweite Person:</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{and.filter(s=>s.id!==a).map(s=><button key={s.id} style={{...S.btnS,...(b===s.id?{background:"#FBEAF0",color:"#4B1528",borderColor:"#D4537E"}:{})}} onClick={()=>setB(s.id)}>{s.name}</button>)}</div>
    <button style={S.btnP} disabled={!a||!b} onClick={()=>onWaehlen(a,b)}>Liebende bestimmen</button>
  </div>;
}

function SeherAktion({lebendig,meineId,onWeiter}){
  const ziele=lebendig.filter(s=>s.id!==meineId);
  return <div style={S.card}>
    <p style={{fontWeight:500,marginBottom:4,color:"#F5F3FF"}}>👁️ Wen möchtest du sehen?</p>
    <p style={{fontSize:12,color:"#9C97C4",marginBottom:10}}>Du erfährst die wahre Rolle dieser Person.</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{ziele.map(s=><button key={s.id} style={S.btnS} onClick={()=>{emit("night_action",{action:"seherSchau",payload:{targetId:s.id}});onWeiter();}}>{s.name}</button>)}</div>
  </div>;
}

function SchutzAktion({lebendig,meineId,letzterSchutz,onSchützen}){
  const ziele=lebendig.filter(s=>s.id!==letzterSchutz);
  return <div style={S.card}>
    <p style={{fontWeight:500,marginBottom:4,color:"#F5F3FF"}}>😇 Wen beschützt du heute Nacht?</p>
    <p style={{fontSize:12,color:"#9C97C4",marginBottom:10}}>Nicht dieselbe Person wie letzte Nacht.</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{ziele.map(s=><button key={s.id} style={S.btnS} onClick={()=>onSchützen(s.id)}>{s.name}</button>)}</div>
  </div>;
}

function HexeAktion({lebendig,meineId,wolfOpfer,wolfOpferName,heiltrank,gifttrank,setHT,setGT,zeigToast,onWeiter}){
  const opfer=wolfOpferName?{name:wolfOpferName}:null;
  return <div style={S.card}>
    <p style={{fontWeight:500,marginBottom:12,color:"#F5F3FF"}}>🧙 Hexe erwacht</p>
    {opfer&&<div style={{padding:"10px 12px",borderRadius:8,background:"#FCEBEB",marginBottom:12}}>
      <p style={{fontSize:13,color:"#A32D2D"}}>Opfer der Werwölfe: <strong>{opfer.name}</strong></p>
      {heiltrank&&<button style={{...S.btnG,marginTop:8,fontSize:12}} onClick={()=>{setHT(false);emit("night_action",{action:"hexeHeil",payload:{}});zeigToast("Heiltrank eingesetzt!");onWeiter();}}>🧪 Heiltrank einsetzen</button>}
      {!heiltrank&&<p style={{fontSize:11,color:"#A32D2D",marginTop:6}}>Heiltrank bereits verbraucht.</p>}
    </div>}
    {!opfer&&<p style={{fontSize:13,color:"#9C97C4",marginBottom:12}}>Diese Nacht gibt es kein Werwolf-Opfer.</p>}
    {gifttrank&&<div style={{marginBottom:12}}>
      <p style={{fontSize:12,color:"#9C97C4",marginBottom:7}}>Gifttrank – wen vergiftest du?</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{lebendig.filter(s=>s.id!==meineId&&s.id!==wolfOpfer).map(s=><button key={s.id} style={{...S.btnS,background:"#FAECE7",color:"#4A1B0C",borderColor:"#993C1D"}} onClick={()=>{setGT(false);emit("night_action",{action:"hexeGift",payload:{targetId:s.id}});zeigToast(`${s.name} vergiftet!`);onWeiter();}}>{s.name}</button>)}</div>
    </div>}
    {!gifttrank&&<p style={{fontSize:11,color:"#9C97C4",marginBottom:10}}>Gifttrank bereits verbraucht.</p>}
    <button style={S.btnG} onClick={onWeiter}>Nichts tun &amp; schlafen</button>
  </div>;
}

function MediumAktion({tot,onFragen,onWeiter}){
  const [gew,setGew]=useState(null);
  if(tot.length===0) return <div style={S.card}><p style={{fontSize:13,color:"#9C97C4"}}>Noch niemand gestorben.<br/><button style={{...S.btnG,marginTop:10}} onClick={onWeiter}>Schlafen</button></p></div>;
  return <div style={S.card}>
    <p style={{fontWeight:500,marginBottom:4,color:"#F5F3FF"}}>🕯️ Mit wem kommunizierst du?</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{tot.map(s=><button key={s.id} style={{...S.btnS,...(gew===s.id?{background:"#E1F5EE",color:"#04342C",borderColor:"#0F6E56"}:{})}} onClick={()=>setGew(s.id)}>{s.name}</button>)}</div>
    {gew&&<><p style={{fontSize:12,color:"#9C97C4",marginBottom:7}}>Stelle deine Ja/Nein-Frage:</p>
      <div style={{display:"flex",gap:8}}><button style={S.btnG} onClick={()=>onFragen(gew,"JA")}>✅ Ja</button><button style={S.btnG} onClick={()=>onFragen(gew,"NEIN")}>❌ Nein</button></div></>}
    <button style={{...S.btnG,marginTop:10}} onClick={onWeiter}>Schlafen ohne Frage</button>
  </div>;
}

function SKAktion({lebendig,meineId,onTöten}){
  return <div style={S.card}>
    <p style={{fontWeight:500,marginBottom:4,color:"#F5F3FF"}}>🔪 Wer ist dein Opfer?</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:8}}>{lebendig.filter(s=>s.id!==meineId).map(s=><button key={s.id} style={{...S.btnS,background:"#FAECE7",color:"#4A1B0C",borderColor:"#993C1D"}} onClick={()=>onTöten(s.id)}>{s.name}</button>)}</div>
  </div>;
}

function FloeteAktion({lebendig,meineId,onVerzaubern}){
  const [a,setA]=useState(null);const [b,setB]=useState(null);
  const and=lebendig.filter(s=>s.id!==meineId);
  return <div style={S.card}>
    <p style={{fontWeight:500,marginBottom:4,color:"#F5F3FF"}}>🎵 Verzaubere zwei Spieler</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{and.map(s=>{const sel=a===s.id||b===s.id;return <button key={s.id} style={{...S.btnS,...(sel?{background:"#FAEEDA",color:"#412402",borderColor:"#BA7517"}:{})}} onClick={()=>{if(a===s.id)setA(null);else if(b===s.id)setB(null);else if(!a)setA(s.id);else if(!b)setB(s.id);}}>{s.name}{sel?" ✦":""}</button>;})}</div>
    <button style={S.btnP} disabled={!a||!b} onClick={()=>onVerzaubern(a,b)}>Verzaubern</button>
  </div>;
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function rolleInfo(id){ return ALLE_ROLLEN.find(r=>r.id===id)||null; }
function naLabel(phaseName){ return NACHT_ORDER.find(p=>p.phase===phaseName); }

export default function App(){
  const [screen,setScreen]=useState("lobby");
  const [name,setName]=useState("");
  const [joinIn,setJoinIn]=useState("");
  const [code,setCode]=useState("");
  const [istGM,setIstGM]=useState(false);
  const [cfg,setCfg]=useState(DEFAULT_CFG);
  const [spieler,setSpieler]=useState([]);
  const [meineId,setMeineId]=useState(null);
  const [runde,setRunde]=useState(1);
  const [phase,setPhase]=useState("warten");
  const [aktNachtPhase,setAktNachtPhase]=useState(null);
  const [ne,setNe]=useState({});
  const [abstimmung,setAbstimmung]=useState({});
  const [protokoll,setProtokoll]=useState([]);
  const [revealed,setRevealed]=useState(false);
  const [gewinner,setGewinner]=useState(null);
  const [toast,setToast]=useState(null);
  const [letzterSchutz,setLetzterSchutz]=useState(null);
  const [heiltrank,setHT]=useState(true);
  const [gifttrank,setGT]=useState(true);
  const [mediumGenutzt,setMediumG]=useState(false);
  const [liebende,setLiebende]=useState([]);
  const [amorGesetzt,setAmorG]=useState(false);
  const [gmTab,setGmTab]=useState("spiel");

  // ── Multiplayer: Socket & WebRTC ──
  const socketRef=useRef(null);
  const peersRef=useRef({});
  const localStreamRef=useRef(null);
  const [localStream,setLocalStream]=useState(null);
  const [streams,setStreams]=useState({}); // peerId -> MediaStream
  const startedFlowDone=useRef(false);

  const ich=spieler.find(s=>s.id===meineId);
  const meineRolle=ich?.rolle;
  const lebendig=spieler.filter(s=>!s.tot);
  const tot=spieler.filter(s=>s.tot);

  function zeigToast(msg,ok=true){setToast({msg,ok});setTimeout(()=>setToast(null),2800);}

  // ── Kamera/Mikrofon + Socket-Verbindung aufbauen ──
  useEffect(()=>{
    const socket=io(SERVER_URL,{transports:["websocket","polling"]});
    socketRef.current=socket;

    navigator.mediaDevices?.getUserMedia({video:true,audio:true})
      .then(stream=>{ localStreamRef.current=stream; setLocalStream(stream); })
      .catch(()=>zeigToast("Kamera/Mikrofon nicht verfügbar.",false));

    socket.on("room_update",(state)=>{
      setCode(state.code);
      setPhase(state.phase==="gameover"?"tag":state.phase);
      setRunde(state.runde);
      setAktNachtPhase(state.aktNachtPhase);
      setAbstimmung(state.abstimmung||{});
      setProtokoll(state.protokoll||[]);
      setIstGM(state.isGM);
      setMeineId(socket.id);
      setSpieler(state.players.map(p=>({...p, rolle: p.rolle?rolleInfo(p.rolle.id):null})));
      if(state.gewinner){ setGewinner(state.gewinner); setScreen("gameover"); }

      // Erster Wechsel von "noch nicht gestartet" -> "gestartet"
      if(state.started && !startedFlowDone.current){
        startedFlowDone.current=true;
        if(state.isGM){ setScreen("game"); }
        else { setRevealed(false); setScreen("role"); }
      }
    });

    socket.on("toast",({msg,ok})=>zeigToast(msg,ok));
    socket.on("room_closed",({reason})=>{ zeigToast(reason||"Raum geschlossen.",false); });

    // ── WebRTC Signaling ──
    socket.on("rtc_peer_joined",({id})=>{
      if(!localStreamRef.current||peersRef.current[id])return;
      const peer=new SimplePeer({initiator:true,trickle:true,stream:localStreamRef.current});
      peer.on("signal",signal=>socket.emit("rtc_signal",{to:id,signal}));
      peer.on("stream",remote=>setStreams(p=>({...p,[id]:remote})));
      peersRef.current[id]=peer;
    });
    socket.on("rtc_signal",({from,signal})=>{
      let peer=peersRef.current[from];
      if(!peer){
        peer=new SimplePeer({initiator:false,trickle:true,stream:localStreamRef.current});
        peer.on("signal",s=>socket.emit("rtc_signal",{to:from,signal:s}));
        peer.on("stream",remote=>setStreams(p=>({...p,[from]:remote})));
        peersRef.current[from]=peer;
      }
      peer.signal(signal);
    });

    return ()=>{ socket.disconnect(); Object.values(peersRef.current).forEach(p=>p.destroy()); };
  },[]);

  function emit(...args){ socketRef.current?.emit(...args); }

  // Sobald wir im Warteraum / Spiel sind: anderen Spielern Bescheid geben
  useEffect(()=>{
    if((screen==="waiting"||screen==="role"||screen==="game")&&localStream){
      emit("rtc_ready");
    }
  },[screen,localStream]);

  function erstellen(){
    emit("create_room",{name:name||"Spielleiter",cfg},(res)=>{
      if(res?.ok){ setCode(res.code); setIstGM(true); setScreen("waiting"); }
      else zeigToast(res?.error||"Fehler beim Erstellen.",false);
    });
  }

  function beitreten(){
    emit("join_room",{code:joinIn,name:name||"Spieler"},(res)=>{
      if(res?.ok){ setCode(res.code); setIstGM(false); setScreen("waiting"); }
      else zeigToast(res?.error||"Raum nicht gefunden.",false);
    });
  }

  function nachtStarten(){ emit("night_start"); }
  function naechstePhase(){ emit("next_phase"); }
  function weiter(){
    if(istGM) emit("next_phase");
    else zeigToast("Aktion gesendet ✓ – warte auf den Spielleiter.",true);
  }

  const gesamtSpieler=Object.values(cfg).reduce((a,b)=>a+b,0);

  // ── SCREENS ──
  if(screen==="gameover") return (
    <div style={S.page}>
      {toast&&<Toast {...toast}/>}
      <div style={{textAlign:"center",padding:"28px 16px",borderRadius:16,background:{dorf:"#E1F5EE",wolf:"#EEEDFE",liebende:"#FBEAF0",serienkiller:"#FAECE7",flötenspieler:"#FAEEDA"}[gewinner]||"#fff",marginBottom:14}}>
        <div style={{fontSize:48,marginBottom:8}}>{{dorf:"🏡",wolf:"🐺",liebende:"💘",serienkiller:"🔪",flötenspieler:"🎵"}[gewinner]||"🎭"}</div>
        <p style={{fontSize:20,fontWeight:600,color:"#F5F3FF"}}>{{"dorf":"Das Dorf gewinnt!","wolf":"Die Werwölfe gewinnen!","liebende":"Die Liebenden gewinnen!","serienkiller":"Der Serienkiller gewinnt!","flötenspieler":"Der Flötenspieler gewinnt!"}[gewinner]||"Spiel vorbei"}</p>
      </div>
      <div style={S.card}>
        <p style={{...S.label,marginBottom:8}}>Alle Rollen aufgedeckt</p>
        {spieler.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"0.5px solid rgba(255,255,255,0.08)"}}>
          <span style={{fontSize:15}}>{s.tot?"💀":s.rolle?.emoji}</span>
          <span style={{fontSize:13,flex:1,color:"#F5F3FF"}}>{s.name}</span>
          <span style={{...S.badge,background:s.rolle?.hell,color:s.rolle?.dunkel,fontSize:10}}>{s.rolle?.name}</span>
        </div>)}
      </div>
      <div style={S.card}>
        <p style={{...S.label,marginBottom:6}}>Protokoll</p>
        {protokoll.map((p,i)=><p key={i} style={{fontSize:11,color:p.startsWith("──")?"#F5F3FF":"#9C97C4",fontWeight:p.startsWith("──")?500:400,lineHeight:1.7}}>{p}</p>)}
      </div>
      <button style={S.btnP} onClick={()=>{setScreen("lobby");setSpieler([]);setRunde(1);setPhase("warten");setProtokoll([]);setGewinner(null);setRevealed(false);setHT(true);setGT(true);setMediumG(false);setLiebende([]);setAmorG(false);setNe({});setAbstimmung({});startedFlowDone.current=false;}}>Neues Spiel</button>
    </div>
  );

  if(screen==="lobby") return (
    <div style={S.page}>
      {toast&&<Toast {...toast}/>}
      <div style={{textAlign:"center",padding:"24px 0 18px"}}>
        <div style={{fontSize:54,filter:"drop-shadow(0 0 18px rgba(124,111,232,0.5))"}}>🐺</div>
        <h1 style={{fontSize:34,fontWeight:800,background:"linear-gradient(135deg,#A85FD0,#7C6FE8)",WebkitBackgroundClip:"text",backgroundClip:"text",color:"transparent",letterSpacing:-1,margin:"6px 0 4px"}}>Werwolf</h1>
        <p style={{fontSize:12,color:"#9C97C4"}}>Online · Kamera · Kein gemeinsames WLAN nötig</p>
        <p style={{fontSize:11,color:"#6B6890",marginTop:4}}>🔗 {SERVER_URL}</p>
      </div>
      <div style={S.card}><p style={S.label}>Dein Name</p><input style={S.inp} value={name} onChange={e=>setName(e.target.value)} placeholder="z.B. Krokoboss"/></div>
      <button style={S.btnP} onClick={()=>setScreen("create")}>Neues Spiel erstellen (Spielleiter)</button>
      <button style={{...S.btnG,marginTop:8}} onClick={()=>setScreen("join")}>Spiel beitreten</button>
      <div style={{marginTop:18}}>
        <p style={{fontSize:11,fontWeight:600,color:"#9C97C4",marginBottom:7}}>ALLE {ALLE_ROLLEN.length} ROLLEN</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{ALLE_ROLLEN.map(r=><span key={r.id} style={{...S.badge,background:r.hell,color:r.dunkel}}>{r.emoji} {r.name}</span>)}</div>
      </div>
    </div>
  );

  if(screen==="create") return (
    <div style={S.page}>
      {toast&&<Toast {...toast}/>}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <button style={S.back} onClick={()=>setScreen("lobby")}>←</button>
        <h2 style={{fontSize:17,fontWeight:500,margin:0,color:"#F5F3FF"}}>Rollen konfigurieren</h2>
      </div>
      <div style={{...S.card,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><p style={{fontWeight:500,fontSize:14,color:"#F5F3FF"}}>Spieler gesamt</p><p style={{fontSize:11,color:"#9C97C4"}}>inkl. GM: {name||"Du"}</p></div>
          <span style={{fontSize:26,fontWeight:700,color:"#534AB7"}}>{gesamtSpieler}</span>
        </div>
        <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
          <span style={{...S.badge,background:"#EEEDFE",color:"#26215C"}}>🐺 {ALLE_ROLLEN.filter(r=>r.team==="wolf").reduce((s,r)=>s+(cfg[r.id]||0),0)} Wölfe</span>
          <span style={{...S.badge,background:"#E1F5EE",color:"#04342C"}}>🧑 {ALLE_ROLLEN.filter(r=>r.team==="dorf").reduce((s,r)=>s+(cfg[r.id]||0),0)} Dorf</span>
          {ALLE_ROLLEN.filter(r=>r.team==="neutral").reduce((s,r)=>s+(cfg[r.id]||0),0)>0&&<span style={{...S.badge,background:"#FAECE7",color:"#4A1B0C"}}>⚖️ {ALLE_ROLLEN.filter(r=>r.team==="neutral").reduce((s,r)=>s+(cfg[r.id]||0),0)} Neutral</span>}
        </div>
        {gesamtSpieler<5&&<p style={{fontSize:11,color:"#A32D2D",marginTop:6}}>⚠ Mindestens 5 Spieler empfohlen</p>}
      </div>
      {KATEGORIEN.map(kat=>(
        <div key={kat} style={{marginBottom:12}}>
          <p style={{fontSize:11,fontWeight:700,color:"#9C97C4",marginBottom:6,letterSpacing:0.5}}>{kat.toUpperCase()}</p>
          {ALLE_ROLLEN.filter(r=>r.kategorie===kat).map(r=>(
            <div key={r.id} style={{...S.card,padding:"9px 11px",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:18,minWidth:22}}>{r.emoji}</span>
                <div style={{flex:1}}>
                  <p style={{fontWeight:500,fontSize:13,color:"#F5F3FF"}}>{r.name}</p>
                  <p style={{fontSize:10,color:"#9C97C4",lineHeight:1.4,marginTop:1}}>{r.beschreibung}</p>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <button style={S.step} onClick={()=>setCfg(p=>{const n={...p,[r.id]:Math.max(0,(p[r.id]||0)-1)};emit("update_cfg",{cfg:n});return n;})}>−</button>
                  <span style={{minWidth:16,textAlign:"center",fontWeight:700,fontSize:14,color:"#F5F3FF"}}>{cfg[r.id]||0}</span>
                  <button style={{...S.step,background:r.hell,color:r.dunkel,borderColor:r.farbe}} onClick={()=>setCfg(p=>{const n={...p,[r.id]:(p[r.id]||0)+1};emit("update_cfg",{cfg:n});return n;})}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
      <button style={{...S.btnP,marginTop:4}} disabled={gesamtSpieler<4} onClick={erstellen}>Raum erstellen ({gesamtSpieler} Spieler)</button>
    </div>
  );

  if(screen==="join") return (
    <div style={S.page}>
      {toast&&<Toast {...toast}/>}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <button style={S.back} onClick={()=>setScreen("lobby")}>←</button>
        <h2 style={{fontSize:17,fontWeight:500,margin:0,color:"#F5F3FF"}}>Spiel beitreten</h2>
      </div>
      <div style={S.card}><p style={S.label}>Raum-Code</p><input style={{...S.inp,fontFamily:"monospace",fontSize:20,textAlign:"center",letterSpacing:3}} value={joinIn} onChange={e=>setJoinIn(e.target.value.toUpperCase())} placeholder="WOLF-XXXX" maxLength={9}/></div>
      <button style={S.btnP} disabled={joinIn.length<4} onClick={beitreten}>Beitreten</button>
    </div>
  );

  if(screen==="waiting") return (
    <div style={S.page}>
      {toast&&<Toast {...toast}/>}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <button style={S.back} onClick={()=>setScreen("lobby")}>←</button>
        <h2 style={{fontSize:17,fontWeight:500,margin:0,color:"#F5F3FF"}}>Warteraum</h2>
      </div>
      <div style={{...S.card,textAlign:"center",marginBottom:10}}>
        <p style={S.label}>Raum-Code – teile ihn mit deinen Mitspielern</p>
        <p style={{fontFamily:"monospace",fontSize:24,fontWeight:700,letterSpacing:4,color:"#A85FD0"}}>{code}</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:10}}>
        {spieler.map(s=><CamSlot key={s.id} s={s} meineId={meineId} zeigeRolle={false} stream={s.istDu?localStream:streams[s.id]}/>)}
      </div>
      <p style={{textAlign:"center",fontSize:12,color:"#9C97C4",marginBottom:10}}>{spieler.length} Spieler verbunden</p>
      {istGM?<button style={S.btnP} onClick={()=>{ startedFlowDone.current=false; emit("start_game"); }}>Spiel starten &amp; Rollen verteilen</button>:<InfoBox>Warte auf den Spielleiter…</InfoBox>}
    </div>
  );

  if(screen==="role"){
    const mitWölfe=spieler.filter(s=>s.id!==meineId&&(s.rolle?.team==="wolf"||s.rolle?.id==="weisser_werwolf")&&(meineRolle?.team==="wolf"||meineRolle?.id==="weisser_werwolf"));
    return (
      <div style={S.page}>
        {toast&&<Toast {...toast}/>}
        <div style={{textAlign:"center",padding:"14px 0 8px"}}>
          <p style={{fontSize:12,color:"#9C97C4"}}>Deine geheime Rolle – zeige niemandem diesen Bildschirm!</p>
        </div>
        {!revealed?(
          <div style={{...S.card,textAlign:"center",padding:"44px 16px",cursor:"pointer",border:`2px dashed ${meineRolle?.farbe||"#534AB7"}`}} onClick={()=>setRevealed(true)}>
            <div style={{fontSize:50,marginBottom:10}}>❓</div>
            <p style={{fontWeight:500,color:"#9C97C4"}}>Tippe um deine Rolle aufzudecken</p>
          </div>
        ):(
          <>
            <div style={{...S.card,textAlign:"center",padding:"22px 14px",border:`2px solid ${meineRolle?.farbe}`,background:meineRolle?.hell}}>
              <div style={{fontSize:48,marginBottom:6}}>{meineRolle?.emoji}</div>
              <h2 style={{fontSize:22,fontWeight:700,color:meineRolle?.dunkel,marginBottom:5}}>{meineRolle?.name}</h2>
              <span style={{...S.badge,background:meineRolle?.farbe,color:"#fff",marginBottom:10,display:"inline-block"}}>{meineRolle?.team==="wolf"?"Werwolf-Partei":meineRolle?.team==="neutral"?"Neutrale Partei":"Dorf-Partei"}</span>
              <p style={{fontSize:13,color:meineRolle?.dunkel,lineHeight:1.6,marginBottom:8}}>{meineRolle?.beschreibung}</p>
              <p style={{fontSize:12,fontStyle:"italic",color:meineRolle?.dunkel,background:"rgba(0,0,0,0.07)",padding:"7px 11px",borderRadius:7}}>💡 {meineRolle?.tipp}</p>
            </div>
            {mitWölfe.length>0&&<div style={{...S.card,marginTop:8}}>
              <p style={S.label}>Deine Artgenossen</p>
              {mitWölfe.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:7,padding:"4px 0"}}><span>🐺</span><span style={{fontSize:13,fontWeight:500,color:"#F5F3FF"}}>{s.name}</span><span style={{fontSize:11,color:"#9C97C4",marginLeft:"auto"}}>{s.rolle?.name}</span></div>)}
            </div>}
            <button style={{...S.btnP,marginTop:10}} onClick={()=>{setScreen("game");setPhase("warten");}}>Verstanden – zum Spiel</button>
          </>
        )}
      </div>
    );
  }

  // ── GAME ──
  const isWolf=meineRolle?.team==="wolf"||meineRolle?.id==="weisser_werwolf";
  const meinePhase=aktNachtPhase&&(aktNachtPhase.rolleId===meineRolle?.id||(aktNachtPhase.phase==="werwolf_waehlt"&&isWolf));

  return (
    <div style={S.page}>
      {toast&&<Toast {...toast}/>}
      <PhaseBar phase={phase} runde={runde} aktNachtPhase={aktNachtPhase}/>

      {istGM&&(
        <div style={S.tabBar}>
          {[["spiel","🎮 Spiel"],["rollen","🃏 Rollen"],["log","📋 Log"]].map(([k,l])=>(
            <button key={k} style={{...S.tab,...(gmTab===k?S.tabA:{})}} onClick={()=>setGmTab(k)}>{l}</button>
          ))}
        </div>
      )}

      {/* ── WARTEN ── */}
      {phase==="warten"&&((!istGM)||gmTab==="spiel")&&(
        <div>
          <CamGrid sp={lebendig} meineId={meineId} zeigeRollen={istGM} streams={{...streams,[meineId]:localStream}}/>
          {tot.length>0&&<><p style={{fontSize:11,color:"#9C97C4",margin:"10px 0 5px"}}>AUSGESCHIEDEN</p><CamGrid sp={tot} meineId={meineId} zeigeRollen tot streams={streams}/></>}
          {istGM&&<button style={{...S.btnP,marginTop:14}} onClick={()=>emit("night_start")}>🌙 Nacht starten (Runde {runde})</button>}
          {!istGM&&<InfoBox>Warte auf den Spielleiter…</InfoBox>}
        </div>
      )}

      {/* ── NACHT-PHASEN ── */}
      {phase==="nacht_phase"&&aktNachtPhase&&((!istGM)||gmTab==="spiel")&&(
        <div>
          <div style={{...S.card,textAlign:"center",padding:"18px 14px",marginBottom:10,background:"#1a1a2e",border:"none"}}>
            <div style={{fontSize:36,marginBottom:6}}>{aktNachtPhase.emoji}</div>
            <p style={{color:"#AFA9EC",fontWeight:500,fontSize:15}}>{aktNachtPhase.label}</p>
            {!meinePhase&&!istGM&&<p style={{color:"#444",fontSize:12,marginTop:5}}>Du schläfst…</p>}
          </div>

          {aktNachtPhase.phase==="amor"&&meinePhase&&!amorGesetzt&&<AmorAktion lebendig={lebendig} meineId={meineId} onWaehlen={(a,b)=>{setAmorG(true);emit("night_action",{action:"amor",payload:{a,b}});zeigToast("Liebende gesetzt!");naechstePhase();}}/>}
          {aktNachtPhase.phase==="amor"&&(amorGesetzt||!meinePhase)&&<InfoBox>{amorGesetzt?"Liebende gesetzt.":"Du bist nicht Amor."}{istGM&&<><br/><button style={{...S.btnG,marginTop:8}} onClick={()=>emit("next_phase")}>GM: Weiter →</button></>}</InfoBox>}

          {aktNachtPhase.phase==="werwolf_waehlt"&&<WolfAktion lebendig={lebendig} meineId={meineId} meineRolle={meineRolle} istGM={istGM} ne={ne} setNe={setNe} onWeiter={naechstePhase}/>}

          {aktNachtPhase.phase==="seher"&&meinePhase&&<SeherAktion lebendig={lebendig} meineId={meineId} onWeiter={naechstePhase}/>}
          {aktNachtPhase.phase==="seher"&&!meinePhase&&<InfoBox>Du bist nicht der Seher.{istGM&&<><br/><button style={{...S.btnG,marginTop:8}} onClick={()=>emit("next_phase")}>GM: Weiter →</button></>}</InfoBox>}

          {aktNachtPhase.phase==="schutzengel"&&meinePhase&&<SchutzAktion lebendig={lebendig} meineId={meineId} letzterSchutz={letzterSchutz} onSchützen={(id)=>{emit("night_action",{action:"geschuetzt",payload:{targetId:id}});zeigToast("Schutz gesetzt.");naechstePhase();}}/>}
          {aktNachtPhase.phase==="schutzengel"&&!meinePhase&&<InfoBox>Du bist nicht der Schutzengel.{istGM&&<><br/><button style={{...S.btnG,marginTop:8}} onClick={()=>emit("next_phase")}>GM: Weiter →</button></>}</InfoBox>}

          {aktNachtPhase.phase==="hexe"&&meinePhase&&<HexeAktion lebendig={lebendig} meineId={meineId} wolfOpfer={ne.wolfOpfer} wolfOpferName={spieler.find(s=>s.id===ne.wolfOpfer)?.name} heiltrank={heiltrank} gifttrank={gifttrank} setHT={setHT} setGT={setGT} zeigToast={zeigToast} onWeiter={naechstePhase}/>}
          {aktNachtPhase.phase==="hexe"&&!meinePhase&&<InfoBox>Du bist nicht die Hexe.{istGM&&<><br/><button style={{...S.btnG,marginTop:8}} onClick={()=>emit("next_phase")}>GM: Weiter →</button></>}</InfoBox>}

          {aktNachtPhase.phase==="medium"&&meinePhase&&!mediumGenutzt&&<MediumAktion tot={tot} onFragen={(id,a)=>{setMediumG(true);emit("night_action",{action:"medium",payload:{targetId:id,antwort:a}});zeigToast(`Antwort: ${a}`,true);naechstePhase();}} onWeiter={naechstePhase}/>}
          {aktNachtPhase.phase==="medium"&&(mediumGenutzt||!meinePhase)&&<InfoBox>{mediumGenutzt?"Medium bereits genutzt.":"Du bist nicht das Medium."}{istGM&&<><br/><button style={{...S.btnG,marginTop:8}} onClick={()=>emit("next_phase")}>GM: Weiter →</button></>}</InfoBox>}

          {aktNachtPhase.phase==="serienkiller"&&meinePhase&&<SKAktion lebendig={lebendig} meineId={meineId} onTöten={(id)=>{emit("night_action",{action:"skOpfer",payload:{targetId:id}});zeigToast("Ziel markiert.");naechstePhase();}}/>}
          {aktNachtPhase.phase==="serienkiller"&&!meinePhase&&<InfoBox>Du bist nicht der Serienkiller.{istGM&&<><br/><button style={{...S.btnG,marginTop:8}} onClick={()=>emit("next_phase")}>GM: Weiter →</button></>}</InfoBox>}

          {aktNachtPhase.phase==="flötenspieler"&&meinePhase&&<FloeteAktion lebendig={lebendig} meineId={meineId} onVerzaubern={(a,b)=>{emit("night_action",{action:"floete",payload:{a,b}});zeigToast("Zwei Spieler verzaubert.");naechstePhase();}}/>}
          {aktNachtPhase.phase==="flötenspieler"&&!meinePhase&&<InfoBox>Du bist nicht der Flötenspieler.{istGM&&<><br/><button style={{...S.btnG,marginTop:8}} onClick={()=>emit("next_phase")}>GM: Weiter →</button></>}</InfoBox>}
        </div>
      )}

      {/* ── TAG ── */}
      {phase==="tag"&&((!istGM)||gmTab==="spiel")&&(
        <div>
          <CamGrid sp={lebendig} meineId={meineId} zeigeRollen={istGM} streams={{...streams,[meineId]:localStream}}/>
          {tot.length>0&&<><p style={{fontSize:11,color:"#9C97C4",margin:"10px 0 5px"}}>AUSGESCHIEDEN</p><CamGrid sp={tot} meineId={meineId} zeigeRollen tot streams={streams}/></>}
          {istGM&&<div style={{display:"flex",gap:8,marginTop:12}}>
            <button style={{...S.btnG,flex:1}} onClick={()=>emit("voting_start")}>🗳️ Abstimmung</button>
            <button style={{...S.btnP,flex:1}} onClick={()=>emit("next_round")}>🌙 Nächste Nacht</button>
          </div>}
          {!istGM&&<InfoBox>Diskutiert – der Spielleiter startet die Abstimmung.</InfoBox>}
        </div>
      )}

      {/* ── ABSTIMMUNG ── */}
      {phase==="abstimmung"&&((!istGM)||gmTab==="spiel")&&(
        <div>
          <div style={S.card}>
            <p style={{fontWeight:500,marginBottom:6,color:"#F5F3FF"}}>🗳️ Wer soll gelyncht werden?</p>
            <p style={{fontSize:12,color:"#9C97C4",marginBottom:12}}>Jeder stimmt für einen Verdächtigen.</p>
            {lebendig.filter(s=>s.stimmrecht).map(w=>(
              <div key={w.id} style={{marginBottom:10}}>
                <p style={{fontSize:12,color:"#9C97C4",marginBottom:4}}><strong style={{color:"#F5F3FF"}}>{w.name}</strong> stimmt für:</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {lebendig.filter(s=>s.id!==w.id).map(t=>(
                    <button key={t.id} style={{...S.btnS,...(abstimmung[w.id]===t.id?{background:t.rolle?.hell,color:t.rolle?.dunkel,borderColor:t.rolle?.farbe}:{})}} onClick={()=>{ if(w.id===meineId||istGM){setAbstimmung(p=>({...p,[w.id]:t.id}));if(w.id===meineId)emit("vote",{targetId:t.id});}  }}>
                      {t.name}{abstimmung[w.id]===t.id?" ✓":""}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {istGM&&<button style={S.btnP} onClick={()=>emit("voting_resolve")}>Abstimmung auswerten</button>}
          {!istGM&&<InfoBox>Warte auf den Spielleiter…</InfoBox>}
          {istGM&&<button style={{...S.btnG,marginTop:8}} onClick={()=>emit("voting_cancel")}>Abstimmung abbrechen</button>}
        </div>
      )}

      {/* GM-only Tabs */}
      {istGM&&gmTab==="rollen"&&(
        <div>
          {spieler.map(s=>(
            <div key={s.id} style={{...S.card,padding:"9px 11px",marginBottom:5,opacity:s.tot?0.4:1,display:"flex",alignItems:"center",gap:7}}>
              <span style={{fontSize:17}}>{s.tot?"💀":s.rolle?.emoji}</span>
              <div style={{flex:1}}><p style={{fontWeight:500,fontSize:12,color:"#F5F3FF",textDecoration:s.tot?"line-through":"none"}}>{s.name}{s.istDu?" (du)":""}</p><p style={{fontSize:10,color:"#9C97C4"}}>{s.rolle?.name}</p></div>
              <span style={{...S.badge,background:s.rolle?.hell,color:s.rolle?.dunkel,fontSize:9}}>{s.rolle?.team}</span>
              {!s.tot&&<button style={{...S.step,background:"#FCEBEB",color:"#A32D2D",borderColor:"#F09595",fontSize:13}} onClick={()=>emit("gm_kill",{targetId:s.id})}>✕</button>}
            </div>
          ))}
        </div>
      )}
      {istGM&&gmTab==="log"&&(
        <div style={S.card}>
          {protokoll.length===0&&<p style={{fontSize:12,color:"#9C97C4"}}>Noch keine Ereignisse.</p>}
          {protokoll.map((p,i)=><p key={i} style={{fontSize:11,color:p.startsWith("──")?"#F5F3FF":"#9C97C4",fontWeight:p.startsWith("──")?600:400,lineHeight:1.8}}>{p}</p>)}
        </div>
      )}
    </div>
  );
}
