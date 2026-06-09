// api/grain-prices.js
// Vercel serverless proxy — fetches BlackSeaGrain.io and returns
// normalised price data. Keeps API key server-side only.
// GET /api/grain-prices

const BSG_BASE  = "https://blackseagrain.io/api";
const BSG_KEY   = process.env.BSG_API_KEY || "demo"; // set in Vercel env vars when upgrading

// Map BSG crop names → our internal keys
const CROP_MAP = {
  "Wheat":          "wheat",
  "Wheat Cl.2":     "wheat",
  "Wheat Cl.3":     "wheat",
  "Corn":           "corn",
  "Sunflower":      "sunflower",
  "Rapeseed":       "rapeseed",
  "Soy":            "soy",
  "Soy non-GMO":    "soy",
};

// Port locations we treat as the reference port price
const PORT_LOCS  = ["Odesa","Yuzhne","Chornomorsk","Mykolaiv","Izmail"];
// Inland/factory we treat as EXW proxy
const INLAND_LOCS = ["Dnipro","Kyiv","Kirovohrad","Poltava","Vinnytsia",
                     "Kharkiv","Cherkasy","Bruklin","Nova Odesa",
                     "Starokostiantyniv","Myronivka","Berezhanka"];

async function fetchBSG(endpoint, params = {}) {
  const url = new URL(`${BSG_BASE}/${endpoint}`);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": BSG_KEY },
  });
  if (!res.ok) throw new Error(`BSG ${endpoint} HTTP ${res.status}`);
  return res.json();
}

// Pick best USD price from a list of price objects for a given type
function bestUsdPrice(items, side = null) {
  const candidates = items
    .filter(p => p.usd && p.usd !== "—")
    .filter(p => !side || p.side === side)
    .map(p => ({
      val: parseFloat(p.usd.replace(/[^0-9.]/g, "")),
      date: p.date,
      chg: p.chg || null,
    }))
    .filter(p => !isNaN(p.val) && p.val > 50);

  if (!candidates.length) return null;
  // Prefer most recent
  candidates.sort((a, b) => new Date(b.date) - new Date(a.date));
  return candidates[0];
}

// Pick best UAH price and convert to USD
function bestUahToUsd(items, rate, side = null) {
  const candidates = items
    .filter(p => p.uah && p.uah !== "—" && p.uah !== "0")
    .filter(p => !side || p.side === side)
    .map(p => ({
      val: Math.round(parseFloat(p.uah.replace(/[^0-9.]/g, "")) / rate),
      date: p.date,
      chg: p.chg || null,
    }))
    .filter(p => !isNaN(p.val) && p.val > 50);

  if (!candidates.length) return null;
  candidates.sort((a, b) => new Date(b.date) - new Date(a.date));
  return candidates[0];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=1800"); // cache 30 min

  try {
    const [pricesData, freightData] = await Promise.all([
      fetchBSG("prices"),
      fetchBSG("freight"),
    ]);

    // NBU approximate rate — used only when USD price not available
    const UAH_USD = 41.5;

    // Group prices by our crop key
    const grouped = {};
    for (const cropKey of ["wheat","corn","sunflower","rapeseed","soy"]) {
      grouped[cropKey] = { port:[], inland:[], factory:[] };
    }

    for (const p of pricesData.prices) {
      const key = CROP_MAP[p.crop];
      if (!key) continue;
      if (PORT_LOCS.includes(p.loc) || p.type === "PORT") {
        grouped[key].port.push(p);
      } else if (p.type === "FACTORY") {
        grouped[key].factory.push(p);
      } else {
        grouped[key].inland.push(p);
      }
    }

    // Build normalised prices for each crop
    const prices = {};
    const sentimentMap = {};
    let latestDate = "2026-01-01";

    for (const [cropKey, g] of Object.entries(grouped)) {
      // Port price (FOB/CPT equivalent)
      const portUsd = bestUsdPrice(g.port) ||
                      bestUahToUsd(g.port, UAH_USD);

      // EXW — factory preferred, then inland
      const exwUsd  = bestUsdPrice([...g.factory, ...g.inland]) ||
                      bestUahToUsd([...g.factory, ...g.inland], UAH_USD);

      // CPT central = port minus ~12 (typical port-to-central spread)
      const portVal = portUsd?.val || null;
      const cptVal  = portVal ? Math.round(portVal * 0.95) : null;
      const exwVal  = exwUsd?.val || null;

      // Week change from BSG chg field (% → USD approx)
      const chgPct  = portUsd?.chg || 0;
      const weekChg = portVal && chgPct
        ? Math.round((portVal * chgPct) / 100)
        : 0;

      prices[cropKey] = {
        cpt_usd:     cptVal,
        port_usd:    portVal,
        exw_usd:     exwVal,
        week_chg:    weekChg,
        month_chg:   null,   // BSG doesn't supply monthly change
        year_chg:    null,   // BSG doesn't supply yearly change
        source_note: `BlackSeaGrain.io · ${pricesData.date || new Date().toISOString().split("T")[0]}`,
        last_updated: portUsd?.date || pricesData.date,
      };

      // Track latest data date
      if (prices[cropKey].last_updated > latestDate) {
        latestDate = prices[cropKey].last_updated;
      }

      // Simple sentiment from week change
      sentimentMap[cropKey] = weekChg > 2 ? "bull" : weekChg < -2 ? "bear" : "neutral";
    }

    // Freight by oblast — returns avg_rate UAH/t for each region
    const freightByOblast = {};
    for (const f of (freightData.oblast_summary || [])) {
      freightByOblast[f.oblast] = {
        avg_uah: f.avg_rate,
        avg_usd: Math.round(f.avg_rate / UAH_USD),
        samples: f.samples,
      };
    }

    return res.status(200).json({
      _meta: {
        lastUpdated:  latestDate,
        source:       "BlackSeaGrain.io (live)",
        uahUsdRate:   UAH_USD,
        fetchedAt:    new Date().toISOString(),
        bsgTotal:     pricesData.total,
        bsgCommodities: pricesData.commodities,
      },
      prices,
      sentiment:   sentimentMap,
      freightByOblast,
      marketNotes: {
        wheat:     { en: "Live FOB/CPT data from BlackSeaGrain.io", uk: "Живі дані FOB/CPT від BlackSeaGrain.io" },
        corn:      { en: "Live FOB/CPT data from BlackSeaGrain.io", uk: "Живі дані FOB/CPT від BlackSeaGrain.io" },
        sunflower: { en: "Live FOB/CPT data from BlackSeaGrain.io", uk: "Живі дані FOB/CPT від BlackSeaGrain.io" },
        rapeseed:  { en: "Live FOB/CPT data from BlackSeaGrain.io", uk: "Живі дані FOB/CPT від BlackSeaGrain.io" },
        soy:       { en: "Live FOB/CPT data from BlackSeaGrain.io", uk: "Живі дані FOB/CPT від BlackSeaGrain.io" },
      },
    });

  } catch (err) {
    console.error("grain-prices proxy error:", err);
    return res.status(502).json({
      error: "Failed to fetch from BlackSeaGrain.io",
      detail: err.message,
    });
  }
}
