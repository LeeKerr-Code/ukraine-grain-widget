// api/update-prices.js
// Vercel serverless function — password-protected price update endpoint
// POST /api/update-prices  { password, data: { prices, marketNotes, sentiment, _meta } }

import { put } from "@vercel/blob";

const ADMIN_PASSWORD = process.env.GRAIN_ADMIN_PASSWORD;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { password, data } = req.body;

  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: "GRAIN_ADMIN_PASSWORD env variable not set on Vercel." });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  if (!data || !data.prices) {
    return res.status(400).json({ error: "Missing data.prices in request body." });
  }

  // Stamp the update time
  const payload = {
    ...data,
    _meta: {
      ...data._meta,
      lastUpdated: new Date().toISOString().split("T")[0],
      updatedBy: "admin",
    },
  };

  try {
    // Write to Vercel Blob storage (publicly readable JSON)
    const blob = await put("grain-prices.json", JSON.stringify(payload, null, 2), {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });

    return res.status(200).json({ success: true, url: blob.url });
  } catch (err) {
    console.error("Blob write error:", err);
    return res.status(500).json({ error: "Failed to save data.", detail: err.message });
  }
}
