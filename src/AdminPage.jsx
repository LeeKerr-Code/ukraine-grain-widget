import { useState, useEffect } from "react";

const API_URL    = import.meta.env?.VITE_ADMIN_API_URL || "/api/update-prices";
const PRICES_URL = "/grain-prices.json";

const C = {
  green:     "#147575",
  greenDark: "#126363",
  greenDeep: "#002b2a",
  greenLight:"#e8f2f2",
  greenMid:  "#4a9e9e",
  beige:     "#F1EDDE",
  beige70:   "#F6F3EA",
  text:      "#212B36",
  textSec:   "#637381",
  white:     "#FFFFFF",
  success:   "#22C55E",
  warning:   "#F59E0B",
  error:     "#EF4444",
};

const FONT_HEAD = "'Montserrat', sans-serif";
const FONT_BODY = "'Roboto', sans-serif";

const CROPS = [
  { key:"wheat",     label:"🌾 Wheat (2nd grade) / Пшениця (2 клас)" },
  { key:"corn",      label:"🌽 Corn / Кукурудза" },
  { key:"sunflower", label:"🌻 Sunflower / Соняшник" },
  { key:"rapeseed",  label:"🟡 Rapeseed / Ріпак" },
  { key:"soy",       label:"🫘 Soybean / Соя" },
];

const SENTIMENT_OPTIONS = [
  { value:"bull",    label:"▲ Bullish / Зростання" },
  { value:"neutral", label:"● Stable / Стабільно"  },
  { value:"bear",    label:"▼ Bearish / Зниження"  },
];

const DEFAULT_PRICES = {
  wheat:     { cpt_usd:220, port_usd:232, exw_usd:205, week_chg:-2, month_chg:5,  year_chg:42,  source_note:"" },
  corn:      { cpt_usd:208, port_usd:218, exw_usd:193, week_chg:1,  month_chg:-3, year_chg:68,  source_note:"" },
  sunflower: { cpt_usd:545, port_usd:503, exw_usd:507, week_chg:-8, month_chg:15, year_chg:110, source_note:"" },
  rapeseed:  { cpt_usd:400, port_usd:412, exw_usd:372, week_chg:3,  month_chg:-6, year_chg:25,  source_note:"" },
  soy:       { cpt_usd:325, port_usd:338, exw_usd:302, week_chg:-4, month_chg:-2, year_chg:-18, source_note:"" },
};

const DEFAULT_SENTIMENT = { wheat:"neutral", corn:"bull", sunflower:"bull", rapeseed:"bear", soy:"bear" };
const DEFAULT_NOTES = {
  wheat:{ en:"", uk:"" }, corn:{ en:"", uk:"" }, sunflower:{ en:"", uk:"" },
  rapeseed:{ en:"", uk:"" }, soy:{ en:"", uk:"" },
};

// ── Shared input styles ───────────────────────────────────────────────────────
const inputBase = {
  width:"100%", padding:"8px 10px",
  border:`1px solid ${C.greenMid}40`,
  borderRadius:6, fontSize:13, fontFamily:FONT_BODY,
  color:C.text, background:C.beige70,
  boxSizing:"border-box", outline:"none",
};

const inputNum = {
  ...inputBase, fontFamily:FONT_HEAD, fontWeight:700,
  color:C.green, fontSize:14, textAlign:"right",
};

export default function AdminPage() {
  const [authed, setAuthed]       = useState(false);
  const [password, setPassword]   = useState("");
  const [authErr, setAuthErr]     = useState("");
  const [activeCrop, setActiveCrop] = useState("wheat");
  const [prices, setPrices]       = useState(DEFAULT_PRICES);
  const [sentiment, setSentiment] = useState(DEFAULT_SENTIMENT);
  const [notes, setNotes]         = useState(DEFAULT_NOTES);
  const [meta, setMeta]           = useState({ source:"", uahUsdRate:41.5 });
  const [status, setStatus]       = useState(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    fetch(`${PRICES_URL}?_=${Date.now()}`)
      .then(r => r.json())
      .then(d => {
        if (d.prices)      setPrices(d.prices);
        if (d.sentiment)   setSentiment(d.sentiment);
        if (d.marketNotes) setNotes(d.marketNotes);
        if (d._meta)       setMeta({ source:d._meta.source||"", uahUsdRate:d._meta.uahUsdRate||41.5 });
        if (d._meta?.lastUpdated) setLastSaved(d._meta.lastUpdated);
      })
      .catch(() => {});
  }, []);

  const tryAuth = () => {
    if (!password.trim()) { setAuthErr("Enter the admin password."); return; }
    setAuthed(true); setAuthErr("");
  };

  const updateCropField = (crop, field, value) =>
    setPrices(prev => ({ ...prev, [crop]: { ...prev[crop], [field]: value } }));

  const updateNote = (crop, lang, value) =>
    setNotes(prev => ({ ...prev, [crop]: { ...prev[crop], [lang]: value } }));

  const handleSave = async () => {
    setStatus("saving"); setErrorMsg("");
    try {
      const res = await fetch(API_URL, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          password,
          data: { prices, sentiment, marketNotes:notes,
            _meta:{ source:meta.source, uahUsdRate:parseFloat(meta.uahUsdRate)||41.5 } },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setStatus("ok");
      setLastSaved(new Date().toISOString().split("T")[0]);
    } catch (err) {
      setStatus("error"); setErrorMsg(err.message);
    }
  };

  const cd = prices[activeCrop] || DEFAULT_PRICES[activeCrop];

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight:"100vh", background:C.beige, display:"flex",
        alignItems:"center", justifyContent:"center", fontFamily:FONT_BODY }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Roboto:wght@400;500&display=swap');`}</style>
        <div style={{ background:C.white, borderRadius:12, padding:"28px 28px 24px",
          width:300, textAlign:"center",
          border:`1px solid ${C.greenMid}30`,
          boxShadow:"0 4px 20px rgba(20,117,117,0.12)" }}>
          <div style={{ fontSize:30, marginBottom:8 }}>🌾</div>
          <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:16, color:C.green, marginBottom:4 }}>
            Grain Price Admin
          </div>
          <div style={{ fontSize:11, color:C.textSec, marginBottom:20 }}>
            Ukraine Grain Price Widget
          </div>
          <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.greenMid,
            textTransform:"uppercase", letterSpacing:0.8, fontFamily:FONT_HEAD, marginBottom:6, textAlign:"left" }}>
            Admin Password
          </label>
          <input type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key==="Enter" && tryAuth()}
            placeholder="Enter password"
            style={{ ...inputBase, marginBottom:10, textAlign:"center" }}
          />
          {authErr && <div style={{ fontSize:11, color:C.error, marginBottom:8, fontFamily:FONT_BODY }}>{authErr}</div>}
          <button onClick={tryAuth} style={{
            background:`linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
            color:C.white, border:"none", borderRadius:7,
            padding:"10px 0", width:"100%",
            cursor:"pointer", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13,
          }}>Enter Admin →</button>
        </div>
      </div>
    );
  }

  // ── Admin UI ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.beige, fontFamily:FONT_BODY, paddingBottom:60 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Roboto:wght@400;500&display=swap');`}</style>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg, ${C.green}, ${C.greenDeep})`,
        padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:17, color:C.white }}>
            🌾 Grain Price Admin
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:2, fontFamily:FONT_BODY }}>
            Ukraine Grain Price Widget{lastSaved ? ` · Last saved: ${lastSaved}` : ""}
          </div>
        </div>
        {lastSaved && (
          <span style={{ background:"rgba(255,255,255,0.15)", color:C.white,
            fontSize:10, fontWeight:700, fontFamily:FONT_HEAD,
            padding:"4px 12px", borderRadius:20, border:"1px solid rgba(255,255,255,0.25)" }}>
            ✓ On file: {lastSaved}
          </span>
        )}
      </div>

      <div style={{ maxWidth:580, margin:"0 auto", padding:"20px 16px 0" }}>

        {/* Meta card */}
        <div style={{ background:C.white, borderRadius:10, border:`1px solid ${C.greenMid}20`,
          padding:"16px 18px", marginBottom:14, boxShadow:"0 2px 8px rgba(20,117,117,0.06)" }}>
          <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:C.text,
            marginBottom:12, paddingBottom:6, borderBottom:`1px solid ${C.greenLight}` }}>
            Update Details
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1 }}>
              <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.greenMid,
                textTransform:"uppercase", letterSpacing:0.8, fontFamily:FONT_HEAD, marginBottom:4 }}>
                Data Source
              </label>
              <input style={inputBase} value={meta.source}
                onChange={e => setMeta(m => ({ ...m, source:e.target.value }))}
                placeholder="e.g. UkrAgroConsult / APK-Inform" />
            </div>
            <div style={{ width:120 }}>
              <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.greenMid,
                textTransform:"uppercase", letterSpacing:0.8, fontFamily:FONT_HEAD, marginBottom:4 }}>
                UAH/USD Rate
              </label>
              <input type="number" style={inputNum} value={meta.uahUsdRate}
                onChange={e => setMeta(m => ({ ...m, uahUsdRate:e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Crop tabs */}
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:12 }}>
          {CROPS.map(c => (
            <button key={c.key} onClick={() => setActiveCrop(c.key)} style={{
              padding:"7px 14px", border:"none", borderRadius:6,
              background: activeCrop===c.key
                ? `linear-gradient(135deg, ${C.green}, ${C.greenDark})`
                : C.greenLight,
              color: activeCrop===c.key ? C.white : C.green,
              fontFamily:FONT_HEAD, fontWeight:700, fontSize:11,
              cursor:"pointer", transition:"all 0.15s",
            }}>{c.label.split("/")[0].trim()}</button>
          ))}
        </div>

        {/* Crop edit card */}
        <div style={{ background:C.white, borderRadius:10, border:`1px solid ${C.greenMid}20`,
          padding:"16px 18px", marginBottom:14, boxShadow:"0 2px 8px rgba(20,117,117,0.06)" }}>
          <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:C.text,
            marginBottom:12, paddingBottom:6, borderBottom:`1px solid ${C.greenLight}` }}>
            {CROPS.find(c=>c.key===activeCrop)?.label}
          </div>

          {/* Price fields */}
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            {[
              { field:"cpt_usd",  label:"CPT Central (USD/t)" },
              { field:"port_usd", label:"Port Odesa (USD/t)"  },
              { field:"exw_usd",  label:"EXW Elevator (USD/t)"},
            ].map(({ field, label }) => (
              <div key={field} style={{ flex:1 }}>
                <label style={{ display:"block", fontSize:9, fontWeight:700, color:C.greenMid,
                  textTransform:"uppercase", letterSpacing:0.7, fontFamily:FONT_HEAD, marginBottom:4 }}>
                  {label}
                </label>
                <input type="number" style={inputNum} value={cd[field]||""}
                  onChange={e => updateCropField(activeCrop, field, parseFloat(e.target.value)||0)} />
              </div>
            ))}
          </div>

          {/* Change fields */}
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            {[
              { field:"week_chg",  label:"Week Δ USD" },
              { field:"month_chg", label:"Month Δ USD" },
              { field:"year_chg",  label:"Year Δ USD"  },
            ].map(({ field, label }) => (
              <div key={field} style={{ flex:1 }}>
                <label style={{ display:"block", fontSize:9, fontWeight:700, color:C.greenMid,
                  textTransform:"uppercase", letterSpacing:0.7, fontFamily:FONT_HEAD, marginBottom:4 }}>
                  {label}
                </label>
                <input type="number" style={{
                  ...inputNum,
                  color: cd[field]>0 ? C.success : cd[field]<0 ? C.error : C.text,
                }} value={cd[field]||0}
                  onChange={e => updateCropField(activeCrop, field, parseFloat(e.target.value)||0)} />
              </div>
            ))}
          </div>

          {/* Sentiment */}
          <div style={{ marginBottom:10 }}>
            <label style={{ display:"block", fontSize:9, fontWeight:700, color:C.greenMid,
              textTransform:"uppercase", letterSpacing:0.7, fontFamily:FONT_HEAD, marginBottom:4 }}>
              Market Sentiment
            </label>
            <select style={{ ...inputBase, fontFamily:FONT_HEAD, fontWeight:600 }}
              value={sentiment[activeCrop]}
              onChange={e => setSentiment(s => ({ ...s, [activeCrop]:e.target.value }))}>
              {SENTIMENT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            {[
              { lang:"en", label:"Market Note (English)" },
              { lang:"uk", label:"Нотатка (Українська)"  },
            ].map(({ lang, label }) => (
              <div key={lang} style={{ flex:1 }}>
                <label style={{ display:"block", fontSize:9, fontWeight:700, color:C.greenMid,
                  textTransform:"uppercase", letterSpacing:0.7, fontFamily:FONT_HEAD, marginBottom:4 }}>
                  {label}
                </label>
                <input style={inputBase} value={notes[activeCrop]?.[lang]||""}
                  onChange={e => updateNote(activeCrop, lang, e.target.value)}
                  placeholder={lang==="en" ? "e.g. Harvest pressure; steady EU demand" : "напр. Тиск врожаю"} />
              </div>
            ))}
          </div>

          {/* Source note */}
          <div>
            <label style={{ display:"block", fontSize:9, fontWeight:700, color:C.greenMid,
              textTransform:"uppercase", letterSpacing:0.7, fontFamily:FONT_HEAD, marginBottom:4 }}>
              Source Note (shown in widget)
            </label>
            <input style={inputBase} value={cd.source_note||""}
              onChange={e => updateCropField(activeCrop, "source_note", e.target.value)}
              placeholder="e.g. UkrAgroConsult 08.06.2026; APK-Inform week 23" />
          </div>
        </div>

        {/* All crops summary */}
        <div style={{ background:C.white, borderRadius:10, border:`1px solid ${C.greenMid}20`,
          padding:"14px 18px", marginBottom:16, boxShadow:"0 2px 8px rgba(20,117,117,0.06)" }}>
          <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:12, color:C.text,
            marginBottom:10, paddingBottom:5, borderBottom:`1px solid ${C.greenLight}` }}>
            Current CPT Central Summary
          </div>
          <div style={{ display:"flex", gap:0, flexWrap:"wrap" }}>
            {CROPS.map((c, i) => (
              <div key={c.key} style={{
                flex:"1 1 80px", textAlign:"center", padding:"6px 4px",
                borderRight: i<CROPS.length-1 ? `1px solid ${C.greenLight}` : "none",
              }}>
                <div style={{ fontSize:16, marginBottom:2 }}>{c.label.split(" ")[0]}</div>
                <div style={{ fontSize:13, fontWeight:700, fontFamily:FONT_HEAD, color:C.green }}>
                  ${prices[c.key]?.cpt_usd ?? "—"}
                </div>
                <div style={{ fontSize:8, color:C.textSec, fontFamily:FONT_BODY }}>USD/t</div>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <button onClick={handleSave} disabled={status==="saving"} style={{
            background: status==="saving"
              ? C.greenMid
              : `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
            color:C.white, border:"none", borderRadius:8,
            padding:"11px 28px", fontSize:14, fontWeight:700,
            fontFamily:FONT_HEAD, cursor: status==="saving" ? "default":"pointer",
            transition:"all 0.2s",
          }}>
            {status==="saving" ? "Saving…" : "💾 Save & Publish Prices"}
          </button>

          {status==="ok" && (
            <span style={{ background:"#dcfce7", color:"#15803d", fontSize:11,
              fontWeight:700, fontFamily:FONT_HEAD, padding:"4px 12px",
              borderRadius:20, border:"1px solid #15803d30" }}>✓ Saved</span>
          )}
          {status==="error" && (
            <span style={{ background:"#fee2e2", color:"#b91c1c", fontSize:11,
              fontWeight:700, fontFamily:FONT_HEAD, padding:"4px 12px",
              borderRadius:20, border:"1px solid #b91c1c30" }}>✗ {errorMsg}</span>
          )}
        </div>

        <div style={{ fontSize:10, color:C.textSec, fontFamily:FONT_BODY, marginTop:10, lineHeight:1.6 }}>
          Saving publishes prices immediately to the live widget via Vercel Blob storage.<br/>
          The widget will show the updated date stamp on next load.
        </div>
      </div>
    </div>
  );
}
