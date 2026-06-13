// ─── WERWOLF MULTIPLAYER SERVER ────────────────────────────────────────────
// Node.js + Socket.io Server
// - Verwaltet Räume (Räume = "Rooms"), Spieler, Rollen, Spielphasen
// - Verteilt Rollen geheim (nur der jeweilige Spieler bekommt seine Rolle)
// - Synchronisiert Tag/Nacht-Phasen, Aktionen, Abstimmungen für alle Geräte
// - Relayed WebRTC-Signaling (Offer/Answer/ICE) für Kamera & Mikrofon
//
// Start: npm install && npm start
// Standard-Port: 3001 (über process.env.PORT überschreibbar)

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.get("/", (req, res) => res.send("Werwolf-Server läuft ✅"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const PORT = process.env.PORT || 3001;

// ─── ROLLEN-DEFINITIONEN (Server-seitig, für Zuweisung & Gewinn-Check) ──────
const ALLE_ROLLEN = {
  werwolf:        { team: "wolf",    nachtPhase: "werwolf_waehlt" },
  alphawolf:      { team: "wolf",    nachtPhase: "werwolf_waehlt" },
  weiserwolf:     { team: "wolf",    nachtPhase: "werwolf_waehlt" },
  grosserwolf:    { team: "wolf",    nachtPhase: "werwolf_waehlt" },
  weisser_werwolf:{ team: "neutral", nachtPhase: "werwolf_waehlt" },
  seher:          { team: "dorf",    nachtPhase: "seher" },
  hexe:           { team: "dorf",    nachtPhase: "hexe" },
  amor:           { team: "dorf",    nachtPhase: "amor" },
  schutzengel:    { team: "dorf",    nachtPhase: "schutzengel" },
  medium:         { team: "dorf",    nachtPhase: "medium" },
  jaeger:         { team: "dorf",    nachtPhase: null },
  buergermeister: { team: "dorf",    nachtPhase: null },
  dorfdepp:       { team: "dorf",    nachtPhase: null },
  altefrau:       { team: "dorf",    nachtPhase: null },
  hexenjaeger:    { team: "dorf",    nachtPhase: null },
  serienkiller:   { team: "neutral", nachtPhase: "serienkiller" },
  flötenspieler:  { team: "neutral", nachtPhase: "flötenspieler" },
  dorfbewohner:   { team: "dorf",    nachtPhase: null },
};

// Reihenfolge der Nacht-Phasen
const NACHT_ORDER = [
  { phase: "amor",           rolleId: "amor",          nurErstNacht: true },
  { phase: "werwolf_waehlt", rolleId: null,            nurErstNacht: false },
  { phase: "seher",          rolleId: "seher",         nurErstNacht: false },
  { phase: "schutzengel",    rolleId: "schutzengel",   nurErstNacht: false },
  { phase: "hexe",           rolleId: "hexe",          nurErstNacht: false },
  { phase: "medium",         rolleId: "medium",        nurErstNacht: false },
  { phase: "serienkiller",   rolleId: "serienkiller",  nurErstNacht: false },
  { phase: "flötenspieler",  rolleId: "flötenspieler", nurErstNacht: false },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function genCode() {
  return "WOLF-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ─── ROOM-STORAGE (im Speicher – für Produktion ggf. Redis verwenden) ───────
// rooms[code] = {
//   code, gmSocketId, players: [{id(socketId), name, rolle, tot, stimmrecht, verzaubert}],
//   cfg, phase, runde, nachtPhasen, nachtIdx, nachtErgebnis, abstimmung,
//   protokoll, liebende, hexeHeil, hexeGift, mediumGenutzt, amorGesetzt,
//   altefrauLebt, letzterSchutz, started
// }
const rooms = {};

function publicPlayer(p, forSocketId, room, isGM) {
  // Rolle nur an: (a) den Spieler selbst, (b) den GM, (c) wenn Spiel vorbei
  const showRole = isGM || p.id === forSocketId || room.gameOver;
  return {
    id: p.id,
    name: p.name,
    tot: p.tot,
    verzaubert: p.verzaubert,
    stimmrecht: p.stimmrecht,
    istDu: p.id === forSocketId,
    rolle: showRole ? p.rolleData : null,
  };
}

function broadcastRoom(code) {
  const room = rooms[code];
  if (!room) return;
  // an jeden Spieler individuell senden (wegen versteckter Rollen)
  for (const p of room.players) {
    io.to(p.id).emit("room_update", buildStateFor(room, p.id, false));
  }
  if (room.gmSocketId) {
    io.to(room.gmSocketId).emit("room_update", buildStateFor(room, room.gmSocketId, true));
  }
}

function buildStateFor(room, socketId, isGM) {
  return {
    code: room.code,
    started: room.started,
    phase: room.phase,
    runde: room.runde,
    aktNachtPhase: room.nachtPhasen[room.nachtIdx] || null,
    nachtErgebnis: isGM ? room.nachtErgebnis : sanitizeNE(room.nachtErgebnis),
    abstimmung: room.abstimmung,
    protokoll: room.protokoll,
    gewinner: room.gewinner || null,
    isGM,
    players: room.players.map((p) => publicPlayer(p, socketId, room, isGM)),
    cfg: room.cfg,
  };
}

// Spieler sollen nicht sehen, was die Hexe/Wölfe genau ausgewählt haben,
// außer es betrifft sie direkt – einfache Variante: nur GM sieht alles.
function sanitizeNE(ne) {
  return {}; // Spieler bekommen Ergebnis nur über Toasts/Protokoll
}

function aktiveNachtPhasen(room) {
  const lebendig = room.players.filter((p) => !p.tot);
  const aktRollen = new Set(lebendig.map((p) => p.rolle));
  const hatWoelfe = lebendig.some(
    (p) => ALLE_ROLLEN[p.rolle]?.team === "wolf" || p.rolle === "weisser_werwolf"
  );
  return NACHT_ORDER.filter((np) => {
    if (np.nurErstNacht && room.runde > 1) return false;
    if (np.phase === "werwolf_waehlt") return hatWoelfe;
    if (np.rolleId && !aktRollen.has(np.rolleId)) return false;
    return true;
  });
}

function log(room, txt) {
  room.protokoll.push(txt);
}

// ─── NACHT AUSWERTEN ─────────────────────────────────────────────────────
function nachtAuswerten(room) {
  const ne = room.nachtErgebnis;
  const logs = [];
  const get = (id) => room.players.find((p) => p.id === id);

  const geschuetzt = ne.hexeHeil ? ne.wolfOpfer : ne.geschuetzt ?? null;

  // Werwolf-Opfer
  if (ne.wolfOpfer && ne.wolfOpfer !== geschuetzt) {
    const s = get(ne.wolfOpfer);
    if (s) {
      if (s.rolle === "altefrau" && room.altefrauLebt) {
        room.altefrauLebt = false;
        logs.push(`${s.name} (Alte Frau) überlebt den ersten Angriff!`);
      } else {
        s.tot = true;
        logs.push(`${s.name} wurde von den Werwölfen getötet.`);
      }
    }
  } else if (ne.wolfOpfer && ne.wolfOpfer === geschuetzt) {
    logs.push(`Das Werwolf-Opfer wurde gerettet!`);
  }

  // Hexe Gift
  if (ne.hexeGift) {
    const s = get(ne.hexeGift);
    if (s && !s.tot) {
      s.tot = true;
      logs.push(`${s.name} wurde von der Hexe vergiftet.`);
    }
  }

  // Serienkiller
  if (ne.skOpfer) {
    const s = get(ne.skOpfer);
    if (s && !s.tot) {
      s.tot = true;
      logs.push(`${s.name} wurde vom Serienkiller getötet.`);
    }
  }

  // Flötenspieler
  if (ne.floeteA) {
    const s = get(ne.floeteA);
    if (s) s.verzaubert = true;
  }
  if (ne.floeteB) {
    const s = get(ne.floeteB);
    if (s) s.verzaubert = true;
  }

  // Liebende-Kettenreaktion
  const vorTot = new Set(room._vorTot || []);
  room.players.forEach((s) => {
    if (s.tot && !vorTot.has(s.id)) {
      const paar = room.liebende.find(([a, b]) => a === s.id || b === s.id);
      if (paar) {
        const pid = paar[0] === s.id ? paar[1] : paar[0];
        const ps = get(pid);
        if (ps && !ps.tot) {
          ps.tot = true;
          logs.push(`${ps.name} stirbt aus Liebeskummer.`);
        }
      }
    }
  });

  logs.forEach((l) => log(room, l));
  room.letzterSchutz = geschuetzt;
  room.phase = "tag";
  log(room, `── Runde ${room.runde} · Tag beginnt ──`);
  pruefeGewinner(room);
}

function pruefeGewinner(room) {
  const leb = room.players.filter((p) => !p.tot);
  const woelfe = leb.filter(
    (p) => ALLE_ROLLEN[p.rolle]?.team === "wolf"
  );
  const dorf = leb.filter((p) => ALLE_ROLLEN[p.rolle]?.team === "dorf");
  const sk = leb.filter((p) => p.rolle === "serienkiller");
  const fp = leb.filter((p) => p.rolle === "flötenspieler");

  const liebPaar =
    room.liebende.length > 0 &&
    room.liebende[0] &&
    leb.some((p) => p.id === room.liebende[0][0]) &&
    leb.some((p) => p.id === room.liebende[0][1]);

  if (liebPaar && leb.length === 2) {
    room.gewinner = "liebende";
  } else if (sk.length > 0 && leb.length === 1) {
    room.gewinner = "serienkiller";
  } else if (fp.length > 0 && leb.every((p) => p.verzaubert)) {
    room.gewinner = "flötenspieler";
  } else if (woelfe.length === 0) {
    room.gewinner = "dorf";
  } else if (woelfe.length >= dorf.length && dorf.length > 0) {
    room.gewinner = "wolf";
  }

  if (room.gewinner) {
    room.phase = "gameover";
    log(room, `── Spiel beendet: ${room.gewinner.toUpperCase()} gewinnt ──`);
  }
}

// ─── SOCKET.IO EVENTS ────────────────────────────────────────────────────
io.on("connection", (socket) => {
  // ── Raum erstellen (GM) ──
  socket.on("create_room", ({ name, cfg }, cb) => {
    const code = genCode();
    rooms[code] = {
      code,
      gmSocketId: socket.id,
      gmName: name || "Spielleiter",
      players: [],
      cfg: cfg || {},
      started: false,
      phase: "warten",
      runde: 1,
      nachtPhasen: [],
      nachtIdx: 0,
      nachtErgebnis: {},
      abstimmung: {},
      protokoll: [],
      liebende: [],
      hexeHeil: true,
      hexeGift: true,
      mediumGenutzt: false,
      amorGesetzt: false,
      altefrauLebt: true,
      letzterSchutz: null,
      gewinner: null,
      gameOver: false,
    };
    socket.join(code);
    socket.data.code = code;
    socket.data.isGM = true;
    cb && cb({ ok: true, code });
    broadcastRoom(code);
  });

  // ── Raum beitreten (Spieler) ──
  socket.on("join_room", ({ code, name }, cb) => {
    const room = rooms[code];
    if (!room) return cb && cb({ ok: false, error: "Raum nicht gefunden." });
    if (room.started) return cb && cb({ ok: false, error: "Spiel läuft bereits." });
    room.players.push({
      id: socket.id,
      name: name || "Spieler",
      rolle: null,
      rolleData: null,
      tot: false,
      stimmrecht: true,
      verzaubert: false,
    });
    socket.join(code);
    socket.data.code = code;
    socket.data.isGM = false;
    cb && cb({ ok: true, code });
    broadcastRoom(code);
  });

  // ── GM: Rollen-Konfiguration aktualisieren ──
  socket.on("update_cfg", ({ cfg }) => {
    const room = rooms[socket.data.code];
    if (!room || socket.id !== room.gmSocketId) return;
    room.cfg = cfg;
    broadcastRoom(room.code);
  });

  // ── GM: Spiel starten & Rollen verteilen ──
  socket.on("start_game", () => {
    const room = rooms[socket.data.code];
    if (!room || socket.id !== room.gmSocketId) return;
    if (room.players.length < 4) return;

    const pool = [];
    Object.entries(room.cfg).forEach(([id, anz]) => {
      for (let i = 0; i < anz; i++) pool.push(id);
    });
    const shuffled = shuffle(pool).slice(0, room.players.length);

    room.players.forEach((p, i) => {
      const rolleId = shuffled[i] || "dorfbewohner";
      p.rolle = rolleId;
      p.rolleData = { id: rolleId, ...ALLE_ROLLEN[rolleId] };
    });

    room.started = true;
    room.phase = "warten";
    room.runde = 1;
    log(room, `Spiel gestartet mit ${room.players.length} Spielern.`);
    broadcastRoom(room.code);
  });

  // ── GM: Nacht starten ──
  socket.on("night_start", () => {
    const room = rooms[socket.data.code];
    if (!room || socket.id !== room.gmSocketId) return;
    room.nachtPhasen = aktiveNachtPhasen(room);
    room.nachtIdx = 0;
    room.nachtErgebnis = {};
    room.phase = "nacht_phase";
    log(room, `── Runde ${room.runde} · Nacht beginnt ──`);
    broadcastRoom(room.code);
  });

  // ── Spieler/GM: Nacht-Aktion einreichen ──
  // action: wolfOpfer | seherSchau | geschuetzt | hexeHeil | hexeGift | skOpfer | floete | amor | medium
  socket.on("night_action", ({ action, payload }) => {
    const room = rooms[socket.data.code];
    if (!room) return;
    const ne = room.nachtErgebnis;

    switch (action) {
      case "wolfOpfer":
        ne.wolfOpfer = payload.targetId;
        break;
      case "seherSchau": {
        const target = room.players.find((p) => p.id === payload.targetId);
        if (target) {
          io.to(socket.id).emit("toast", {
            msg: `${target.name} ist: ${target.rolle}`,
            ok: true,
          });
        }
        break;
      }
      case "geschuetzt":
        ne.geschuetzt = payload.targetId;
        room.letzterSchutz = payload.targetId;
        break;
      case "hexeHeil":
        ne.hexeHeil = true;
        room.hexeHeil = false;
        break;
      case "hexeGift":
        ne.hexeGift = payload.targetId;
        room.hexeGift = false;
        break;
      case "skOpfer":
        ne.skOpfer = payload.targetId;
        break;
      case "floete":
        ne.floeteA = payload.a;
        ne.floeteB = payload.b;
        break;
      case "amor":
        room.liebende = [[payload.a, payload.b]];
        room.amorGesetzt = true;
        log(room, "Amor hat zwei Liebende bestimmt.");
        break;
      case "medium": {
        room.mediumGenutzt = true;
        const target = room.players.find((p) => p.id === payload.targetId);
        if (target) {
          log(room, `Medium hat ${target.name} befragt – Antwort: ${payload.antwort}`);
        }
        break;
      }
    }
    broadcastRoom(room.code);
  });

  // ── GM: nächste Nacht-Phase / Nacht auswerten ──
  socket.on("next_phase", () => {
    const room = rooms[socket.data.code];
    if (!room || socket.id !== room.gmSocketId) return;
    if (room.nachtIdx + 1 < room.nachtPhasen.length) {
      room.nachtIdx += 1;
    } else {
      nachtAuswerten(room);
    }
    broadcastRoom(room.code);
  });

  // ── Spieler: abstimmen ──
  socket.on("vote", ({ targetId }) => {
    const room = rooms[socket.data.code];
    if (!room) return;
    room.abstimmung[socket.id] = targetId;
    broadcastRoom(room.code);
  });

  // ── GM: Abstimmung starten / auswerten ──
  socket.on("voting_start", () => {
    const room = rooms[socket.data.code];
    if (!room || socket.id !== room.gmSocketId) return;
    room.abstimmung = {};
    room.phase = "abstimmung";
    broadcastRoom(room.code);
  });

  socket.on("voting_resolve", () => {
    const room = rooms[socket.data.code];
    if (!room || socket.id !== room.gmSocketId) return;

    const stimmen = {};
    room.players
      .filter((p) => !p.tot && p.stimmrecht)
      .forEach((p) => {
        const v = room.abstimmung[p.id];
        if (v) stimmen[v] = (stimmen[v] || 0) + (p.rolle === "buergermeister" ? 2 : 1);
      });

    let maxId = null, maxV = 0;
    Object.entries(stimmen).forEach(([id, v]) => {
      if (v > maxV) { maxV = v; maxId = id; }
    });

    if (!maxId) {
      log(room, "Keine Einigung – niemand wird gelyncht.");
      room.phase = "tag";
      broadcastRoom(room.code);
      return;
    }

    const g = room.players.find((p) => p.id === maxId);
    if (g.rolle === "dorfdepp") {
      g.stimmrecht = false;
      log(room, `${g.name} ist der Dorfdepp! Überlebt, verliert Stimmrecht.`);
      room.phase = "tag";
      broadcastRoom(room.code);
      return;
    }

    g.tot = true;
    log(room, `${g.name} (${g.rolle}) wurde vom Dorf gelyncht.`);

    const paar = room.liebende.find(([a, b]) => a === g.id || b === g.id);
    if (paar) {
      const pid = paar[0] === g.id ? paar[1] : paar[0];
      const ps = room.players.find((p) => p.id === pid);
      if (ps && !ps.tot) {
        ps.tot = true;
        log(room, `${ps.name} stirbt aus Liebeskummer.`);
      }
    }

    room.phase = "tag";
    pruefeGewinner(room);
    broadcastRoom(room.code);
  });

  // ── GM: nächste Runde / Spieler manuell entfernen ──
  socket.on("next_round", () => {
    const room = rooms[socket.data.code];
    if (!room || socket.id !== room.gmSocketId) return;
    room.runde += 1;
    room.nachtPhasen = aktiveNachtPhasen(room);
    room.nachtIdx = 0;
    room.nachtErgebnis = {};
    room.phase = "nacht_phase";
    log(room, `── Runde ${room.runde} · Nacht beginnt ──`);
    broadcastRoom(room.code);
  });

  socket.on("gm_kill", ({ targetId }) => {
    const room = rooms[socket.data.code];
    if (!room || socket.id !== room.gmSocketId) return;
    const p = room.players.find((x) => x.id === targetId);
    if (p) {
      p.tot = true;
      log(room, `GM: ${p.name} wurde entfernt.`);
      pruefeGewinner(room);
    }
    broadcastRoom(room.code);
  });

  // ── WebRTC Signaling Relay (Kamera/Mikrofon) ──
  socket.on("rtc_signal", ({ to, signal }) => {
    io.to(to).emit("rtc_signal", { from: socket.id, signal });
  });

  // ── Neuer Peer ist bereit (für WebRTC-Verbindungsaufbau) ──
  socket.on("rtc_ready", () => {
    const code = socket.data.code;
    if (!code) return;
    socket.to(code).emit("rtc_peer_joined", { id: socket.id });
  });

  // ── Verbindung getrennt ──
  socket.on("disconnect", () => {
    const code = socket.data.code;
    if (!code || !rooms[code]) return;
    const room = rooms[code];

    if (socket.id === room.gmSocketId) {
      // GM weg → Raum schließen
      io.to(code).emit("room_closed", { reason: "Der Spielleiter hat den Raum verlassen." });
      delete rooms[code];
      return;
    }

    room.players = room.players.filter((p) => p.id !== socket.id);
    if (room.players.length === 0 && !room.gmSocketId) {
      delete rooms[code];
      return;
    }
    broadcastRoom(code);
  });
});

server.listen(PORT, () => {
  console.log(`🐺 Werwolf-Server läuft auf Port ${PORT}`);
});
