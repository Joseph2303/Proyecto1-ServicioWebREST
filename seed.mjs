import { MongoClient } from "mongodb";
import fs from "node:fs/promises";
import path from "node:path";
import 'dotenv/config';


const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "terror";

if (!MONGODB_URI) {
  console.error("Falta MONGODB_URI (revisa tu .env en la raíz)");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);

async function readDirJSON(dir) {
  try {
    const files = await fs.readdir(dir);
    const out = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(dir, f), "utf8");
      out.push(JSON.parse(raw));
    }
    return out;
  } catch {
    return [];
  }
}

async function readEither(folder, singleFile) {
  // 1) intenta leer muchos .json en la carpeta
  const fromFolder = await readDirJSON(`./data/${folder}`);
  if (fromFolder.length) return fromFolder;

  // 2) si no hay, intenta leer el archivo único agregado
  try {
    const raw = await fs.readFile(`./data/${singleFile}`, "utf8");
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}

async function main() {
  await client.connect();
  const db = client.db(DB_NAME);

  const cDirs = db.collection("directors");
  const cProds = db.collection("producers");
  const cMovies = db.collection("movies");

  // lee datos (carpeta o archivo agregado)
  const dirs = await readEither("directors", "directors.json");
  const prods = await readEither("producers", "producers.json");
  const moviesRaw = await readEither("movies", "movies.json");

  if (!dirs.length || !prods.length || !moviesRaw.length) {
    console.warn("Aviso: faltan datos. Leídos =>",
      { directors: dirs.length, producers: prods.length, movies: moviesRaw.length });
  }

  // limpia colecciones
  await Promise.all([
    cDirs.deleteMany({}),
    cProds.deleteMany({}),
    cMovies.deleteMany({})
  ]);

  // inserta directores y productoras
  const resDirs = await cDirs.insertMany(dirs);
  const resProds = await cProds.insertMany(prods);

  // mapas nombre -> ObjectId
  const mapDir = new Map();
  Object.values(resDirs.insertedIds).forEach((id, i) => mapDir.set(dirs[i].fullName, id));
  const mapProd = new Map();
  Object.values(resProds.insertedIds).forEach((id, i) => mapProd.set(prods[i].name, id));

  // transforma películas (de nombres a *_Id)
  const movies = moviesRaw.map(m => ({
    title: m.title,
    year: m.year,
    duration_min: m.duration_min,
    rating: m.rating,
    synopsis: m.synopsis,
    posterUrl: m.posterUrl,
    producerId: mapProd.get(m.producer) || null,
    directorIds: (m.directors || []).map(n => mapDir.get(n)).filter(Boolean)
  }));

  const faltantes = movies.filter(x => !x.producerId || !x.directorIds.length).map(x => x.title);
  if (faltantes.length) {
    console.warn("Atención: estas películas no resolvieron producer/directors:", faltantes);
  }

  await cMovies.insertMany(movies);

  console.log(`Importados => directores: ${dirs.length}, productoras: ${prods.length}, películas: ${movies.length}`);
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
