import { store, json, soloDigitos } from "../lib/util.mjs";

export const config = { path: "/api/consultar" };

export default async (req) => {
  const tel = soloDigitos(new URL(req.url).searchParams.get("telefono"));
  if (tel.length !== 10) return json({ error: "Teléfono inválido" }, 400);
  const s = store();
  const { blobs } = await s.list({ prefix: "res:" });
  const recs = (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })))).filter((r) => r && r.telefono === tel);
  const boletos = recs.flatMap((r) => r.numeros).sort();
  const pagados = recs.filter((r) => r.pagado).flatMap((r) => r.numeros).sort();
  return json({ boletos, pagados });
};
