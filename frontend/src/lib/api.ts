const BASE = import.meta.env.VITE_API_BASE || "/.netlify/functions";

// Manejo de token JWT en localStorage
export const auth = {
  getToken(): string | null {
    return localStorage.getItem("token");
  },
  setToken(token: string) {
    localStorage.setItem("token", token);
  },
  removeToken() {
    localStorage.removeItem("token");
  },
  getUser(): any {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },
  setUser(user: any) {
    localStorage.setItem("user", JSON.stringify(user));
  },
  removeUser() {
    localStorage.removeItem("user");
  },
  isAuthenticated(): boolean {
    return !!this.getToken();
  },
  logout() {
    this.removeToken();
    this.removeUser();
  }
};

async function j(res: Response) {
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `HTTP ${res.status}`);
  }
  // puede venir 204
  try { return await res.json(); } catch { return null as any; }
}

function headers() {
  const h: Record<string, string> = {
    "Content-Type": "application/json"
  };
  const token = auth.getToken();
  if (token) {
    h["Authorization"] = `Bearer ${token}`;
  }
  return h;
}

export const api = {
  // Autenticación
  async login(username: string, password: string) {
    const r = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await j(r);
    if (data.token) {
      auth.setToken(data.token);
      auth.setUser(data.user);
    }
    return data;
  },
  
  async register(username: string, password: string) {
    const r = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await j(r);
    if (data.token) {
      auth.setToken(data.token);
      auth.setUser(data.user);
    }
    return data;
  },

  // Procesar cola de RabbitMQ
  async processQueue() {
    const r = await fetch(`${BASE}/process-queue`, {
      method: "POST",
      headers: headers(),
    });
    return j(r);
  },

  // CRUD genérico
  async list(resource: string, qs = "") {
    const r = await fetch(`${BASE}/${resource}${qs}`, {
      headers: headers()
    });
    return j(r);
  },
  
  async read(resource: string, id: string) {
    const r = await fetch(`${BASE}/${resource}/${id}`, {
      headers: headers()
    });
    return j(r);
  },
  
  async create(resource: string, body: any) {
    const r = await fetch(`${BASE}/${resource}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    return j(r);
  },
  
  async update(resource: string, id: string, body: any) {
    const url = `${BASE}/${resource}/${encodeURIComponent(id)}?id=${encodeURIComponent(id)}`;
    const r = await fetch(url, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(body),
    });
    return j(r);
  },
  
  async remove(resource: string, id: string) {
    const r = await fetch(`${BASE}/${resource}/${id}`, { 
      method: "DELETE",
      headers: headers()
    });
    return r.ok;
  },
};
