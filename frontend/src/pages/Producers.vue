<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../lib/api";

const items = ref<any[]>([]);
const form = ref<any>({ name:"", country:"", foundedYear:null, logoUrl:"" });

async function load(){ items.value = await api.list("producers"); }
async function add(){
  const r = await api.create("producers", form.value);
  items.value.unshift(r);
  form.value = { name:"", country:"", foundedYear:null, logoUrl:"" };
}
async function delItem(id: string){
  if (!confirm("¿Eliminar esta productora?")) return;
  await api.remove("producers", id);
  items.value = items.value.filter(x=>x._id!==id);
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
        <input v-model="form.logoUrl" placeholder="Logo URL" style="grid-column:1/-1" required />
        <button style="grid-column:1/-1">Guardar</button>
      </form>
    </details>

    <ul style="list-style:none; padding:0;">
      <li v-for="p in items" :key="p._id" style="display:flex; gap:12px; align-items:center; margin:.5rem 0; border:1px solid #eee; border-radius:8px; padding:.5rem;">
        <img :src="p.logoUrl" alt="" style="height:48px; width:auto; border-radius:6px" />
        <div style="flex:1">
          <strong>{{ p.name }}</strong> — {{ p.country }} ({{ p.foundedYear }})
        </div>
        <button @click="delItem(p._id)">Eliminar</button>
      </li>
    </ul>
  </section>
</template>
