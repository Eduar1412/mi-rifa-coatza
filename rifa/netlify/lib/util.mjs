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
  premio: "$1,000 EN EFECTIVO",
  precio: 12,
  minimo: 100,
  horasPago: 24,
  titulo: "¡Gana $1,000 en efectivo con solo $12!",
  subtitulo: "Cada boleto trae 4 números. El ganador lo decide la Lotería Nacional: nadie puede hacer trampa.",
  fechaSorteo: "",
  sorteoNombre: "",
  // Opcional: premio que crece. Una línea por escalón → boletos vendidos | premio. Vacío = premio fijo.
  escalones: "",
  metodoSorteo:
    "Gana quien tenga los ÚLTIMOS 3 DÍGITOS del premio mayor de la Lotería Nacional del día del sorteo. Lo transmitimos EN VIVO por Facebook.\n" +
    "Si ese número no se vendió, gana el número vendido más cercano hacia arriba (por ejemplo, si sale el 347 y nadie lo tiene, se revisa el 348, el 349… y gana el primero que esté vendido; después del 999 sigue el 000). Siempre hay ganador ese mismo día.\n" +
    "El sorteo se realiza al venderse al menos 100 boletos. Si a la fecha no se llega, se pospone una sola vez una semana; si aun así no se llega, se devuelve el dinero a todos.",
  organizador: "",
  mensajeOrganizador: "Soy de Coatza y organizo estas rifas entre amigos. Todo es transparente: el ganador lo decide la Lotería Nacional y la entrega del premio se publica en video. Cualquier duda, escríbeme directo.",
  ganadores: "",
  whatsapp: "529213073574",
  facebook: "https://www.facebook.com/SorteosEntreAmigosCoatza",
  banco: "",
  titular: "",
  clabe: "",
  oxxo: "",
  notaPago: "Al apartar tienes 24 horas para pagar; si no, tus números se liberan. Envía tu comprobante por WhatsApp y te confirmamos tu boleto.",
  faq:
    "¿Cómo participo? | Elige tus números (o usa la Maquinita), llena tus datos y pulsa “Apartar ahora”. Te llevará a WhatsApp para recibir los datos de pago.\n" +
    "¿Cuánto cuesta un boleto? | $12 y trae 4 números: tienes 4 oportunidades de ganar.\n" +
    "¿Quién decide al ganador? | La Lotería Nacional. Gana quien tenga los últimos 3 dígitos de su premio mayor. Nadie puede manipular el resultado y tú mismo puedes revisarlo en lotenal.gob.mx.\n" +
    "¿Y si sale un número que nadie compró? | Gana el número vendido más cercano hacia arriba. Ejemplo: si sale el 347 y no se vendió, se revisa el 348, el 349… y gana el primero que tenga dueño. Siempre hay ganador ese mismo día.\n" +
    "¿Y si no se venden suficientes boletos? | El sorteo se hace al venderse al menos 100 boletos. Si a la fecha no se llega, se pospone una semana; si aun así no se llega, te devolvemos tu dinero completo.\n" +
    "¿Cuánto tiempo tengo para pagar? | 24 horas después de apartar. Si no se confirma el pago, los números se liberan.\n" +
    "¿Cómo sé que mis boletos están registrados? | Usa la pestaña “Consultar mis boletos” con tu número de WhatsApp.\n" +
    "¿Cómo cobro si gano? | Te contactamos por WhatsApp y entregamos el premio en efectivo en Coatza o por transferencia. La entrega se publica en Facebook.",
  logoV: "",
  bannerV: "",
  organizadorV: "",
  ganadorV: "",
};

export const IMAGENES = ["logo", "banner", "organizador", "ganador"];

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
