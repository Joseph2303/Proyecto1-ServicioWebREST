import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "terror";

if (!MONGODB_URI) {
  console.error("❌ Falta MONGODB_URI en .env");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);

async function createDefaultUser() {
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const users = db.collection("users");

    // Verificar si ya existe
    const existing = await users.findOne({ username: "admin" });
    if (existing) {
      console.log("ℹ️  Usuario 'admin' ya existe");
      return;
    }

    // Crear usuario admin
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await users.insertOne({
      username: "admin",
      password: hashedPassword,
      createdAt: new Date()
    });

    console.log("✅ Usuario creado:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
  }
}

createDefaultUser();
