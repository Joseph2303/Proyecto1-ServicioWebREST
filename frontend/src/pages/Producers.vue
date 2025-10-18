<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../lib/api";

const items = ref<any[]>([]);
const form = ref<any>({ name:"", country:"", foundedYear:null, logoUrl:"" });

// edición inline
const editingId = ref<string|null>(null);
const draft = ref<any>({});
const saving = ref(false);

const toId = (v: any): string => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (typeof (v as any).toHexString === "function") return (v as any).toHexString();
    if ("$oid" in (v as any)) return (v as any)["$oid"];
  }
  return String(v);
};

const FALLBACK_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' width='120' height='48'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='0'>
      <stop offset='0%' stop-color='#1a1a24'/><stop offset='100%' stop-color='#0d0d14'/>
    </linearGradient></defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#cfcfe6' font-size='12' font-family='Arial, sans-serif'>LOGO</text>
  </svg>`);

function safeUrl(u?: string) {
  if (!u) return FALLBACK_LOGO;
  try { return u.startsWith("http://") ? "https://" + u.slice(7) : u; }
  catch { return FALLBACK_LOGO; }
}
function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = FALLBACK_LOGO;
}

function normalize(p:any){
  return {
    ...p,
    _id: toId(p._id),
    foundedYear: p.foundedYear != null ? Number(p.foundedYear) : p.foundedYear,
  };
}

async function load(){ 
  const raw = await api.list("producers");
  items.value = raw.map(normalize); 
}

async function add(){
  try {
    const r = await api.create("producers", form.value);
    
    if (r.queued) {
      alert("✓ Productora agregada a cola. Procesa la cola para ver cambios.");
      form.value = { name:"", country:"", foundedYear:null, logoUrl:"" };
      return;
    }
    
    items.value.unshift(normalize(r));
    form.value = { name:"", country:"", foundedYear:null, logoUrl:"" };
    window.dispatchEvent(new Event('catalog:changed'));
  } catch (e: any) {
    alert(e?.message || "Error al crear productora");
  }
}

async function delItem(id: string){
  if (!confirm("¿Eliminar esta productora?")) return;
  try {
    await api.remove("producers", id);
    alert("✓ Eliminación procesada.");
    items.value = items.value.filter(x=>x._id!==id);
    window.dispatchEvent(new Event('catalog:changed'));
  } catch (e: any) {
    alert(e?.message || "Error al eliminar");
  }
}

function startEdit(p:any){
  editingId.value = p._id;
  draft.value = { ...p };
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

    const updated = await api.update("producers", id, payload);

    if (updated && updated.queued) {
      alert("✓ Cambios enviados a cola. Procesa la cola para aplicar.");
      cancelEdit();
      window.dispatchEvent(new Event('catalog:changed'));
      return;
    }

    let fresh = updated && updated._id ? normalize(updated) : null;
    if (!fresh) {
      try { fresh = normalize(await api.read("producers", id)); } catch {}
    }
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
    <h2>Productoras</h2>

    <details style="margin:1rem 0;">
      <summary style="cursor:pointer; font-weight:600;">➕ Agregar productora</summary>
      <form @submit.prevent="add" style="display:grid; gap:.5rem; grid-template-columns: repeat(2, 1fr); margin-top:.75rem;">
        <input v-model="form.name" placeholder="Nombre" required />
        <input v-model="form.country" placeholder="País" required />
        <input v-model.number="form.foundedYear" placeholder="Año de fundación" required />
        <input v-model="form.logoUrl" placeholder="Logo URL (https…)" style="grid-column:1/-1" required />
        <div style="grid-column:1/-1; display:flex; align-items:center; gap:.75rem;">
          <img :src="safeUrl(form.logoUrl)" @error="onImgError" alt="" style="height:48px; width:auto; border-radius:6px; object-fit:contain; border:1px solid #2a2a36; background:#0d0d14; padding:4px;" />
          <small style="opacity:.75">Vista previa</small>
        </div>
        <button style="grid-column:1/-1">Guardar</button>
      </form>
    </details>

    <ul style="list-style:none; padding:0;">
      <li v-for="p in items" :key="p._id" style="display:flex; gap:12px; align-items:flex-start; margin:.5rem 0; border:1px solid #2a2a36; background:linear-gradient(180deg,#13131b,#111118); border-radius:10px; padding:.5rem;">
        <img :src="editingId===p._id ? safeUrl(draft.logoUrl) : safeUrl(p.logoUrl)" @error="onImgError" alt=""
             style="height:48px; width:auto; border-radius:6px; object-fit:contain; background:#0d0d14; padding:4px; border:1px solid #2a2a36;" />
        <div style="flex:1">
          <br/>
          <!-- vista normal -->
          <template v-if="editingId!==p._id">
            <strong>{{ p.name }}</strong> — {{ p.country }} ({{ p.foundedYear }})
          </template>

          <!-- edición -->
          <template v-else>
            <form @submit.prevent="saveEdit" style="display:grid; gap:.5rem; grid-template-columns: repeat(2, 1fr);">
              <input v-model="draft.name" placeholder="Nombre" required />
              <input v-model="draft.country" placeholder="País" required />
              <input v-model.number="draft.foundedYear" placeholder="Año de fundación" required />
              <input v-model="draft.logoUrl" placeholder="Logo URL (https…)" style="grid-column:1/-1" required />
              <div style="grid-column:1/-1; display:flex; align-items:center; gap:.75rem;">
                <img :src="safeUrl(draft.logoUrl)" @error="onImgError" alt=""
                     style="height:48px; width:auto; border-radius:6px; object-fit:contain; border:1px solid #2a2a36; background:#0d0d14; padding:4px;" />
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
          <button v-if="editingId!==p._id" @click="startEdit(p)">Editar</button>
          <button v-else @click="cancelEdit">Cerrar</button>
          <button @click="delItem(p._id)">Eliminar</button>
        </div>
      </li>
    </ul>
  </section>
</template>
