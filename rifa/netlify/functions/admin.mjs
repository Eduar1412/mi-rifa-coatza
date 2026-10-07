import {
  store, json, isAdmin, leerConfig, DEFAULT_CONFIG, esNumero, soloDigitos, crearReserva,
} from "../lib/util.mjs";

export const config = { path: "/api/admin" };

const NUM_KEYS = ["precio"];

export default async (req) => {
  if (!isAdmin(req)) return json({ error: "Contraseña incorrecta" }, 401);
  const s = store();
  let b = {};
  if (req.method === "POST") { try { b = await req.json(); } catch {} }
  const action = b.action || "list";

  if (action === "list") {
    const { blobs } = await s.list({ prefix: "res:" });
    const reservas = (await Promise.all(blobs.map((x) => s.get(x.key, { type: "json" })))).filter(Boolean)
      .sort((a, c) => c.creado.localeCompare(a.creado));
    return json({ reservas, config: await leerConfig(s) });
  }

  if (action === "pagar") {
    const r = await s.get("res:" + b.id, { type: "json" });
    if (!r) return json({ error: "No existe" }, 404);
    r.pagado = !!b.pagado;
    await s.setJSON("res:" + b.id, r);
    return json({ ok: true });
  }

  if (action === "liberar") {
    const r = await s.get("res:" + b.id, { type: "json" });
    if (!r) return json({ error: "No existe" }, 404);
    await Promise.all(r.numeros.map((n) => s.delete("num:" + n)));
    await s.delete("res:" + b.id);
    return json({ ok: true });
  }

  if (action === "manual") {
    const nombre = String(b.nombre || "").trim().slice(0, 80);
    const telefono = soloDigitos(b.telefono);
    const numeros = [...new Set((Array.isArray(b.numeros) ? b.numeros : []).map(String))];
    if (nombre.length < 2) return json({ error: "Falta el nombre." }, 400);
    if (telefono.length !== 10) return json({ error: "El WhatsApp debe tener 10 dígitos." }, 400);
    if (!numeros.length || numeros.length % 4 || !numeros.every(esNumero))
      return json({ error: "Los números deben ser de 3 dígitos (ej. 045) y en múltiplos de 4." }, 400);
    const cfg = await leerConfig(s);
    const r = await crearReserva(s, { nombre, telefono, estado: String(b.estado || "").slice(0, 60), numeros, pagado: !!b.pagado }, Number(cfg.precio) || 10);
    if (!r.ok) return json({ error: "Ya ocupados: " + r.ocupados.join(", ") }, 409);
    return json({ ok: true, id: r.id });
  }

  if (action === "config") {
    const cur = await leerConfig(s);
    const nueva = {};
    for (const k of Object.keys(DEFAULT_CONFIG)) {
      if (k === "logoV" || k === "bannerV") continue;
      if (b.config && k in b.config) {
        nueva[k] = NUM_KEYS.includes(k) ? Math.max(1, Number(b.config[k]) || 10) : String(b.config[k]).slice(0, 2000);
      }
    }
    if (nueva.estado && !["abierta", "cerrada"].includes(nueva.estado)) nueva.estado = "abierta";
    await s.setJSON("config", { ...cur, ...nueva });
    return json({ ok: true });
  }

  if (action === "imagen") {
    const nombre = b.nombre === "logo" ? "logo" : b.nombre === "banner" ? "banner" : null;
    if (!nombre) return json({ error: "Imagen inválida" }, 400);
    const cfg = await leerConfig(s);
    const key = nombre + "V";
    if (b.quitar) {
      await s.delete("img:" + nombre);
      await s.setJSON("config", { ...cfg, [key]: "" });
      return json({ ok: true });
    }
    const m = /^data:(image\/(?:webp|jpeg|png));base64,(.+)$/.exec(String(b.data || ""));
    if (!m) return json({ error: "Formato de imagen inválido" }, 400);
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 3_000_000) return json({ error: "La imagen es muy pesada" }, 413);
    await s.set("img:" + nombre, buf, { metadata: { contentType: m[1] } });
    await s.setJSON("config", { ...cfg, [key]: String(Date.now()) });
    return json({ ok: true });
  }

  if (action === "reiniciar") {
    if (b.confirmar !== "BORRAR") return json({ error: "Escribe BORRAR para confirmar" }, 400);
    for (const prefix of ["num:", "res:"]) {
      const { blobs } = await s.list({ prefix });
      await Promise.all(blobs.map((x) => s.delete(x.key)));
    }
    return json({ ok: true });
  }

  return json({ error: "Acción desconocida" }, 400);
};
