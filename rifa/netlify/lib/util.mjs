import { getStore } from "@netlify/blobs";

export const store = () => getStore({ name: "rifa", consistency: "strong" });

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export function isAdmin(req) {
  const key = req.headers.get("x-admin-key") || "";
  const pass = process.env.ADMIN_PASSWORD || "";
  return pass.length >= 6 && key === pass;
}

export const esNumero = (n) => typeof n === "string" && /^\d{3}$/.test(n);
export const soloDigitos = (s) => String(s || "").replace(/\D/g, "").slice(-10);

export async function numerosVendidos(s) {
  const { blobs } = await s.list({ prefix: "num:" });
  return blobs.map((b) => b.key.slice(4));
}

export const DEFAULT_CONFIG = {
  estado: "abierta", // abierta | cerrada
  premio: "$2,000 EN EFECTIVO",
  precio: 10,
  titulo: "¡Participa en nuestro sorteo!",
  subtitulo: "Elige tus números de la suerte y aparta tus boletos en segundos",
  fechaSorteo: "",
  metodoSorteo: "Se define con los 3 dígitos de la Lotería Nacional (o el método anunciado en la fecha del sorteo).",
  whatsapp: "529213073574",
  facebook: "https://www.facebook.com/RifasEntreAmigosCoatza",
  banco: "",
  titular: "",
  clabe: "",
  oxxo: "",
  notaPago: "Una vez apartados tus números, te enviamos las cuentas por WhatsApp. Envía tu comprobante para confirmar tu boleto.",
  faq:
    "¿Cómo participo? | Elige tus números (o usa la Maquinita), llena tus datos y pulsa “Apartar ahora”. Te llevará a WhatsApp para recibir los datos de pago.\n" +
    "¿Cuánto cuesta un boleto? | Cada boleto cuesta lo indicado en la página e incluye 4 números.\n" +
    "¿Cuánto tiempo tengo para pagar? | Tus números quedan apartados; envía tu comprobante lo antes posible. Si no se confirma el pago, podrán liberarse.\n" +
    "¿Cómo sé que mis boletos están registrados? | Usa la pestaña “Consultar mis boletos” con tu número de WhatsApp.\n" +
    "¿Cómo cobro si gano? | Te contactamos por WhatsApp y entregamos el premio en efectivo o por transferencia.",
  logoV: "",
  bannerV: "",
};

export async function leerConfig(s) {
  const c = await s.get("config", { type: "json" });
  return { ...DEFAULT_CONFIG, ...(c || {}) };
}

export const configPublica = (c) => c; // nada de la configuración es secreto

// Aparta números de forma atómica (dos personas no pueden quedarse el mismo número)
export async function crearReserva(s, { nombre, telefono, estado, numeros, pagado = false }, precio) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6).toUpperCase();
  const tomados = [], ocupados = [];
  for (const n of numeros) {
    const r = await s.setJSON("num:" + n, { id }, { onlyIfNew: true });
    if (r && r.modified === false) ocupados.push(n); else tomados.push(n);
  }
  if (ocupados.length) {
    await Promise.all(tomados.map((n) => s.delete("num:" + n)));
    return { ok: false, ocupados };
  }
  const total = (numeros.length / 4) * precio;
  await s.setJSON("res:" + id, {
    id, nombre, telefono, estado, numeros: [...numeros].sort(), total,
    pagado, creado: new Date().toISOString(),
  });
  return { ok: true, id, total };
}
