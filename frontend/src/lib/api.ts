const BASE = import.meta.env.VITE_API_BASE || "/.netlify/functions";

async function j(res: Response) {
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `HTTP ${res.status}`);
  }
  // puede venir 204
  try { return await res.json(); } catch { return null as any; }
}

export const api = {
  async list(resource: string, qs = "") {
    const r = await fetch(`${BASE}/${resource}${qs}`);
    return j(r);
  },
  // 👇 nuevo: leer por id
async read(resource: string, id: string) {
  const r = await fetch(`${BASE}/${resource}/${id}`);
  return j(r);
},
  async create(resource: string, body: any) {
    const r = await fetch(`${BASE}/${resource}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return j(r);
  },
  async update(resource: string, id: string, body: any) {
  const url = `${BASE}/${resource}/${encodeURIComponent(id)}?id=${encodeURIComponent(id)}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return j(r);
},
  async remove(resource: string, id: string) {
    const r = await fetch(`${BASE}/${resource}/${id}`, { method: "DELETE" });
    return r.ok;
  },
};
