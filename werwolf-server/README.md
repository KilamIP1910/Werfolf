# 🐺 Werwolf-Server

Dieser Server übernimmt:
- **Räume verwalten** (erstellen/beitreten per Code)
- **Rollen geheim verteilen** (jeder Spieler sieht nur seine eigene Rolle)
- **Spielphasen synchronisieren** (Nacht-Reihenfolge, Tag, Abstimmung) – nur der GM steuert den Ablauf
- **Aktionen verarbeiten** (Werwölfe wählen Opfer, Seher schaut, Hexe heilt/vergiftet, usw.)
- **WebRTC-Signaling** weiterleiten, damit Kamera/Mikrofon zwischen den Spielern direkt verbunden werden (Peer-to-Peer)

---

## 1. Lokal starten

```bash
cd werwolf-server
npm install
npm start
```

Der Server läuft dann auf `http://localhost:3001`.

## 2. Online hosten (kostenlos)

Am einfachsten mit **Railway** oder **Render**:

1. Lade den Ordner `werwolf-server` auf GitHub hoch (eigenes Repo)
2. Auf [railway.app](https://railway.app) oder [render.com](https://render.com): "New Project" → "Deploy from GitHub"
3. Der Server startet automatisch (`npm start`). Du bekommst eine URL wie `https://dein-projekt.up.railway.app`
4. Diese URL trägst du im Frontend als `SERVER_URL` ein (siehe unten)

---

## 3. Frontend-Anbindung (React-App)

Im React-Code musst du `socket.io-client` installieren und die Events nutzen:

```bash
npm install socket.io-client
```

```javascript
import { io } from "socket.io-client";

const socket = io("https://dein-projekt.up.railway.app");

// Raum erstellen (GM)
socket.emit("create_room", { name: "Krokoboss", cfg: rollenConfig }, (res) => {
  if (res.ok) setCode(res.code); // res.code = "WOLF-XXXX"
});

// Raum beitreten (Spieler)
socket.emit("join_room", { code: "WOLF-XXXX", name: "LetsHugo" }, (res) => {
  if (res.ok) console.log("Beigetreten!");
});

// Auf Updates hören (wird bei jeder Änderung automatisch gesendet)
socket.on("room_update", (state) => {
  // state.players, state.phase, state.runde, state.aktNachtPhase, ...
  setSpieler(state.players);
  setPhase(state.phase);
});

// GM startet das Spiel
socket.emit("start_game");

// GM startet die Nacht
socket.emit("night_start");

// Spieler reicht eine Nacht-Aktion ein
socket.emit("night_action", { action: "wolfOpfer", payload: { targetId: zielSocketId } });

// GM geht zur nächsten Nacht-Phase / wertet die Nacht aus
socket.emit("next_phase");

// Abstimmung
socket.emit("voting_start");          // GM
socket.emit("vote", { targetId });    // Spieler
socket.emit("voting_resolve");        // GM

// Toast-Nachrichten (z.B. "X ist: Werwolf")
socket.on("toast", ({ msg, ok }) => zeigToast(msg, ok));
```

### Wichtige Events – Übersicht

| Event (Client → Server) | Wer | Beschreibung |
|---|---|---|
| `create_room` | GM | Erstellt Raum, gibt Code zurück |
| `join_room` | Spieler | Tritt Raum bei |
| `update_cfg` | GM | Aktualisiert Rollen-Konfiguration |
| `start_game` | GM | Verteilt Rollen, startet Spiel |
| `night_start` | GM | Beginnt Nacht-Phasen |
| `night_action` | Spieler | Aktion einreichen (Opfer wählen, heilen, etc.) |
| `next_phase` | GM | Nächste Nacht-Rolle / Nacht auswerten |
| `voting_start` | GM | Startet Tagesabstimmung |
| `vote` | Spieler | Stimme abgeben |
| `voting_resolve` | GM | Wertet Abstimmung aus |
| `next_round` | GM | Neue Runde (Nacht) |
| `gm_kill` | GM | Spieler manuell entfernen |

| Event (Server → Client) | Beschreibung |
|---|---|
| `room_update` | Kompletter Spielzustand (individuell pro Spieler – Rollen bleiben geheim) |
| `toast` | Kurze Hinweismeldung (z.B. Seher-Ergebnis) |
| `room_closed` | Raum wurde geschlossen (z.B. GM hat verlassen) |

---

## 4. WebRTC – Kamera & Mikrofon

Der Server leitet nur die "Signaling"-Nachrichten weiter (Verbindungsaufbau), die eigentliche Video/Audio-Übertragung läuft **direkt zwischen den Geräten** (Peer-to-Peer), nicht über den Server.

Empfehlung: nutze die Bibliothek **[simple-peer](https://github.com/feross/simple-peer)** im Frontend – sie übernimmt den kompletten WebRTC-Teil, du musst nur die Signale über die `rtc_signal`-Events weiterleiten:

```javascript
import SimplePeer from "simple-peer";

socket.on("rtc_peer_joined", ({ id }) => {
  const peer = new SimplePeer({ initiator: true, stream: localStream });
  peer.on("signal", (signal) => socket.emit("rtc_signal", { to: id, signal }));
  peer.on("stream", (remoteStream) => { /* remote-video.srcObject = remoteStream */ });
  peers[id] = peer;
});

socket.on("rtc_signal", ({ from, signal }) => {
  if (!peers[from]) {
    peers[from] = new SimplePeer({ initiator: false, stream: localStream });
    peers[from].on("signal", (s) => socket.emit("rtc_signal", { to: from, signal: s }));
    peers[from].on("stream", (remoteStream) => { /* ... */ });
  }
  peers[from].signal(signal);
});

// Beim Beitreten:
socket.emit("rtc_ready");
```

---

## 5. Nächste Schritte für dich

1. Server hochladen (GitHub) und auf Railway/Render deployen
2. Im React-Frontend `socket.io-client` + `simple-peer` einbauen (Stellen, an denen aktuell lokale `useState`-Demo-Logik läuft, durch Socket-Events ersetzen)
3. Testen: zwei Browser-Tabs / zwei Geräte → einer erstellt Raum, der andere tritt mit dem Code bei
