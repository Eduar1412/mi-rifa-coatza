import { store } from "../lib/util.mjs";

export const config = { path: "/api/img/:name" };

export default async (req, context) => {
  const name = context.params.name;
  if (name !== "logo" && name !== "banner") return new Response("No encontrado", { status: 404 });
  const r = await store().getWithMetadata("img:" + name, { type: "arrayBuffer" });
  if (!r) return new Response("No encontrado", { status: 404 });
  return new Response(r.data, {
    headers: {
      "content-type": r.metadata?.contentType || "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};
