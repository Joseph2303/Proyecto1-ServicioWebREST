import { getDb, ObjectId, reply } from "./_db.js";
import { sendToQueue } from "./_rabbitmq.js";
import { requireAuth } from "./_auth.js";

/* ========== Helpers de IDs y normalización ========== */
const toOid = (v) => (ObjectId.isValid(v) ? new ObjectId(v) : null);

// Solo para FILTRAR (GET)
const filterByRef = (v) => {
  const arr = [];
  const oid = toOid(v);
  if (oid) arr.push(oid);
  arr.push(String(v));
  return { $in: arr };
};

// Para GUARDAR (POST/PATCH)
const storeRef = (v) => {
  const oid = toOid(v);
  return oid ?? String(v);
};

// Para RESPUESTA al cliente
const unwrapRef = (v) => {
  if (v && typeof v === "object" && Array.isArray(v.$in) && v.$in.length) {
    const first = v.$in[0];
    return typeof first === "object" && typeof first.toHexString === "function"
      ? first.toHexString()
      : String(first);
  }
  return v && typeof v === "object" && typeof v.toHexString === "function"
    ? v.toHexString()
    : String(v);
};

const toClient = (doc) => {
  if (!doc) return doc;
  return {
    ...doc,
    _id: unwrapRef(doc._id),
    producerId: doc.producerId != null ? unwrapRef(doc.producerId) : "",
    directorIds: Array.isArray(doc.directorIds) ? doc.directorIds.map(unwrapRef) : [],
  };
};

// Extrae id desde path o query (?id=)
const extractId = (event) => {
  // 1) path segment
  const path = (event.path || "").replace(/\/+$/g, ""); // quita '/' final
  const seg = path.split("/").pop();
  if (seg && seg !== "movies") return decodeURIComponent(seg);
  // 2) query param
  const qId = event.queryStringParameters?.id;
  return qId ? decodeURIComponent(qId) : "";
};

/* ========== Handler ========== */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return reply.noContent();

  const db = await getDb();
  const col = db.collection("movies");

  const id = extractId(event);
  const hasId = !!id;

  try {
    switch (event.httpMethod) {
      /* ------ LISTAR / LEER ------ */
      case "GET": {
        if (hasId) {
          const doc = await col.findOne({ $or: [{ _id: toOid(id) }, { _id: id }] });
          return doc ? reply.ok(toClient(doc)) : reply.notFound();
        }

        const qs = new URLSearchParams(event.queryStringParameters || {});
        const q = qs.get("q");
        const producerId = qs.get("producerId");
        const limit = Number(qs.get("limit") || 20);
        const skip = Number(qs.get("skip") || 0);

        const filter = {};
        if (q) filter.title = { $regex: q, $options: "i" };
        if (producerId) filter.producerId = filterByRef(producerId);

        const items = await col.find(filter).sort({ year: -1, _id: -1 }).skip(skip).limit(limit).toArray();
        return reply.ok(items.map(toClient));
      }

      /* ------ CREAR ------ */
      case "POST": {
        const user = requireAuth(event);
        
        const data = JSON.parse(event.body || "{}");
        const required = ["title", "year", "duration_min", "rating", "synopsis", "posterUrl", "producerId"];
        for (const k of required) {
          if (data[k] == null || data[k] === "") return reply.bad(`Falta ${k}`);
        }

        data.year = Number(data.year);
        data.duration_min = Number(data.duration_min);
        data.rating = Number(data.rating);

        data.producerId = storeRef(data.producerId);
        if (Array.isArray(data.directorIds)) data.directorIds = data.directorIds.map(storeRef);

        await sendToQueue({
          operation: "CREATE",
          collection: "movies",
          data,
          userId: user.userId
        });

        return reply.ok({ 
          message: "Película enviada a cola",
          queued: true,
          data 
        });
      }

      /* ------ ACTUALIZAR ------ */
      case "PUT":
      case "PATCH": {
        const user = requireAuth(event);
        
        if (!hasId) return reply.bad("Falta id");
        const data = JSON.parse(event.body || "{}");
        delete data._id;

        if (data.year != null) data.year = Number(data.year);
        if (data.duration_min != null) data.duration_min = Number(data.duration_min);
        if (data.rating != null) data.rating = Number(data.rating);

        if (data.producerId != null) data.producerId = storeRef(data.producerId);
        if (Array.isArray(data.directorIds)) data.directorIds = data.directorIds.map(storeRef);

        await sendToQueue({
          operation: "UPDATE",
          collection: "movies",
          id,
          data,
          userId: user.userId
        });

        return reply.ok({ 
          message: "Actualización enviada a cola",
          queued: true,
          id,
          data 
        });
      }

      /* ------ ELIMINAR ------ */
      case "DELETE": {
        const user = requireAuth(event);
        
        if (!hasId) return reply.bad("Falta id");

        await sendToQueue({
          operation: "DELETE",
          collection: "movies",
          id,
          userId: user.userId
        });

        return reply.ok({ 
          message: "Eliminación enviada a cola",
          queued: true,
          id 
        });
      }

      default:
        return reply.bad("Método no soportado");
    }
  } catch (e) {
    if (e.message.includes("autorizado") || e.message.includes("Token")) {
      return { 
        statusCode: 401, 
        headers: reply.ok({}).headers,
        body: JSON.stringify({ error: e.message }) 
      };
    }
    return reply.error(e);
  }
}
