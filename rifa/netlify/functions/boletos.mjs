import { store, json, numerosVendidos, leerConfig } from "../lib/util.mjs";

export const config = { path: "/api/boletos" };

export default async () => {
  const s = store();
  const [vendidos, cfg] = await Promise.all([numerosVendidos(s), leerConfig(s)]);
  return json({ vendidos, config: cfg });
};
