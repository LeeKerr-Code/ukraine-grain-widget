import { useState, useEffect, useCallback } from "react";

// ── API endpoint — Vercel proxy to BlackSeaGrain.io ───────────────────────────
// In production this hits /api/grain-prices (api/grain-prices.js)
// In local dev set VITE_GRAIN_API_URL=http://localhost:3000/api/grain-prices
const API_URL = import.meta.env?.VITE_GRAIN_API_URL || "/api/grain-prices";

// Auto-refresh every 30 minutes (matches BSG update frequency)
const REFRESH_MS = 30 * 60 * 1000;

// ── Brand palette ─────────────────────────────────────────────────────────────
const C = {
  green:      "#147575",
  greenDark:  "#126363",
  greenDeep:  "#002b2a",
  greenLight: "#e8f2f2",
  greenMid:   "#4a9e9e",
  beige:      "#F1EDDE",
  beige70:    "#F6F3EA",
  text:       "#212B36",
  textSec:    "#637381",
  white:      "#FFFFFF",
  success:    "#22C55E",
  warning:    "#F59E0B",
  error:      "#EF4444",
};

const FONT_HEAD = "'Montserrat', sans-serif";
const FONT_BODY = "'Roboto', sans-serif";

// ── i18n ──────────────────────────────────────────────────────────────────────
const T = {
  en: {
    title:          "Grain Market Prices",
    subtitle:       "Ukraine · Live",
    loading:        "Fetching live prices…",
    error_load:     "Could not fetch live prices.",
    error_retry:    "Retry",
    as_of:          "Live data as of",
    live_badge:     "LIVE",
    stale_warning:  "⚠ Data is more than 2 hours old",
    tab_prices:     "Prices",
    tab_market:     "Market",
    tab_region:     "Regional",
    price_cpt:      "CPT Central",
    price_port:     "Port FOB",
    price_exw:      "EXW Inland",
    week_chg:       "wk",
    month_chg:      "mo",
    year_chg:       "yr",
    market_sentiment: "Market Sentiment",
    key_driver:     "Data Source",
    bull:           "Bullish",
    bear:           "Bearish",
    neutral:        "Stable",
    no_data:        "No live price available",
    disclaimer:     "Live FOB/CPT prices via BlackSeaGrain.io. Verify before trading.",
    region_note:    "Regional freight adjustments derived from live BlackSeaGrain.io freight data (UAH/t avg by oblast).",
    reg_differential: "Freight adjustment",
    last_src:       "Source",
    refreshing:     "Refreshing…",
    last_refresh:   "Updated",
    regions: {
      Cherkasy: "Cherkasy", Chernihiv: "Chernihiv", Khmelnytska: "Khmelnytska",
      Kirovohrad: "Kirovohrad", Kharkiv: "Kharkiv", Kyiv: "Kyiv",
      Odesa: "Odesa", Poltava: "Poltava", Sumy: "Sumy",
      Vinnytsia: "Vinnytsia", Zaporizhzhia: "Zaporizhzhia", Zhytomyr: "Zhytomyr",
    },
    crops: {
      wheat: "Wheat (2nd gr.)", corn: "Corn",
      sunflower: "Sunflower", rapeseed: "Rapeseed", soy: "Soybean",
    },
  },
  uk: {
    title:          "Ринок зерна",
    subtitle:       "Україна · Наживо",
    loading:        "Завантаження живих цін…",
    error_load:     "Не вдалося отримати ціни.",
    error_retry:    "Повторити",
    as_of:          "Живі дані станом на",
    live_badge:     "НАЖИВО",
    stale_warning:  "⚠ Дані старші 2 годин",
    tab_prices:     "Ціни",
    tab_market:     "Ринок",
    tab_region:     "Регіони",
    price_cpt:      "ЦПТ Центр",
    price_port:     "Порт FOB",
    price_exw:      "EXW Склад",
    week_chg:       "тиж",
    month_chg:      "міс",
    year_chg:       "рік",
    market_sentiment: "Настрій ринку",
    key_driver:     "Джерело даних",
    bull:           "Зростання",
    bear:           "Зниження",
    neutral:        "Стабільно",
    no_data:        "Живих цін немає",
    disclaimer:     "Живі ціни FOB/CPT від BlackSeaGrain.io. Перевіряйте перед торгівлею.",
    region_note:    "Регіональні коригування на основі живих даних про фрахт BlackSeaGrain.io (середня UAH/т по областях).",
    reg_differential: "Коригування фрахту",
    last_src:       "Джерело",
    refreshing:     "Оновлення…",
    last_refresh:   "Оновлено",
    regions: {
      Cherkasy: "Черкаси", Chernihiv: "Чернігів", Khmelnytska: "Хмельницька",
      Kirovohrad: "Кіровоград", Kharkiv: "Харків", Kyiv: "Київ",
      Odesa: "Одеса", Poltava: "Полтава", Sumy: "Суми",
      Vinnytsia: "Вінниця", Zaporizhzhia: "Запоріжжя", Zhytomyr: "Житомир",
    },
    crops: {
      wheat: "Пшениця (2 кл.)", corn: "Кукурудза",
      sunflower: "Соняшник", rapeseed: "Ріпак", soy: "Соя",
    },
  },
};

// ── Regions ───────────────────────────────────────────────────────────────────
const REGIONS = [
  { en:"Cherkasy",    uk:"Черкаси",      bsg:"Cherkasy"    },
  { en:"Chernihiv",   uk:"Чернігів",     bsg:"Chernihiv"   },
  { en:"Khmelnytska", uk:"Хмельницька",  bsg:null          },
  { en:"Kirovohrad",  uk:"Кіровоград",   bsg:"Kirovohrad"  },
  { en:"Kharkiv",     uk:"Харків",       bsg:"Kharkiv"     },
  { en:"Kyiv",        uk:"Київ",         bsg:"Kyiv"        },
  { en:"Odesa",       uk:"Одеса",        bsg:"Odesa"       },
  { en:"Poltava",     uk:"Полтава",      bsg:"Poltava"     },
  { en:"Sumy",        uk:"Суми",         bsg:"Sumy"        },
  { en:"Vinnytsia",   uk:"Вінниця",      bsg:"Vinnytsia"   },
  { en:"Zaporizhzhia",uk:"Запоріжжя",    bsg:"Zaporizhzhia"},
  { en:"Zhytomyr",    uk:"Житомир",      bsg:"Zhytomyr"    },
];

// Fallback static differentials for regions BSG has no freight data on
const STATIC_BASIS = {
  Cherkasy:    { wheat: +2,  corn: +4,  sunflower: +5,  rapeseed: +2,  soy: +4  },
  Chernihiv:   { wheat: -3,  corn: -2,  sunflower: -8,  rapeseed: -4,  soy: -3  },
  Khmelnytska: { wheat: -4,  corn: -5,  sunflower: -10, rapeseed: +4,  soy: -4  },
  Kirovohrad:  { wheat: +3,  corn: +4,  sunflower: +6,  rapeseed: +3,  soy: +3  },
  Kharkiv:     { wheat: -8,  corn: -5,  sunflower: -12, rapeseed: -10, soy: -8  },
  Kyiv:        { wheat: 0,   corn: 0,   sunflower: +8,  rapeseed: -5,  soy: +5  },
  Odesa:       { wheat: +10, corn: +8,  sunflower: +6,  rapeseed: +8,  soy: +10 },
  Poltava:     { wheat: +1,  corn: +6,  sunflower: +4,  rapeseed: +1,  soy: +3  },
  Sumy:        { wheat: -5,  corn: -3,  sunflower: -9,  rapeseed: -6,  soy: -5  },
  Vinnytsia:   { wheat: -2,  corn: -1,  sunflower: -6,  rapeseed: +3,  soy: -2  },
  Zaporizhzhia:{ wheat: -12, corn: -6,  sunflower: -18, rapeseed: -15, soy: -10 },
  Zhytomyr:    { wheat: -6,  corn: -4,  sunflower: -14, rapeseed: -3,  soy: -6  },
};

// Reference freight (Kyiv oblast → port, UAH/t) for differential calculation
const KYIV_FREIGHT_UAH = 1200;

const CROPS      = ["wheat","corn","sunflower","rapeseed","soy"];
const CROP_EMOJI = { wheat:"🌾", corn:"🌽", sunflower:"🌻", rapeseed:"🟡", soy:"🫘" };
const CROP_COLOR = { wheat:"#D4A017", corn:"#F59E0B", sunflower:"#EAB308", rapeseed:"#22C55E", soy:"#8B5CF6" };

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr, lang) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(
    lang === "uk" ? "uk-UA" : "en-GB",
    { day:"numeric", month:"short", year:"numeric" }
  );
}

function formatTime(isoStr) {
  if (!isoStr) return "";
  return new Date(isoStr).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
}

function hoursSince(isoStr) {
  if (!isoStr) return 999;
  return (Date.now() - new Date(isoStr)) / 3600000;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function FontLoader() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Roboto:wght@400;500&display=swap');
    `}</style>
  );
}

function Chg({ val, label }) {
  if (val === null || val === undefined) return null;
  const col   = val > 0 ? C.success : val < 0 ? C.error : C.textSec;
  const arrow = val > 0 ? "▲" : val < 0 ? "▼" : "─";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1, minWidth:28 }}>
      <span style={{ fontSize:14, fontWeight:700, color:col, fontFamily:FONT_HEAD, whiteSpace:"nowrap" }}>
        {arrow} {val > 0 ? "+" : ""}{val}
      </span>
      <span style={{ fontSize:10, color:C.textSec, fontFamily:FONT_BODY }}>{label}</span>
    </div>
  );
}

function SentimentPill({ sentiment, t }) {
  const cfg = {
    bull:    { label:t.bull,    bg:"#dcfce7", color:"#15803d" },
    bear:    { label:t.bear,    bg:"#fee2e2", color:"#b91c1c" },
    neutral: { label:t.neutral, bg:"#fef9c3", color:"#a16207" },
  };
  const { label, bg, color } = cfg[sentiment] || cfg.neutral;
  return (
    <span style={{
      background:bg, color, fontFamily:FONT_HEAD, fontSize:11, fontWeight:700,
      padding:"2px 9px", borderRadius:20, border:`1px solid ${color}30`,
    }}>
      {sentiment==="bull" ? "▲" : sentiment==="bear" ? "▼" : "●"} {label}
    </span>
  );
}

function SectionHead({ label }) {
  return (
    <div style={{
      fontSize:11, fontWeight:700, fontFamily:FONT_HEAD, color:C.greenMid,
      textTransform:"uppercase", letterSpacing:1.2,
      marginBottom:8, marginTop:2, paddingBottom:4,
      borderBottom:`1px solid ${C.greenLight}`,
    }}>{label}</div>
  );
}

function LiveBadge({ t, refreshing }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      background: refreshing ? C.greenLight : "rgba(34,197,94,0.12)",
      border:`1px solid ${refreshing ? C.greenMid : "#22C55E"}40`,
      borderRadius:20, padding:"1px 7px",
      fontSize:10, fontWeight:700, fontFamily:FONT_HEAD,
      color: refreshing ? C.greenMid : C.success,
    }}>
      <span style={{
        width:6, height:6, borderRadius:"50%",
        background: refreshing ? C.greenMid : C.success,
        animation: refreshing ? "none" : "pulse 2s infinite",
        display:"inline-block",
      }}/>
      {refreshing ? t.refreshing : t.live_badge}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </span>
  );
}

function DataStamp({ meta, lang, t, stale, refreshing, lastFetch }) {
  return (
    <div style={{
      background: stale ? "#fffbeb" : C.greenLight,
      border:`1px solid ${stale ? C.warning : C.greenMid}30`,
      borderRadius:6, padding:"5px 9px", marginBottom:10,
    }}>
      {stale && (
        <div style={{ fontSize:10, color:C.warning, fontWeight:700, fontFamily:FONT_HEAD, marginBottom:2 }}>
          {t.stale_warning}
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:11, color:C.textSec, fontFamily:FONT_BODY }}>
          <span style={{ fontWeight:600, color:C.green, fontFamily:FONT_HEAD }}>{t.as_of}:</span>{" "}
          <span style={{ fontWeight:700, color:C.text, fontFamily:FONT_HEAD }}>
            {formatDate(meta?.lastUpdated, lang)}
          </span>
        </div>
        <LiveBadge t={t} refreshing={refreshing} />
      </div>
      {lastFetch && (
        <div style={{ fontSize:10, color:C.textSec, fontFamily:FONT_BODY, marginTop:2 }}>
          {t.last_refresh}: {formatTime(lastFetch)} · {meta?.source || "BlackSeaGrain.io"}
        </div>
      )}
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────────
export default function GrainPriceWidget() {
  const [lang, setLang]           = useState("en");
  const [regionIdx, setRegionIdx] = useState(5); // Kyiv default
  const [crop, setCrop]           = useState("wheat");
  const [tab, setTab]             = useState("prices");
  const [currency, setCurrency]   = useState("usd");
  const [liveData, setLiveData]   = useState(null);
  const [loadState, setLoadState] = useState("loading"); // loading | ok | error
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetch, setLastFetch]   = useState(null);
  const t = T[lang];
  const region = REGIONS[regionIdx];

  // ── Fetch live data ──────────────────────────────────────────────────────
  const fetchLive = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadState("loading");

    try {
      const res = await fetch(`${API_URL}?_=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLiveData(data);
      setLoadState("ok");
      setLastFetch(new Date().toISOString());
    } catch (err) {
      console.error("GrainWidget fetch error:", err);
      setLoadState(prev => prev === "ok" ? "ok" : "error"); // keep showing data on refresh fail
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchLive(false); }, [fetchLive]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const iv = setInterval(() => fetchLive(true), REFRESH_MS);
    return () => clearInterval(iv);
  }, [fetchLive]);

  // ── Derive regional price from live freight data ──────────────────────────
  function getRegionalDiff(regionObj, cropKey) {
    const freight = liveData?.freightByOblast;
    if (freight && regionObj.bsg && freight[regionObj.bsg]) {
      // Live: difference between this region's freight and Kyiv reference
      const regionFreight = freight[regionObj.bsg].avg_usd || 0;
      const kyivFreight   = freight["Kyiv"]?.avg_usd || Math.round(KYIV_FREIGHT_UAH / 41.5);
      return Math.round(kyivFreight - regionFreight); // positive = cheaper freight = higher price
    }
    // Fallback to static basis
    return STATIC_BASIS[regionObj.en]?.[cropKey] || 0;
  }

  function toDisplay(usd) {
    if (usd === null || usd === undefined) return "—";
    const rate = liveData?._meta?.uahUsdRate || 41.5;
    return currency === "usd" ? `$${usd}` : `${Math.round(usd * rate).toLocaleString()} ₴`;
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loadState === "loading") {
    return (
      <div style={{ width:300, background:C.beige, borderRadius:12, padding:40,
        textAlign:"center", fontFamily:FONT_BODY, color:C.green,
        border:`1px solid ${C.greenMid}40`, boxShadow:"0 4px 20px rgba(20,117,117,0.12)" }}>
        <FontLoader/>
        <div style={{ fontSize:26, marginBottom:10 }}>🌾</div>
        <div style={{ fontSize:13, fontFamily:FONT_HEAD, fontWeight:600 }}>{t.loading}</div>
        <div style={{ fontSize:11, color:C.textSec, marginTop:6 }}>BlackSeaGrain.io</div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (loadState === "error") {
    return (
      <div style={{ width:300, background:C.beige, borderRadius:12, padding:28,
        textAlign:"center", fontFamily:FONT_BODY,
        border:`1px solid ${C.error}30`, boxShadow:"0 4px 20px rgba(20,117,117,0.12)" }}>
        <FontLoader/>
        <div style={{ fontSize:24, marginBottom:8 }}>⚠️</div>
        <div style={{ fontSize:13, marginBottom:4, color:C.text, fontFamily:FONT_HEAD }}>{t.error_load}</div>
        <div style={{ fontSize:11, color:C.textSec, marginBottom:14 }}>BlackSeaGrain.io</div>
        <button onClick={() => fetchLive(false)} style={{
          background:`linear-gradient(135deg,${C.green},${C.greenDark})`,
          color:C.white, border:"none", borderRadius:6,
          padding:"8px 20px", cursor:"pointer", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13,
        }}>{t.error_retry}</button>
      </div>
    );
  }

  // ── Data ready ────────────────────────────────────────────────────────────
  const meta      = liveData._meta;
  const cropData  = liveData.prices?.[crop] || {};
  const sentiment = liveData.sentiment?.[crop] || "neutral";
  const marketNote = liveData.marketNotes?.[crop]?.[lang] || "";
  const stale     = hoursSince(lastFetch) > 2;
  const diff      = getRegionalDiff(region, crop);

  const cptUsd  = cropData.cpt_usd != null ? cropData.cpt_usd + diff : null;
  const portUsd = cropData.port_usd != null ? cropData.port_usd : null;
  const exwUsd  = cropData.exw_usd  != null ? cropData.exw_usd  + (diff > 0 ? Math.round(diff * 0.6) : diff) : null;

  const priceRows = [
    { label: t.price_cpt,  val: cptUsd  },
    { label: t.price_port, val: portUsd },
    { label: t.price_exw,  val: exwUsd  },
  ];

  return (
    <div style={{
      fontFamily: FONT_BODY, background: C.beige, width: 300,
      borderRadius: 12, overflow: "hidden",
      boxShadow: "0 4px 24px rgba(20,117,117,0.14)",
      border: `1px solid ${C.greenMid}30`,
    }}>
      <FontLoader/>

      {/* ── Header ── */}
      <div style={{
        background:`linear-gradient(135deg,${C.green} 0%,${C.greenDark} 100%)`,
        padding:"13px 14px 11px",
        display:"flex", alignItems:"flex-start", justifyContent:"space-between",
      }}>
        <div>
          <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:17, color:C.white, letterSpacing:0.3 }}>
            {t.title}
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", fontFamily:FONT_BODY, marginTop:1 }}>
            {t.subtitle}
          </div>
        </div>
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          <button onClick={() => setCurrency(c => c==="usd"?"uah":"usd")} style={{
            background:"rgba(255,255,255,0.18)", color:C.white,
            border:"1px solid rgba(255,255,255,0.35)", borderRadius:6,
            fontSize:12, fontWeight:700, padding:"3px 8px",
            cursor:"pointer", fontFamily:FONT_HEAD,
          }}>{currency==="usd" ? "UAH" : "USD"}</button>
          <button onClick={() => setLang(l => l==="en"?"uk":"en")} style={{
            background:"rgba(255,255,255,0.18)", color:C.white,
            border:"1px solid rgba(255,255,255,0.35)", borderRadius:6,
            fontSize:12, fontWeight:700, padding:"3px 8px",
            cursor:"pointer", fontFamily:FONT_HEAD,
          }}>{lang==="en" ? "УКР" : "ENG"}</button>
        </div>
      </div>

      {/* ── Region dropdown ── */}
      <div style={{ background:C.greenDeep, padding:"8px 14px 10px" }}>
        <select
          value={regionIdx}
          onChange={e => setRegionIdx(Number(e.target.value))}
          style={{
            width:"100%", background:C.beige70,
            border:`1px solid ${C.greenMid}30`, borderRadius:8,
            padding:"5px 28px 5px 10px", fontSize:13,
            fontFamily:FONT_HEAD, fontWeight:700, color:C.text,
            cursor:"pointer", outline:"none", appearance:"none",
            backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23637381'/%3E%3C/svg%3E")`,
            backgroundRepeat:"no-repeat", backgroundPosition:"right 10px center",
          }}
        >
          {REGIONS.map((r,i) => (
            <option key={r.en} value={i}>{lang==="uk" ? r.uk : r.en}</option>
          ))}
        </select>
      </div>

      {/* ── Crop selector ── */}
      <div style={{ background:C.beige70, padding:"8px 14px", borderBottom:`1px solid ${C.greenMid}20` }}>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {CROPS.map(c => (
            <button key={c} onClick={() => setCrop(c)} style={{
              background: crop===c ? C.green : C.white,
              color: crop===c ? C.white : C.text,
              border:`1px solid ${crop===c ? C.green : C.greenMid}40`,
              borderRadius:20, fontSize:11.5, fontWeight: crop===c ? 700 : 400,
              padding:"3px 9px", cursor:"pointer", fontFamily:FONT_HEAD,
              display:"flex", alignItems:"center", gap:3, transition:"all 0.15s",
            }}>
              <span>{CROP_EMOJI[c]}</span>
              <span>{c==="sunflower" ? "Sun." : t.crops[c].split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:"flex", background:C.white, borderBottom:`1px solid ${C.greenLight}` }}>
        {["prices","market","region"].map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{
            flex:1, padding:"9px 0", background:"none", border:"none",
            borderBottom: tab===tb ? `2px solid ${C.green}` : "2px solid transparent",
            color: tab===tb ? C.green : C.textSec,
            fontSize:11, fontWeight: tab===tb ? 700 : 500,
            cursor:"pointer", fontFamily:FONT_HEAD, marginBottom:-1, letterSpacing:0.3,
          }}>{t[`tab_${tb}`]}</button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding:"12px 14px", background:C.white, minHeight:260 }}>
        <DataStamp meta={meta} lang={lang} t={t} stale={stale}
          refreshing={refreshing} lastFetch={lastFetch} />

        {/* PRICES TAB */}
        {tab === "prices" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:14, fontWeight:700, fontFamily:FONT_HEAD, color:C.text }}>
                {CROP_EMOJI[crop]} {t.crops[crop]}
              </span>
              <SentimentPill sentiment={sentiment} t={t} />
            </div>

            {priceRows.map(({ label, val }) => (
              <div key={label} style={{
                background:C.beige70, borderRadius:8, padding:"8px 10px", marginBottom:6,
                border:`1px solid ${C.greenLight}`,
                display:"flex", alignItems:"center", justifyContent:"space-between",
              }}>
                <span style={{ fontSize:12, color:C.textSec, fontFamily:FONT_BODY, width:90, flexShrink:0 }}>
                  {label}
                </span>
                <span style={{ fontSize:20, fontWeight:700, fontFamily:FONT_HEAD, color: val ? C.green : C.textSec }}>
                  {val ? toDisplay(val) : t.no_data}
                </span>
                {cropData.week_chg != null && (
                  <Chg val={cropData.week_chg} label={t.week_chg} />
                )}
              </div>
            ))}

            {/* Live freight adjustment badge */}
            {liveData.freightByOblast?.[region.bsg] && (
              <div style={{
                background:C.greenLight, borderRadius:8, padding:"6px 10px",
                display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:2,
              }}>
                <span style={{ fontSize:11, color:C.textSec, fontFamily:FONT_BODY }}>
                  🚛 {lang==="en"?"Live freight":"Живий фрахт"} · {lang==="uk" ? region.uk : region.en}
                </span>
                <span style={{ fontSize:13, fontWeight:700, fontFamily:FONT_HEAD, color:C.green }}>
                  {liveData.freightByOblast[region.bsg].avg_usd} USD/t
                </span>
              </div>
            )}

            {cropData.source_note && (
              <div style={{ fontSize:10.5, color:C.textSec, fontFamily:FONT_BODY, marginTop:8, lineHeight:1.4, opacity:0.8 }}>
                📋 {cropData.source_note}
              </div>
            )}
          </div>
        )}

        {/* MARKET TAB */}
        {tab === "market" && (
          <div>
            <SectionHead label={t.market_sentiment} />
            <div style={{ marginBottom:10 }}>
              <SentimentPill sentiment={sentiment} t={t} />
            </div>
            {marketNote && (
              <div style={{
                background:C.beige70, borderRadius:6, padding:"8px 10px",
                fontSize:12, color:C.text, fontFamily:FONT_BODY, lineHeight:1.5,
                border:`1px solid ${C.greenLight}`, marginBottom:10,
              }}>
                <div style={{ fontSize:11, color:C.green, fontWeight:700, fontFamily:FONT_HEAD,
                  textTransform:"uppercase", letterSpacing:0.8, marginBottom:4 }}>
                  {t.key_driver}
                </div>
                {marketNote}
              </div>
            )}

            <SectionHead label={lang==="en" ? "All Crops · Port FOB" : "Всі культури · Порт FOB"} />
            {CROPS.map(c => {
              const cd   = liveData.prices?.[c] || {};
              const sent = liveData.sentiment?.[c] || "neutral";
              const sentColor = { bull:"#15803d", bear:"#b91c1c", neutral:"#a16207" }[sent];
              return (
                <div key={c} style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"5px 7px", borderRadius:6, marginBottom:3,
                  background: crop===c ? C.greenLight : "transparent",
                  border:`1px solid ${crop===c ? C.greenMid+"40" : "transparent"}`,
                  cursor:"pointer",
                }} onClick={() => setCrop(c)}>
                  <span style={{ fontSize:15 }}>{CROP_EMOJI[c]}</span>
                  <span style={{ fontSize:12, fontFamily:FONT_BODY, color:C.text, flex:1 }}>{t.crops[c]}</span>
                  <span style={{ fontSize:14, fontWeight:700, fontFamily:FONT_HEAD, color: cd.port_usd ? C.green : C.textSec }}>
                    {cd.port_usd ? toDisplay(cd.port_usd) : "—"}
                  </span>
                  <span style={{ fontSize:11, fontWeight:700, color:sentColor }}>
                    {sent==="bull"?"▲":sent==="bear"?"▼":"●"}
                  </span>
                </div>
              );
            })}
            <div style={{ fontSize:10.5, color:C.textSec, fontFamily:FONT_BODY, marginTop:6 }}>
              {lang==="en" ? "Tap any crop for detailed prices." : "Натисніть культуру для деталей."}
            </div>
          </div>
        )}

        {/* REGIONAL TAB */}
        {tab === "region" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
              <span style={{ fontSize:15 }}>{CROP_EMOJI[crop]}</span>
              <span style={{ fontSize:14, fontWeight:700, fontFamily:FONT_HEAD, color:C.text }}>
                {t.crops[crop]}
              </span>
            </div>

            <SectionHead label={`${t.price_cpt} ${lang==="en"?"by Region":"по Регіонах"} (USD/t)`} />
            {REGIONS.map((r, i) => {
              const rDiff       = getRegionalDiff(r, crop);
              const regionalCpt = cropData.cpt_usd != null ? cropData.cpt_usd + rDiff : null;
              const barPct      = regionalCpt ? Math.min(100, Math.max(8, ((regionalCpt - 150) / 500) * 100)) : 0;
              const isActive    = i === regionIdx;
              const hasLive     = !!(liveData.freightByOblast?.[r.bsg]);
              return (
                <div key={r.en} style={{
                  marginBottom:7, borderRadius:7, padding:"5px 7px",
                  background: isActive ? C.greenLight : "transparent",
                  border:`1px solid ${isActive ? C.greenMid+"40" : "transparent"}`,
                  cursor:"pointer",
                }} onClick={() => setRegionIdx(i)}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:12, fontFamily: isActive ? FONT_HEAD : FONT_BODY,
                      fontWeight: isActive ? 700 : 400, color:C.text,
                      display:"flex", alignItems:"center", gap:4 }}>
                      {lang==="uk" ? r.uk : r.en}
                      {hasLive && (
                        <span style={{ fontSize:8, color:C.success, fontFamily:FONT_HEAD, fontWeight:700 }}>
                          ● LIVE
                        </span>
                      )}
                    </span>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      {rDiff !== 0 && (
                        <span style={{ fontSize:11, color: rDiff>0?C.success:C.error,
                          fontFamily:FONT_HEAD, fontWeight:700 }}>
                          {rDiff>0?"+":""}{rDiff}
                        </span>
                      )}
                      <span style={{ fontSize:14, fontWeight:700, fontFamily:FONT_HEAD,
                        color: regionalCpt ? C.green : C.textSec }}>
                        {regionalCpt ? toDisplay(regionalCpt) : "—"}
                      </span>
                    </div>
                  </div>
                  <div style={{ background:"#E5E7EB", borderRadius:4, height:5, overflow:"hidden" }}>
                    <div style={{ background:CROP_COLOR[crop], width:`${barPct}%`, height:"100%",
                      borderRadius:4, transition:"width 0.5s" }} />
                  </div>
                </div>
              );
            })}

            <div style={{
              background:C.greenLight, border:`1px solid ${C.greenMid}30`,
              borderRadius:6, padding:"6px 8px", marginTop:8,
            }}>
              <div style={{ fontSize:10, color:C.green, fontWeight:700, fontFamily:FONT_HEAD, marginBottom:2 }}>
                ● {lang==="en" ? "LIVE freight" : "ЖИВИЙ фрахт"} · ⚡ {lang==="en" ? "Static basis" : "Статичний базис"}
              </div>
              <div style={{ fontSize:10.5, color:C.textSec, fontFamily:FONT_BODY, lineHeight:1.4 }}>
                {t.region_note}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ background:C.beige, padding:"7px 12px 9px", borderTop:`1px solid ${C.greenMid}20` }}>
        <div style={{ fontSize:10.5, color:C.textSec, fontFamily:FONT_BODY, lineHeight:1.4, marginBottom:5 }}>
          ⚡ {t.disclaimer}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", gap:10 }}>
            <a href="https://blackseagrain.io" target="_blank" rel="noopener noreferrer"
              style={{ fontSize:11, color:C.green, textDecoration:"none", fontFamily:FONT_HEAD, fontWeight:700 }}>
              BlackSeaGrain.io ↗
            </a>
            <button onClick={() => fetchLive(true)} style={{
              background:"none", border:"none", cursor:"pointer",
              fontSize:11, color:C.greenMid, fontFamily:FONT_BODY, padding:0,
            }}>
              {refreshing ? "⟳ …" : "⟳ Refresh"}
            </button>
          </div>
          <span style={{ fontSize:10, color:C.textSec, fontFamily:FONT_BODY, opacity:0.7 }}>
            {meta?.bsgTotal} price points
          </span>
        </div>
      </div>
    </div>
  );
}
