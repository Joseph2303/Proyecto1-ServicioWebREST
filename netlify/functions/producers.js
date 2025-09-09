import { getDb, ObjectId, reply } from "./_db.js";

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
        if (hasId) {
          const doc = await col.findOne({ _id: new ObjectId(id) });
          return doc ? reply.ok(doc) : reply.notFound();
        }
        const items = await col.find({}).sort({ name: 1 }).toArray();
        return reply.ok(items);
      }

      case "POST": {
        const data = JSON.parse(event.body || "{}");
        const required = ["name", "country", "foundedYear", "logoUrl"];
        for (const k of required) if (data[k] == null || data[k] === "") return reply.bad(`Falta ${k}`);

        data.foundedYear = Number(data.foundedYear);

        const { insertedId } = await col.insertOne(data);
        const created = await col.findOne({ _id: insertedId });
        return reply.created(created);
      }

      case "PUT":
      case "PATCH": {
        if (!hasId) return reply.bad("Falta id");
        const data = JSON.parse(event.body || "{}");
        delete data._id;
        if (data.foundedYear != null) data.foundedYear = Number(data.foundedYear);

        const { value } = await col.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: data },
          { returnDocument: "after" }
        );
        return value ? reply.ok(value) : reply.notFound();
      }

      case "DELETE": {
        if (!hasId) return reply.bad("Falta id");
        const { deletedCount } = await col.deleteOne({ _id: new ObjectId(id) });
        return deletedCount ? reply.noContent() : reply.notFound();
      }

      default:
        return reply.bad("Método no soportado");
    }
  } catch (e) {
    return reply.error(e);
  }
}
