# Lexteriq — YouTube Analytics Extension

> Analiza videos de YouTube en tiempo real: SEO score, keywords ocultas, métricas de canal y más. La alternativa open-source a VidIQ.

![Version](https://img.shields.io/badge/version-1.0.0-4f98a3)
![Manifest](https://img.shields.io/badge/manifest-v3-green)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)

## ✨ Features

- **SEO Score** — Puntuación 0-100 basada en título, descripción y tags
- **Tags ocultos** — Ve los tags de cualquier video (YouTube los oculta)
- **Keywords detectadas** — Extrae keywords del título y descripción
- **Estadísticas completas** — Vistas, likes, comentarios, engagement rate
- **Info de canal** — Suscriptores, videos totales, vistas del canal
- **Checklist SEO** — Qué optimizar para mejorar el posicionamiento
- **Búsqueda de keywords** — Ideas de keywords desde el popup
- **Autenticación Google** — Login con tu cuenta de Google

## 🏗️ Estructura del proyecto

```
Lexteriq/
├── manifest.json              # MV3 — configuración de la extensión
├── popup.html                 # Popup de la extensión
├── src/
│   ├── background/
│   │   └── background.js      # Service Worker (YouTube API + auth)
│   ├── content/
│   │   └── youtube.js         # Content script inyectado en YouTube
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── styles/
│       └── panel.css          # Estilos del panel lateral
├── images/                    # Íconos de la extensión (agregar)
└── _locales/
    └── es/messages.json
```

## 🚀 Instalación (Desarrollo)

1. Clona el repositorio:
   ```bash
   git clone https://github.com/luisitoys12/Lexteriq.git
   cd Lexteriq
   ```

2. Configura Firebase:
   - Crea un proyecto en [Firebase Console](https://console.firebase.google.com)
   - Edita `src/background/background.js` y reemplaza `FIREBASE_CONFIG`

3. Configura Google OAuth:
   - Ve a [Google Cloud Console](https://console.cloud.google.com)
   - Crea credenciales OAuth 2.0 para extensión de Chrome
   - Reemplaza `client_id` en `manifest.json`

4. Habilita YouTube Data API v3:
   - En Google Cloud Console → APIs → YouTube Data API v3
   - La extensión usa el token OAuth del usuario (no necesitas API key separada)

5. Carga en Chrome:
   - Abre `chrome://extensions/`
   - Activa **Modo desarrollador**
   - Haz clic en **Cargar descomprimida**
   - Selecciona la carpeta del proyecto

## 🔧 Configuración requerida

### Firebase (`src/background/background.js`)
```javascript
const FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  // ...
};
```

### OAuth2 (`manifest.json`)
```json
"oauth2": {
  "client_id": "TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
}
```

## 📋 Roadmap

- [x] Fase 1 — Estructura base MV3 + content script YouTube
- [x] Fase 1 — SEO Score calculator
- [x] Fase 1 — Panel lateral inyectado
- [x] Fase 1 — Popup con tabs
- [ ] Fase 2 — Firebase Auth completa
- [ ] Fase 3 — YouTube Data API v3 integración completa
- [ ] Fase 4 — Keyword Ideas API (Firebase Function)
- [ ] Fase 5 — Sistema de planes Free/Pro
- [ ] Fase 6 — Web dashboard (lexteriq.com)

## 🛠️ Tech Stack

| Capa | Tecnología |
|------|------------|
| Extensión | Chrome MV3 |
| Auth | Google OAuth + Firebase Auth |
| DB | Firestore |
| YouTube | YouTube Data API v3 |
| API | Firebase Functions |
| Dashboard | Next.js + Vercel |

## 📄 License

GPL-3.0 — Ver [LICENSE](LICENSE)
