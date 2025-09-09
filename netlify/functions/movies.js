import { getDb, ObjectId, reply } from "./_db.js";

// helpers de ID (acepta ObjectId y string)
const toOid = (v) => (ObjectId.isValid(v) ? new ObjectId(v) : null);
const idQuery = (id) => {
  const oid = toOid(id);
  return oid ? { $or: [{ _id: oid }, { _id: id }] } : { _id: id };
};
const refQuery = (v) => {
  const oid = toOid(v);
  return oid ? { $in: [oid, v] } : v;
};

// lee id desde path o query ?id=...
const extractId = (event) => {
  const p = event.path || "";
  let last = p.split("/").pop() || "";
  if (!last || last === "movies") {
    last = event.queryStringParameters?.id || "";
  }
  return last;
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return reply.noContent();

  const db = await getDb();
  const col = db.collection("movies");

  const id = extractId(event);
  const hasId = !!id;

  try {
    switch (event.httpMethod) {
      case "GET": {
        if (hasId) {
          const doc = await col.findOne(idQuery(id));
          return doc ? reply.ok(doc) : reply.notFound();
        }
        const qs = new URLSearchParams(event.queryStringParameters || {});
        const q = qs.get("q");
        const producerId = qs.get("producerId");
        const limit = Number(qs.get("limit") || 20);
        const skip = Number(qs.get("skip") || 0);

        const filter = {};
        if (q) filter.title = { $regex: q, $options: "i" };
        if (producerId) filter.producerId = refQuery(producerId);

        const items = await col
          .find(filter)
          .sort({ year: -1, _id: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();
        return reply.ok(items);
      }

      case "POST": {
        const data = JSON.parse(event.body || "{}");
        const required = ["title", "year", "duration_min", "rating", "synopsis", "posterUrl", "producerId"];
        for (const k of required) if (data[k] == null || data[k] === "") return reply.bad(`Falta ${k}`);

        data.year = Number(data.year);
        data.duration_min = Number(data.duration_min);
        data.rating = Number(data.rating);

        data.producerId = refQuery(data.producerId);
        if (Array.isArray(data.directorIds)) data.directorIds = data.directorIds.map(refQuery);

        const { insertedId } = await col.insertOne(data);
        const created = await col.findOne({ _id: insertedId });
        return reply.created(created);
      }

      case "PUT":
      case "PATCH": {
        if (!hasId) return reply.bad("Falta id");
        const data = JSON.parse(event.body || "{}");
        delete data._id;

        if (data.year != null) data.year = Number(data.year);
        if (data.duration_min != null) data.duration_min = Number(data.duration_min);
        if (data.rating != null) data.rating = Number(data.rating);

        if (data.producerId) data.producerId = refQuery(data.producerId);
        if (Array.isArray(data.directorIds)) data.directorIds = data.directorIds.map(refQuery);

        const { value } = await col.findOneAndUpdate(
          idQuery(id),
          { $set: data },
          { returnDocument: "after" }
        );
        return value ? reply.ok(value) : reply.notFound();
      }

      case "DELETE": {
        if (!hasId) return reply.bad("Falta id");
        const { deletedCount } = await col.deleteOne(idQuery(id));
        return deletedCount ? reply.noContent() : reply.notFound();
      }

      default:
        return reply.bad("Método no soportado");
    }
  } catch (e) {
    return reply.error(e);
  }
}
