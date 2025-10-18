import amqp from "amqplib";

let connection = null;
let channel = null;

// Detecta si corre en entorno serverless (Netlify/AWS Lambda)
const isServerless = !!process.env.NETLIFY || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// No uses localhost en producción. Solo permite fallback local en desarrollo.
const DEFAULT_LOCAL_URL = "amqp://localhost";
const ENV_URL = process.env.RABBITMQ_URL;
const RABBITMQ_URL = ENV_URL || (isServerless ? "" : DEFAULT_LOCAL_URL);

const QUEUE_NAME = process.env.RABBITMQ_QUEUE || "terror_updates";
const CONNECT_TIMEOUT_MS = Number(process.env.RABBITMQ_CONNECT_TIMEOUT_MS || 8000);

function maskUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.username || u.password) {
      u.username = u.username ? "***" : "";
      u.password = u.password ? "***" : "";
    }
    return u.toString();
  } catch {
    return url;
  }
}

async function connectWithTimeout(url) {
  const to = new Promise((_, rej) => setTimeout(() => rej(new Error(`Timeout conectando a RabbitMQ tras ${CONNECT_TIMEOUT_MS}ms`)), CONNECT_TIMEOUT_MS));
  return Promise.race([amqp.connect(url), to]);
}

/**
 * Conecta a RabbitMQ y obtiene el canal
 */
export async function getChannel() {
  if (channel) return channel;
  
  try {
    if (!RABBITMQ_URL) {
      throw new Error("RabbitMQ no configurado: define la variable de entorno RABBITMQ_URL (usa CloudAMQP o similar).");
    }

    connection = await connectWithTimeout(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    // Listeners para reconexión simple
    connection.on("error", (err) => {
      console.error("[RabbitMQ] error de conexión:", err?.message);
      channel = null; connection = null;
    });
    connection.on("close", () => {
      console.warn("[RabbitMQ] conexión cerrada");
      channel = null; connection = null;
    });

    console.log("✓ Conectado a RabbitMQ:", maskUrl(RABBITMQ_URL));
    return channel;
  } catch (error) {
    const msg = `No se pudo conectar a RabbitMQ (${maskUrl(RABBITMQ_URL)}): ${error.message}`;
    console.error(msg);
    throw new Error(msg);
  }
}

/**
 * Envía un mensaje a la cola de RabbitMQ
 * @param {object} message - { operation, collection, data, id }
 */
export async function sendToQueue(message) {
  const ch = await getChannel();
  const content = Buffer.from(JSON.stringify(message));
  
  ch.sendToQueue(QUEUE_NAME, content, { persistent: true });
  console.log("→ Mensaje enviado a cola:", message.operation, message.collection);
}

/**
 * Consume mensajes de la cola
 * @param {function} callback - función que procesa cada mensaje
 */
export async function consumeQueue(callback) {
  const ch = await getChannel();
  
  await ch.consume(QUEUE_NAME, async (msg) => {
    if (msg !== null) {
      try {
        const message = JSON.parse(msg.content.toString());
        await callback(message);
        ch.ack(msg);
        console.log("✓ Mensaje procesado:", message.operation);
      } catch (error) {
        console.error("Error procesando mensaje:", error);
        ch.nack(msg, false, false); // no reencolar
      }
    }
  });
}

/**
 * Cierra la conexión (útil en desarrollo)
 */
export async function closeConnection() {
  if (channel) await channel.close();
  if (connection) await connection.close();
  channel = null;
  connection = null;
}

/** Estado rápido para diagnósticos */
export function rabbitStatus() {
  return {
    configured: !!RABBITMQ_URL,
    url: RABBITMQ_URL ? maskUrl(RABBITMQ_URL) : null,
    connected: !!(connection && channel),
    queue: QUEUE_NAME
  };
}
