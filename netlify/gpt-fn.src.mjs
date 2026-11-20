// SOURCE of netlify/functions/gpt.mjs — do not deploy this file directly.
// Netlify's build does not install dependencies for a functions-folder
// package.json on this site (v55 shipped a function that died at runtime
// with "Cannot find package '@netlify/blobs'"), so the function is
// pre-bundled with esbuild and the bundle is committed:
//     bash netlify/build-gpt.sh
// All logic is in ./gpt-core.mjs (tested by tracker/tests/gpt-core.mjs).
import { getStore } from "@netlify/blobs";
import { handle } from "./gpt-core.mjs";

function brokenStore(err){
  const boom = async () => { throw new Error("Netlify Blobs unavailable: " + (err && err.message || err)); };
  return { get: boom, setJSON: boom, list: boom, delete: boom };
}

export default async (req, context) => {
  const env = { GPT_API_TOKEN: process.env.GPT_API_TOKEN || "" };
  // Site-wide store on purpose: the deploy preview IS her app, so the
  // preview and production must see the same data.
  let store;
  try{ store = getStore({ name: "bermo-tracker", consistency: "strong" }); }
  catch(e){ store = brokenStore(e); }
  try{
    return await handle(req, store, env);
  }catch(e){
    return new Response(JSON.stringify({ error: "Server error: " + (e && e.message || e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
};

export const config = { path: "/api/gpt/*" };
