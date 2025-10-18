import { getDb, ObjectId, reply } from "./_db.js";
import { sendToQueue } from "./_rabbitmq.js";
import { requireAuth } from "./_auth.js";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return reply.noContent();

  const db = await getDb();
  const col = db.collection("directors");

  const path = event.path || "";
  const id = path.split("/").pop();
  const hasId = id && !path.endsWith("/directors");

  try {
    switch (event.httpMethod) {
      case "GET": {
        // Las consultas NO requieren autenticación y van directo a DB
        if (hasId) {
          const doc = await col.findOne({ _id: new ObjectId(id) });
          return doc ? reply.ok(doc) : reply.notFound();
        }
        const items = await col.find({}).sort({ fullName: 1 }).toArray();
        return reply.ok(items);
      }

      case "POST": {
        // Requiere autenticación
        const user = requireAuth(event);
        
        const data = JSON.parse(event.body || "{}");
        const required = ["fullName", "nationality", "birthYear", "imageUrl"];
        for (const k of required) if (data[k] == null || data[k] === "") return reply.bad(`Falta ${k}`);

        data.birthYear = Number(data.birthYear);

        // Enviar a RabbitMQ en vez de insertar directamente
        await sendToQueue({
          operation: "CREATE",
          collection: "directors",
          data,
          userId: user.userId
        });

        return reply.ok({ 
          message: "Director enviado a cola para procesamiento",
          queued: true,
          data 
        });
      }

      case "PUT":
      case "PATCH": {
        // Requiere autenticación
        const user = requireAuth(event);
        
        if (!hasId) return reply.bad("Falta id");
        const data = JSON.parse(event.body || "{}");
        delete data._id;
        if (data.birthYear != null) data.birthYear = Number(data.birthYear);

        // Enviar a RabbitMQ
        await sendToQueue({
          operation: "UPDATE",
          collection: "directors",
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
        // Requiere autenticación
        const user = requireAuth(event);
        
        if (!hasId) return reply.bad("Falta id");

        // Enviar a RabbitMQ
        await sendToQueue({
          operation: "DELETE",
          collection: "directors",
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
    // Si es error de autenticación, devolver 401
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
