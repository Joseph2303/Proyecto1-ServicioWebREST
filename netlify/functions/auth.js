import { getDb, reply } from "./_db.js";
import { generateToken, hashPassword, comparePassword } from "./_auth.js";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return reply.noContent();

  const db = await getDb();
  const usersCol = db.collection("users");

  try {
    const { username, password } = JSON.parse(event.body || "{}");

    if (event.path.endsWith("/register")) {
      // ===== REGISTRO =====
      if (!username || !password) {
        return reply.bad("Username y password son requeridos");
      }

      // Verificar si el usuario ya existe
      const exists = await usersCol.findOne({ username });
      if (exists) {
        return reply.bad("El usuario ya existe");
      }

      // Crear usuario
      const hashedPassword = await hashPassword(password);
      const { insertedId } = await usersCol.insertOne({
        username,
        password: hashedPassword,
        createdAt: new Date()
      });

      const user = await usersCol.findOne({ _id: insertedId });
      const token = generateToken(user);

      return reply.created({ 
        token, 
        user: { 
          id: user._id, 
          username: user.username 
        } 
      });

    } else if (event.path.endsWith("/login")) {
      // ===== LOGIN =====
      if (!username || !password) {
        return reply.bad("Username y password son requeridos");
      }

      const user = await usersCol.findOne({ username });
      if (!user) {
        return reply.bad("Credenciales inválidas");
      }

      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return reply.bad("Credenciales inválidas");
      }

      const token = generateToken(user);

      return reply.ok({ 
        token, 
        user: { 
          id: user._id, 
          username: user.username 
        } 
      });

    } else {
      return reply.bad("Ruta no encontrada");
    }

  } catch (e) {
    return reply.error(e);
  }
}
