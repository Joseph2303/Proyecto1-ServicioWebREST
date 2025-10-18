<script setup lang="ts">
import Movies from './pages/Movies.vue'
import Directors from './pages/Directors.vue'
import Producers from './pages/Producers.vue'
import Login from './pages/Login.vue'
import { ref, onMounted } from 'vue'
import { auth, api } from './lib/api'

const tab = ref<'movies' | 'directors' | 'producers'>('movies')
const isAuthenticated = ref(false)
const user = ref<any>(null)
const processingQueue = ref(false)

function checkAuth() {
  isAuthenticated.value = auth.isAuthenticated()
  user.value = auth.getUser()
}

function handleAuthenticated() {
  checkAuth()
}

function logout() {
  auth.logout()
  checkAuth()
}

async function processQueue() {
  if (processingQueue.value) return
  
  try {
    processingQueue.value = true
    const result = await api.processQueue()
    alert(result.message || `Procesados: ${result.processed}`)
    // Recargar datos
    window.location.reload()
  } catch (e: any) {
    alert(e.message || "Error procesando cola")
  } finally {
    processingQueue.value = false
  }
}

onMounted(() => {
  checkAuth()
})
</script>

<template>
  <!-- Pantalla de login si no está autenticado -->
  <Login v-if="!isAuthenticated" @authenticated="handleAuthenticated" />

  <!-- Aplicación principal si está autenticado -->
  <main v-else class="container">
    <!-- Marquesina / Header -->
    <header class="marquee">
      <div>
        <h1 class="neon">Cine del Pánico</h1>
        <p class="subtitle">Cartelera & catálogo terror</p>
      </div>
      <div class="userInfo">
        <span>👤 {{ user?.username }}</span>
        <button class="btnLogout" @click="logout">Salir</button>
        <button class="btnProcess" @click="processQueue" :disabled="processingQueue">
          {{ processingQueue ? '⏳ Procesando...' : '🔄 Procesar Cola' }}
        </button>
      </div>
    </header>

    <!-- Tabs -->
    <nav class="tabs" role="tablist" aria-label="Secciones">
      <button
        class="tab"
        :class="{ active: tab==='movies' }"
        role="tab"
        :aria-selected="tab==='movies'"
        @click="tab='movies'"
      >🎬 Películas</button>

      <button
        class="tab"
        :class="{ active: tab==='directors' }"
        role="tab"
        :aria-selected="tab==='directors'"
        @click="tab='directors'"
      >🎭 Directores</button>

      <button
        class="tab"
        :class="{ active: tab==='producers' }"
        role="tab"
        :aria-selected="tab==='producers'"
        @click="tab='producers'"
      >🏛️ Productoras</button>
    </nav>

    <!-- Contenido -->
    <section class="card">
      <Movies v-if="tab==='movies'" />
      <Directors v-else-if="tab==='directors'" />
      <Producers v-else />
    </section>
  </main>
</template>

<style>
/* Fuentes (import sin tocar index.html) */
@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Inter:wght@400;600&display=swap');

:root{
  --bg:#0b0b0f;
  --bg-2:#0e0e14;
  --fg:#e8e8ea;
  --muted:#a9a9b5;
  --line:#1d1d26;
  --accent:#e50914;       /* rojo neón */
  --accent-2:#8b0000;
  --card:#12121a;
  --card-2:#141420;
  --radius:16px;
  --shadow: 0 10px 30px rgba(0,0,0,.45);
}

*{ box-sizing:border-box; }
html,body,#app{ height:100%; }
body{
  margin:0; color:var(--fg);
  background: radial-gradient(1200px 800px at 20% -10%, #141418 0%, var(--bg) 40%, #060609 100%);
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  overflow-y: overlay;
}

/* Film grain overlay */
body::before{
  content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='table' tableValues='0 0 .08 .12 .16 .12 .08 0'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity:.13; mix-blend-mode:soft-light;
}

/* Contenedor principal */
.container{
  max-width:1080px; margin:24px auto 48px; padding:0 16px; position:relative; z-index:1;
}

/* Marquesina / header */
.marquee{
  display:flex; align-items:center; justify-content:space-between; 
  padding:28px 16px 22px; margin:18px 0 10px; position:relative;
  flex-wrap: wrap;
  gap: 16px;
}
.marquee::after, .marquee::before{
  content:""; position:absolute; left:0; right:0; height:2px; opacity:.45;
  background:linear-gradient(90deg, transparent, var(--accent), transparent);
}
.marquee::before{ top:0; } .marquee::after{ bottom:0; }

.userInfo{
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
}
.userInfo span{
  color:var(--fg); font-size:14px; font-weight:600;
}
.btnLogout, .btnProcess{
  padding:8px 14px; border-radius:8px; font-size:13px; font-weight:600;
  cursor:pointer; transition: all 0.2s ease; border:1px solid;
}
.btnLogout{
  background:linear-gradient(180deg, #2a1416, #1a0b0d);
  border-color:rgba(229,9,20,.4);
  color:#fff;
}
.btnLogout:hover{
  border-color:rgba(229,9,20,.7);
  transform:translateY(-1px);
}
.btnProcess{
  background:linear-gradient(180deg, #1b2a26, #0d1a16);
  border-color:rgba(34,197,94,.4);
  color:#a7f3d0;
}
.btnProcess:hover:not(:disabled){
  border-color:rgba(34,197,94,.7);
  transform:translateY(-1px);
}
.btnProcess:disabled{
  opacity:0.5;
  cursor:not-allowed;
}

.neon{
  font-family:"Cinzel Decorative", serif;
  font-weight:700; letter-spacing:.06em; text-transform:uppercase;
  color:#fff; font-size:clamp(28px, 5vw, 52px);
  text-shadow:
    0 0 6px rgba(229,9,20,.7),
    0 0 14px rgba(229,9,20,.6),
    0 0 28px rgba(229,9,20,.4);
  animation: flicker 4.5s infinite both;
}
.subtitle{ margin-top:6px; color:var(--muted); }

@keyframes flicker{
  0%,19%,22%,62%,64%,70%,100%{ opacity:1; }
  20%,63%{ opacity:.55; }
  65%{ opacity:.8; }
}

/* Tabs */
.tabs{ display:flex; gap:8px; flex-wrap:wrap; margin:16px 0 18px; }
.tab{
  background: linear-gradient(180deg, #1b1b26, #14141c);
  border:1px solid var(--line);
  border-radius: var(--radius);
  padding:10px 14px;
  display:flex; align-items:center; gap:8px; cursor:pointer;
  box-shadow: var(--shadow);
  transition: transform .06s ease, border-color .2s ease, box-shadow .2s ease, background .2s ease;
  user-select:none; color:var(--fg);
}
.tab:hover{ transform: translateY(-1px); border-color:#2a2a36; }
.tab.active{
  border-color: rgba(229,9,20,.6);
  box-shadow: 0 0 0 2px rgba(229,9,20,.18), var(--shadow);
  background: linear-gradient(180deg, #1f1f2b, #14141c);
}

/* Tarjeta contenedora */
.card{
  background: linear-gradient(180deg, var(--card), var(--card-2));
  border:1px solid var(--line);
  border-radius: var(--radius);
  padding:16px;
  box-shadow: var(--shadow);
}

/* Estilizado general de formularios y listas */
input, select, textarea{
  background: var(--bg-2);
  color: var(--fg);
  border:1px solid var(--line);
  border-radius: 10px;
  padding:10px 12px;
  outline:none;
  transition: border-color .15s ease, box-shadow .15s ease, background .2s ease;
}
input::placeholder, textarea::placeholder{ color:#888; }
textarea{ resize: vertical; }
select[multiple]{ min-height: 120px; }

input:focus, select:focus, textarea:focus{
  border-color: rgba(229,9,20,.55);
  box-shadow: 0 0 0 3px rgba(229,9,20,.16);
}

button{
  appearance:none;
  background: linear-gradient(180deg, #2a0f12, #1b0709);
  color:#fff;
  border:1px solid rgba(229,9,20,.45);
  border-radius: 12px;
  padding:10px 14px;
  font-weight:600;
  cursor:pointer;
  box-shadow: 0 8px 24px rgba(229,9,20,.15);
  transition: transform .06s ease, box-shadow .15s ease, filter .15s ease, border-color .15s ease;
}
button:hover{
  transform: translateY(-1px);
  border-color: rgba(229,9,20,.7);
  box-shadow: 0 10px 28px rgba(229,9,20,.22);
}
button:active{ transform: translateY(0); }

/* details/summary */
details{
  background: linear-gradient(180deg, #0f0f16, #0c0c12);
  border:1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
}
summary{
  list-style:none; cursor:pointer; font-weight:600; color:var(--fg);
}
summary::-webkit-details-marker{ display:none; }

/* Items de lista (como carteles) */
ul{ list-style:none; padding:0; margin:0; }
li{
  border:1px solid var(--line);
  border-radius: 12px;
  background: linear-gradient(180deg, #13131b, #111118);
  box-shadow: var(--shadow);
}
img{
  box-shadow: 0 10px 20px rgba(0,0,0,.35);
}

/* Scrollbar sutil (Chromium) */
*::-webkit-scrollbar{ width:10px; height:10px; }
*::-webkit-scrollbar-thumb{
  background: linear-gradient(180deg, #2a2a38, #20202c);
  border-radius: 8px;
  border:2px solid transparent; background-clip: padding-box;
}
*::-webkit-scrollbar-thumb:hover{ background: linear-gradient(180deg, #333346, #252536); }

/* Texto auxiliar */
em{ color:#c9c9d4; }
</style>
