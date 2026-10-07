import { store, json, esNumero, soloDigitos, leerConfig, crearReserva } from "../lib/util.mjs";

export const config = { path: "/api/reservar" };

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido" }, 405);
  let b;
  try { b = await req.json(); } catch { return json({ ok: false, error: "Datos inválidos" }, 400); }

  const nombre = String(b.nombre || "").trim().slice(0, 80);
  const telefono = soloDigitos(b.telefono);
  const estado = String(b.estado || "").trim().slice(0, 60);
  const numeros = [...new Set(Array.isArray(b.numeros) ? b.numeros : [])];

  if (nombre.length < 3) return json({ ok: false, error: "Escribe tu nombre completo." }, 400);
  if (telefono.length !== 10) return json({ ok: false, error: "WhatsApp de 10 dígitos." }, 400);
  if (!numeros.length || numeros.length % 4 || numeros.length > 200 || !numeros.every(esNumero))
    return json({ ok: false, error: "Selección de números inválida." }, 400);

  const s = store();
  const cfg = await leerConfig(s);
  if (cfg.estado !== "abierta") return json({ ok: false, error: "La rifa está cerrada por el momento." }, 403);

  const r = await crearReserva(s, { nombre, telefono, estado, numeros }, Number(cfg.precio) || 10);
  if (!r.ok) return json({ ok: false, error: "Algunos números ya se ocuparon.", ocupados: r.ocupados }, 409);
  return json({ ok: true, id: r.id, total: r.total });
};
