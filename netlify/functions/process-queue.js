import { getDb, ObjectId, reply } from "./_db.js";
import { getChannel } from "./_rabbitmq.js";
import { requireAuth } from "./_auth.js";

const QUEUE_NAME = "terror_updates";

/**
 * Aplica una operación en la base de datos
 */
async function applyOperation(db, message) {
  const { operation, collection, data, id } = message;
  const col = db.collection(collection);

  switch (operation) {
    case "CREATE": {
      const { insertedId } = await col.insertOne(data);
      return { insertedId, ...data };
    }

    case "UPDATE": {
      const filter = { _id: ObjectId.isValid(id) ? new ObjectId(id) : id };
      const { value } = await col.findOneAndUpdate(
        filter,
        { $set: data },
        { returnDocument: "after" }
      );
      return value;
    }

    case "DELETE": {
      const filter = { _id: ObjectId.isValid(id) ? new ObjectId(id) : id };
      const { deletedCount } = await col.deleteOne(filter);
      return { deletedCount };
    }

    default:
      throw new Error(`Operación desconocida: ${operation}`);
  }
}

/**
 * Netlify Function que procesa TODOS los mensajes pendientes en la cola
 * URL: /.netlify/functions/process-queue
 */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return reply.noContent();

  // Solo permitir GET o POST
  if (!["GET", "POST"].includes(event.httpMethod)) {
    return reply.bad("Método no soportado");
  }

  try {
    // Autenticación opcional (puedes requerir admin)
    // const user = requireAuth(event);

    const db = await getDb();
    const channel = await getChannel();

    let processedCount = 0;
    const results = [];

    console.log("🔄 Iniciando procesamiento de cola...");

    // Procesar mensajes uno por uno hasta vaciar la cola
    while (true) {
      const msg = await channel.get(QUEUE_NAME, { noAck: false });
      
      if (!msg) {
        // Cola vacía
        break;
      }

      try {
        const message = JSON.parse(msg.content.toString());
        console.log(`→ Procesando: ${message.operation} en ${message.collection}`);

        const result = await applyOperation(db, message);
        
        channel.ack(msg);
        processedCount++;
        
        results.push({
          operation: message.operation,
          collection: message.collection,
          success: true,
          result
        });

      } catch (error) {
        console.error("❌ Error procesando mensaje:", error.message);
        channel.nack(msg, false, false); // no reencolar
        
        results.push({
          operation: "UNKNOWN",
          success: false,
          error: error.message
        });
      }
    }

    console.log(`✓ Procesados ${processedCount} mensajes`);

    return reply.ok({
      processed: processedCount,
      message: processedCount > 0 
        ? `Se procesaron ${processedCount} actualizaciones pendientes` 
        : "No hay actualizaciones pendientes",
      results
    });

  } catch (e) {
    console.error("Error en process-queue:", e);
    return reply.error(e);
  }
}
