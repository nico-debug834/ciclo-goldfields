import * as React from "react";
import { useEffect, useRef, useState } from "react";

/*
  CICLO · Gold Fields — Demo de visualización de economía circular (Salares Norte).
  Solo visualización: datos mock internos (sin ingreso de usuario, sin API).
  El MAPA usa el plano real (FLR-A9SN-EP-3000) como fondo:
    -> copia el archivo  plano-planta.jpg  dentro de la carpeta  public/  del proyecto.
  Marca según "Gold Fields Brand CI". El emblema del león es un MARCADOR (usar artwork oficial).
*/

// Prefijo base: "/" en Vercel/Netlify, "/ciclo-goldfields/" en GitHub Pages.
const BASE = import.meta.env.BASE_URL;
const asset = (p: string) => BASE + p.replace(/^\//, "");
const PLANO = asset("plano-planta.jpg");

const C = {
  blue: "#001d39", blue2: "#0a2c4d", gold: "#c8a064", teal: "#00b398",
  carmine: "#9b2743", ochre: "#db864e", lime: "#6cc24a", amber: "#f0b323",
  sage: "#6fa287", paper: "#f4f6f8", card: "#ffffff", line: "#e3e8ec", ink: "#4a5662",
};

const VALUES = [
  { k: "safety", color: C.teal, g: "⛑" },
  { k: "respect", color: C.ochre, g: "🤝" },
  { k: "responsibility", color: C.lime, g: "🌐" },
  { k: "collaborative", color: C.amber, g: "▦" },
];

// ---------------- DATOS MOCK ----------------

/*
type Material = {
id: string; // único, en minúscula, sin espacios (se usa como key y en folios)
name: string;
nature: string; // "naturaleza" que se muestra como subtítulo
color: string; // usar tokens de C (paleta secundaria GF)
glyph: string; // emoji/símbolo del ícono
hazard: boolean; // true => badge RESPEL + color carmín en clasificación
kg: number; // reciclado a la fecha
meta: number; // meta del material
co2: number; // toneladas de CO2 evitadas (alimenta equivalencias y certificado)
cert: boolean; // true => habilita botón "Ver certificado"
ruta: string[]; // pasos de disposición (se dibujan como timeline en orden)
};
*/

type Material = {
  id: string; name: string; nature: string; color: string; glyph: string; hazard: boolean;
  kg: number; meta: number; co2: number; cert: boolean; ruta: string[];
};

const MATERIALS: Material[] = [
  { id:"metal",   name:"Chatarra metálica",  nature:"Metal ferroso / no ferroso", color:C.gold,    glyph:"🔩", hazard:false, kg:18000, meta:20000, co2:25.2, cert:true,
    ruta:["Generación en planta","Acopio","Compactado","Retiro por gestor","Fundición (valorización)"] },
  { id:"plastic", name:"Plástico",           nature:"PET / Polietileno",          color:C.teal,    glyph:"♳", hazard:false, kg:6200,  meta:8000,  co2:6.8,  cert:true,
    ruta:["Generación en planta","Punto limpio plásticos","Compactado","Enfardado","Reciclador autorizado"] },
  { id:"carton",  name:"Cartón y papel",     nature:"Celulosa",                   color:C.sage,    glyph:"📦", hazard:false, kg:9100,  meta:9000,  co2:6.4,  cert:false,
    ruta:["Generación en oficinas/bodega","Punto limpio cartones","Compactadora de cartón","Retiro","Papelera"] },
  { id:"wood",    name:"Madera / pallets",   nature:"Madera tratada",             color:C.ochre,   glyph:"🪵", hazard:false, kg:4300,  meta:5000,  co2:2.1,  cert:false,
    ruta:["Generación en bodega","Acopio de madera","Reúso interno","Chipeado"] },
  { id:"tyre",    name:"Neumáticos OTR",     nature:"Caucho",                     color:C.carmine, glyph:"🛞", hazard:false, kg:3800,  meta:6000,  co2:8.4,  cert:true,
    ruta:["Cambio en taller","Cancha de neumáticos","Retiro por gestor","Valorización energética"] },
  { id:"oil",     name:"Aceites usados",     nature:"Residuo peligroso (RESPEL)", color:C.amber,   glyph:"⚠", hazard:true,  kg:5200,  meta:5000,  co2:16.1, cert:true,
    ruta:["Generación en taller","Estanque RESPEL","Almacén temporal RESPEL","Gestor autorizado RESPEL"] },
  { id:"raee",    name:"Chatarra eléctrica", nature:"RAEE / electrónico",         color:C.lime,    glyph:"⚡", hazard:true,  kg:1200,  meta:2000,  co2:2.2,  cert:true,
    ruta:["Baja de equipos","Jaula RAEE","Retiro","Gestor RAEE certificado"] },
  { id:"glass",   name:"Vidrio",             nature:"Sílice",                     color:C.teal,    glyph:"🫙", hazard:false, kg:900,   meta:1500,  co2:0.4,  cert:false,
    ruta:["Generación en laboratorio/casino","Acopio de vidrio","Retiro","Reciclador"] },
];

const META_GLOBAL = 60000;

// Puntos de reciclaje: px/py = posición en % sobre el plano (escala con la imagen)
type Punto = { id:string; name:string; px:number; py:number; materials:string[] };
const PUNTOS: Punto[] = [
  { id:"P1", name:"Acopio Norte · Chancador", px:13, py:13, materials:["metal","tyre"] },
  { id:"P2", name:"Taller Mantención Planta",      px:30, py:27, materials:["metal","oil","raee","carton","plastic","wood"] },
  { id:"P3", name:"Patio Molienda",     px:32, py:43, materials:["oil","tyre","metal"] },
  { id:"P4", name:"DP Aggreko",                px:84, py:23, materials:["oil","raee"] },
  { id:"P5", name:"Laboratorio",                    px:43, py:30, materials:["glass","raee","oil"] },
  { id:"P6", name:"Barrio Cívico · Casino",          px:50, py:31, materials:["plastic","glass","carton"] },
  { id:"P7", name:"Planta Filtros de Relave",       px:14, py:86, materials:["metal","plastic", "tyre"] },
  { id:"P8", name:"Truck Shop ICV",   px:0, py:42, materials:["tyre","raee","plastic","carton"] },
];

// ---------------- UTILIDADES ----------------
const fmt = (n: number) => Math.round(n).toLocaleString("es-CL");
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("es-CL");
const mat = (id: string) => MATERIALS.find((m) => m.id === id)!;

/*
1 tonelada de CO₂ equivale a absorber entre 33 y 66 árboles
1 tonelada de CO₂ a kilómetros de automóvil, promedio es de ≈ 7.000 km a ≈ 8.500 km
1 casa promedio genera entre 1,2 y 1,8 toneladas de CO₂ al año solo por electricidad
Cartón y Papel: Ahorra entre 30 y 55 litros de agua por kg 
Plástico (PET, PEAD, etc.): Ahorra 39.26 litros de agua por kg.
Aluminio: Ahorra hasta 16.000 litros de agua por tonelada
Vidrio: Ahorra 1.2 litros de agua por kg.

*/

function equivalencias(co2t: number, kg: number) {
  return { arboles: Math.round(co2t * 45), autosKm: Math.round(co2t * 4200), hogares: Math.round(co2t / 1.5), aguaLt: Math.round(kg * 30) };
}

// ---------------- ESTILOS GLOBALES ----------------
function GlobalStyle() {
  return (
    <style>{`
      @keyframes pulseRing { 0%{box-shadow:0 0 0 0 rgba(0,179,152,.55)} 70%{box-shadow:0 0 0 14px rgba(0,179,152,0)} 100%{box-shadow:0 0 0 0 rgba(0,179,152,0)} }
      @keyframes pinDrop { 0%{opacity:0; transform:translate(-50%,-185%)} 60%{opacity:1; transform:translate(-50%,-88%)} 80%{transform:translate(-50%,-104%)} 100%{transform:translate(-50%,-100%)} }
      @keyframes fadeUp { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
      @keyframes growBar { from{width:0} }
      * { box-sizing:border-box; }
      ::-webkit-scrollbar { height:8px; width:8px; }
      ::-webkit-scrollbar-thumb { background:#c3ccd4; border-radius:8px; }
    `}</style>
  );
}

// ---------------- MARCA ----------------
// function LogoLockup({ light = true, scale = 1 }: { light?: boolean; scale?: number }) {
//   const fg = light ? "#ffffff" : C.blue;
//   return (
//     <div style={{ display:"flex", alignItems:"center", gap:8*scale }}>
//       <div style={{ width:30*scale, height:30*scale, borderRadius:"50%", border:(2*scale)+"px solid "+fg,
//         display:"grid", placeItems:"center", color:fg, fontWeight:800, fontSize:11*scale }}>GF</div>
//       <span style={{ color:fg, fontWeight:800, letterSpacing:3*scale, fontSize:11*scale }}>GOLD&nbsp;&nbsp;FIELDS</span>
//     </div>
//   );
// }

type LogoBackground = "white" | "nonWhite";

function LogoLockup({
  background = "white",
  scale = 1.5,
}: {
  background?: LogoBackground;
  scale?: number;
}) {
  const logoSrc =
    background === "white"
      ? asset("GF-Logo-Horizontal-Calado.png")
      : asset("GF-Logo-Horizontal-Fondo-Calado.png");

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <img
        src={logoSrc}
        alt="Gold Fields"
        style={{
          height: 34 * scale,
          width: "auto",
          display: "block",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

function ValuesStrip() {
  return (
    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
      {VALUES.map((v) => (
        <div key={v.k} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
          <div style={{ width:22, height:22, borderRadius:"50%", background:v.color, color:"#fff",
            display:"grid", placeItems:"center", fontSize:12 }}>{v.g}</div>
          <span style={{ fontSize:7, color:"rgba(255,255,255,.85)" }}>{v.k}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------- CONFETTI ----------------
function Confetti({ fireKey }: { fireKey: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!fireKey) return;
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    const colors = [C.gold, C.teal, C.blue, C.lime, C.amber, "#ffffff"];
    type P = { x:number; y:number; vx:number; vy:number; s:number; c:string; r:number; vr:number };
    const parts: P[] = [];
    for (let i = 0; i < 220; i++) {
      parts.push({ x: W/2 + (Math.random()-0.5)*240, y: H*0.38, vx:(Math.random()-0.5)*13, vy:Math.random()*-15-5,
        s:Math.random()*8+4, c:colors[(Math.random()*colors.length)|0], r:Math.random()*Math.PI, vr:(Math.random()-0.5)*0.3 });
    }
    let frame = 0, raf = 0;
    const tick = () => {
      ctx.clearRect(0,0,W,H); frame++;
      parts.forEach((p) => {
        p.vy += 0.3; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle=p.c; ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*0.6); ctx.restore();
      });
      if (frame < 200) raf = requestAnimationFrame(tick); else ctx.clearRect(0,0,W,H);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [fireKey]);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, width:"100vw", height:"100vh", pointerEvents:"none", zIndex:9999 }} />;
}

// ---------------- PIEZAS UI ----------------
function Stat({ label, value, unit, accent }: { label:string; value:string|number; unit:string; accent:string }) {
  return (
    <div style={{ background:C.card, border:"1px solid "+C.line, borderRadius:16, padding:18, animation:"fadeUp .4s ease" }}>
      <div style={{ fontSize:32, fontWeight:800, color:C.blue, lineHeight:1 }}>
        {value}<span style={{ fontSize:13, fontWeight:700, color:accent, marginLeft:4 }}>{unit}</span>
      </div>
      <div style={{ fontSize:12, color:C.ink, marginTop:8 }}>{label}</div>
    </div>
  );
}

function ProgressBar({ pct, done }: { pct:number; done:boolean }) {
  return (
    <div style={{ background:C.line, borderRadius:99, height:12, overflow:"hidden" }}>
      <div style={{ width:Math.min(100,pct)+"%", height:"100%", borderRadius:99, animation:"growBar 1.1s ease",
        background: done ? "linear-gradient(90deg,"+C.gold+","+C.teal+")" : "linear-gradient(90deg,"+C.blue+","+C.teal+")" }} />
    </div>
  );
}

function RouteTimeline({ pasos, color }: { pasos:string[]; color:string }) {
  return (
    <div>
      {pasos.map((p, i) => (
        <div key={i} style={{ display:"flex", gap:12 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
            <div style={{ width:14, height:14, borderRadius:"50%", background:color, flexShrink:0 }} />
            {i < pasos.length - 1 && <div style={{ width:2, flex:1, minHeight:18, background:C.line }} />}
          </div>
          <div style={{ paddingBottom:14, marginTop:-2 }}>
            <span style={{ fontSize:13, color:C.blue, fontWeight:600 }}>{p}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- MASTHEAD ----------------
function Masthead({ tab }: { tab:string }) {
  const titles: Record<string,[string,string]> = {
    resumen:    ["Resumen","Impacto del programa de reciclaje"],
    materiales: ["Materiales","Ruta y naturaleza de cada residuo"],
    metas:      ["Metas","Avance frente a nuestras metas"],
    mapa:       ["Mapa","Puntos de reciclaje en planta"],
  };
  const [script, title] = titles[tab];
  return (
    <div style={{ position:"relative", padding:"22px 24px 18px", overflow:"hidden",
      background:"linear-gradient(105deg,"+C.blue+" 0%,"+C.blue+" 42%,"+C.teal+" 125%)" }}>
      <div style={{ position:"absolute", right:-30, top:-40, fontSize:240, opacity:0.06, color:"#fff", pointerEvents:"none" }}>◓</div>
      <div style={{ position:"absolute", inset:10, border:"1px solid rgba(255,255,255,.4)", borderTopLeftRadius:26, pointerEvents:"none" }} />
      <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap" }}>
        <div>
          <LogoLockup background="nonWhite" />
          <div style={{ fontFamily:"'Segoe Script','Brush Script MT',cursive", color:C.gold, fontSize:20, marginTop:14 }}>{script}</div>
          <div style={{ color:"#fff", fontWeight:800, fontSize:24, lineHeight:1.1 }}>{title}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <span style={{ fontFamily:"'Segoe Script','Brush Script MT',cursive", color:C.gold, fontSize:18 }}>#CicloGoldFields</span>
          <div style={{ color:"rgba(255,255,255,.75)", fontSize:11, marginTop:6 }}>Salares Norte · Ene–Jun 2025</div>
          <div style={{ marginTop:12 }}><ValuesStrip /></div>
        </div>
      </div>
    </div>
  );
}

// ---------------- MAPA DE PLANTA  ----------------
function PlantMap({ selMat }: { selMat: string | null }) {
  const [sel, setSel] = useState<Punto | null>(null);
  const accent = selMat ? mat(selMat).color : C.teal;

  return (
    <div>
      <div style={{ background:C.card, border:"1px solid "+C.line, borderRadius:16, padding:10, overflowX:"auto" }}>
        {/* Lienzo del plano: posición relativa, marcadores en % */}
        <div style={{ position:"relative", width:"100%", minWidth:680 }}>
          <img src={PLANO} alt="Plano general de planta — Salares Norte"
            style={{ width:"100%", display:"block", borderRadius:10 }} />
          {/* velo blanco tenue para que resalten los marcadores */}
          <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,.28)", borderRadius:10, pointerEvents:"none" }} />

          {PUNTOS.filter((p) => !selMat || p.materials.includes(selMat)).map((p) => {
            const isSel = sel?.id === p.id;
            const w = isSel ? 40 : 32, h = isSel ? 53 : 43;
            return (
              <button key={p.id + (selMat || "all")} onClick={() => setSel(p)} title={p.name}
                style={{
                  position:"absolute", left:p.px+"%", top:p.py+"%",
                  transform:"translate(-50%,-100%)",
                  background:"none", border:"none", padding:0, cursor:"pointer", lineHeight:0,
                  animation:"pinDrop .55s cubic-bezier(.22,1.1,.36,1) both",
                  zIndex: isSel ? 5 : 4, filter:"drop-shadow(0 3px 3px rgba(0,0,0,.4))",
                }}>
                {/* pin tipo gota: la punta inferior apunta al punto exacto */}
                <svg width={w} height={h} viewBox="0 0 24 32" style={{ display:"block" }}>
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.37 18.63 0 12 0z"
                    fill={accent} stroke="#fff" strokeWidth={1.6} />
                  <circle cx={12} cy={12} r={5} fill="#fff" />
                  <text x={12} y={15.5} fontSize={8} fontWeight={800} fill={accent} textAnchor="middle">{p.id.slice(1)}</text>
                </svg>
                {isSel && (
                  <span style={{ position:"absolute", left:"50%", top:-8, transform:"translate(-50%,-100%)",
                    whiteSpace:"nowrap", background:C.blue, color:"#fff", fontSize:11, fontWeight:700,
                    padding:"4px 9px", borderRadius:8 }}>{p.name}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalle del punto seleccionado / listado filtrado */}
      <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:10 }}>
        {(sel ? [sel] : PUNTOS.filter((p) => !selMat || p.materials.includes(selMat))).map((p) => (
          <div key={p.id} style={{ background:C.card, border:"1px solid "+C.line, borderRadius:12, padding:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ width:22, height:22, borderRadius:"50%", background:accent, color:"#fff",
                display:"grid", placeItems:"center", fontSize:11, fontWeight:800 }}>{p.id.slice(1)}</span>
              <strong style={{ color:C.blue, fontSize:13 }}>{p.name}</strong>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
              {p.materials.map((mid) => (
                <span key={mid} style={{ fontSize:10, color:"#fff", background:mat(mid).color, padding:"2px 8px", borderRadius:20 }}>
                  {mat(mid).name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {sel && (
        <button onClick={() => setSel(null)} style={{ marginTop:10, background:"none", border:"1px solid "+C.line,
          borderRadius:10, padding:"8px 14px", color:C.blue, cursor:"pointer", fontWeight:600 }}>Ver todos los puntos</button>
      )}
    </div>
  );
}

// ---------------- CERTIFICADO ----------------
function Certificado({ m, onClose }: { m:Material; onClose:()=>void }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,29,57,.6)", zIndex:200, display:"grid", placeItems:"center", padding:20 }}>
      <div onClick={(e)=>e.stopPropagation()} style={{ background:"#fff", width:"min(560px,100%)", borderRadius:16, overflow:"hidden", position:"relative" }}>
        <div style={{ position:"absolute", inset:14, border:"2px solid "+C.gold, borderTopLeftRadius:18, pointerEvents:"none" }} />
        <div style={{ padding:"28px 30px", textAlign:"center" }}>
          <LogoLockup/>
          <div style={{ fontFamily:"'Segoe Script','Brush Script MT',cursive", color:C.gold, fontSize:22, marginTop:18 }}>Certificado de reciclaje</div>
          <div style={{ color:C.blue, fontWeight:800, fontSize:20, marginTop:2 }}>{m.name}</div>
          <p style={{ color:C.ink, fontSize:13, marginTop:16, lineHeight:1.5 }}>
            Se certifica la valorización de <strong>{fmt(m.kg)} kg</strong> de {m.nature.toLowerCase()},
            gestionados conforme a la normativa vigente y al programa de economía circular de Gold Fields en Salares Norte.
          </p>
          <div style={{ display:"flex", justifyContent:"space-around", margin:"18px 0", fontSize:12 }}>
            <div><div style={{ color:C.ink }}>CO₂ evitado</div><strong style={{ color:C.blue }}>{fmt1(m.co2)} t</strong></div>
            <div><div style={{ color:C.ink }}>Periodo</div><strong style={{ color:C.blue }}>Ene–Jun 2025</strong></div>
            <div><div style={{ color:C.ink }}>Folio</div><strong style={{ color:C.blue }}>SN-{m.id.toUpperCase()}-2025</strong></div>
          </div>
          <div style={{ borderTop:"1px solid "+C.line, paddingTop:12, fontSize:11, color:C.ink }}>
            Documento demostrativo · Se puede reemplazar por certificado oficial del gestor autorizado
          </div>
          <button onClick={onClose} style={{ marginTop:16, background:C.blue, color:"#fff", border:"none", borderRadius:10, padding:"10px 22px", cursor:"pointer", fontWeight:700 }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- DETALLE DE MATERIAL ----------------
function MaterialDetail({ m, onClose, onVerMapa }: { m:Material; onClose:()=>void; onVerMapa:()=>void }) {
  const [cert, setCert] = useState(false);
  const pct = Math.round((m.kg / m.meta) * 100);
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,29,57,.55)", zIndex:120, display:"flex", justifyContent:"flex-end" }}>
        <div onClick={(e)=>e.stopPropagation()} style={{ background:C.paper, width:"min(440px,100%)", height:"100%", overflowY:"auto", animation:"fadeUp .25s ease" }}>
          <div style={{ background:"linear-gradient(105deg,"+C.blue+","+m.color+")", padding:"20px 22px", color:"#fff", position:"relative" }}>
            <div style={{ position:"absolute", inset:8, border:"1px solid rgba(255,255,255,.4)", borderTopLeftRadius:18, pointerEvents:"none" }} />
            <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:34 }}>{m.glyph}</div>
              <button onClick={onClose} style={{ background:"rgba(255,255,255,.2)", border:"none", color:"#fff", width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:16 }}>✕</button>
            </div>
            <div style={{ position:"relative", fontWeight:800, fontSize:22, marginTop:8 }}>{m.name}</div>
            <div style={{ position:"relative", fontSize:12, opacity:.9 }}>Naturaleza: {m.nature}</div>
            {m.hazard && <span style={{ position:"relative", display:"inline-block", marginTop:8, fontSize:10, fontWeight:800, background:C.carmine, padding:"3px 10px", borderRadius:20 }}>RESIDUO PELIGROSO · RESPEL</span>}
          </div>

          <div style={{ padding:20, display:"flex", flexDirection:"column", gap:18 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Stat label="Reciclado" value={fmt(m.kg)} unit="kg" accent={m.color} />
              <Stat label="Avance meta" value={pct} unit="%" accent={C.teal} />
            </div>
            <div>
              <h4 style={{ margin:"0 0 10px", color:C.blue, fontSize:14 }}>Ruta de disposición</h4>
              <div style={{ background:C.card, border:"1px solid "+C.line, borderRadius:14, padding:16 }}>
                <RouteTimeline pasos={m.ruta} color={m.color} />
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={onVerMapa} style={{ flex:1, background:C.card, border:"1px solid "+C.line, borderRadius:12, padding:"12px", color:C.blue, fontWeight:700, cursor:"pointer" }}>Ver en el mapa</button>
              <button onClick={() => m.cert && setCert(true)} disabled={!m.cert}
                style={{ flex:1, borderRadius:12, padding:"12px", fontWeight:700, cursor: m.cert?"pointer":"not-allowed", border:"none", color:"#fff", opacity:m.cert?1:.45, background:"linear-gradient(100deg,"+C.blue+","+C.teal+")" }}>
                {m.cert ? "Ver certificado" : "Sin certificado"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {cert && <Certificado m={m} onClose={() => setCert(false)} />}
    </>
  );
}

// ---------------- TARJETA DE META ----------------
function MetaCard({ name, kg, meta, glyph }: { name:string; kg:number; meta:number; color?:string; glyph?:string }) {
  const pct = Math.round((kg / meta) * 100);
  const done = pct >= 100;
  return (
    <div style={{ background:C.card, border:"1px solid "+(done?C.gold:C.line), borderRadius:16, padding:18,
      boxShadow: done ? "0 8px 24px rgba(200,160,100,.25)" : "none" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {glyph && <span style={{ fontSize:18 }}>{glyph}</span>}
          <strong style={{ color:C.blue, fontSize:14 }}>{name}</strong>
        </div>
        {done && <span style={{ fontSize:18 }}>🏆</span>}
      </div>
      <ProgressBar pct={pct} done={done} />
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:12 }}>
        <span style={{ color: done?C.gold:C.ink, fontWeight:700 }}>{done ? "¡Meta cumplida!" : pct+"% de la meta"}</span>
        <span style={{ color:C.ink }}>{fmt(kg)} / {fmt(meta)} kg</span>
      </div>
    </div>
  );
}

// ---------------- APP ----------------
// ---------------- ERROR BOUNDARY (diagnóstico en pantalla) ----------------
type EBState = { error: Error | null };
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: "#001d39", color: "#fff", padding: 28,
          fontFamily: "sans-serif", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center" }}>
          <div style={{ fontSize: 38 }}>!</div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>Ciclo - Error al cargar</div>
          <div style={{ background: "rgba(255,255,255,.1)", padding: 16, borderRadius: 10,
            fontSize: 12, maxWidth: 480, width: "100%", wordBreak: "break-word" }}>
            {this.state.error.message}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", maxWidth: 480, wordBreak: "break-word" }}>
            {this.state.error.stack?.split("\n").slice(0, 4).join(" | ")}
          </div>
          <button onClick={() => window.location.reload()} style={{ background: "#00b398",
            border: "none", color: "#fff", padding: "10px 22px", borderRadius: 10,
            cursor: "pointer", fontWeight: 700 }}>Reintentar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const [tab, setTab] = useState<"resumen"|"materiales"|"metas"|"mapa">("resumen");
  const [detail, setDetail] = useState<Material | null>(null);
  const [selMat, setSelMat] = useState<string | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);

  const totalKg = MATERIALS.reduce((a, m) => a + m.kg, 0);
  const totalCo2 = MATERIALS.reduce((a, m) => a + m.co2, 0);
  const totalCerts = MATERIALS.filter((m) => m.cert).length;
  const pctGlobal = Math.round((totalKg / META_GLOBAL) * 100);
  const eq = equivalencias(totalCo2, totalKg);
  const cumplidas = MATERIALS.filter((m) => m.kg >= m.meta);

  useEffect(() => {
    if (tab === "metas" && cumplidas.length > 0) setConfettiKey((k) => k + 1);
  }, [tab]); // eslint-disable-line

  const NAV = [
    { k:"resumen", label:"Resumen" }, { k:"materiales", label:"Materiales" },
    { k:"metas", label:"Metas" }, { k:"mapa", label:"Mapa" },
  ] as const;

  return (
    <div style={{ minHeight:"100vh", background:C.paper, fontFamily:"Calibri,'Segoe UI',system-ui,sans-serif", color:C.blue }}>
      <GlobalStyle />
      <Confetti fireKey={confettiKey} />

      <div style={{ maxWidth:1000, margin:"0 auto", background:C.paper, minHeight:"100vh", boxShadow:"0 0 60px rgba(0,0,0,.08)" }}>
        <Masthead tab={tab} />

        <div style={{ display:"flex", gap:4, padding:"0 16px", background:"#fff", borderBottom:"1px solid "+C.line, position:"sticky", top:0, zIndex:50, overflowX:"auto" }}>
          {NAV.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{ padding:"14px 16px", border:"none", background:"none", cursor:"pointer",
              fontWeight: tab===t.k?800:500, fontSize:14, color: tab===t.k?C.blue:"#9aa6b2", borderBottom:"3px solid "+(tab===t.k?C.gold:"transparent") }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding:"22px 16px 60px" }}>

          {/* ---- RESUMEN ---- */}
          {tab === "resumen" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:12 }}>
                <Stat label="Total reciclado" value={fmt(totalKg)} unit="kg" accent={C.teal} />
                <Stat label="Avance meta global" value={pctGlobal} unit="%" accent={C.gold} />
                <Stat label="CO₂ evitado" value={fmt1(totalCo2)} unit="t" accent={C.lime} />
                <Stat label="Certificados" value={totalCerts} unit="" accent={C.sage} />
              </div>

              <h3 style={{ margin:"28px 0 12px", fontSize:16 }}>Equivalencia en beneficios ambientales</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:12 }}>
                {[
                  { icon:"🌳", n:fmt(eq.arboles),  l:"árboles equivalentes (captura anual de CO₂)" },
                  { icon:"🚗", n:fmt(eq.autosKm),  l:"km en auto sin emitir" },
                  { icon:"🏠", n:fmt(eq.hogares),  l:"hogares: consumo eléctrico anual" },
                  { icon:"💧", n:fmt(eq.aguaLt),   l:"litros de agua equivalentes ahorrados" },
                ].map((e, i) => (
                  <div key={i} style={{ background:C.card, border:"1px solid "+C.line, borderRadius:16, padding:18 }}>
                    <div style={{ fontSize:30 }}>{e.icon}</div>
                    <div style={{ fontSize:24, fontWeight:800, color:C.blue, marginTop:6 }}>{e.n}</div>
                    <div style={{ fontSize:12, color:C.ink, marginTop:4 }}>{e.l}</div>
                  </div>
                ))}
              </div>

              {/* <h3 style={{ margin:"28px 0 12px", fontSize:16 }}>Desviación mensual de residuos (kg)</h3>
              <div style={{ background:C.card, border:"1px solid "+C.line, borderRadius:16, padding:20 }}>
                <div style={{ display:"flex", alignItems:"flex-end", gap:14, height:160 }}>
                  {[6200,7400,6900,8600,9300,10300].map((v, i) => {
                    const h = ( v / 11000 ) * 100 ;
                    return (
                      <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:11, color:C.ink }}>{fmt(v)}</span>
                        <div style={{ width:"100%", height:h+"%", borderRadius:"8px 8px 0 0", background:"linear-gradient("+C.teal+","+C.blue+")" }} />
                        <span style={{ fontSize:11, color:"#9aa6b2" }}>{["Ene","Feb","Mar","Abr","May","Jun"][i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div> */}

              <h3 style={{ margin: "28px 0 12px", fontSize: 16 }}>
                Residuos reciclados mensuales (kg)
              </h3>

              <div
                style={{
                  background: C.card,
                  border: "1px solid " + C.line,
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 14,
                    height: 180,
                    paddingTop: 12,
                  }}
                >
                  {[6200, 7400, 6900, 8600, 9300, 10300].map((v, i) => {
                    const h = Math.max(12, (v / 11000) * 130);

                    return (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "flex-end",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: C.ink,
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        >
                          {fmt(v)}
                        </span>

                        <div
                          style={{
                            width: "70%",
                            height: h,
                            borderRadius: "8px 8px 0 0",
                            background:
                              "linear-gradient(180deg, " + C.teal + ", " + C.blue + ")",
                            boxShadow: "0 6px 14px rgba(0,0,0,0.12)",
                          }}
                        />

                        <span
                          style={{
                            fontSize: 11,
                            color: "#9aa6b2",
                            marginTop: 8,
                          }}
                        >
                          {["Ene", "Feb", "Mar", "Abr", "May", "Jun"][i]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop:24, background:C.blue, borderRadius:16, padding:22, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", inset:8, border:"1px solid rgba(255,255,255,.3)", borderTopLeftRadius:18, pointerEvents:"none" }} />
                <div style={{ fontFamily:"'Segoe Script','Brush Script MT',cursive", color:C.gold, fontSize:20 }}>Our Purpose</div>
                <div style={{ color:"#fff", fontWeight:700, fontSize:18 }}>Creating enduring value beyond mining</div>
              </div>
            </>
          )}

          {/* ---- MATERIALES ---- */}
          {tab === "materiales" && (
            <>
              <p style={{ fontSize:13, color:C.ink, margin:"0 0 16px" }}>
                Selecciona un material para ver su naturaleza, cuánto se ha reciclado, su ruta de disposición y su certificado.
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12 }}>
                {MATERIALS.map((m) => {
                  const pct = Math.round((m.kg / m.meta) * 100);
                  return (
                    <button key={m.id} onClick={() => setDetail(m)} style={{ textAlign:"left", cursor:"pointer", background:C.card, border:"1px solid "+C.line, borderRadius:16, padding:16, borderLeft:"6px solid "+m.color }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div style={{ width:38, height:38, borderRadius:11, background:m.color+"22", color:m.color, display:"grid", placeItems:"center", fontSize:20 }}>{m.glyph}</div>
                        {m.cert && <span style={{ fontSize:9, fontWeight:800, color:C.teal, background:C.teal+"1a", padding:"3px 8px", borderRadius:20 }}>CERTIFICADO</span>}
                      </div>
                      <div style={{ fontWeight:800, color:C.blue, fontSize:15, marginTop:10 }}>{m.name}</div>
                      <div style={{ fontSize:11, color:C.ink, marginBottom:12 }}>{m.nature}</div>
                      <ProgressBar pct={pct} done={pct>=100} />
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:C.ink }}>
                        <span>{fmt(m.kg)} kg</span><span>{pct}% meta</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ---- METAS ---- */}
          {tab === "metas" && (
            <>
              <div style={{ background:C.card, border:"1px solid "+C.line, borderRadius:16, padding:20, marginBottom:18 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:10 }}>
                  <strong style={{ fontSize:16, color:C.blue }}>Meta global de reciclaje</strong>
                </div>
                <ProgressBar pct={pctGlobal} done={pctGlobal>=100} />
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:13 }}>
                  <span style={{ color:C.gold, fontWeight:700 }}>{pctGlobal}% de la meta</span>
                  <span style={{ color:C.ink }}>{fmt(totalKg)} / {fmt(META_GLOBAL)} kg</span>
                </div>
                <div style={{ fontSize:12, color:C.ink, marginTop:10 }}>{cumplidas.length} de {MATERIALS.length} materiales ya superaron su meta individual.</div>
              </div>

              <h3 style={{ margin:"0 0 12px", fontSize:15 }}>Metas por material</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:12 }}>
                {MATERIALS.map((m) => (
                  <MetaCard key={m.id} name={m.name} kg={m.kg} meta={m.meta} color={m.color} glyph={m.glyph} />
                ))}
              </div>
            </>
          )}

          {/* ---- MAPA ---- */}
          {tab === "mapa" && (
            <>
              <p style={{ fontSize:13, color:C.ink, margin:"0 0 14px" }}>
                Filtra por material para ver dónde están sus puntos de reciclaje en el plano de planta. Toca un punto para ver el detalle.
              </p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                <button onClick={() => setSelMat(null)} style={{ padding:"8px 14px", borderRadius:20, cursor:"pointer", border:"1px solid "+(selMat===null?C.blue:C.line), background:selMat===null?C.blue:"#fff", color:selMat===null?"#fff":C.blue, fontWeight:600, fontSize:12 }}>Todos</button>
                {MATERIALS.map((m) => (
                  <button key={m.id} onClick={() => setSelMat(m.id)} style={{ padding:"8px 14px", borderRadius:20, cursor:"pointer", border:"1px solid "+(selMat===m.id?m.color:C.line), background:selMat===m.id?m.color:"#fff", color:selMat===m.id?"#fff":C.blue, fontWeight:600, fontSize:12 }}>
                    {m.glyph} {m.name}
                  </button>
                ))}
              </div>
              <PlantMap selMat={selMat} />
            </>
          )}
        </div>

        <div style={{ padding:"16px", borderTop:"1px solid "+C.line, background:"#fff", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8, fontSize:11, color:"#9aa6b2" }}>
          <span>Prototipo de Plataforma · Alimentación de Datos en Tiempo Real </span>
        </div>
      </div>

      {detail && (
        <MaterialDetail m={detail} onClose={() => setDetail(null)} onVerMapa={() => { setSelMat(detail.id); setTab("mapa"); setDetail(null); }} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
