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
  precio: 12,
  horasPago: 24,
  titulo: "¡Gana $2,000 en efectivo con solo $12!",
  subtitulo: "Cada boleto trae 4 números. El ganador lo decide la Lotería Nacional: nadie puede hacer trampa.",
  fechaSorteo: "",
  sorteoNombre: "",
  // Premio que crece: una línea por escalón → boletos vendidos | premio
  escalones: "80 | $700\n130 | $1,200\n180 | $1,600\n250 | $2,000",
  metodoSorteo:
    "Gana quien tenga los ÚLTIMOS 3 DÍGITOS del premio mayor de la Lotería Nacional del día del sorteo. Lo transmitimos EN VIVO por Facebook.\n" +
    "El premio crece conforme se venden boletos (mira la barra de arriba). Si a la fecha del sorteo no se vendieron todos, se entrega el premio del escalón alcanzado. Si no se llega ni al primer escalón, el sorteo se pospone una sola vez una semana; si aun así no se llega, se devuelve el dinero a todos.\n" +
    "Si el número ganador no fue vendido, se usa el resultado del siguiente sorteo de la Lotería Nacional hasta que haya un ganador.",
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
    "¿Y si no se venden todos los boletos? | El sorteo se hace en la fecha anunciada con el premio del escalón alcanzado. Si no se llega ni al primero, se pospone una semana y, si aun así no se llega, se devuelve tu dinero. Mientras más compartas, más grande es el premio.\n" +
    "¿Y si sale un número que nadie compró? | Se usa el siguiente sorteo de la Lotería Nacional hasta que haya ganador. Siempre hay ganador.\n" +
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
