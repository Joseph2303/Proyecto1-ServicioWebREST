<script setup lang="ts">
import { ref } from "vue";
import { api, auth } from "../lib/api";

const emit = defineEmits<{
  (e: "authenticated"): void
}>();

const isLogin = ref(true);
const username = ref("");
const password = ref("");
const errorMsg = ref("");
const loading = ref(false);

async function handleSubmit() {
  errorMsg.value = "";
  loading.value = true;

  try {
    if (isLogin.value) {
      await api.login(username.value, password.value);
    } else {
      await api.register(username.value, password.value);
    }
    emit("authenticated");
  } catch (e: any) {
    errorMsg.value = e.message || "Error de autenticación";
  } finally {
    loading.value = false;
  }
}

function toggle() {
  isLogin.value = !isLogin.value;
  errorMsg.value = "";
}
</script>

<template>
  <div class="authPage">
    <div class="authCard">
      <h1 class="authTitle">{{ isLogin ? "Iniciar Sesión" : "Registro" }}</h1>
      <p class="authSubtitle">Catálogo de Terror</p>

      <form @submit.prevent="handleSubmit" class="authForm">
        <div class="field">
          <label>Usuario</label>
          <input 
            v-model="username" 
            type="text" 
            placeholder="nombre de usuario" 
            required 
            autocomplete="username"
          />
        </div>

        <div class="field">
          <label>Contraseña</label>
          <input 
            v-model="password" 
            type="password" 
            placeholder="••••••••" 
            required 
            autocomplete="current-password"
          />
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

        <button type="submit" class="btnPrimary" :disabled="loading">
          {{ loading ? "Procesando..." : isLogin ? "Entrar" : "Registrarse" }}
        </button>

        <button type="button" class="btnSecondary" @click="toggle">
          {{ isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión" }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.authPage {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: radial-gradient(1200px 800px at 20% -10%, #141418 0%, var(--bg) 40%, #060609 100%);
}

.authCard {
  width: min(420px, 100%);
  background: linear-gradient(180deg, var(--card), var(--card-2));
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 32px 28px;
  box-shadow: var(--shadow);
}

.authTitle {
  font-family: "Cinzel Decorative", serif;
  font-size: 28px;
  text-align: center;
  color: var(--accent);
  margin: 0 0 8px 0;
  text-shadow:
    0 0 6px rgba(229,9,20,.7),
    0 0 14px rgba(229,9,20,.6);
}

.authSubtitle {
  text-align: center;
  color: var(--muted);
  margin: 0 0 24px 0;
  font-size: 14px;
}

.authForm {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg);
}

.field input {
  width: 100%;
}

.error {
  color: #ff6b6b;
  font-size: 14px;
  margin: -8px 0 0 0;
}

.btnPrimary, .btnSecondary {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btnPrimary {
  background: linear-gradient(180deg, #e50914, #b80710);
  border: none;
  color: white;
}

.btnPrimary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(229,9,20,.35);
}

.btnPrimary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btnSecondary {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--muted);
  font-size: 13px;
}

.btnSecondary:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
