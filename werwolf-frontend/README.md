# 🐺 Werwolf Frontend

React-App für das Online-Werwolf-Spiel mit Kamera und Multiplayer.

## Lokal starten

```bash
npm install
npm start
```

Öffnet automatisch http://localhost:3000

## Deployen (z.B. auf Vercel – kostenlos)

1. Diesen Ordner auf GitHub hochladen (eigenes Repo, z.B. `werwolf-frontend`)
2. Auf [vercel.com](https://vercel.com) → "New Project" → GitHub Repo auswählen
3. Build Command: `npm run build`  
   Output Directory: `build`
4. Deploy klicken → fertig!

## Server

Der Backend-Server läuft auf Railway:  
`https://werwolf-production.up.railway.app`

Die URL ist direkt in `src/App.jsx` eingetragen (`SERVER_URL`).
