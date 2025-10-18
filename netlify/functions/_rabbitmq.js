import amqp from "amqplib";

let connection = null;
let channel = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = "terror_updates";

/**
 * Conecta a RabbitMQ y obtiene el canal
 */
export async function getChannel() {
  if (channel) return channel;
  
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    
    console.log("✓ Conectado a RabbitMQ");
    return channel;
  } catch (error) {
    console.error("Error conectando a RabbitMQ:", error.message);
    throw error;
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
