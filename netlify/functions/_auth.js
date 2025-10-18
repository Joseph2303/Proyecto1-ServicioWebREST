import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "tu-secreto-super-seguro-cambialo";
const JWT_EXPIRES_IN = "7d";

/**
 * Genera un token JWT para un usuario
 */
export function generateToken(user) {
  return jwt.sign(
    { 
      userId: user._id.toString(), 
      username: user.username 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verifica y decodifica un token JWT
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error("Token inválido o expirado");
  }
}

/**
 * Hashea una contraseña
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Compara contraseña con hash
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Middleware para proteger rutas - extrae token del header
 */
export function extractTokenFromEvent(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  
  if (!authHeader) {
    throw new Error("No autorizado - Token no proporcionado");
  }
  
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw new Error("Formato de token inválido");
  }
  
  return parts[1];
}

/**
 * Valida que el usuario esté autenticado
 */
export function requireAuth(event) {
  const token = extractTokenFromEvent(event);
  const decoded = verifyToken(token);
  return decoded; // { userId, username }
}
