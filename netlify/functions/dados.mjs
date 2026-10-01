// Ficha · Lanchonete da Dione — guarda os lançamentos no Netlify Blobs
import { getStore } from "@netlify/blobs";
import { createHash, randomUUID } from "node:crypto";

const hash = (s) => createHash("sha256").update("ficha-dione:" + s).digest("hex");
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const canon = (d) =>
  JSON.stringify(
    ["products", "clients", "entries"]
      .map((k) => (d[k] || []).slice().sort((a, b) => (a.id < b.id ? -1 : 1)))
      .concat([Object.keys(d.deleted || {}).sort()])
  );

// junta dois bancos: o registro mais recente (u) vence; exclusões valem para todos
function merge(a, b) {
  const del = { ...(a.deleted || {}), ...(b.deleted || {}) };
  const m = (x, y) => {
    const map = new Map();
    [...(x || []), ...(y || [])].forEach((r) => {
      if (!r || !r.id) return;
      const o = map.get(r.id);
      if (!o || (r.u || 0) > (o.u || 0)) map.set(r.id, r);
    });
    return [...map.values()].filter((r) => !del[r.id]);
  };
  const out = {
    products: m(a.products, b.products),
    clients: m(a.clients, b.clients),
    entries: m(a.entries, b.entries),
    deleted: del,
    updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0),
  };
  const seen = {};
  out.clients.sort((x, y) => (x.id < y.id ? -1 : 1)).forEach((c) => {
    const k = norm(c.name);
    if (!seen[k]) return (seen[k] = c);
    out.entries.forEach((e) => { if (e.clientId === c.id) { e.clientId = seen[k].id; e.u = Date.now(); } });
    del[c.id] = Date.now();
  });
  const sp = {};
  out.products.forEach((p) => {
    const k = norm(p.name);
    if (!sp[k] || (p.u || 0) > (sp[k].u || 0)) { if (sp[k]) del[sp[k].id] = Date.now(); sp[k] = p; }
    else del[p.id] = Date.now();
  });
  out.clients = out.clients.filter((c) => !del[c.id]);
  out.products = out.products.filter((p) => !del[p.id]);
  return out;
}

export default async (req) => {
  const store = getStore({ name: "ficha", consistency: "strong" });
  const url = new URL(req.url);
  const meta = (await store.get("meta", { type: "json" })) || {};
  const envPin = (globalThis.Netlify?.env?.get?.("FICHA_PIN")) || process.env.FICHA_PIN || "";

  if (url.searchParams.has("status")) return json({ ok: true, hasPin: !!(envPin || meta.pinHash) });

  const pin = req.headers.get("x-pin") || "";
  if (!/^\d{4,8}$/.test(pin)) return json({ error: "pin" }, 401);
  if (envPin) { if (pin !== envPin) return json({ error: "pin" }, 401); }
  else if (meta.pinHash) { if (hash(pin) !== meta.pinHash) return json({ error: "pin" }, 401); }
  else { meta.pinHash = hash(pin); await store.setJSON("meta", meta); } // primeiro acesso cria o PIN

  if (req.method === "GET") {
    if (url.searchParams.has("rev")) return json({ rev: meta.rev || null });
    return json({ rev: meta.rev || null, data: (await store.get("db", { type: "json" })) || null });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "json" }, 400); }
    const incoming = body && body.data;
    if (!incoming || !Array.isArray(incoming.entries)) return json({ error: "dados" }, 400);
    const cur = await store.get("db", { type: "json" });
    const merged = cur ? merge(cur, incoming) : merge(incoming, {});
    if (!cur || canon(merged) !== canon(cur)) {
      meta.rev = randomUUID();
      await store.setJSON("db", merged);
      await store.setJSON("meta", meta);
      // cópia automática do dia (guarda um retrato por dia)
      await store.setJSON("copia-" + new Date().toISOString().slice(0, 10), merged);
    }
    return json({ rev: meta.rev || null, data: merged });
  }
  return json({ error: "método" }, 405);
};

export const config = { path: "/api/dados" };
