// /api/gpt/* — the ChatGPT API for the tracker. Thin shell: Netlify Blobs
// for storage, the token from env, all logic in ../gpt-core.mjs (tested in
// Node with a fake store). Runs as an Edge Function so @netlify/blobs is
// available without a package.json at the site root.
import { getStore } from "@netlify/blobs";
import { handle } from "../gpt-core.mjs";

export default async (req, context) => {
  const store = getStore({ name: "bermo-tracker", consistency: "strong" });
  const env = { GPT_API_TOKEN: Netlify.env.get("GPT_API_TOKEN") || "" };
  try{
    return await handle(req, store, env);
  }catch(e){
    return new Response(JSON.stringify({ error: "Server error: " + (e && e.message || e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
};

export const config = { path: "/api/gpt/*" };
