import { getDb, ObjectId, reply } from "./_db.js";
import { sendToQueue } from "./_rabbitmq.js";
import { requireAuth } from "./_auth.js";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return reply.noContent();

  const db = await getDb();
  const col = db.collection("producers");

  const path = event.path || "";
  const id = path.split("/").pop();
  const hasId = id && !path.endsWith("/producers");

  try {
    switch (event.httpMethod) {
      case "GET": {
        // Consultas directas a DB sin autenticación
        if (hasId) {
          const doc = await col.findOne({ _id: new ObjectId(id) });
          return doc ? reply.ok(doc) : reply.notFound();
        }
        const items = await col.find({}).sort({ name: 1 }).toArray();
        return reply.ok(items);
      }

      case "POST": {
        const user = requireAuth(event);
        
        const data = JSON.parse(event.body || "{}");
        const required = ["name", "country", "foundedYear", "logoUrl"];
        for (const k of required) if (data[k] == null || data[k] === "") return reply.bad(`Falta ${k}`);

        data.foundedYear = Number(data.foundedYear);

        await sendToQueue({
          operation: "CREATE",
          collection: "producers",
          data,
          userId: user.userId
        });

        return reply.ok({ 
          message: "Productora enviada a cola",
          queued: true,
          data 
        });
      }

      case "PUT":
      case "PATCH": {
        const user = requireAuth(event);
        
        if (!hasId) return reply.bad("Falta id");
        const data = JSON.parse(event.body || "{}");
        delete data._id;
        if (data.foundedYear != null) data.foundedYear = Number(data.foundedYear);

        await sendToQueue({
          operation: "UPDATE",
          collection: "producers",
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

      case "DELETE": {
        const user = requireAuth(event);
        
        if (!hasId) return reply.bad("Falta id");

        await sendToQueue({
          operation: "DELETE",
          collection: "producers",
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
