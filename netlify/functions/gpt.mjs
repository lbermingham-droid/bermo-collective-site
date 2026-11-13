// /api/gpt/* — the ChatGPT API for the tracker. Thin shell: Netlify Blobs
// for storage, the token from env, all logic in ../gpt-core.mjs (tested in
// Node with a fake store: tracker/tests/gpt-core.mjs).
import { getStore } from "@netlify/blobs";
import { handle } from "../gpt-core.mjs";

export default async (req, context) => {
  const env = { GPT_API_TOKEN: process.env.GPT_API_TOKEN || "" };
  try{
    // Site-wide store on purpose: the deploy preview IS her app, so the
    // preview and production must see the same data.
    const store = getStore({ name: "bermo-tracker", consistency: "strong" });
    return await handle(req, store, env);
  }catch(e){
    return new Response(JSON.stringify({ error: "Server error: " + (e && e.message || e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
};

export const config = { path: "/api/gpt/*" };
