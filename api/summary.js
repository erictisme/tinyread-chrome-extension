// Vercel serverless handler
import crypto from "crypto";
import { RateLimiterMemory } from "rate-limiter-flexible";
import * as db from "../database.js";
import * as gemini from "../gemini.js";

const limiter = new RateLimiterMemory({ points: 10, duration: 60 });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");
  
  try {
    await limiter.consume(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anon");
  } catch {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  const { url, content } = req.body || {};
  if (!url || !content) return res.status(400).json({ error: "Missing url or content" });

  const urlHash = crypto.createHash("md5").update(url).digest("hex").slice(0, 16);

  // get or create
  let isNew = false;
  let summary = await db.getSummary(urlHash);
  if (!summary) {
    const summaries = await gemini.generateSummaries(content);
    try {
      await db.createSummary({
        urlHash, url,
        title: summaries.title || url,
        shortSummary: summaries.short,
        mediumSummary: summaries.medium,
        detailedSummary: summaries.detailed
      });
      isNew = true;
    } catch (e) {
      if (!String(e.code).includes("SQLITE_CONSTRAINT")) throw e;
    }
    summary = await db.getSummary(urlHash);
  }

  // increment views separately
  const stats = await db.incrementAndGetViews(urlHash);

  // Build a PUBLIC share URL from the incoming request, never hardcode
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const base = `${proto}://${host}`;
  const share_url = `${base}/s/${urlHash}`;

  return res.json({
    summary: {
      short: summary.shortSummary,
      medium: summary.mediumSummary,
      detailed: summary.detailedSummary
    },
    reuse_count: stats.view_count,
    is_cached: !isNew,
    share_url,
    environmental_impact: { co2_saved_grams: !isNew ? 2.5 : 0, equivalent_searches: Math.floor(stats.view_count / 10) }
  });
}