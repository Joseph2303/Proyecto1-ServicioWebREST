import { reply } from "./_db.js";
import { rabbitStatus, getChannel } from "./_rabbitmq.js";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return reply.noContent();

  try {
    // Si se pasa ?connect=true intenta conectar explícitamente
    const shouldConnect = (event.queryStringParameters?.connect || "").toLowerCase() === "true";
    if (shouldConnect) {
      await getChannel();
    }

    const status = rabbitStatus();
    return reply.ok({ ok: true, ...status });
  } catch (e) {
    return reply.error(e);
  }
}
