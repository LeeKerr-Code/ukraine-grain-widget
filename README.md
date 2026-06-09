# Ukraine Grain Price Widget v2.0 — Live Data

Bilingual (EN/UK) grain price widget powered by **BlackSeaGrain.io** live API.
Displays real FOB/CPT/EXW prices for Wheat, Corn, Sunflower, Rapeseed, Soy
across 12 Ukrainian regions. Prices refresh automatically every 30 minutes.

---

## Data source

**BlackSeaGrain.io** — real-time Ukraine grain & fertilizer prices, updated
every 30 minutes from verified institutional sources.

- Free tier: use API key `demo` (no registration needed)
- Paid tier: register at blackseagrain.io for a production key with higher limits

---

## Project structure

```
grain-widget/
├── api/
│   ├── grain-prices.js     ← Vercel proxy to BlackSeaGrain.io (keeps API key server-side)
│   └── update-prices.js    ← (legacy manual update route, no longer primary)
├── src/
│   └── GrainPriceWidget.jsx ← The live widget
├── index.html
├── vercel.json
└── package.json
```

---

## Deploy

```bash
npm install
vercel --prod
```

### Environment variables (Vercel dashboard → Settings → Environment Variables)

| Variable        | Value             | Required |
|-----------------|-------------------|----------|
| `BSG_API_KEY`   | `demo` (free) or your BlackSeaGrain.io key | Yes |

That's it. No other env vars needed for basic operation.

---

## Upgrade to paid API key

1. Register at https://blackseagrain.io
2. Get your API key from your account dashboard
3. Set `BSG_API_KEY=your_key` in Vercel environment variables
4. Redeploy — no code changes needed

---

## How the live data works

1. Widget loads → calls `/api/grain-prices` (your Vercel function)
2. Vercel function calls `https://blackseagrain.io/api/prices` and `/api/freight`
   with your API key (kept server-side, never exposed to browser)
3. Function normalises the data → returns CPT/Port/EXW per crop
4. Widget displays prices with live timestamp and auto-refreshes every 30 min
5. Regional tab: uses live freight rates by oblast where available,
   falls back to static logistics basis for regions not in BSG data

---

## What the widget shows

**Prices tab:** CPT Central, Port FOB, EXW Inland for selected crop × region.
Week change badge (from BSG % change field). Live freight cost for selected region.

**Market tab:** Sentiment per crop (derived from week change direction).
All-crops FOB price summary table — click any row to switch crop.

**Regional tab:** All 12 regions with CPT price adjusted for freight.
Regions with live BSG freight data show a ● LIVE badge.
Others show ⚡ (static logistics basis).

---

## WordPress embed

```php
function grain_widget_shortcode($atts) {
    $atts = shortcode_atts(['src' => 'https://your-project.vercel.app'], $atts);
    return '<iframe src="' . esc_url($atts['src']) . '" width="300" height="540"
            style="border:none;border-radius:12px;" loading="lazy"></iframe>';
}
add_shortcode('grain_widget', 'grain_widget_shortcode');
```

Usage: `[grain_widget src="https://your-project.vercel.app"]`
