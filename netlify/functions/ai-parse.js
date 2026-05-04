// Netlify Function: AI brain-dump parser for /tracker/.
// Project owner sets ANTHROPIC_API_KEY in Netlify env; users don't need keys.
// Accepts text + optional base64 images, returns structured JSON for the
// tracker app to apply to today's log.

const SYSTEM_PROMPT = `You are an athletic + nutrition assistant inside a personal tracker app.
The user describes their day in natural language and may attach photos (food plates, Apple Watch rings, gym whiteboards).
Extract every loggable item.

Return ONLY a JSON object that matches this schema. No prose, no markdown fences, no commentary.

{
  "meals": {
    "breakfast": [{"name": string, "serving": string, "cal": int, "p": number, "c": number, "f": number}],
    "lunch":     [...same shape...],
    "dinner":    [...same shape...],
    "snacks":    [...same shape...]
  },
  "sessions": [
    {
      "name": string,             // "Leg day", "CrossFit class", "30 min run"
      "type": "wod" | "lift" | "cardio",
      "duration_min": int,
      "lifts": [
        {
          "exercise": string,     // "Back Squat", "Leg Press", canonical names
          "sets": [{"weight": number, "reps": int}]   // weight in user's unit (assume lb unless told otherwise)
        }
      ]
    }
  ],
  "activity": { "move": int, "exercise": int, "stand": int },   // kcal, minutes, hours
  "water_oz": number,
  "weight_lb": number | null,
  "notes": string
}

Rules:
- Skip any field with no info — empty arrays / 0 / null are fine. NEVER fabricate.
- Estimate realistic calories + macros for foods based on stated portions; round cal to int, macros to 0.1 g.
- Parse "weight x reps" pairs precisely. "45 lb x 10" → {"weight": 45, "reps": 10}.
- "Same as <exercise> for reps/sets/weight, but last set was X" → copy the prior exercise's sets, then replace the last set's weight with X (or whatever was modified).
- A "CrossFit class" with no detail → one session, type:"wod", duration_min: 60 (typical class), no lifts.
- A "<N> min run / cardio / class" → session with type:"cardio", that duration, no lifts.
- For a lifting session like "lifted for 50 min for leg day" → type:"lift", duration_min: 50, name:"Leg day".
- If a photo shows Apple Watch / Health rings: extract Move (kcal), Exercise (min), Stand (hr) into "activity".
- If a photo shows food: identify items, assign to the meal slot the user mentioned (or "snacks" if unclear).
- Confidence-low items: still include them, but mention in "notes".
- Lift names: use canonical capitalized form ("Back Squat", "Leg Press", "Bench Press", "Deadlift").
- Weights default to LB unless user says kg.`;

const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: "Method not allowed" };
  }

  // Accept the canonical name OR a couple of friendly aliases the site
  // owner may have used in Netlify env (some accounts reject certain names).
  const key = process.env.ANTHROPIC_API_KEY
           || process.env.BERMOFIT
           || process.env.BERMO_AI_KEY
           || process.env.CLAUDE_API_KEY;
  if (!key) {
    return {
      statusCode: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "AI is not configured for this site. Ask Lexi to set ANTHROPIC_API_KEY (or BERMOFIT) in Netlify env." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: "Invalid JSON body" };
  }

  const text = (body.text || "").toString();
  const images = Array.isArray(body.images) ? body.images.slice(0, 4) : []; // cap at 4 images
  if (!text.trim() && images.length === 0) {
    return { statusCode: 400, headers: corsHeaders, body: "Provide text or at least one image" };
  }

  // Build Anthropic content array: images first, then the user's text.
  const userContent = [];
  for (const img of images) {
    if (typeof img === "string" && img.length > 0 && img.length < 5_000_000) {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: img },
      });
    }
  }
  if (text.trim()) {
    userContent.push({ type: "text", text: text.trim() });
  }

  let res, data;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    data = await res.json();
  } catch (e) {
    return {
      statusCode: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to reach Anthropic: " + e.message }),
    };
  }

  if (!res.ok || data.error) {
    return {
      statusCode: res.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: (data.error && data.error.message) || "AI request failed" }),
    };
  }

  const rawText = (data.content && data.content[0] && data.content[0].text) || "";
  // Strip markdown fences if Claude added them despite the instruction.
  const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch (e2) {
        return {
          statusCode: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "AI returned non-JSON", raw: rawText.slice(0, 400) }),
        };
      }
    } else {
      return {
        statusCode: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "AI returned non-JSON", raw: rawText.slice(0, 400) }),
      };
    }
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, parsed }),
  };
};
