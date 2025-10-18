<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../lib/api";

const items = ref<any[]>([]);
const form = ref<any>({ fullName:"", nationality:"", birthYear:null, imageUrl:"" });

// edición inline
const editingId = ref<string|null>(null);
const draft = ref<any>({});
const saving = ref(false);

// ---- helpers de ids (mismo que en Movies) ----
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

// ---- normalización + util de imagen ----
const FALLBACK_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0%' stop-color='#191922'/><stop offset='100%' stop-color='#0d0d14'/>
    </linearGradient></defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <circle cx='80' cy='60' r='26' fill='#2a2a36'/>
    <rect x='30' y='100' width='100' height='40' rx='8' fill='#2a2a36'/>
    <text x='50%' y='155' dominant-baseline='middle' text-anchor='middle' fill='#cfcfe6' font-size='10' font-family='Arial, sans-serif'>SIN FOTO</text>
  </svg>`);

function safeUrl(u?: string) {
  if (!u) return FALLBACK_IMG;
  try { return u.startsWith("http://") ? "https://" + u.slice(7) : u; }
  catch { return FALLBACK_IMG; }
}
function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = FALLBACK_IMG;
}

function normalize(d:any){
  return {
    ...d,
    _id: toId(d._id),
    birthYear: d.birthYear != null ? Number(d.birthYear) : d.birthYear,
  };
}

async function load(){
  const raw = await api.list("directors");
  items.value = raw.map(normalize);
}

// ---- CRUD ----
async function add(){
  try {
    const r = await api.create("directors", form.value);
    
    if (r.queued) {
      alert("✓ Director agregado a cola. Procesa la cola para ver cambios.");
      form.value = { fullName:"", nationality:"", birthYear:null, imageUrl:"" };
      return;
    }
    
    items.value.unshift(normalize(r));
    form.value = { fullName:"", nationality:"", birthYear:null, imageUrl:"" };
    window.dispatchEvent(new Event('catalog:changed'));
  } catch (e: any) {
    alert(e?.message || "Error al crear director");
  }
}

async function delItem(id: string){
  if (!confirm("¿Eliminar este director?")) return;
  try {
    await api.remove("directors", id);
    alert("✓ Eliminación procesada.");
    items.value = items.value.filter(x=>x._id!==id);
    window.dispatchEvent(new Event('catalog:changed'));
  } catch (e: any) {
    alert(e?.message || "Error al eliminar");
  }
}

function startEdit(d:any){
  editingId.value = d._id;
  draft.value = { ...d }; // ya normalizado
}
function cancelEdit(){
  editingId.value = null;
  draft.value = {};
}

async function saveEdit(){
  if (!editingId.value) return;
  try{
    saving.value = true;
    const id = editingId.value;
    const payload = { ...draft.value };
    delete (payload as any)._id;

    const updated = await api.update("directors", id, payload);

    // Si está en cola
    if (updated && updated.queued) {
      alert("✓ Cambios enviados a cola. Procesa la cola para aplicar.");
      cancelEdit();
      window.dispatchEvent(new Event('catalog:changed'));
      return;
    }

    // si el backend devuelve el doc actualizado, úsalo
    let fresh = updated && updated._id ? normalize(updated) : null;

    // fallback: si no devolvió doc, léelo por id
    if (!fresh) {
      try { fresh = normalize(await api.read("directors", id)); } catch {}
    }
    // plan C: mezcla local
    if (!fresh) fresh = normalize({ ...draft.value, _id:id });

    const idx = items.value.findIndex(x=>x._id===id);
    if (idx>=0) items.value[idx] = fresh;

    cancelEdit();
    window.dispatchEvent(new Event('catalog:changed'));
  }catch(e:any){
    const msg = e?.message || "";
    if (msg.includes("Not found")) {
      await load();
      cancelEdit();
      return;
    }
    alert(msg || "Error al guardar");
  }finally{
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section style="max-width:1000px; margin:0 auto; padding:1rem;">
    <h2>Directores</h2>

    <details style="margin:1rem 0;">
      <summary style="cursor:pointer; font-weight:600;">➕ Agregar director</summary>
      <form @submit.prevent="add" style="display:grid; gap:.5rem; grid-template-columns: repeat(2, 1fr); margin-top:.75rem;">
        <input v-model="form.fullName" placeholder="Nombre completo" required />
        <input v-model="form.nationality" placeholder="Nacionalidad" required />
        <input v-model.number="form.birthYear" placeholder="Año de nacimiento" required />
        <input v-model="form.imageUrl" placeholder="Foto URL (https…)" style="grid-column:1/-1" required />
        <div style="grid-column:1/-1; display:flex; align-items:center; gap:.75rem;">
          <img :src="safeUrl(form.imageUrl)" @error="onImgError" alt="" style="height:64px; width:64px; border-radius:8px; object-fit:cover; border:1px solid #2a2a36;" />
          <small style="opacity:.75">Vista previa</small>
        </div>
        <button style="grid-column:1/-1">Guardar</button>
      </form>
    </details>

    <ul style="list-style:none; padding:0;">
      <li v-for="d in items" :key="d._id" style="display:flex; gap:12px; align-items:flex-start; margin:.5rem 0; border:1px solid #2a2a36; background:linear-gradient(180deg,#13131b,#111118); border-radius:10px; padding:.5rem;">
        <img :src="editingId===d._id ? safeUrl(draft.imageUrl) : safeUrl(d.imageUrl)" @error="onImgError" alt=""
             style="height:64px; width:64px; border-radius:8px; object-fit:cover; border:1px solid #2a2a36;" />
        <div style="flex:1">
          <!-- vista normal -->
           <br>
          </br>
          <template v-if="editingId!==d._id">
            <strong>{{ d.fullName }}</strong> — {{ d.nationality }} ({{ d.birthYear }})
          </template>

          <!-- edición -->
          <template v-else>
            <form @submit.prevent="saveEdit" style="display:grid; gap:.5rem; grid-template-columns: repeat(2, 1fr);">
              <input v-model="draft.fullName" placeholder="Nombre completo" required />
              <input v-model="draft.nationality" placeholder="Nacionalidad" required />
              <input v-model.number="draft.birthYear" placeholder="Año de nacimiento" required />
              <input v-model="draft.imageUrl" placeholder="Foto URL (https…)" style="grid-column:1/-1" required />
              <div style="grid-column:1/-1; display:flex; align-items:center; gap:.75rem;">
                <img :src="safeUrl(draft.imageUrl)" @error="onImgError" alt=""
                     style="height:64px; width:64px; border-radius:8px; object-fit:cover; border:1px solid #2a2a36;" />
                <small style="opacity:.75">Vista previa</small>
              </div>
              <div style="grid-column:1/-1; display:flex; gap:.5rem;">
                <button type="submit" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
                <button type="button" @click="cancelEdit">Cancelar</button>
              </div>
            </form>
          </template>
        </div>

        <div style="display:flex; flex-direction:column; gap:.5rem;">
          <button v-if="editingId!==d._id" @click="startEdit(d)">Editar</button>
          <button v-else @click="cancelEdit">Cerrar</button>
          <button @click="delItem(d._id)">Eliminar</button>
        </div>
      </li>
    </ul>
  </section>
</template>
