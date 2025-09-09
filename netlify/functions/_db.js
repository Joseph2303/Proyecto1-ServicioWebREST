import { MongoClient, ObjectId } from "mongodb";

let client, db;

export async function getDb() {
  if (db) return db;
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.DB_NAME);
  return db;
}

const cors = () => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
});

export const reply = {
  ok: (body)      => ({ statusCode: 200, headers: cors(), body: JSON.stringify(body) }),
  created: (body) => ({ statusCode: 201, headers: cors(), body: JSON.stringify(body) }),
  noContent: ()   => ({ statusCode: 204, headers: cors(), body: "" }),
  bad: (msg)      => ({ statusCode: 400, headers: cors(), body: JSON.stringify({ error: msg }) }),
  notFound: ()    => ({ statusCode: 404, headers: cors(), body: JSON.stringify({ error: "Not found" }) }),
  error: (e)      => ({ statusCode: 500, headers: cors(), body: JSON.stringify({ error: e.message }) })
};

export { ObjectId };
