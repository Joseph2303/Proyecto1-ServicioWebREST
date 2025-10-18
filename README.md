# Proyecto 2 - Catálogo de Películas de Terror

## 📋 Descripción

Aplicación web full-stack para gestionar un catálogo de películas de terror, directores y productoras. Implementa arquitectura serverless con Netlify Functions, MongoDB Atlas, RabbitMQ para actualizaciones diferidas y autenticación JWT.

---

## 🏗️ Arquitectura

### Backend (Netlify Functions)
- **Autenticación**: JWT con bcryptjs para hash de contraseñas
- **Base de Datos**: MongoDB Atlas (en la nube)
- **Cola de Mensajes**: RabbitMQ para actualizaciones diferidas
- **Funciones Serverless**: Node.js con ES Modules

### Frontend
- **Framework**: Vue 3 con Composition API
- **Lenguaje**: TypeScript
- **Build Tool**: Vite
- **Estilos**: CSS personalizado con tema oscuro "terror"

---

## 🔑 Arquitectura de Dos Niveles

### Nivel 1: Captura de Actualizaciones
Todas las operaciones **CREATE**, **UPDATE** y **DELETE** son capturadas por Netlify Functions y enviadas a una cola de RabbitMQ:

```
Frontend → POST/PATCH/DELETE → Netlify Function → RabbitMQ Queue
```

### Nivel 2: Procesamiento Diferido
Una función especial (`process-queue`) lee todos los mensajes pendientes de RabbitMQ y los aplica en MongoDB:

```
URL Especial → process-queue Function → Lee RabbitMQ → Aplica en MongoDB
```

### Consultas (GET)
Las consultas **NO** pasan por RabbitMQ, van directo a MongoDB:

```
Frontend → GET → Netlify Function → MongoDB → Respuesta
```

---

## 📁 Estructura del Proyecto

```
Proyecto1-ServicioWebREST/
├── netlify/
│   └── functions/
│       ├── _auth.js           # Módulo JWT (tokens, hash)
│       ├── _db.js             # Módulo MongoDB (conexión, helpers)
│       ├── _rabbitmq.js       # Módulo RabbitMQ (conexión, cola)
│       ├── auth.js            # Login & Register
│       ├── process-queue.js   # ⭐ Procesa cola de RabbitMQ
│       ├── directors.js       # CRUD Directores
│       ├── producers.js       # CRUD Productoras
│       └── movies.js          # CRUD Películas
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── api.ts         # Cliente HTTP + Auth
│   │   ├── pages/
│   │   │   ├── Login.vue      # Autenticación
│   │   │   ├── Movies.vue     # Gestión películas
│   │   │   ├── Directors.vue  # Gestión directores
│   │   │   └── Producers.vue  # Gestión productoras
│   │   ├── App.vue            # Componente raíz
│   │   └── main.ts            # Entry point
│   ├── index.html
│   └── package.json
├── data/                      # Datos semilla (JSON)
├── seed.mjs                   # Script de importación
├── package.json
├── netlify.toml
└── README.md
```

---

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/Joseph2303/Proyecto1-ServicioWebREST.git
cd Proyecto1-ServicioWebREST
```

### 2. Instalar dependencias

```bash
# Backend (raíz)
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 3. Configurar variables de entorno

Crear archivo `.env` en la raíz:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/
DB_NAME=terror

# RabbitMQ (CloudAMQP u otro servicio)
RABBITMQ_URL=amqps://usuario:password@servidor.cloudamqp.com/vhost

# JWT Secret
JWT_SECRET=tu-secreto-super-seguro-cambialo-en-produccion
```

### 4. Poblar la base de datos

```bash
npm run seed
```

---

## 💻 Desarrollo Local

```bash
# Iniciar servidor de desarrollo (frontend + functions)
npm run dev

# O por separado:
# Backend: netlify dev
# Frontend: cd frontend && npm run dev
```

El sitio estará disponible en:
- Frontend: `http://localhost:8888` (Netlify Dev)
- Functions: `http://localhost:8888/.netlify/functions/`

---

## 🌐 URLs de la Aplicación

### Producción (Netlify)
- **Sitio Web**: `https://tu-sitio.netlify.app`
- **API Base**: `https://tu-sitio.netlify.app/.netlify/functions`

### Endpoints Importantes

#### Autenticación
- `POST /.netlify/functions/auth/login` - Iniciar sesión
- `POST /.netlify/functions/auth/register` - Registrarse

#### Procesar Cola ⭐
- `POST /.netlify/functions/process-queue` - **URL ESPECIAL** para aplicar cambios pendientes

#### CRUD (requieren autenticación para CREATE/UPDATE/DELETE)
- `GET/POST /.netlify/functions/movies`
- `GET/PATCH/DELETE /.netlify/functions/movies/:id`
- `GET/POST /.netlify/functions/directors`
- `GET/PATCH/DELETE /.netlify/functions/directors/:id`
- `GET/POST /.netlify/functions/producers`
- `GET/PATCH/DELETE /.netlify/functions/producers/:id`

---

## 👤 Credenciales de Prueba

### Usuario de Ejemplo
```
Username: admin
Password: admin123
```

### Crear Nuevo Usuario
1. Ir al sitio web
2. Clic en "¿No tienes cuenta? Regístrate"
3. Ingresar username y password
4. El sistema crea el usuario automáticamente

---

## 🔄 Flujo de Trabajo

### 1. Autenticación
```
Usuario → Login → Recibe JWT Token → Almacenado en localStorage
```

### 2. Crear/Actualizar/Eliminar
```
Usuario → Acción (CREATE/UPDATE/DELETE) → Netlify Function
    ↓
Valida JWT Token → Envía mensaje a RabbitMQ → Retorna "queued: true"
    ↓
Usuario ve mensaje: "Enviado a cola. Procesa la cola para aplicar."
```

### 3. Procesar Cola (Manual o Automático)
```
Usuario/Admin → Clic en "Procesar Cola" → Llamada a process-queue
    ↓
Lee TODOS los mensajes de RabbitMQ → Aplica en MongoDB → Retorna resumen
    ↓
Frontend recarga automáticamente
```

### 4. Consultas
```
Usuario → GET request → Netlify Function → MongoDB → Respuesta inmediata
```

---

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** 20+ (ES Modules)
- **MongoDB** 6.19.0 - Base de datos NoSQL
- **RabbitMQ** (amqplib 0.10.5) - Cola de mensajes
- **JWT** (jsonwebtoken 9.0.2) - Autenticación
- **bcryptjs** 2.4.3 - Hash de contraseñas
- **Netlify Functions** - Serverless

### Frontend
- **Vue 3.5** - Framework reactivo
- **TypeScript 5.6** - Tipado estático
- **Vite 5.4** - Build tool
- **CSS Variables** - Theming

---

## 📊 Esquema de Base de Datos

### Collection: `users`
```javascript
{
  _id: ObjectId,
  username: String (único),
  password: String (hasheado con bcrypt),
  createdAt: Date
}
```

### Collection: `directors`
```javascript
{
  _id: ObjectId,
  fullName: String,
  nationality: String,
  birthYear: Number,
  imageUrl: String
}
```

### Collection: `producers`
```javascript
{
  _id: ObjectId,
  name: String,
  country: String,
  foundedYear: Number,
  logoUrl: String
}
```

### Collection: `movies`
```javascript
{
  _id: ObjectId,
  title: String,
  year: Number,
  duration_min: Number,
  rating: Number,
  synopsis: String,
  posterUrl: String,
  producerId: ObjectId | String,  // Referencia a producers
  directorIds: [ObjectId | String]  // Referencias a directors
}
```

---

## 🔐 Seguridad

### Autenticación JWT
- Tokens firmados con `JWT_SECRET`
- Expiración: 7 días
- Almacenados en `localStorage` del navegador

### Protección de Rutas
- **GET**: Público (lectura sin autenticación)
- **POST/PATCH/DELETE**: Requieren token JWT válido

### Hash de Contraseñas
- bcryptjs con salt rounds = 10
- Nunca se almacenan contraseñas en texto plano

---

## 📤 Despliegue en Netlify

### 1. Conectar repositorio

```bash
# En Netlify Dashboard
New site from Git → GitHub → Seleccionar repositorio
```

### 2. Configurar Build

```
Build command: npm --prefix frontend ci && npm --prefix frontend run build
Publish directory: frontend/dist
Functions directory: netlify/functions
```

### 3. Variables de entorno

En Netlify Dashboard → Site settings → Environment variables:
- `MONGODB_URI`
- `DB_NAME`
- `RABBITMQ_URL`
- `JWT_SECRET`

### 4. Deploy

```bash
git push origin master
# Netlify detecta automáticamente y deploya
```

---

## 🧪 Pruebas de Funcionamiento

### 1. Registro de Usuario
```
1. Abrir sitio
2. Clic en "Regístrate"
3. Ingresar: username="testuser", password="test123"
4. ✓ Debe crear usuario y redirigir a app
```

### 2. Login
```
1. Usar credenciales: admin / admin123
2. ✓ Debe mostrar catálogo completo
```

### 3. Crear Película
```
1. Tab "Películas" → "Agregar película"
2. Llenar formulario
3. ✓ Mensaje: "Enviado a cola"
4. Clic en "Procesar Cola"
5. ✓ Película aparece en lista
```

### 4. Actualizar Director
```
1. Tab "Directores" → Clic en "Editar"
2. Modificar datos
3. ✓ Mensaje: "Cambios enviados a cola"
4. Procesar cola
5. ✓ Cambios aplicados
```

### 5. Eliminar Productora
```
1. Tab "Productoras" → "Eliminar"
2. Confirmar
3. ✓ Mensaje: "Eliminación procesada"
4. Procesar cola
5. ✓ Productora eliminada
```

---

## 📝 Notas Importantes

### ⚠️ Procesamiento de Cola
- **Manual**: Usuario debe hacer clic en "Procesar Cola"
- **Alternativa**: Crear cron job o webhook que llame a `process-queue` periódicamente
- Los cambios NO son inmediatos hasta procesar la cola

### 🔍 Consultas vs Actualizaciones
- **Consultas (GET)**: Instantáneas, sin cola
- **Actualizaciones (POST/PATCH/DELETE)**: Diferidas, requieren procesar cola

### 🎨 Relaciones entre Datos
- Películas muestran nombres de directores y productoras
- Al editar una película, se pueden seleccionar múltiples directores
- Las relaciones se resuelven en el frontend usando mapas

---

## 📞 Soporte

**Autor**: Joseph2303  
**Repositorio**: [GitHub - Proyecto1-ServicioWebREST](https://github.com/Joseph2303/Proyecto1-ServicioWebREST)

---

## 📄 Licencia

Este proyecto es parte de un trabajo académico.

---

## ✅ Checklist de Entrega

- [x] Frontend en Vue.js con autenticación
- [x] Backend con Netlify Functions
- [x] MongoDB Atlas configurado
- [x] RabbitMQ integrado
- [x] JWT implementado
- [x] Función process-queue funcionando
- [x] CRUD completo (agregar, modificar, eliminar, consultar)
- [x] Relaciones entre colecciones
- [x] Documentación completa
- [ ] Sitio publicado en Netlify
- [ ] URL de process-queue documentada
- [ ] Credenciales de prueba proporcionadas

---

**Última actualización**: 17 de octubre de 2025
