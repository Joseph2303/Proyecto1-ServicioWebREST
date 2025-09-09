<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { api } from "../lib/api";

const movies = ref<any[]>([]);
const loading = ref(false);
const errorMsg = ref("");

// filtros
const q = ref("");
const filterProducerId = ref<string>("");

// catálogos
const producers = ref<any[]>([]);
const directors = ref<any[]>([]);
const mapProducerName = ref<Record<string, string>>({});
const mapDirectorName = ref<Record<string, string>>({});

// crear
const form = ref<any>({
  title: "", year: null, duration_min: null, rating: null,
  synopsis: "", posterUrl: "",
  producerId: "",
  directorIds: [] as string[]
});

// edición (ahora en modal)
const editingId = ref<string | null>(null);
const draft = ref<any>({});
const saving = ref(false);

// poster fallback
const FALLBACK_POSTER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' width='400' height='600'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0%' stop-color='#1a0b0d'/><stop offset='100%' stop-color='#0b0b12'/>
    </linearGradient></defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <rect x='30' y='30' width='340' height='540' fill='none' stroke='rgba(229,9,20,0.55)' stroke-width='4' rx='14'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#e8e8ea' font-size='28' font-family='Arial, sans-serif'>SIN POSTER</text>
  </svg>`);

function safeUrl(u?: string) {
  if (!u) return FALLBACK_POSTER;
  try { return u.startsWith("http://") ? "https://" + u.slice(7) : u; }
  catch { return FALLBACK_POSTER; }
}
function posterFor(m:any) {
  return safeUrl(editingId.value === m._id ? draft.value.posterUrl : m.posterUrl);
}
function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = FALLBACK_POSTER;
}

// ---------- Normalización & IDs ----------
const toId = (v: any): string => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (typeof (v as any).toHexString === "function") return (v as any).toHexString();
    if ("$oid" in (v as any)) return (v as any)["$oid"];
    if ((v as any)._id && typeof (v as any)._id.toHexString === "function") return (v as any)._id.toHexString();
  }
  return String(v);
};

function normalizeMovie(m:any){
  return {
    ...m,
    _id: toId(m._id),
    producerId: m.producerId ? toId(m.producerId) : "",
    directorIds: Array.isArray(m.directorIds) ? m.directorIds.map(toId) : [],
    year: m.year != null ? Number(m.year) : m.year,
    duration_min: m.duration_min != null ? Number(m.duration_min) : m.duration_min,
    rating: m.rating != null ? Number(m.rating) : m.rating,
  };
}

function buildMaps() {
  mapProducerName.value = Object.fromEntries(
    producers.value.map((p:any) => [toId(p._id), p.name])
  );
  mapDirectorName.value = Object.fromEntries(
    directors.value.map((d:any) => [toId(d._id), d.fullName])
  );
}

async function loadAux() {
  const [prods, dirs] = await Promise.all([ api.list("producers"), api.list("directors") ]);
  producers.value = prods;
  directors.value = dirs;
  buildMaps();
}

async function loadMovies() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const qs: string[] = [];
    if (q.value) qs.push(`q=${encodeURIComponent(q.value)}`);
    if (filterProducerId.value) qs.push(`producerId=${filterProducerId.value}`);
    const urlQuery = qs.length ? `?${qs.join("&")}` : "";
    const raw = await api.list("movies", urlQuery);
    movies.value = raw.map(normalizeMovie);
  } catch (e:any) {
    errorMsg.value = e?.message || "Error cargando películas";
  } finally {
    loading.value = false;
  }
}

// crear
async function add() {
  try {
    const payload = { ...form.value };
    payload.directorIds = Array.isArray(payload.directorIds) ? payload.directorIds : [];
    const created = await api.create("movies", payload);
    movies.value.unshift(normalizeMovie(created));
    form.value = { title:"", year:null, duration_min:null, rating:null, synopsis:"", posterUrl:"", producerId:"", directorIds:[] };
  } catch (e:any) {
    alert(e?.message || "Error al crear película");
  }
}

// borrar
async function delItem(id: string) {
  if (!confirm("¿Eliminar esta película?")) return;
  await api.remove("movies", id);
  movies.value = movies.value.filter(m => m._id !== id);
}

// editar (abre modal)
function startEdit(m:any) {
  editingId.value = m._id; // m._id ya es string normalizado
  draft.value = {
    _id: m._id,
    title: m.title,
    year: m.year,
    duration_min: m.duration_min,
    rating: m.rating,
    synopsis: m.synopsis,
    posterUrl: m.posterUrl,
    producerId: m.producerId,
    directorIds: Array.isArray(m.directorIds) ? [...m.directorIds] : []
  };
}
function cancelEdit() {
  editingId.value = null;
  draft.value = {};
}

// guardar (cierra modal)
async function saveEdit() {
  if (!editingId.value) return;
  try {
    saving.value = true;
    const id = editingId.value;
    const payload = { ...draft.value };
    delete (payload as any)._id;

    const updated = await api.update("movies", id, payload);
    const idx = movies.value.findIndex(m => m._id === id);

    let fresh = updated && updated._id ? normalizeMovie(updated) : null;
    if (!fresh) {
      try { fresh = normalizeMovie(await api.read("movies", id)); }
      catch {}
    }
    if (!fresh) fresh = normalizeMovie({ ...movies.value[idx], ...payload, _id:id });

    if (idx >= 0) movies.value[idx] = fresh;
    cancelEdit();
  } catch (e:any) {
    const msg = e?.message || "";
    if (msg.includes("Not found")) {
      await loadMovies();
      cancelEdit();
      return;
    }
    alert(msg || "Error al guardar cambios");
  } finally {
    saving.value = false;
  }
}

// UX: bloquear scroll del body y cerrar con ESC
const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape" && editingId.value) cancelEdit(); };
watch(editingId, v => {
  if (typeof document !== "undefined") document.body.style.overflow = v ? "hidden" : "";
});
function onCatalogChanged(){ loadAux(); }
function onFocus(){ loadAux(); }

onMounted(async () => {
  window.addEventListener('catalog:changed', onCatalogChanged);
  window.addEventListener('focus', onFocus);
  window.addEventListener('keydown', onEsc);
  await loadAux();
  await loadMovies();
});
onBeforeUnmount(() => {
  window.removeEventListener('catalog:changed', onCatalogChanged);
  window.removeEventListener('focus', onFocus);
  window.removeEventListener('keydown', onEsc);
});

watch(filterProducerId, loadMovies);
</script>

<template>
  <section class="wrap">
    <h2 class="title">Películas de Terror</h2>

    <!-- Filtros -->
    <div class="controls">
      <input class="input" v-model="q" placeholder="Buscar por título..." />
      <select class="select" v-model="filterProducerId">
        <option value="">Todas las productoras</option>
        <option v-for="p in producers" :key="toId(p._id)" :value="toId(p._id)">{{ p.name }}</option>
      </select>
      <button class="btn" @click="loadMovies">Buscar</button>
      <button class="btn ghost" @click="() => { q=''; filterProducerId=''; loadMovies(); }">Limpiar</button>
    </div>

    <p v-if="loading">Cargando…</p>
    <p v-if="errorMsg" class="err">{{ errorMsg }}</p>

    <!-- Crear -->
    <details class="create">
      <summary>➕ Agregar película</summary>
      <form @submit.prevent="add" class="grid2">
        <input class="input" v-model="form.title" placeholder="Título" required />
        <input class="input" v-model.number="form.year" placeholder="Año" required />
        <input class="input" v-model.number="form.duration_min" placeholder="Duración (min)" required />
        <input class="input" v-model.number="form.rating" placeholder="Rating (0-10)" required />

        <select class="select" v-model="form.producerId" required>
          <option disabled value="">-- Productora --</option>
          <option v-for="p in producers" :key="toId(p._id)" :value="toId(p._id)">{{ p.name }}</option>
        </select>

        <select class="select" v-model="form.directorIds" multiple size="4">
          <option v-for="d in directors" :key="toId(d._id)" :value="toId(d._id)">{{ d.fullName }}</option>
        </select>

        <input class="input wide" v-model="form.posterUrl" placeholder="Poster URL (https…)" required />
        <div class="preview">
          <img :src="safeUrl(form.posterUrl)" @error="onImgError" loading="lazy" alt="preview poster" />
        </div>

        <textarea class="textarea wide" v-model="form.synopsis" placeholder="Sinopsis" rows="3" required></textarea>
        <button class="btn wide">Guardar</button>
      </form>
    </details>

    <!-- Grilla -->
    <ul class="grid">
      <li v-for="m in movies" :key="m._id" class="posterCard">
        <figure class="posterBox">
          <img class="poster" :src="posterFor(m)" :alt="m.title" loading="lazy" @error="onImgError" />
          <figcaption class="overlay">
            <div class="overlayTop">
              <strong class="name">{{ m.title }}</strong>
              <span class="meta">{{ m.year }} • {{ m.duration_min }} min • ⭐ {{ m.rating }}</span>
            </div>
            <div class="overlayBottom">
              <span class="sub"><em>Productora:</em> {{ mapProducerName[m.producerId] || m.producerId }}</span>
              <span class="sub">
                <em>Director(es):</em>
                <template v-if="Array.isArray(m.directorIds) && m.directorIds.length">
                  {{ m.directorIds.map((id:string) => mapDirectorName[id] || id).join(", ") }}
                </template>
                <template v-else>—</template>
              </span>
            </div>
          </figcaption>
        </figure>

        <div class="actions">
          <button class="btn sm" @click="startEdit(m)">Editar</button>
          <button class="btn sm ghost" @click="delItem(m._id)">Eliminar</button>
        </div>
      </li>
    </ul>

    <p v-if="!loading && !movies.length" class="empty">No hay películas con ese filtro.</p>

    <!-- MODAL DE EDICIÓN -->
    <div v-if="editingId" class="modal" @click.self="cancelEdit">
      <div class="panel" role="dialog" aria-modal="true">
        <header class="modalHead">
          <strong>Editar película</strong>
          <button class="btn ghost sm" type="button" @click="cancelEdit">Cerrar</button>
        </header>

        <div class="modalBody">
          <div class="modalLeft">
            <img class="poster big" :src="safeUrl(draft.posterUrl)" @error="onImgError" alt="preview edit" />
          </div>
          <form class="modalForm" @submit.prevent="saveEdit">
            <input class="input" v-model="draft.title" placeholder="Título" required />
            <div class="row2">
              <input class="input" v-model.number="draft.year" placeholder="Año" required />
              <input class="input" v-model.number="draft.duration_min" placeholder="Duración (min)" required />
              <input class="input" v-model.number="draft.rating" placeholder="Rating (0-10)" required />
            </div>

            <select class="select" v-model="draft.producerId" required>
              <option disabled value="">-- Productora --</option>
              <option v-for="p in producers" :key="toId(p._id)" :value="toId(p._id)">{{ p.name }}</option>
            </select>

            <select class="select" v-model="draft.directorIds" multiple size="4">
              <option v-for="d in directors" :key="toId(d._id)" :value="toId(d._id)">{{ d.fullName }}</option>
            </select>

            <input class="input" v-model="draft.posterUrl" placeholder="Poster URL (https…)" required />
            <textarea class="textarea" v-model="draft.synopsis" placeholder="Sinopsis" rows="4" required></textarea>

            <div class="row">
              <button class="btn" type="submit" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
              <button class="btn ghost" type="button" @click="cancelEdit">Cancelar</button>
            </div>
          </form>
        </div>
        <p class="hint">Sugerencia: puedes cerrar con la tecla <kbd>Esc</kbd>.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Layout general */
.wrap{ max-width:1080px; margin:0 auto; padding:1rem; }
.title{ margin: 0 0 .25rem 0; }

.controls{ display:flex; gap:.5rem; align-items:center; flex-wrap: wrap; margin:.5rem 0 1rem; }
.input, .select, .textarea{
  background: var(--bg-2);
  color: var(--fg);
  border:1px solid var(--line);
  border-radius: 10px;
  padding:10px 12px;
  outline:none;
  transition: border-color .15s ease, box-shadow .15s ease, background .2s ease;
}
.input:focus, .select:focus, .textarea:focus{
  border-color: rgba(229,9,20,.55);
  box-shadow: 0 0 0 3px rgba(229,9,20,.16);
}
.btn{
  appearance:none;
  background: linear-gradient(180deg, #2a0f12, #1b0709);
  color:#fff;
  border:1px solid rgba(229,9,20,.45);
  border-radius: 12px; padding:10px 14px; font-weight:600;
  cursor:pointer; box-shadow: 0 8px 24px rgba(229,9,20,.15);
}
.btn:hover{ border-color: rgba(229,9,20,.7); }
.btn.ghost{
  background: linear-gradient(180deg, #1b1b26, #14141c);
  border-color:#2a2a36;
  color:#e8e8ea;
}
.btn.sm{ padding:8px 10px; font-size:.9rem; }
.err{ color:#ff6b6b; }

.create{ background: linear-gradient(180deg, #0f0f16, #0c0c12); border:1px solid var(--line); border-radius:12px; padding:10px 12px; }
.create > summary{ cursor:pointer; font-weight:600; }
.grid2{ display:grid; grid-template-columns: repeat(2, 1fr); gap:.5rem; margin-top:.75rem; }
.grid2 .wide{ grid-column: 1 / -1; }

.preview{
  grid-column: 2 / 3;
  display:flex; align-items:center; justify-content:center;
  padding:6px; border:1px dashed #2a2a36; border-radius:10px; min-height:120px;
}
.preview img{ height:120px; width:auto; border-radius:8px; object-fit:cover; }

/* Grilla de cards */
.grid{
  list-style:none; padding:0; margin:12px 0 0;
  display:grid; gap:16px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}
.posterCard{
  border:1px solid var(--line);
  border-radius:14px;
  background: linear-gradient(180deg, #13131b, #111118);
  box-shadow: var(--shadow);
  padding:10px;
  display:flex; flex-direction:column; gap:10px;
}
.posterBox{ position:relative; margin:0; }
.poster{
  width:100%;
  height:320px;
  object-fit:cover;
  border-radius:12px;
  display:block;
  box-shadow: 0 10px 20px rgba(0,0,0,.35);
}
.poster.big{ height:420px; }
.overlay{
  position:absolute; left:8px; right:8px; bottom:8px;
  background: linear-gradient(180deg, rgba(6,6,9,0.05), rgba(6,6,9,0.65) 30%, rgba(6,6,9,0.95));
  border:1px solid rgba(255,255,255,0.06);
  border-radius:10px; padding:8px 10px; color:#e8e8ea;
  backdrop-filter: blur(2px);
}
.overlayTop{ display:flex; flex-direction:column; gap:3px; }
.name{ font-size:1rem; }
.meta{ font-size:.9rem; opacity:.9; }
.overlayBottom{ margin-top:6px; display:flex; flex-direction:column; gap:2px; font-size:.85rem; opacity:.95; }
.sub em{ color:#c9c9d4; font-style:normal; }

.actions{ display:flex; gap:.5rem; }

/* MODAL */
.modal{
  position: fixed; inset: 0;
  display:flex; align-items:center; justify-content:center;
  padding: 16px; background: rgba(0,0,0,.6);
  z-index: 1000;
}
.panel{
  width: min(980px, 100%);
  background: linear-gradient(180deg, #12121a, #0e0e15);
  border: 1px solid #2a2a36;
  border-radius: 14px;
  box-shadow: 0 30px 80px rgba(0,0,0,.55);
  max-height: 90vh;
  overflow: auto;
}
.modalHead{
  display:flex; justify-content:space-between; align-items:center;
  padding: 12px 14px; border-bottom: 1px solid #242432;
}
.modalBody{
  display:grid; grid-template-columns: 340px 1fr; gap: 14px;
  padding: 14px;
}
.modalLeft{
  display:flex; align-items:flex-start; justify-content:center;
}
.modalForm{
  display:flex; flex-direction:column; gap:.6rem;
}
.row{ display:flex; gap:.5rem; }
.row2{ display:grid; grid-template-columns: repeat(3, 1fr); gap:.5rem; }

.hint{
  opacity:.7; font-size:.85rem; padding: 6px 14px 12px;
}

.empty{ opacity:.7; margin-top:10px; }

/* Responsive */
@media (max-width: 860px){
  .modalBody{ grid-template-columns: 1fr; }
  .poster.big{ height:320px; }
}
</style>
