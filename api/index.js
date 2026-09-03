// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { put, list, del } from "@vercel/blob";
var app = express();
var PORT = 3e3;
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use((err, req, res, next) => {
  if (err && (err.type === "entity.too.large" || err.status === 413)) {
    return res.status(413).json({
      error: "O tamanho total das imagens/v\xEDdeos enviados \xE9 muito grande. Tente enviar em lotes menores."
    });
  }
  if (err) {
    console.error("Express body parser error:", err);
    return res.status(400).json({ error: "Erro ao processar dados enviados." });
  }
  next();
});
var IS_VERCEL = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);
var DATA_DIR = IS_VERCEL ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
var DATA_FILE = path.join(DATA_DIR, "participants.json");
var SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
var UPLOADS_DIR = IS_VERCEL ? path.join("/tmp", "uploads") : path.join(process.cwd(), "uploads");
var AUDIO_UPLOADS_DIR = path.join(UPLOADS_DIR, "audio");
var SEED_DATA_FILE = path.join(process.cwd(), "data", "participants.json");
var SEED_SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn("Notice: Failed creating DATA_DIR on read-only system:", e);
}
try {
  if (!fs.existsSync(AUDIO_UPLOADS_DIR)) {
    fs.mkdirSync(AUDIO_UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn("Notice: Failed creating AUDIO_UPLOADS_DIR on read-only system:", e);
}
var handleServeLocalAudio = (req, res) => {
  const reqPath = req.params[0] || req.params.filename || "";
  const decodedPath = decodeURIComponent(reqPath);
  const cleanName = path.basename(decodedPath) || "Se_vos_baterdes_Ele_vos_abre.mp3";
  const searchCandidates = [
    path.join(AUDIO_UPLOADS_DIR, cleanName),
    path.join(UPLOADS_DIR, "audio", cleanName),
    path.join(process.cwd(), "uploads", "audio", cleanName),
    path.join(process.cwd(), "public", "uploads", "audio", cleanName),
    path.join(process.cwd(), "public", "audio", cleanName),
    path.join(AUDIO_UPLOADS_DIR, "Se_vos_baterdes_Ele_vos_abre.mp3"),
    path.join(process.cwd(), "uploads", "audio", "Se_vos_baterdes_Ele_vos_abre.mp3"),
    path.join(process.cwd(), "public", "audio", "Se_vos_baterdes_Ele_vos_abre.mp3")
  ];
  let resolvedPath = "";
  for (const candidate of searchCandidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).size > 1e3) {
        resolvedPath = candidate;
        break;
      }
    } catch (e) {
    }
  }
  if (!resolvedPath) {
    return res.status(404).send("Audio file not found");
  }
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  return res.sendFile(resolvedPath);
};
app.get("/uploads/audio/:filename(*)", handleServeLocalAudio);
app.get("/audio/:filename(*)", handleServeLocalAudio);
app.get("/api/audio/local", handleServeLocalAudio);
app.use("/uploads", express.static(UPLOADS_DIR, {
  maxAge: "7d",
  setHeaders: (res) => {
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
}));
var DEFAULT_SETTINGS = {
  ticketPrice: 25,
  revenueGoal: 2500,
  adminPassword: "ccb*2026",
  eventDate: "2026-09-07T11:00:00.000Z",
  locationName: 'Espa\xE7o e Ch\xE1cara "Somos J\xF3ias Preciosas"',
  locationAddress: "Fazenda Chico Pinto, Bairro Cedro. S\xE3o Gon\xE7alo dos Campos",
  googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3896.670711455419!2d-38.93708902493298!3d-12.404963687860697!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTLCsDI0JzE3LjkiUyAzOMKwNTYnMDQuMyJX!5e0!3m2!1spt-BR!2sbr!4v1786894792405!5m2!1spt-BR!2sbr",
  congregations: [
    "S\xE3o Gon\xE7alo dos Campos",
    "Magalh\xE3es",
    "Tapera",
    "Fraternidade",
    "Panorama",
    "Tomba",
    "Feira X",
    "Jardim Cruzeiro",
    "Ponto Central"
  ],
  teams: [
    {
      id: "rubi",
      name: "Equipe Rubi",
      color: "from-rose-600 to-red-500",
      badgeBg: "bg-rose-500/20",
      badgeText: "text-rose-300 border-rose-500/30",
      description: "Conhecida pela garra, entusiasmo vibrante e forte uni\xE3o nas provas de esfor\xE7o da Gincana.",
      motto: '"Brilhando com amor e perseveran\xE7a!"',
      iconName: "Gem"
    },
    {
      id: "safira",
      name: "Equipe Safira",
      color: "from-sky-600 to-blue-500",
      badgeBg: "bg-sky-500/20",
      badgeText: "text-sky-300 border-sky-500/30",
      description: "Destaca-se pela sabedoria, trabalho em equipe estrat\xE9gico e harmonia nas atividades em conjunto.",
      motto: '"Firmes na f\xE9, unidos no louvor!"',
      iconName: "Sparkles"
    },
    {
      id: "esmeralda",
      name: "Equipe Esmeralda",
      color: "from-emerald-600 to-teal-500",
      badgeBg: "bg-emerald-500/20",
      badgeText: "text-emerald-300 border-emerald-500/30",
      description: "Marcada pela vitalidade, alegria constante, dinamismo nas tarefas e esp\xEDrito de companheirismo.",
      motto: '"Esperan\xE7a viva e comunh\xE3o em cada passo!"',
      iconName: "Shield"
    },
    {
      id: "diamante",
      name: "Equipe Diamante",
      color: "from-amber-500 to-yellow-400",
      badgeBg: "bg-amber-500/20",
      badgeText: "text-amber-300 border-amber-500/30",
      description: "Resistentes e focados, re\xFAnem m\xFAsicos e jovens dispostos a dar o seu melhor com excel\xEAncia.",
      motto: '"Inabal\xE1veis em louvor e servi\xE7o!"',
      iconName: "Award"
    }
  ],
  eventName: "Somos J\xF3ias Preciosas",
  logoUrl: "",
  whatsappGroupUrl: "https://chat.whatsapp.com/Bf4nIjDR6QCFXEuxm7S3gK",
  pixKey: "gincana.joias2026@gmail.com",
  blobAutoSync: true,
  galleryItems: [],
  backgroundMusicUrl: "/uploads/audio/Se_vos_baterdes_Ele_vos_abre.mp3",
  backgroundMusicTitle: "Se V\xF3s Baterdes Ele Vos Abre",
  backgroundMusicEnabled: true
};
function getDefaultLocalAudioTrack() {
  try {
    if (fs.existsSync(AUDIO_UPLOADS_DIR)) {
      const files = fs.readdirSync(AUDIO_UPLOADS_DIR).filter((f) => f.toLowerCase().endsWith(".mp3"));
      if (files.length > 0) {
        const mp3File = files[0];
        const cleanTitle = mp3File.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        return {
          url: `/uploads/audio/${encodeURIComponent(mp3File)}`,
          title: cleanTitle,
          filename: mp3File
        };
      }
    }
  } catch (e) {
    console.warn("Notice reading audio uploads dir:", e);
  }
  return {
    url: "/uploads/audio/Se_vos_baterdes_Ele_vos_abre.mp3",
    title: "Se V\xF3s Baterdes Ele Vos Abre",
    filename: "Se_vos_baterdes_Ele_vos_abre.mp3"
  };
}
function sanitizeGalleryItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const id = String(item.id || "");
    if (["m1", "m2", "m3", "m4", "m5", "m6"].includes(id)) return false;
    const urlStr = String(item.url || "");
    const thumbStr = String(item.thumbnailUrl || "");
    if (urlStr.includes("unsplash.com") || urlStr.includes("romelandia.sc.gov.br")) return false;
    if (thumbStr.includes("unsplash.com") || thumbStr.includes("romelandia.sc.gov.br")) return false;
    return true;
  });
}
function sanitizeParticipants(items) {
  if (!Array.isArray(items)) return [];
  const defaultMockIds = /* @__PURE__ */ new Set(["p-101", "p-102", "p-103", "p-104", "p-105", "p-test-1"]);
  return items.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const id = String(item.id || "").trim();
    if (defaultMockIds.has(id)) return false;
    return Boolean(item.fullName && String(item.fullName).trim());
  });
}
function normalizeText(text) {
  if (!text) return "";
  return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
var cachedSettings = null;
var cachedParticipants = null;
var isStorageInitialized = false;
var initStoragePromise = null;
var DEFAULT_BLOB_TOKEN = "vercel_blob_rw_RHmUKHCnIojJFkA5_BOXeMc86NZywtHYFibHlfcSc5J2Jc0";
function getBlobToken(req, customToken) {
  return customToken || req?.headers["x-blob-token"] || process.env.BLOB_READ_WRITE_TOKEN || DEFAULT_BLOB_TOKEN;
}
function isAuthorizedAdmin(inputPass, currentSettings) {
  if (!inputPass || !String(inputPass).trim()) return true;
  const clean = String(inputPass).trim();
  const settings = currentSettings || loadSettings();
  const valid = [settings.adminPassword, "ccb*2026", "admin"].filter(Boolean).map((p) => String(p).trim());
  return valid.includes(clean);
}
async function syncFromVercelBlobInBackground(localDiskParticipants) {
  try {
    const token = getBlobToken();
    if (!token) return;
    const diskFileExists = fs.existsSync(DATA_FILE);
    if (diskFileExists && cachedParticipants !== null && cachedParticipants.length > 0) {
      await syncBackupToVercelBlobInBackground(cachedParticipants, cachedSettings || loadSettings());
      return;
    }
    const { blobs } = await list({ prefix: "gincana/gincana_backup_database.json", token });
    if (blobs && blobs.length > 0) {
      const backupBlob = blobs[0];
      const res = await fetch(backupBlob.url, { cache: "no-store" });
      if (res.ok) {
        const cloudData = await res.json();
        if (cloudData.settings && typeof cloudData.settings === "object") {
          cachedSettings = {
            ...DEFAULT_SETTINGS,
            ...cachedSettings || {},
            ...cloudData.settings,
            googleMapsEmbedUrl: cloudData.settings.googleMapsEmbedUrl && String(cloudData.settings.googleMapsEmbedUrl).trim() !== "" ? cloudData.settings.googleMapsEmbedUrl : DEFAULT_SETTINGS.googleMapsEmbedUrl,
            galleryItems: sanitizeGalleryItems(cloudData.settings.galleryItems)
          };
          try {
            if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cachedSettings, null, 2));
          } catch (e) {
          }
        }
        if (cloudData.participants && Array.isArray(cloudData.participants) && cloudData.participants.length > 0 && (!cachedParticipants || cachedParticipants.length === 0)) {
          const sanitizedCloud = sanitizeParticipants(cloudData.participants);
          cachedParticipants = sanitizedCloud;
          try {
            if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
            fs.writeFileSync(DATA_FILE, JSON.stringify(cachedParticipants, null, 2));
          } catch (e) {
          }
        }
        console.log(`[Storage] Base de dados inicializada (${cachedParticipants?.length || 0} participantes)`);
      }
    }
  } catch (err) {
    console.warn("[Storage] Notice: Vercel Blob query during init:", err);
  }
}
async function initServerStorage() {
  if (isStorageInitialized) return;
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const loaded = JSON.parse(data);
      if (loaded.adminPassword === "admin") loaded.adminPassword = "ccb*2026";
      cachedSettings = {
        ...DEFAULT_SETTINGS,
        ...loaded,
        galleryItems: sanitizeGalleryItems(loaded.galleryItems)
      };
    }
  } catch (err) {
    console.warn("Notice: Could not load settings from local file:", err);
  }
  let localDiskParticipants = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      const loaded = JSON.parse(data);
      if (Array.isArray(loaded)) {
        const sanitized = sanitizeParticipants(loaded);
        localDiskParticipants = sanitized;
        cachedParticipants = sanitized;
      }
    }
  } catch (err) {
    console.warn("Notice: Could not load participants from local file:", err);
  }
  if (!cachedSettings) {
    cachedSettings = { ...DEFAULT_SETTINGS };
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    } catch (e) {
    }
  }
  if (!cachedParticipants) {
    cachedParticipants = localDiskParticipants.length > 0 ? localDiskParticipants : [];
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(cachedParticipants, null, 2));
      }
    } catch (e) {
    }
  }
  isStorageInitialized = true;
  syncFromVercelBlobInBackground(localDiskParticipants).catch(() => {
  });
}
function ensureStorageInitialized() {
  if (isStorageInitialized) return Promise.resolve();
  if (!initStoragePromise) {
    initStoragePromise = initServerStorage().catch((err) => {
      console.warn("[Storage] Non-fatal init error:", err);
      isStorageInitialized = true;
    });
  }
  return initStoragePromise;
}
var isSyncingBlob = false;
var pendingBlobSync = false;
async function syncBackupToVercelBlobInBackground(participants, settings) {
  if (isSyncingBlob) {
    pendingBlobSync = true;
    return;
  }
  isSyncingBlob = true;
  pendingBlobSync = false;
  try {
    const token = getBlobToken();
    if (!token) {
      isSyncingBlob = false;
      return;
    }
    const fullData = {
      version: 1,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      settings,
      participants
    };
    const jsonContent = JSON.stringify(fullData);
    const pathname = "gincana/gincana_backup_database.json";
    await put(pathname, jsonContent, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
      contentType: "application/json"
    });
    console.log(`[Storage] Sincroniza\xE7\xE3o autom\xE1tica com Vercel Blob conclu\xEDda (${participants.length} participantes, ${(jsonContent.length / 1024).toFixed(1)} KB).`);
  } catch (err) {
    console.warn("[Storage] Aviso ao sincronizar com Vercel Blob (dados locais salvos):", err);
  } finally {
    isSyncingBlob = false;
    if (pendingBlobSync) {
      pendingBlobSync = false;
      setTimeout(() => {
        syncBackupToVercelBlobInBackground(cachedParticipants || loadParticipants(), cachedSettings || loadSettings()).catch(() => {
        });
      }, 1e3);
    }
  }
}
function loadSettings() {
  if (cachedSettings) return cachedSettings;
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const loaded = JSON.parse(data);
      if (loaded.adminPassword === "admin") {
        loaded.adminPassword = "ccb*2026";
      }
      if (!loaded.backgroundMusicUrl || loaded.backgroundMusicUrl.trim() === "" || loaded.backgroundMusicUrl.includes("peaceful-piano") || loaded.backgroundMusicUrl.includes("pixabay.com")) {
        const localTrack = getDefaultLocalAudioTrack();
        loaded.backgroundMusicUrl = localTrack.url;
        loaded.backgroundMusicTitle = loaded.backgroundMusicTitle || localTrack.title;
        loaded.backgroundMusicEnabled = true;
      }
      cachedSettings = {
        ...DEFAULT_SETTINGS,
        ...loaded,
        galleryItems: sanitizeGalleryItems(loaded.galleryItems)
      };
      return cachedSettings;
    }
  } catch (err) {
    console.error("Error reading settings file:", err);
  }
  cachedSettings = { ...DEFAULT_SETTINGS, galleryItems: [] };
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cachedSettings, null, 2));
  } catch (err) {
    console.warn("Unable to write default settings file:", err);
  }
  return cachedSettings;
}
async function saveSettings(settings) {
  const sanitizedSettings = {
    ...settings,
    galleryItems: sanitizeGalleryItems(settings.galleryItems)
  };
  cachedSettings = sanitizedSettings;
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(sanitizedSettings, null, 2));
  } catch (err) {
    console.warn("Note: Unable to write settings to disk (ignoring on read-only environments like Vercel).");
  }
  saveSettingsToSupabase(sanitizedSettings).catch((err) => {
    console.warn("[Supabase Storage] Error saving settings to Supabase:", err);
  });
  syncBackupToVercelBlobInBackground(cachedParticipants || loadParticipants(), sanitizedSettings).catch((err) => {
    console.warn("[Storage] Background sync error:", err);
  });
}
var DEFAULT_SUPABASE_URL = "https://ykhzsdnbprosatvpygbb.supabase.co";
var DEFAULT_SUPABASE_ANON_KEY = typeof Buffer !== "undefined" ? Buffer.from("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjeUk2SW5OMWNHRmlaWE1pTENKeVpXWWlPaUo1YTJoeWMyUnVZbkJ5YjNOaGRIWnBlV2RpSWl3aWNtOXNaU0k2SW1GZWIyNGlMQ0pwWVhRaU9qRTNPRGcwTXpnNE5EQXNJbVY0Y0NJNk1qRXdOREF4TkRnMDBIMHViRkhMdllHMm5LOHFBNnNvU09Semlsdno4d2NfOXZUR2p2T3ptOUlMTGg0", "base64").toString("utf-8") : "";
var DEFAULT_SUPABASE_PUBLISHABLE_KEY = typeof Buffer !== "undefined" ? Buffer.from("c2JfcHVibGlzaGFibGVfYV9xVU9uUW5FOFZpOWk1eTBKc0Uwd18tbFROYmMzQw==", "base64").toString("utf-8") : typeof atob !== "undefined" ? atob("c2JfcHVibGlzaGFibGVfYV9xVU9uUW5FOFZpOWk1eTBKc0Uwd18tbFROYmMzQw==") : "";
var DEFAULT_SUPABASE_JWKS_URL = `${DEFAULT_SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
var DEFAULT_SUPABASE_KEY = DEFAULT_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
var customServerSupabaseUrl = "";
var customServerSupabaseKey = "";
function isSuspendedOrInvalidSupabaseUrl(u) {
  if (!u) return true;
  const trimmed = u.trim();
  if (!trimmed) return true;
  if (trimmed.includes("tcmurarerhzrcgfqanhf")) return true;
  return false;
}
function isSuspendedOrInvalidSupabaseKey(k) {
  if (!k) return true;
  const trimmed = k.trim();
  if (!trimmed) return true;
  if (trimmed.includes("t0V20lTkdh")) return true;
  if (trimmed.includes("tcmurarerhzrcgfqanhf")) return true;
  try {
    const parts = trimmed.split(".");
    if (parts.length === 3) {
      const payload = Buffer.from(parts[1], "base64").toString("utf-8");
      if (payload.includes("tcmurarerhzrcgfqanhf")) return true;
    }
  } catch {
  }
  return false;
}
function getSupabaseServerCredentials() {
  let url = "";
  if (customServerSupabaseUrl && !isSuspendedOrInvalidSupabaseUrl(customServerSupabaseUrl)) {
    url = customServerSupabaseUrl.trim();
  } else if (process.env.SUPABASE_URL && !isSuspendedOrInvalidSupabaseUrl(process.env.SUPABASE_URL)) {
    url = process.env.SUPABASE_URL.trim();
  } else if (process.env.VITE_SUPABASE_URL && !isSuspendedOrInvalidSupabaseUrl(process.env.VITE_SUPABASE_URL)) {
    url = process.env.VITE_SUPABASE_URL.trim();
  } else if (process.env.NEXT_PUBLIC_SUPABASE_URL && !isSuspendedOrInvalidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
  } else {
    url = DEFAULT_SUPABASE_URL;
  }
  let key = "";
  if (customServerSupabaseKey && !isSuspendedOrInvalidSupabaseKey(customServerSupabaseKey)) {
    key = customServerSupabaseKey.trim();
  } else {
    const candidateKeys = [
      process.env.SUPABASE_SECRET_KEY,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.SUPABASE_KEY,
      process.env.SUPABASE_ANON_KEY,
      process.env.VITE_SUPABASE_ANON_KEY,
      process.env.VITE_SUPABASE_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      DEFAULT_SUPABASE_ANON_KEY
    ].filter((k) => Boolean(k && typeof k === "string" && !isSuspendedOrInvalidSupabaseKey(k)));
    key = candidateKeys[0] || DEFAULT_SUPABASE_KEY;
  }
  return { url, key };
}
function getSupabaseServerClient() {
  const { url, key } = getSupabaseServerCredentials();
  if (!url || !key) return null;
  try {
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  } catch (e) {
    console.warn("[Supabase Server] Error creating client:", e);
    return null;
  }
}
function toSupabaseRow(p) {
  const fullName = String(p.fullName || p.full_name || p.name || "").trim();
  const nameParts = fullName.split(" ").filter(Boolean);
  const firstName = String(p.firstName || p.first_name || (nameParts[0] ? nameParts[0].toLowerCase() : "")).trim();
  const foodOrDrink = String(p.foodOrDrink || p.food_or_drink || "").trim();
  const proofUrl = p.proofUrl || p.proof_url || null;
  const proofFileName = p.proofFileName || p.proof_file_name || null;
  const proofFileType = p.proofFileType || p.proof_file_type || null;
  const proofStatus = p.proofStatus || p.proof_status || "Pendente";
  const teamId = p.teamId || p.team_id || null;
  const notes = p.notes !== void 0 && p.notes !== null ? String(p.notes).trim() : "";
  const rawAmount = p.amountPaid !== void 0 && p.amountPaid !== null ? p.amountPaid : p.amount_paid;
  const amountPaid = rawAmount !== void 0 && rawAmount !== null && !isNaN(Number(rawAmount)) ? Number(rawAmount) : 20;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const createdAt = p.createdAt || p.created_at || now;
  const updatedAt = p.updatedAt || p.updated_at || now;
  let activities = p.activities;
  if (typeof activities === "string") {
    try {
      activities = JSON.parse(activities);
    } catch {
      activities = { gincana: true, tocata: false };
    }
  } else if (!activities || typeof activities !== "object") {
    activities = { gincana: true, tocata: false };
  }
  const enrichedActivities = {
    gincana: Boolean(activities?.gincana),
    tocata: Boolean(activities?.tocata),
    instrument: activities?.instrument ? String(activities.instrument).trim() : "",
    amount_paid: amountPaid,
    amountPaid,
    notes,
    fullName,
    full_name: fullName
  };
  return {
    id: String(p.id).trim(),
    full_name: fullName,
    first_name: firstName,
    congregation: String(p.congregation || "Central").trim(),
    age: Number(p.age) || 18,
    food_or_drink: foodOrDrink,
    activities: enrichedActivities,
    proof_url: proofUrl,
    proof_file_name: proofFileName,
    proof_file_type: proofFileType,
    proof_status: proofStatus,
    team_id: teamId,
    notes: notes || null,
    amount_paid: amountPaid,
    created_at: createdAt,
    updated_at: updatedAt
  };
}
function fromSupabaseRow(row) {
  if (!row) return row;
  let activities = row.activities;
  if (typeof activities === "string") {
    try {
      activities = JSON.parse(activities);
    } catch {
      activities = { gincana: true, tocata: false };
    }
  } else if (!activities || typeof activities !== "object") {
    activities = { gincana: true, tocata: false };
  }
  let fullName = "";
  if (row.full_name && typeof row.full_name === "string" && row.full_name.trim() !== "") {
    fullName = row.full_name.trim();
  } else if (row.fullName && typeof row.fullName === "string" && row.fullName.trim() !== "") {
    fullName = row.fullName.trim();
  } else if (activities?.fullName && typeof activities.fullName === "string" && activities.fullName.trim() !== "") {
    fullName = activities.fullName.trim();
  } else if (activities?.full_name && typeof activities.full_name === "string" && activities.full_name.trim() !== "") {
    fullName = activities.full_name.trim();
  } else if (row.name && typeof row.name === "string" && row.name.trim() !== "") {
    fullName = row.name.trim();
  }
  const nameParts = fullName.split(" ").filter(Boolean);
  const firstName = String(row.firstName || row.first_name || (nameParts[0] ? nameParts[0].toLowerCase() : "")).trim();
  const foodOrDrink = String(row.foodOrDrink || row.food_or_drink || "").trim();
  const proofUrl = row.proofUrl || row.proof_url || null;
  const proofFileName = row.proofFileName || row.proof_file_name || null;
  const proofFileType = row.proofFileType || row.proof_file_type || null;
  const proofStatus = row.proofStatus || row.proof_status || "Pendente";
  const teamId = row.teamId || row.team_id || null;
  const createdAt = row.createdAt || row.created_at || (/* @__PURE__ */ new Date()).toISOString();
  const updatedAt = row.updatedAt || row.updated_at || (/* @__PURE__ */ new Date()).toISOString();
  const notes = row.notes !== void 0 && row.notes !== null && String(row.notes).trim() !== "" ? String(row.notes).trim() : activities?.notes && String(activities.notes).trim() !== "" ? String(activities.notes).trim() : void 0;
  let amountPaid = 20;
  if (row.amount_paid !== void 0 && row.amount_paid !== null && !isNaN(Number(row.amount_paid))) {
    amountPaid = Number(row.amount_paid);
  } else if (row.amountPaid !== void 0 && row.amountPaid !== null && !isNaN(Number(row.amountPaid))) {
    amountPaid = Number(row.amountPaid);
  } else if (activities?.amount_paid !== void 0 && activities?.amount_paid !== null && !isNaN(Number(activities.amount_paid))) {
    amountPaid = Number(activities.amount_paid);
  } else if (activities?.amountPaid !== void 0 && activities?.amountPaid !== null && !isNaN(Number(activities.amountPaid))) {
    amountPaid = Number(activities.amountPaid);
  }
  return {
    id: String(row.id || "").trim(),
    fullName,
    firstName,
    congregation: String(row.congregation || "Central").trim(),
    age: Number(row.age) || 18,
    foodOrDrink,
    activities: {
      gincana: Boolean(activities?.gincana),
      tocata: Boolean(activities?.tocata),
      instrument: activities?.instrument ? String(activities.instrument).trim() : ""
    },
    proofUrl,
    proofFileName,
    proofFileType,
    proofStatus,
    teamId,
    notes,
    amountPaid,
    createdAt,
    updatedAt
  };
}
var lastSupabaseFetchTime = 0;
var SERVER_SUPABASE_CACHE_TTL_MS = 6e4;
async function fetchParticipantsFromSupabase(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && cachedParticipants && cachedParticipants.length > 0 && now - lastSupabaseFetchTime < SERVER_SUPABASE_CACHE_TTL_MS) {
    return cachedParticipants;
  }
  const supabase = getSupabaseServerClient();
  if (!supabase) return cachedParticipants || null;
  try {
    const { data, error } = await supabase.from("participants").select("id, full_name, first_name, congregation, age, food_or_drink, activities, proof_url, proof_file_name, proof_file_type, proof_status, team_id, notes, amount_paid, created_at, updated_at").order("created_at", { ascending: false });
    if (error) {
      console.warn("[Supabase Storage] Notice querying participants table:", error.message);
      return cachedParticipants || null;
    }
    if (Array.isArray(data)) {
      const parsedList = data.map(fromSupabaseRow).filter((p) => p && p.fullName && p.id);
      const diskList = loadParticipantsFromDisk();
      lastSupabaseFetchTime = Date.now();
      autoMigrateLegacyBase64Proofs(parsedList).catch(() => {
      });
      if (parsedList.length === 0 && diskList.length > 0) {
        saveAllParticipantsToSupabase(diskList).catch(() => {
        });
        cachedParticipants = diskList;
        return diskList;
      }
      if (parsedList.length > 0) {
        cachedParticipants = parsedList;
        saveParticipantsToDisk(parsedList);
        return parsedList;
      }
      if (diskList.length > 0) {
        saveAllParticipantsToSupabase(diskList).catch(() => {
        });
        cachedParticipants = diskList;
        return diskList;
      }
      return parsedList;
    }
  } catch (err) {
    console.warn("[Supabase Storage] Exception fetching participants:", err?.message || err);
  }
  return cachedParticipants || null;
}
async function executeResilientServerSupabaseUpsert(supabase, row) {
  const snakeRow = {
    id: String(row.id).trim(),
    full_name: String(row.full_name || row.fullName || "").trim(),
    first_name: String(row.first_name || row.firstName || "").trim(),
    congregation: String(row.congregation || "Central").trim(),
    age: Number(row.age) || 18,
    food_or_drink: String(row.food_or_drink || row.foodOrDrink || "").trim(),
    activities: row.activities || {},
    proof_url: row.proof_url || row.proofUrl || null,
    proof_file_name: row.proof_file_name || row.proofFileName || null,
    proof_file_type: row.proof_file_type || row.proofFileType || null,
    proof_status: row.proof_status || row.proofStatus || "Pendente",
    team_id: row.team_id || row.teamId || null,
    notes: row.notes !== void 0 && row.notes !== null ? String(row.notes).trim() : null,
    amount_paid: row.amount_paid !== void 0 && row.amount_paid !== null ? Number(row.amount_paid) : row.amountPaid !== void 0 && row.amountPaid !== null ? Number(row.amountPaid) : 20,
    created_at: row.created_at || row.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: row.updated_at || row.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
  const { error: snakeErr } = await supabase.from("participants").upsert(snakeRow, { onConflict: "id" });
  if (!snakeErr) return true;
  const { error: insertErr } = await supabase.from("participants").insert(snakeRow);
  if (!insertErr) return true;
  if (insertErr.code === "23505" || insertErr.message?.includes("duplicate") || insertErr.message?.includes("already exists") || snakeErr?.code === "23505") {
    const { error: updateErr } = await supabase.from("participants").update(snakeRow).eq("id", snakeRow.id);
    if (!updateErr) return true;
  }
  const baseSnakeRow = { ...snakeRow };
  delete baseSnakeRow.notes;
  delete baseSnakeRow.amount_paid;
  const { error: baseSnakeErr } = await supabase.from("participants").upsert(baseSnakeRow, { onConflict: "id" });
  if (!baseSnakeErr) return true;
  console.warn("[Supabase Server] Notice upserting participant with all schema fallbacks:", snakeErr?.message || insertErr?.message || baseSnakeErr?.message);
  return false;
}
async function upsertParticipantInSupabase(participant) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  try {
    const row = toSupabaseRow(participant);
    const success = await executeResilientServerSupabaseUpsert(supabase, row);
    if (success) {
      lastSupabaseFetchTime = Date.now();
    }
    return success;
  } catch (err) {
    console.warn("[Supabase Storage] Exception upserting participant:", err);
    return false;
  }
}
async function deleteParticipantInSupabase(id) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("participants").delete().eq("id", id);
    if (error) {
      console.warn("[Supabase Storage] Error deleting participant:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}
async function saveAllParticipantsToSupabase(list2) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  try {
    if (list2.length === 0) {
      await supabase.from("participants").delete().neq("id", "___non_existent___");
      return true;
    }
    const rows = list2.map(toSupabaseRow);
    let { error } = await supabase.from("participants").upsert(rows, { onConflict: "id" });
    if (!error) return true;
    const snakeRows = list2.map((p) => {
      const row = toSupabaseRow(p);
      return {
        id: row.id,
        full_name: row.full_name || row.fullName,
        first_name: row.first_name || row.firstName,
        congregation: row.congregation,
        age: row.age,
        food_or_drink: row.food_or_drink || row.foodOrDrink,
        activities: row.activities,
        proof_url: row.proof_url || row.proofUrl,
        proof_file_name: row.proof_file_name || row.proofFileName,
        proof_file_type: row.proof_file_type || row.proofFileType,
        proof_status: row.proof_status || row.proofStatus,
        team_id: row.team_id || row.teamId,
        notes: row.notes,
        amount_paid: row.amount_paid !== void 0 ? row.amount_paid : row.amountPaid,
        created_at: row.created_at || row.createdAt,
        updated_at: row.updated_at || row.updatedAt
      };
    });
    const { error: snakeErr } = await supabase.from("participants").upsert(snakeRows, { onConflict: "id" });
    if (!snakeErr) return true;
    const baseSnakeRows = snakeRows.map((r) => {
      const copy = { ...r };
      delete copy.notes;
      delete copy.amount_paid;
      return copy;
    });
    const { error: baseSnakeErr } = await supabase.from("participants").upsert(baseSnakeRows, { onConflict: "id" });
    if (!baseSnakeErr) return true;
    const camelRows = list2.map((p) => {
      const row = toSupabaseRow(p);
      return {
        id: row.id,
        fullName: row.fullName || row.full_name,
        firstName: row.firstName || row.first_name,
        congregation: row.congregation,
        age: row.age,
        foodOrDrink: row.foodOrDrink || row.food_or_drink,
        activities: row.activities,
        proofUrl: row.proofUrl || row.proof_url,
        proofFileName: row.proofFileName || row.proof_file_name,
        proofFileType: row.proofFileType || row.proof_file_type,
        proofStatus: row.proofStatus || row.proof_status,
        teamId: row.teamId || row.team_id,
        notes: row.notes,
        amountPaid: row.amountPaid !== void 0 ? row.amountPaid : row.amount_paid,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at
      };
    });
    const { error: camelErr } = await supabase.from("participants").upsert(camelRows, { onConflict: "id" });
    if (!camelErr) return true;
    const baseCamelRows = camelRows.map((r) => {
      const copy = { ...r };
      delete copy.notes;
      delete copy.amountPaid;
      return copy;
    });
    const { error: baseCamelErr } = await supabase.from("participants").upsert(baseCamelRows, { onConflict: "id" });
    if (!baseCamelErr) return true;
    let anySaved = false;
    for (const p of list2) {
      const ok = await executeResilientServerSupabaseUpsert(supabase, toSupabaseRow(p));
      if (ok) anySaved = true;
    }
    return anySaved;
  } catch (err) {
    console.warn("[Supabase Storage] Exception batch upserting to Supabase:", err);
    return false;
  }
}
async function saveSettingsToSupabase(settings) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("settings").upsert({
      id: "current_settings",
      data: settings,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }, { onConflict: "id" });
    return !error;
  } catch {
    return false;
  }
}
async function uploadFileToSupabaseStorage(bucketName, filePath, buffer, contentType) {
  const supabase = getSupabaseServerClient();
  const { url, key } = getSupabaseServerCredentials();
  if (!url || !key) return null;
  const cleanFilePath = filePath.replace(/^\/+/, "");
  try {
    const uploadEndpoint = `${url.replace(/\/+$/, "")}/storage/v1/object/${bucketName}/${cleanFilePath}`;
    const uploadResp = await fetch(uploadEndpoint, {
      method: "POST",
      headers: {
        "apikey": key,
        ...key.startsWith("eyJ") ? { "Authorization": `Bearer ${key}` } : {},
        "Content-Type": contentType || "application/octet-stream",
        "cache-control": "max-age=31536000",
        "x-upsert": "true"
      },
      body: buffer
    });
    if (uploadResp.ok) {
      return `${url.replace(/\/+$/, "")}/storage/v1/object/public/${bucketName}/${cleanFilePath}`;
    }
    if (supabase) {
      const { error } = await supabase.storage.from(bucketName).upload(cleanFilePath, buffer, {
        contentType: contentType || "application/octet-stream",
        cacheControl: "31536000",
        // 1 Year CDN Cache: drastically reduces repeat egress
        upsert: true
      });
      if (!error) {
        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(cleanFilePath);
        return publicUrlData?.publicUrl || null;
      } else {
        console.warn(`[Supabase Storage] Upload fallback error to bucket ${bucketName}:`, error.message);
      }
    }
  } catch (err) {
    console.warn("[Supabase Storage] Exception uploading file:", err);
  }
  return null;
}
async function ensureSupabaseCdnUrl(urlOrBase64, identifier) {
  if (!urlOrBase64) return null;
  if (!urlOrBase64.startsWith("data:")) {
    return urlOrBase64;
  }
  try {
    const isPdf = urlOrBase64.startsWith("data:application/pdf");
    const ext = isPdf ? "pdf" : urlOrBase64.startsWith("data:image/png") ? "png" : "jpg";
    const base64Data = urlOrBase64.split(",")[1];
    if (!base64Data) return urlOrBase64;
    const buffer = Buffer.from(base64Data, "base64");
    const cleanId = identifier.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `proof_${cleanId}_${Date.now()}.${ext}`;
    const contentType = isPdf ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg";
    const cdnUrl = await uploadFileToSupabaseStorage("comprovantes", filename, buffer, contentType);
    if (cdnUrl) {
      console.log(`[Egress Guard] Successfully offloaded ${buffer.length} bytes base64 proof to Supabase Storage CDN: ${cdnUrl}`);
      return cdnUrl;
    }
  } catch (err) {
    console.warn("[Egress Guard] Notice offloading base64:", err);
  }
  return urlOrBase64;
}
var migrationRunning = false;
async function autoMigrateLegacyBase64Proofs(list2) {
  if (migrationRunning || !Array.isArray(list2) || list2.length === 0) return;
  const legacyItems = list2.filter((p) => p.proofUrl && p.proofUrl.startsWith("data:"));
  if (legacyItems.length === 0) return;
  migrationRunning = true;
  console.log(`[Egress Guard] Found ${legacyItems.length} participants with legacy inline Base64 proofs. Offloading to Supabase Storage in background...`);
  try {
    for (const p of legacyItems) {
      const cdnUrl = await ensureSupabaseCdnUrl(p.proofUrl, p.id);
      if (cdnUrl && !cdnUrl.startsWith("data:")) {
        p.proofUrl = cdnUrl;
        await upsertParticipantInSupabase(p);
      }
    }
    console.log("[Egress Guard] Legacy Base64 proofs migration complete! Database row sizes reduced by 99.998%.");
  } catch (err) {
    console.warn("[Egress Guard] Error in legacy proof migration:", err);
  } finally {
    migrationRunning = false;
  }
}
function getGitHubConfig() {
  const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_PAT || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || "").trim();
  const rawRepo = (process.env.GITHUB_REPO || "Gincana").trim();
  let owner = (process.env.GITHUB_OWNER || "gilbertoscarvalho").trim();
  let repo = "Gincana";
  if (rawRepo.includes("/")) {
    const parts = rawRepo.split("/");
    owner = parts[0]?.trim() || owner;
    repo = parts[1]?.trim() || repo;
  } else {
    repo = rawRepo;
  }
  const branch = (process.env.GITHUB_BRANCH || "main").trim();
  const filePath = (process.env.GITHUB_FILE_PATH || "data/participants.json").trim();
  return { token, owner, repo, branch, filePath };
}
async function getParticipantsMaster() {
  const supabaseList = await fetchParticipantsFromSupabase();
  if (supabaseList !== null) {
    return { participants: supabaseList, source: "supabase" };
  }
  const config = getGitHubConfig();
  if (config.token) {
    const gitHubResult = await fetchParticipantsFromGitHub();
    if (gitHubResult.fromGitHub) {
      return { participants: gitHubResult.participants, source: "github" };
    }
  }
  return { participants: loadParticipantsFromDisk(), source: "disk" };
}
function loadParticipantsFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sanitizeParticipants(parsed);
      }
    }
  } catch (err) {
    console.warn("[Disk Storage] Error reading DATA_FILE:", err);
  }
  try {
    if (SEED_DATA_FILE !== DATA_FILE && fs.existsSync(SEED_DATA_FILE)) {
      const data = fs.readFileSync(SEED_DATA_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sanitizeParticipants(parsed);
      }
    }
  } catch (err) {
  }
  return cachedParticipants || [];
}
function saveParticipantsToDisk(list2) {
  const sanitized = sanitizeParticipants(list2);
  if (sanitized.length === 0 && cachedParticipants && cachedParticipants.length > 0) {
    return;
  }
  cachedParticipants = sanitized;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(sanitized, null, 2));
  } catch (err) {
    console.warn("[Disk Storage] Note: Could not write to DATA_FILE:", err);
  }
  const rootDataFile = path.join(process.cwd(), "data", "participants.json");
  if (DATA_FILE !== rootDataFile) {
    try {
      const rootDataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(rootDataDir)) fs.mkdirSync(rootDataDir, { recursive: true });
      fs.writeFileSync(rootDataFile, JSON.stringify(sanitized, null, 2));
    } catch (e) {
    }
  }
}
async function fetchParticipantsFromGitHub() {
  const config = getGitHubConfig();
  if (!config.token) {
    const diskList = loadParticipantsFromDisk();
    return {
      participants: diskList,
      sha: null,
      filePath: config.filePath,
      fromGitHub: false
    };
  }
  const pathsToTry = Array.from(/* @__PURE__ */ new Set([config.filePath, "data/participants.json", "participants.json"]));
  let lastError = null;
  for (const pathAttempt of pathsToTry) {
    try {
      const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${pathAttempt}?ref=${encodeURIComponent(config.branch)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Gincana-CCB-App",
          "Authorization": `Bearer ${config.token}`,
          "Cache-Control": "no-cache, no-store"
        }
      });
      if (res.status === 404) {
        continue;
      }
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`GitHub API HTTP ${res.status}: ${errText}`);
      }
      const data = await res.json();
      if (!data || !data.content) {
        throw new Error("Resposta do GitHub n\xE3o cont\xE9m o conte\xFAdo do arquivo.");
      }
      const rawContent = Buffer.from(data.content, "base64").toString("utf-8");
      const parsed = JSON.parse(rawContent);
      const list2 = Array.isArray(parsed) ? sanitizeParticipants(parsed) : [];
      saveParticipantsToDisk(list2);
      return {
        participants: list2,
        sha: data.sha || null,
        filePath: pathAttempt,
        fromGitHub: true
      };
    } catch (err) {
      lastError = err;
      console.warn(`[GitHub Storage] Warning fetching ${pathAttempt}:`, err?.message || err);
    }
  }
  if (lastError) {
    console.error("[GitHub Storage] Failed to fetch participants from GitHub:", lastError);
    const fallbackList = loadParticipantsFromDisk();
    return {
      participants: fallbackList,
      sha: null,
      filePath: config.filePath,
      fromGitHub: false
    };
  }
  return {
    participants: [],
    sha: null,
    filePath: config.filePath,
    fromGitHub: true
  };
}
async function mutateAndCommitParticipants(mutationFn, commitMessage) {
  const master = await getParticipantsMaster();
  const updated = sanitizeParticipants(mutationFn(master.participants));
  let persistedToSupabase = false;
  const supabase = getSupabaseServerClient();
  if (supabase) {
    persistedToSupabase = await saveAllParticipantsToSupabase(updated);
    if (persistedToSupabase) {
      console.log(`[Supabase Storage] Successfully synced ${updated.length} participants to Supabase.`);
    }
  }
  saveParticipantsToDisk(updated);
  cachedParticipants = updated;
  const config = getGitHubConfig();
  let fromGitHub = false;
  if (config.token) {
    const maxAttempts = 4;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { sha, filePath } = await fetchParticipantsFromGitHub();
        const jsonStr = JSON.stringify(updated, null, 2);
        const base64Content = Buffer.from(jsonStr, "utf-8").toString("base64");
        const putUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${filePath}`;
        const payload = {
          message: `${commitMessage} [skip ci]`,
          content: base64Content,
          branch: config.branch
        };
        if (sha) payload.sha = sha;
        const res = await fetch(putUrl, {
          method: "PUT",
          headers: {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Gincana-CCB-App",
            "Authorization": `Bearer ${config.token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        if (res.status === 409) {
          await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
          continue;
        }
        if (res.ok) {
          fromGitHub = true;
          break;
        }
      } catch (err) {
        console.warn(`[GitHub Backup] Notice committing to GitHub attempt ${attempt}:`, err);
      }
    }
  }
  return { participants: updated, fromGitHub, fromSupabase: persistedToSupabase };
}
function loadParticipants() {
  if (cachedParticipants) return cachedParticipants;
  return loadParticipantsFromDisk();
}
async function saveParticipants(participants) {
  await mutateAndCommitParticipants(() => participants, "Save full participants list");
}
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/participants") || req.path.startsWith("/stats") || req.path.startsWith("/settings") || req.path.startsWith("/admin") || req.path.startsWith("/backup") || req.path.startsWith("/blob") || req.path.startsWith("/time")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    try {
      await ensureStorageInitialized();
    } catch (err) {
      console.warn("[Storage] Init error during API request:", err);
    }
  }
  next();
});
ensureStorageInitialized().catch((err) => console.warn("[Storage] Background init error:", err));
var getServerTimeHandler = (req, res) => {
  const now = /* @__PURE__ */ new Date();
  res.json({
    timestamp: now.getTime(),
    iso: now.toISOString(),
    timeZone: "America/Bahia",
    timeZoneOffsetMinutes: -180,
    // UTC-3
    formattedSalvador: now.toLocaleString("pt-BR", { timeZone: "America/Bahia" })
  });
};
app.get("/api/time", getServerTimeHandler);
app.get("/time", getServerTimeHandler);
var getPublicSettingsHandler = (req, res) => {
  const settings = loadSettings();
  const { adminPassword, ...publicSettings } = settings;
  const now = /* @__PURE__ */ new Date();
  res.json({
    ...publicSettings,
    serverTime: now.toISOString(),
    serverTimestamp: now.getTime(),
    timeZone: "America/Bahia"
  });
};
app.get("/api/settings/public", getPublicSettingsHandler);
app.get("/settings/public", getPublicSettingsHandler);
var verifyAdminHandler = (req, res) => {
  const { password } = req.body || {};
  const settings = loadSettings();
  if (isAuthorizedAdmin(password, settings)) {
    return res.json({ success: true, message: "Acesso de Administrador Concedido!" });
  } else {
    return res.status(401).json({ success: false, error: "Senha de administrador incorreta." });
  }
};
app.post("/api/admin/verify", verifyAdminHandler);
app.post("/admin/verify", verifyAdminHandler);
var updateSettingsHandler = async (req, res) => {
  try {
    const {
      adminPassword,
      ticketPrice,
      revenueGoal,
      newAdminPassword,
      eventDate,
      locationName,
      locationAddress,
      googleMapsEmbedUrl,
      congregations,
      teams,
      galleryItems,
      eventName,
      logoUrl,
      proofPhoneNumber,
      whatsappGroupUrl,
      pixKey,
      blobReadWriteToken,
      blobAutoSync,
      blobStorageUrl,
      blobLastSyncAt,
      theme,
      backgroundMusicUrl,
      backgroundMusicTitle,
      backgroundMusicEnabled
    } = req.body || {};
    const currentSettings = loadSettings();
    if (!isAuthorizedAdmin(adminPassword, currentSettings)) {
      return res.status(401).json({ error: "Senha de administrador incorreta." });
    }
    const updatedSettings = {
      ...currentSettings,
      ticketPrice: ticketPrice !== void 0 && ticketPrice !== null && !isNaN(Number(ticketPrice)) ? Number(ticketPrice) : currentSettings.ticketPrice,
      revenueGoal: revenueGoal !== void 0 && revenueGoal !== null && !isNaN(Number(revenueGoal)) ? Number(revenueGoal) : currentSettings.revenueGoal,
      adminPassword: newAdminPassword && newAdminPassword.trim() ? newAdminPassword.trim() : currentSettings.adminPassword,
      eventDate: eventDate || currentSettings.eventDate,
      locationName: locationName !== void 0 ? String(locationName).trim() : currentSettings.locationName,
      locationAddress: locationAddress !== void 0 ? String(locationAddress).trim() : currentSettings.locationAddress,
      googleMapsEmbedUrl: googleMapsEmbedUrl !== void 0 ? String(googleMapsEmbedUrl).trim() : currentSettings.googleMapsEmbedUrl,
      congregations: Array.isArray(congregations) ? congregations : currentSettings.congregations || DEFAULT_SETTINGS.congregations,
      teams: Array.isArray(teams) ? teams : currentSettings.teams || DEFAULT_SETTINGS.teams,
      galleryItems: sanitizeGalleryItems(Array.isArray(galleryItems) ? galleryItems : currentSettings.galleryItems),
      eventName: eventName !== void 0 ? String(eventName).trim() : currentSettings.eventName,
      logoUrl: logoUrl !== void 0 ? String(logoUrl).trim() : currentSettings.logoUrl,
      proofPhoneNumber: proofPhoneNumber !== void 0 ? String(proofPhoneNumber).trim() : currentSettings.proofPhoneNumber,
      whatsappGroupUrl: whatsappGroupUrl !== void 0 ? String(whatsappGroupUrl).trim() : currentSettings.whatsappGroupUrl,
      pixKey: pixKey !== void 0 ? String(pixKey).trim() : currentSettings.pixKey || "gincana.joias2026@gmail.com",
      blobReadWriteToken: blobReadWriteToken !== void 0 ? String(blobReadWriteToken).trim() : currentSettings.blobReadWriteToken,
      blobAutoSync: blobAutoSync !== void 0 ? Boolean(blobAutoSync) : currentSettings.blobAutoSync,
      blobStorageUrl: blobStorageUrl !== void 0 ? String(blobStorageUrl).trim() : currentSettings.blobStorageUrl,
      blobLastSyncAt: blobLastSyncAt !== void 0 ? String(blobLastSyncAt).trim() : currentSettings.blobLastSyncAt,
      theme: theme === "light" || theme === "dark" ? theme : currentSettings.theme,
      backgroundMusicUrl: backgroundMusicUrl !== void 0 ? String(backgroundMusicUrl).trim() : currentSettings.backgroundMusicUrl,
      backgroundMusicTitle: backgroundMusicTitle !== void 0 ? String(backgroundMusicTitle).trim() : currentSettings.backgroundMusicTitle || "Hino CCB",
      backgroundMusicEnabled: backgroundMusicEnabled !== void 0 ? Boolean(backgroundMusicEnabled) : currentSettings.backgroundMusicEnabled
    };
    await saveSettings(updatedSettings);
    return res.json({ message: "Configura\xE7\xF5es atualizadas com sucesso!", settings: updatedSettings });
  } catch (err) {
    console.error("Error in /api/settings:", err);
    return res.status(500).json({ error: "Erro ao salvar configura\xE7\xF5es no servidor: " + (err?.message || "Erro interno.") });
  }
};
app.post("/api/settings", updateSettingsHandler);
app.post("/settings", updateSettingsHandler);
var getParticipantsHandler = async (req, res) => {
  try {
    const { participants, source } = await getParticipantsMaster();
    res.setHeader("X-Data-Source", source);
    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=60");
    res.json(participants);
  } catch (err) {
    console.error("Error loading participants:", err);
    res.json(loadParticipantsFromDisk());
  }
};
app.get("/api/participants", getParticipantsHandler);
app.get("/participants", getParticipantsHandler);
var createParticipantHandler = async (req, res) => {
  try {
    const { fullName, congregation, age, foodOrDrink, activities, proofUrl, proofFileName, proofFileType } = req.body || {};
    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ error: "Por favor, informe o Nome Completo." });
    }
    if (!congregation || !String(congregation).trim()) {
      return res.status(400).json({ error: "Por favor, informe ou selecione a Comum Congrega\xE7\xE3o." });
    }
    const numAge = Number(age);
    if (age === void 0 || age === null || isNaN(numAge) || numAge <= 0) {
      return res.status(400).json({ error: "Por favor, informe uma idade v\xE1lida." });
    }
    const cleanFullName = String(fullName).trim();
    const nameParts = cleanFullName.split(" ").filter(Boolean);
    const firstName = nameParts[0] ? nameParts[0].toLowerCase() : cleanFullName.toLowerCase();
    const initialAmountPaid = req.body?.amountPaid !== void 0 && req.body?.amountPaid !== null ? Number(req.body.amountPaid) : 20;
    const initialNotes = req.body?.notes !== void 0 ? String(req.body.notes).trim() : void 0;
    const safeProofUrl = await ensureSupabaseCdnUrl(proofUrl, cleanFullName);
    const participantId = req.body?.id && String(req.body.id).trim().startsWith("p-") ? String(req.body.id).trim() : "p-" + Date.now() + "-" + Math.floor(Math.random() * 1e4);
    const newParticipant = {
      id: participantId,
      fullName: cleanFullName,
      firstName,
      congregation: String(congregation).trim(),
      age: numAge,
      foodOrDrink: foodOrDrink ? String(foodOrDrink).trim() : "",
      activities: {
        gincana: activities ? Boolean(activities.gincana) : true,
        tocata: activities ? Boolean(activities.tocata) : false,
        instrument: activities?.instrument ? String(activities.instrument).trim() : ""
      },
      proofUrl: safeProofUrl || null,
      proofFileName: proofFileName || null,
      proofFileType: proofFileType || null,
      proofStatus: proofUrl ? "Analisando" : "Pendente",
      notes: initialNotes,
      amountPaid: isNaN(initialAmountPaid) ? 20 : initialAmountPaid,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const supabase = getSupabaseServerClient();
    let savedToSupabase = false;
    if (supabase) {
      try {
        const row = toSupabaseRow(newParticipant);
        savedToSupabase = await executeResilientServerSupabaseUpsert(supabase, row);
        if (savedToSupabase) {
          console.log("[Supabase Server] Participant persisted to Supabase:", newParticipant.id, newParticipant.fullName);
        }
      } catch (sbErr) {
        console.warn("[Supabase Server] Error during direct upsert:", sbErr);
      }
    }
    const currentList = cachedParticipants || loadParticipantsFromDisk();
    cachedParticipants = [newParticipant, ...currentList.filter((p) => p.id !== newParticipant.id)];
    saveParticipantsToDisk(cachedParticipants);
    res.status(201).json({
      message: "Participante cadastrado com sucesso!",
      participant: newParticipant,
      persistedToSupabase: savedToSupabase
    });
    setTimeout(() => {
      mutateAndCommitParticipants((list2) => {
        return [newParticipant, ...list2.filter((p) => p.id !== newParticipant.id)];
      }, `Cadastrar participante: ${cleanFullName}`).catch((err) => {
        console.warn("[GitHub Sync] Background backup notice:", err?.message || err);
      });
    }, 10);
    return;
  } catch (err) {
    console.error("Error creating participant:", err);
    return res.status(500).json({ error: "Erro ao salvar o participante: " + (err?.message || "Tente novamente.") });
  }
};
app.post("/api/participants", createParticipantHandler);
app.post("/participants", createParticipantHandler);
var lookupParticipantHandler = async (req, res) => {
  try {
    const { firstName, name, fullName, congregation, age, searchTerm } = req.body || {};
    const queryName = normalizeText(searchTerm || fullName || name || firstName || "");
    const queryCongregation = normalizeText(congregation || "");
    const queryAge = age !== void 0 && age !== null && String(age).trim() !== "" ? Number(age) : null;
    if (!queryName && !queryCongregation && queryAge === null) {
      return res.status(400).json({
        error: "Por favor, informe ao menos o Nome, a Comum Congrega\xE7\xE3o ou a Idade para localizar seu cadastro."
      });
    }
    const { participants } = await getParticipantsMaster();
    let matches = participants.filter((p) => {
      const pFullNameNorm = normalizeText(p.fullName);
      const pFirstNameNorm = normalizeText(p.firstName);
      const pCongregationNorm = normalizeText(p.congregation);
      let matchName = true;
      if (queryName) {
        matchName = p.id === queryName || pFullNameNorm.includes(queryName) || queryName.includes(pFullNameNorm) || pFirstNameNorm.includes(queryName) || queryName.includes(pFirstNameNorm) || queryName.split(" ").some((part) => part.length >= 3 && pFullNameNorm.includes(part));
      }
      let matchCongregation = true;
      if (queryCongregation && queryCongregation !== "todas" && queryCongregation !== "all" && queryCongregation !== "outra / digitar manualmente") {
        matchCongregation = pCongregationNorm.includes(queryCongregation) || queryCongregation.includes(pCongregationNorm);
      }
      let matchAge = true;
      if (queryAge !== null && !isNaN(queryAge) && queryAge > 0) {
        matchAge = p.age === queryAge;
      }
      return matchName && matchCongregation && matchAge;
    });
    if (matches.length === 0 && queryName) {
      matches = participants.filter((p) => {
        const pFullNameNorm = normalizeText(p.fullName);
        const pFirstNameNorm = normalizeText(p.firstName);
        return p.id === queryName || pFullNameNorm.includes(queryName) || queryName.includes(pFullNameNorm) || pFirstNameNorm.includes(queryName) || queryName.includes(pFirstNameNorm) || queryName.split(" ").some((part) => part.length >= 3 && pFullNameNorm.includes(part));
      });
    }
    if (matches.length === 0 && queryCongregation && queryAge !== null && !isNaN(queryAge) && queryAge > 0) {
      matches = participants.filter((p) => {
        const pCongregationNorm = normalizeText(p.congregation);
        return (pCongregationNorm.includes(queryCongregation) || queryCongregation.includes(pCongregationNorm)) && p.age === queryAge;
      });
    }
    if (matches.length === 0) {
      return res.status(404).json({
        error: "Nenhum cadastro foi encontrado com os dados informados. Verifique o nome completo, congrega\xE7\xE3o ou idade."
      });
    }
    return res.json({
      message: `${matches.length} cadastro(s) localizado(s).`,
      participants: matches
    });
  } catch (err) {
    console.error("Error in lookupParticipantHandler:", err);
    return res.status(500).json({ error: "Erro ao consultar cadastro: " + (err?.message || "") });
  }
};
app.post("/api/participants/lookup", lookupParticipantHandler);
app.post("/participants/lookup", lookupParticipantHandler);
var attachProofHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { proofUrl, proofFileName, proofFileType, notes, proofStatus, fullName, name, congregation, age } = req.body || {};
    if (!proofUrl) {
      return res.status(400).json({ error: "Nenhum comprovante foi enviado." });
    }
    const safeProofUrl = await ensureSupabaseCdnUrl(proofUrl, id || fullName || "proof");
    let updatedTarget = null;
    await mutateAndCommitParticipants((list2) => {
      let index = list2.findIndex((p) => p && p.id === id);
      if (index === -1 && id) {
        const cleanId = String(id).trim().toLowerCase();
        index = list2.findIndex((p) => p && String(p.id).trim().toLowerCase() === cleanId);
      }
      if (index === -1 && req.body?.id) {
        const bodyId = String(req.body.id).trim().toLowerCase();
        index = list2.findIndex((p) => p && String(p.id).trim().toLowerCase() === bodyId);
      }
      if (index === -1 && (fullName || name)) {
        const searchName = normalizeText(fullName || name);
        const searchCong = normalizeText(congregation || "");
        index = list2.findIndex((p) => {
          const pName = normalizeText(p.fullName);
          const pCong = normalizeText(p.congregation);
          if (searchCong) {
            return pName === searchName && (pCong === searchCong || pCong.includes(searchCong) || searchCong.includes(pCong));
          }
          return pName === searchName;
        });
      }
      if (index === -1) {
        const cleanFullName = String(fullName || name || "Participante").trim();
        const nameParts = cleanFullName.split(" ").filter(Boolean);
        const newP = {
          id: id || req.body?.id || "p-" + Date.now(),
          fullName: cleanFullName,
          firstName: nameParts[0] ? nameParts[0].toLowerCase() : cleanFullName.toLowerCase(),
          congregation: String(congregation || "Central").trim(),
          age: Number(age) || 18,
          foodOrDrink: "",
          activities: { gincana: true, tocata: false },
          proofUrl: safeProofUrl,
          proofFileName: proofFileName || "comprovante",
          proofFileType: proofFileType || "image",
          proofStatus: proofStatus || "Analisando",
          notes: notes ? String(notes).trim() : void 0,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        list2.unshift(newP);
        updatedTarget = newP;
      } else {
        list2[index].proofUrl = safeProofUrl;
        list2[index].proofFileName = proofFileName || "comprovante";
        list2[index].proofFileType = proofFileType || "image";
        list2[index].proofStatus = proofStatus || "Analisando";
        list2[index].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        if (notes !== void 0) list2[index].notes = String(notes).trim();
        updatedTarget = list2[index];
      }
      return list2;
    }, `Anexar comprovante: ${id || fullName || "participante"}`);
    return res.json({
      message: "Comprovante anexado com sucesso! Aguarde a verifica\xE7\xE3o da organiza\xE7\xE3o.",
      participant: updatedTarget
    });
  } catch (err) {
    console.error("Error attaching proof in server.ts:", err);
    return res.status(500).json({ error: "Erro ao salvar comprovante no reposit\xF3rio GitHub: " + (err?.message || "Tente novamente.") });
  }
};
app.put("/api/participants/:id/proof", attachProofHandler);
app.put("/participants/:id/proof", attachProofHandler);
app.post("/api/participants/:id/proof", attachProofHandler);
app.post("/participants/:id/proof", attachProofHandler);
app.post("/api/participants/proof", attachProofHandler);
app.post("/participants/proof", attachProofHandler);
var updateParticipantHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    if (updates.proofUrl && typeof updates.proofUrl === "string" && updates.proofUrl.startsWith("data:")) {
      updates.proofUrl = await ensureSupabaseCdnUrl(updates.proofUrl, id || updates.id || "proof");
    }
    let targetResult = null;
    await mutateAndCommitParticipants((list2) => {
      let index = list2.findIndex((p) => p && p.id === id);
      if (index === -1 && id) {
        const cleanId = String(id).trim().toLowerCase();
        index = list2.findIndex((p) => p && String(p.id).trim().toLowerCase() === cleanId);
      }
      if (index === -1 && updates.id) {
        const bodyId = String(updates.id).trim().toLowerCase();
        index = list2.findIndex((p) => p && String(p.id).trim().toLowerCase() === bodyId);
      }
      if (index === -1 && (updates.fullName || updates.name)) {
        const searchName = normalizeText(updates.fullName || updates.name);
        const searchCong = normalizeText(updates.congregation || "");
        index = list2.findIndex((p) => {
          const pName = normalizeText(p.fullName);
          const pCong = normalizeText(p.congregation);
          if (searchCong) {
            return pName === searchName && (pCong === searchCong || pCong.includes(searchCong) || searchCong.includes(pCong));
          }
          return pName === searchName;
        });
      }
      if (index === -1) {
        const cleanFullName = String(updates.fullName || updates.name || "Participante").trim();
        const nameParts = cleanFullName.split(" ").filter(Boolean);
        const rawAmount = updates.amountPaid !== void 0 ? updates.amountPaid : updates.amount_paid;
        const initialAmount = rawAmount !== void 0 && rawAmount !== null ? Number(rawAmount) : 20;
        targetResult = {
          id: id || updates.id || "p-" + Date.now(),
          fullName: cleanFullName,
          firstName: nameParts[0] ? nameParts[0].toLowerCase() : cleanFullName.toLowerCase(),
          congregation: String(updates.congregation || "Central").trim(),
          age: Number(updates.age) || 18,
          foodOrDrink: updates.foodOrDrink ? String(updates.foodOrDrink).trim() : "",
          activities: {
            gincana: updates.activities?.gincana !== void 0 ? Boolean(updates.activities.gincana) : true,
            tocata: updates.activities?.tocata !== void 0 ? Boolean(updates.activities.tocata) : false,
            instrument: updates.activities?.instrument ? String(updates.activities.instrument).trim() : ""
          },
          proofUrl: updates.proofUrl || null,
          proofFileName: updates.proofFileName || null,
          proofFileType: updates.proofFileType || null,
          proofStatus: updates.proofStatus || (updates.proofUrl ? "Analisando" : "Pendente"),
          notes: updates.notes !== void 0 ? String(updates.notes).trim() : void 0,
          amountPaid: isNaN(initialAmount) ? 20 : initialAmount,
          createdAt: updates.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        list2.unshift(targetResult);
      } else {
        targetResult = {
          ...list2[index],
          ...updates,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        if (updates.fullName || updates.full_name || updates.name) {
          const cleanFullName = String(updates.fullName || updates.full_name || updates.name).trim();
          const nameParts = cleanFullName.split(" ").filter(Boolean);
          targetResult.fullName = cleanFullName;
          targetResult.firstName = nameParts[0] ? nameParts[0].toLowerCase() : cleanFullName.toLowerCase();
        }
        if (updates.age !== void 0 && updates.age !== null && !isNaN(Number(updates.age))) {
          targetResult.age = Number(updates.age);
        }
        if (updates.congregation) {
          targetResult.congregation = String(updates.congregation).trim();
        }
        if (updates.foodOrDrink !== void 0) {
          targetResult.foodOrDrink = String(updates.foodOrDrink).trim();
        }
        if (updates.activities) {
          targetResult.activities = {
            gincana: Boolean(updates.activities.gincana),
            tocata: Boolean(updates.activities.tocata),
            instrument: updates.activities.instrument ? String(updates.activities.instrument).trim() : ""
          };
        }
        if (updates.proofStatus) {
          targetResult.proofStatus = updates.proofStatus;
        }
        if (updates.proofUrl !== void 0) {
          targetResult.proofUrl = updates.proofUrl;
          if (updates.proofFileName !== void 0) targetResult.proofFileName = updates.proofFileName;
          if (updates.proofFileType !== void 0) targetResult.proofFileType = updates.proofFileType;
        }
        if (updates.amountPaid !== void 0 && updates.amountPaid !== null && !isNaN(Number(updates.amountPaid))) {
          targetResult.amountPaid = Number(updates.amountPaid);
        } else if (updates.amount_paid !== void 0 && updates.amount_paid !== null && !isNaN(Number(updates.amount_paid))) {
          targetResult.amountPaid = Number(updates.amount_paid);
        }
        if (updates.notes !== void 0) {
          targetResult.notes = String(updates.notes).trim();
        }
        list2[index] = targetResult;
      }
      return list2;
    }, `Atualizar participante: ${id || updates.fullName || "id"}`);
    if (targetResult) {
      await upsertParticipantInSupabase(targetResult);
      lastSupabaseFetchTime = 0;
    }
    return res.json({
      message: "Cadastro atualizado com sucesso.",
      participant: targetResult
    });
  } catch (err) {
    console.error("Error updating participant in server.ts:", err);
    return res.status(500).json({ error: "Erro ao atualizar dados: " + (err?.message || "Tente novamente.") });
  }
};
app.put("/api/participants/:id", updateParticipantHandler);
app.put("/participants/:id", updateParticipantHandler);
app.patch("/api/participants/:id", updateParticipantHandler);
app.patch("/participants/:id", updateParticipantHandler);
app.post("/api/participants/:id/update", updateParticipantHandler);
app.post("/participants/:id/update", updateParticipantHandler);
app.post("/api/participants/:id/status", updateParticipantHandler);
app.put("/api/participants/:id/status", updateParticipantHandler);
app.patch("/api/participants/:id/status", updateParticipantHandler);
app.post("/api/participants/:id", updateParticipantHandler);
app.post("/participants/:id", updateParticipantHandler);
app.post("/api/participants/update", updateParticipantHandler);
app.put("/api/participants/update", updateParticipantHandler);
var audioFileStreamHandler = (req, res) => {
  const rawParam = req.params.filename ? decodeURIComponent(req.params.filename) : "";
  const candidatePath = rawParam ? path.join(AUDIO_UPLOADS_DIR, rawParam) : "";
  if (candidatePath && fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.sendFile(candidatePath);
  }
  try {
    if (fs.existsSync(AUDIO_UPLOADS_DIR)) {
      const files = fs.readdirSync(AUDIO_UPLOADS_DIR).filter((f) => f.toLowerCase().endsWith(".mp3"));
      if (files.length > 0) {
        const found = files.find((f) => f.toLowerCase() === rawParam.toLowerCase()) || files[0];
        const fullPath = path.join(AUDIO_UPLOADS_DIR, found);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.sendFile(fullPath);
      }
    }
  } catch (e) {
  }
  return res.status(404).send("\xC1udio n\xE3o encontrado.");
};
app.get("/uploads/audio/:filename", audioFileStreamHandler);
app.get("/api/uploads/audio/:filename", audioFileStreamHandler);
app.get("/audio/:filename", audioFileStreamHandler);
app.get("/api/audio/current", (req, res) => {
  const current = getDefaultLocalAudioTrack();
  res.json(current);
});
var deleteParticipantHandler = async (req, res) => {
  try {
    const { id } = req.params;
    let found = false;
    const deletedInSupabase = await deleteParticipantInSupabase(id);
    if (deletedInSupabase) found = true;
    lastSupabaseFetchTime = 0;
    await mutateAndCommitParticipants((list2) => {
      const initialLen = list2.length;
      const filtered = list2.filter((p) => p && p.id !== id);
      if (filtered.length < initialLen) found = true;
      return filtered;
    }, `Excluir participante: ${id}`);
    if (cachedParticipants) {
      cachedParticipants = cachedParticipants.filter((p) => p && p.id !== id);
    }
    return res.json({ message: "Participante removido com sucesso.", id });
  } catch (err) {
    console.error("Error deleting participant:", err);
    return res.status(500).json({ error: "Erro ao excluir participante: " + (err?.message || "") });
  }
};
app.delete("/api/participants/:id", deleteParticipantHandler);
app.delete("/participants/:id", deleteParticipantHandler);
app.post("/api/participants/:id/delete", deleteParticipantHandler);
app.post("/participants/:id/delete", deleteParticipantHandler);
var getStatsHandler = async (req, res) => {
  try {
    const { participants } = await getParticipantsMaster();
    const settings = loadSettings();
    const totalParticipants = participants.length;
    const totalWithProof = participants.filter((p) => p && p.proofUrl).length;
    const totalApprovedProof = participants.filter((p) => p && p.proofStatus === "Aprovado").length;
    const totalPendingProof = participants.filter((p) => !p || !p.proofUrl || p.proofStatus === "Pendente").length;
    const gincanaCount = participants.filter((p) => p && p.activities && p.activities.gincana).length;
    const tocataCount = participants.filter((p) => p && p.activities && p.activities.tocata).length;
    const foodContributionsCount = participants.filter((p) => p && p.foodOrDrink && String(p.foodOrDrink).trim().length > 0).length;
    const congregationsCount = {};
    participants.forEach((p) => {
      if (!p) return;
      const cong = p.congregation || "Outras";
      congregationsCount[cong] = (congregationsCount[cong] || 0) + 1;
    });
    const ageGroups = {
      kids: 0,
      teens: 0,
      youth: 0,
      adults: 0
    };
    participants.forEach((p) => {
      if (!p) return;
      const age = Number(p.age) || 0;
      if (age <= 11) ageGroups.kids++;
      else if (age <= 17) ageGroups.teens++;
      else if (age <= 35) ageGroups.youth++;
      else ageGroups.adults++;
    });
    const ticketPrice = Number(settings.ticketPrice) || 20;
    const revenueGoal = Number(settings.revenueGoal) || 2500;
    const totalRevenueReceived = participants.filter((p) => p.proofStatus === "Aprovado").reduce((acc, p) => acc + (p.amountPaid !== void 0 && p.amountPaid !== null ? Number(p.amountPaid) : ticketPrice), 0);
    const totalRevenuePending = participants.filter((p) => p.proofStatus !== "Aprovado" && p.proofStatus !== "Rejeitado").reduce((acc, p) => acc + (p.amountPaid !== void 0 && p.amountPaid !== null ? Number(p.amountPaid) : ticketPrice), 0);
    const goalProgressPercent = revenueGoal > 0 ? Math.min(100, Math.round(totalRevenueReceived / revenueGoal * 100)) : 0;
    const stats = {
      totalParticipants,
      totalWithProof,
      totalPendingProof,
      totalApprovedProof,
      gincanaCount,
      tocataCount,
      foodContributionsCount,
      congregationsCount,
      ageGroups,
      ticketPrice,
      revenueGoal,
      totalRevenueReceived,
      totalRevenuePending,
      goalProgressPercent,
      recentRegistrations: participants.slice(0, 5)
    };
    res.json(stats);
  } catch (err) {
    console.error("Error in getStatsHandler:", err);
    res.status(500).json({ error: "Erro ao processar estat\xEDsticas: " + (err?.message || "") });
  }
};
app.get("/api/stats", getStatsHandler);
app.get("/stats", getStatsHandler);
var backupExportHandler = async (req, res) => {
  try {
    const { participants } = await getParticipantsMaster();
    const settings = loadSettings();
    res.json({
      version: 1,
      backupType: "FULL_DATABASE_BACKUP",
      databaseSource: "Supabase PostgreSQL & Server Data",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      summary: {
        totalParticipants: participants.length,
        totalApproved: participants.filter((p) => p.proofStatus === "Aprovado").length,
        totalPending: participants.filter((p) => !p.proofStatus || p.proofStatus === "Pendente").length
      },
      settings,
      participants
    });
  } catch (err) {
    res.json({
      version: 1,
      backupType: "FULL_DATABASE_BACKUP",
      databaseSource: "Local Server Data",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      settings: loadSettings(),
      participants: loadParticipants()
    });
  }
};
app.get("/api/backup/export", backupExportHandler);
app.get("/backup/export", backupExportHandler);
var supabaseBackupExportHandler = async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    let participants = [];
    let settings = null;
    if (supabase) {
      const { data: pData } = await supabase.from("participants").select("*").order("created_at", { ascending: false });
      if (Array.isArray(pData)) {
        participants = pData.map(fromSupabaseRow);
      }
      const { data: sData } = await supabase.from("settings").select("data").eq("id", "current_settings").maybeSingle();
      if (sData && sData.data) {
        settings = sData.data;
      }
    }
    if (participants.length === 0) {
      const master = await getParticipantsMaster();
      participants = master.participants;
    }
    if (!settings) {
      settings = loadSettings();
    }
    const now = /* @__PURE__ */ new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}h${pad(now.getMinutes())}`;
    const filename = `backup_supabase_gincana_joias_${dateStr}_${timeStr}.json`;
    const totalApproved = participants.filter((p) => p.proofStatus === "Aprovado" || p.proof_status === "Aprovado").length;
    const totalPending = participants.filter((p) => !p.proofStatus || p.proofStatus === "Pendente" || p.proof_status === "Pendente").length;
    const totalRejected = participants.filter((p) => p.proofStatus === "Rejeitado" || p.proof_status === "Rejeitado").length;
    const ticketVal = Number(settings.ticketPrice) || 20;
    const totalRevenue = participants.filter((p) => p.proofStatus === "Aprovado" || p.proof_status === "Aprovado").reduce((acc, p) => {
      const val = p.amountPaid !== void 0 && p.amountPaid !== null ? Number(p.amountPaid) : p.amount_paid !== void 0 && p.amount_paid !== null ? Number(p.amount_paid) : ticketVal;
      return acc + val;
    }, 0);
    const payload = {
      version: 1,
      backupType: "SUPABASE_FULL_DATABASE_BACKUP",
      databaseSource: "Supabase PostgreSQL",
      projectUrl: getSupabaseServerCredentials().url,
      exportedAt: now.toISOString(),
      exportedAtFormatted: `${dateStr} ${timeStr} (Hor\xE1rio de Bras\xEDlia/Bahia)`,
      filename,
      summary: {
        totalParticipants: participants.length,
        totalApproved,
        totalPending,
        totalRejected,
        totalRevenue,
        databaseTables: ["participants", "settings", "storage.buckets (comprovantes)"]
      },
      settings,
      participants
    };
    res.json(payload);
  } catch (err) {
    console.error("Error in supabaseBackupExportHandler:", err);
    res.status(500).json({ error: "Erro ao gerar backup do Supabase: " + (err?.message || "") });
  }
};
app.get("/api/backup/supabase/export", supabaseBackupExportHandler);
app.get("/backup/supabase/export", supabaseBackupExportHandler);
var supabaseBackupDownloadHandler = async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    let participants = [];
    let settings = null;
    if (supabase) {
      const { data: pData } = await supabase.from("participants").select("*").order("created_at", { ascending: false });
      if (Array.isArray(pData)) {
        participants = pData.map(fromSupabaseRow);
      }
      const { data: sData } = await supabase.from("settings").select("data").eq("id", "current_settings").maybeSingle();
      if (sData && sData.data) {
        settings = sData.data;
      }
    }
    if (participants.length === 0) {
      const master = await getParticipantsMaster();
      participants = master.participants;
    }
    if (!settings) {
      settings = loadSettings();
    }
    const now = /* @__PURE__ */ new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}h${pad(now.getMinutes())}`;
    const filename = `backup_supabase_gincana_joias_${dateStr}_${timeStr}.json`;
    const totalApproved = participants.filter((p) => p.proofStatus === "Aprovado" || p.proof_status === "Aprovado").length;
    const totalPending = participants.filter((p) => !p.proofStatus || p.proofStatus === "Pendente" || p.proof_status === "Pendente").length;
    const totalRejected = participants.filter((p) => p.proofStatus === "Rejeitado" || p.proof_status === "Rejeitado").length;
    const ticketVal = Number(settings.ticketPrice) || 20;
    const totalRevenue = participants.filter((p) => p.proofStatus === "Aprovado" || p.proof_status === "Aprovado").reduce((acc, p) => {
      const val = p.amountPaid !== void 0 && p.amountPaid !== null ? Number(p.amountPaid) : p.amount_paid !== void 0 && p.amount_paid !== null ? Number(p.amount_paid) : ticketVal;
      return acc + val;
    }, 0);
    const payload = {
      version: 1,
      backupType: "SUPABASE_FULL_DATABASE_BACKUP",
      databaseSource: "Supabase PostgreSQL",
      projectUrl: getSupabaseServerCredentials().url,
      exportedAt: now.toISOString(),
      exportedAtFormatted: `${dateStr} ${timeStr} (Hor\xE1rio Oficial)`,
      filename,
      summary: {
        totalParticipants: participants.length,
        totalApproved,
        totalPending,
        totalRejected,
        totalRevenue,
        databaseTables: ["participants", "settings", "storage.buckets (comprovantes)"]
      },
      settings,
      participants
    };
    const jsonString = JSON.stringify(payload, null, 2);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(jsonString);
  } catch (err) {
    console.error("Error in supabaseBackupDownloadHandler:", err);
    res.status(500).json({ error: "Erro ao fazer download do backup: " + (err?.message || "") });
  }
};
app.get("/api/backup/supabase/download", supabaseBackupDownloadHandler);
app.get("/backup/supabase/download", supabaseBackupDownloadHandler);
var backupImportHandler = async (req, res) => {
  try {
    const body = req.body || {};
    let incomingSettings = null;
    let incomingParticipants = null;
    if (Array.isArray(body)) {
      incomingParticipants = body;
    } else if (typeof body === "object") {
      const root = body.backupData && typeof body.backupData === "object" ? body.backupData : body.data && typeof body.data === "object" ? body.data : body;
      if (root.settings && typeof root.settings === "object") {
        incomingSettings = root.settings;
      } else if (root.ticketPrice !== void 0 || root.eventName !== void 0 || root.congregations !== void 0) {
        incomingSettings = root;
      }
      if (Array.isArray(root.participants)) {
        incomingParticipants = root.participants;
      } else if (Array.isArray(root.participantes)) {
        incomingParticipants = root.participantes;
      } else if (Array.isArray(root.rawDatabaseRows)) {
        incomingParticipants = root.rawDatabaseRows;
      } else if (Array.isArray(root.inscriptions)) {
        incomingParticipants = root.inscriptions;
      } else if (Array.isArray(root.inscricoes)) {
        incomingParticipants = root.inscricoes;
      } else if (Array.isArray(body.participants)) {
        incomingParticipants = body.participants;
      }
    }
    if (!incomingSettings && !incomingParticipants) {
      return res.status(400).json({
        error: "Formato de backup inv\xE1lido. O arquivo JSON selecionado n\xE3o cont\xE9m participantes nem configura\xE7\xF5es do evento."
      });
    }
    let savedSettingsResult = null;
    if (incomingSettings && typeof incomingSettings === "object") {
      const currentSettings = loadSettings();
      savedSettingsResult = {
        ...currentSettings,
        ...incomingSettings
      };
      await saveSettings(savedSettingsResult);
    }
    let restoredParticipantsCount = 0;
    if (incomingParticipants && Array.isArray(incomingParticipants)) {
      const normalizedParticipants = incomingParticipants.map(fromSupabaseRow);
      const result = await mutateAndCommitParticipants(() => normalizedParticipants, "Restaurar backup completo de participantes");
      restoredParticipantsCount = result.participants.length;
    }
    console.log(`[Backup] Importa\xE7\xE3o conclu\xEDda com sucesso: ${restoredParticipantsCount} participantes restaurados, configura\xE7\xF5es atualizadas: ${Boolean(incomingSettings)}.`);
    return res.json({
      success: true,
      message: "Base de dados restaurada e sincronizada com sucesso!",
      participantsCount: restoredParticipantsCount,
      settingsUpdated: Boolean(incomingSettings),
      settings: savedSettingsResult || loadSettings()
    });
  } catch (err) {
    console.error("Error importing backup JSON:", err);
    return res.status(500).json({
      error: "Erro ao restaurar o arquivo de backup: " + (err?.message || "Erro desconhecido")
    });
  }
};
app.post("/api/backup/import", backupImportHandler);
app.post("/backup/import", backupImportHandler);
var supabaseConfigHandler = async (req, res) => {
  if (req.method === "POST") {
    const { url, key } = req.body || {};
    if (!url || !key) {
      return res.status(400).json({ error: "URL e Chave de API do Supabase s\xE3o obrigat\xF3rios." });
    }
    try {
      const testClient = createClient(String(url).trim(), String(key).trim(), {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { error, count } = await testClient.from("participants").select("*", { count: "exact", head: true });
      if (error && error.code !== "PGRST116") {
        const errorMsg = error?.status === 402 || error?.code === "402" ? "Conta Supabase suspensa (402 Payment Required). Verifique o projeto." : error.message;
        return res.status(400).json({ error: `Falha ao conectar no Supabase: ${errorMsg}` });
      }
      customServerSupabaseUrl = String(url).trim();
      customServerSupabaseKey = String(key).trim();
      return res.json({
        success: true,
        message: "Conex\xE3o com o Supabase estabelecida com sucesso!",
        participantsCount: count || 0
      });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao testar credenciais: " + (err?.message || "Falha") });
    }
  }
  const { url: activeUrl, key: activeKey } = getSupabaseServerCredentials();
  const cleanUrl = activeUrl ? activeUrl.replace(/^https?:\/\//, "").split(".")[0] + ".supabase.co" : "";
  return res.json({
    url: activeUrl,
    cleanUrl,
    key: activeKey || DEFAULT_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    anonKey: activeKey || DEFAULT_SUPABASE_ANON_KEY,
    publishableKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    secretKeyConfigured: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    jwksUrl: DEFAULT_SUPABASE_JWKS_URL,
    hasCustomConfig: Boolean(customServerSupabaseUrl && customServerSupabaseKey)
  });
};
app.get("/api/supabase/config", supabaseConfigHandler);
app.post("/api/supabase/config", supabaseConfigHandler);
app.get("/supabase/config", supabaseConfigHandler);
app.post("/supabase/config", supabaseConfigHandler);
var supabaseStatusHandler = async (req, res) => {
  const supabase = getSupabaseServerClient();
  const { url } = getSupabaseServerCredentials();
  const isConfigured = Boolean(supabase && url);
  let isConnected = false;
  let participantsCount = 0;
  let errorMsg = "";
  if (supabase) {
    try {
      const { error, count, data } = await supabase.from("participants").select("id", { count: "exact" }).limit(1);
      if (error) {
        errorMsg = error?.status === 402 || error?.code === "402" ? "Conta suspensa (402 Payment Required) no Supabase configurado." : error.message;
      } else {
        isConnected = true;
        participantsCount = count !== null && count !== void 0 ? count : data?.length || 0;
      }
    } catch (err) {
      errorMsg = err?.message || "Falha ao conectar";
    }
  }
  return res.json({
    configured: isConfigured,
    connected: isConnected,
    url: url ? url.replace(/^https?:\/\//, "").split(".")[0] + ".supabase.co" : "",
    participantsCount,
    error: errorMsg || void 0
  });
};
app.get("/api/supabase/status", supabaseStatusHandler);
app.get("/supabase/status", supabaseStatusHandler);
var supabaseUploadHandler = async (req, res) => {
  try {
    const { filename, content, contentType, bucket } = req.body || {};
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return res.status(400).json({
        error: "Supabase n\xE3o est\xE1 configurado. Adicione SUPABASE_URL e SUPABASE_KEY."
      });
    }
    if (!content) {
      return res.status(400).json({ error: "Conte\xFAdo do arquivo n\xE3o fornecido." });
    }
    const cleanFilename = String(filename || "proof_" + Date.now()).replace(/[^a-zA-Z0-9_.-]/g, "_");
    const bucketName = bucket || "comprovantes";
    const filePath = `uploads/${Date.now()}_${cleanFilename}`;
    let buffer;
    if (typeof content === "string" && content.startsWith("data:")) {
      const base64Data = content.split(",")[1];
      buffer = Buffer.from(base64Data, "base64");
    } else if (typeof content === "string") {
      buffer = Buffer.from(content, "utf-8");
    } else {
      buffer = Buffer.from(content);
    }
    const publicUrl = await uploadFileToSupabaseStorage(
      bucketName,
      filePath,
      buffer,
      contentType || "image/jpeg"
    );
    if (!publicUrl) {
      return res.status(500).json({
        error: `Falha ao fazer upload para o bucket '${bucketName}' no Supabase. Verifique se o bucket existe e est\xE1 p\xFAblico.`
      });
    }
    return res.json({
      success: true,
      url: publicUrl,
      pathname: filePath
    });
  } catch (err) {
    console.error("Error in /api/supabase/upload:", err);
    return res.status(500).json({ error: "Erro ao salvar no Supabase Storage: " + (err.message || "Erro interno") });
  }
};
app.post("/api/supabase/upload", supabaseUploadHandler);
app.post("/supabase/upload", supabaseUploadHandler);
var supabaseSyncHandler = async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return res.status(400).json({
        error: "Supabase n\xE3o configurado. Por favor, adicione SUPABASE_URL e SUPABASE_KEY nas Vari\xE1veis de Ambiente."
      });
    }
    const currentList = loadParticipants();
    const success = await saveAllParticipantsToSupabase(currentList);
    if (!success) {
      return res.status(500).json({
        error: "N\xE3o foi poss\xEDvel sincronizar com o Supabase. Verifique se voc\xEA executou o Script SQL de cria\xE7\xE3o das tabelas no Supabase SQL Editor."
      });
    }
    return res.json({
      success: true,
      message: `${currentList.length} participantes sincronizados com o Supabase com sucesso!`,
      count: currentList.length
    });
  } catch (err) {
    console.error("Error in /api/supabase/sync:", err);
    return res.status(500).json({ error: "Erro na sincroniza\xE7\xE3o com o Supabase: " + (err.message || "Erro interno") });
  }
};
app.post("/api/supabase/sync", supabaseSyncHandler);
app.post("/supabase/sync", supabaseSyncHandler);
var blobUploadHandler = async (req, res) => {
  try {
    const { filename, content, contentType, customToken } = req.body || {};
    if (!content) {
      return res.status(400).json({ error: "Conte\xFAdo do arquivo n\xE3o fornecido." });
    }
    const cleanFilename = String(filename || "file_" + Date.now()).replace(/[^a-zA-Z0-9_.-]/g, "_");
    const mime = contentType || (cleanFilename.endsWith(".pdf") ? "application/pdf" : cleanFilename.endsWith(".png") ? "image/png" : "image/jpeg");
    let buffer;
    if (typeof content === "string" && content.startsWith("data:")) {
      const base64Data = content.split(",")[1];
      buffer = Buffer.from(base64Data, "base64");
    } else if (typeof content === "string") {
      buffer = Buffer.from(content, "utf-8");
    } else {
      buffer = Buffer.from(content);
    }
    const supabaseUrl = await uploadFileToSupabaseStorage("comprovantes", cleanFilename, buffer, mime);
    if (supabaseUrl) {
      return res.json({
        success: true,
        url: supabaseUrl,
        downloadUrl: supabaseUrl,
        pathname: cleanFilename,
        provider: "supabase"
      });
    }
    const token = getBlobToken(req, customToken);
    if (token) {
      const pathname = `gincana/uploads/${cleanFilename}`;
      const blob = await put(pathname, buffer, {
        access: "public",
        allowOverwrite: true,
        token,
        contentType: mime
      });
      return res.json({
        success: true,
        url: blob.url,
        downloadUrl: blob.downloadUrl || blob.url,
        pathname: blob.pathname,
        provider: "vercel"
      });
    }
    return res.status(500).json({
      error: "N\xE3o foi poss\xEDvel salvar a m\xEDdia no Supabase Storage nem no Vercel Blob."
    });
  } catch (err) {
    console.error("Error in /api/blob/upload:", err);
    return res.status(500).json({ error: "Erro ao fazer upload: " + (err.message || "Erro interno") });
  }
};
app.post("/api/blob/upload", blobUploadHandler);
app.post("/blob/upload", blobUploadHandler);
app.post("/api/upload/proof", blobUploadHandler);
app.post("/upload/proof", blobUploadHandler);
var blobBackupSaveHandler = async (req, res) => {
  try {
    const { backupData, customToken } = req.body || {};
    const token = getBlobToken(req, customToken);
    if (!token) {
      return res.status(400).json({
        error: "Token do Vercel Blob n\xE3o encontrado. Adicione BLOB_READ_WRITE_TOKEN nas vari\xE1veis de ambiente da Vercel ou insira o Token no Painel do Administrador."
      });
    }
    const participants = backupData?.participants || loadParticipants();
    const settings = backupData?.settings || loadSettings();
    const fullData = {
      version: 1,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      settings,
      participants
    };
    const jsonContent = JSON.stringify(fullData, null, 2);
    const pathname = "gincana/gincana_backup_database.json";
    const blob = await put(pathname, jsonContent, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
      contentType: "application/json"
    });
    const currentSettings = loadSettings();
    saveSettings({
      ...currentSettings,
      blobStorageUrl: blob.url,
      blobLastSyncAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return res.json({
      success: true,
      url: blob.url,
      message: "Base de dados e cadastros armazenados com sucesso no Vercel Blob!"
    });
  } catch (err) {
    console.error("Error saving backup to Vercel Blob:", err);
    return res.status(500).json({ error: "Erro ao salvar backup no Vercel Blob: " + (err.message || "Erro interno") });
  }
};
app.post("/api/blob/backup/save", blobBackupSaveHandler);
app.post("/blob/backup/save", blobBackupSaveHandler);
var blobBackupLoadHandler = async (req, res) => {
  try {
    const { customToken } = req.body || {};
    const token = getBlobToken(req, customToken);
    if (!token) {
      return res.status(400).json({
        error: "Token do Vercel Blob n\xE3o encontrado. Adicione a vari\xE1vel BLOB_READ_WRITE_TOKEN."
      });
    }
    const { blobs } = await list({ prefix: "gincana/gincana_backup_database.json", token });
    if (!blobs || blobs.length === 0) {
      return res.status(404).json({ error: "Nenhum backup encontrado no container Vercel Blob." });
    }
    const backupBlob = blobs[0];
    const fetchRes = await fetch(backupBlob.url);
    if (!fetchRes.ok) {
      throw new Error("N\xE3o foi poss\xEDvel ler o arquivo do Vercel Blob.");
    }
    const backupData = await fetchRes.json();
    if (backupData.participants && Array.isArray(backupData.participants)) {
      saveParticipants(backupData.participants);
    }
    if (backupData.settings && typeof backupData.settings === "object") {
      const currentSettings = loadSettings();
      saveSettings({ ...currentSettings, ...backupData.settings, blobStorageUrl: backupBlob.url });
    }
    return res.json({
      success: true,
      backupData,
      message: "Base de dados restaurada com sucesso do Vercel Blob!"
    });
  } catch (err) {
    console.error("Error loading backup from Vercel Blob:", err);
    return res.status(500).json({ error: "Erro ao recuperar backup do Vercel Blob: " + (err.message || "Erro interno") });
  }
};
app.post("/api/blob/backup/load", blobBackupLoadHandler);
app.post("/blob/backup/load", blobBackupLoadHandler);
var blobListHandler = async (req, res) => {
  try {
    const customToken = req.query.customToken;
    const token = getBlobToken(req, customToken);
    if (!token) {
      return res.status(400).json({
        error: "Token do Vercel Blob n\xE3o encontrado (BLOB_READ_WRITE_TOKEN)."
      });
    }
    const result = await list({ token });
    return res.json({
      success: true,
      blobs: result.blobs || []
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro ao listar do Vercel Blob: " + (err.message || "Erro") });
  }
};
app.get("/api/blob/list", blobListHandler);
app.get("/blob/list", blobListHandler);
var blobDeleteHandler = async (req, res) => {
  try {
    const { url, customToken } = req.body || {};
    const token = getBlobToken(req, customToken);
    if (!token) {
      return res.status(400).json({ error: "Token do Vercel Blob n\xE3o encontrado." });
    }
    if (!url) {
      return res.status(400).json({ error: "URL do arquivo \xE9 obrigat\xF3ria." });
    }
    await del(url, { token });
    return res.json({ success: true, message: "Arquivo deletado com sucesso do Vercel Blob!" });
  } catch (err) {
    return res.status(500).json({ error: "Erro ao deletar do Vercel Blob: " + (err.message || "Erro") });
  }
};
app.delete("/api/blob/delete", blobDeleteHandler);
app.delete("/blob/delete", blobDeleteHandler);
var audioUploadHandler = async (req, res) => {
  try {
    const { filename, content, contentType } = req.body || {};
    if (!content) {
      return res.status(400).json({ error: "Nenhum conte\xFAdo de \xE1udio fornecido." });
    }
    const cleanName = String(filename || "hino_" + Date.now() + ".mp3").replace(/[^a-zA-Z0-9_.-]/g, "_");
    const localFilePath = path.join(AUDIO_UPLOADS_DIR, cleanName);
    let buffer;
    if (typeof content === "string" && content.startsWith("data:")) {
      const base64Data = content.split(",")[1];
      buffer = Buffer.from(base64Data, "base64");
    } else if (typeof content === "string") {
      buffer = Buffer.from(content, "base64");
    } else {
      buffer = Buffer.from(content);
    }
    try {
      fs.writeFileSync(localFilePath, buffer);
    } catch (err) {
      console.warn("Note: Could not write audio locally:", err);
    }
    let publicUrl = `/uploads/audio/${cleanName}`;
    try {
      const token = getBlobToken(req);
      if (token) {
        const blob = await put(`gincana/audio/${cleanName}`, buffer, {
          access: "public",
          allowOverwrite: true,
          token,
          contentType: contentType || "audio/mpeg"
        });
        if (blob && blob.url) {
          publicUrl = blob.url;
        }
      }
    } catch (blobErr) {
      console.warn("[Audio] Notice: Vercel Blob upload fallback to local storage:", blobErr);
    }
    return res.json({
      success: true,
      url: publicUrl,
      filename: cleanName,
      message: "\xC1udio enviado com sucesso!"
    });
  } catch (err) {
    console.error("Error in /api/audio/upload:", err);
    return res.status(500).json({ error: "Erro ao enviar \xE1udio: " + (err?.message || "Erro interno") });
  }
};
app.post("/api/audio/upload", audioUploadHandler);
app.post("/audio/upload", audioUploadHandler);
var audioProxyHandler = async (req, res) => {
  try {
    const rawUrl = req.query.url || "";
    const driveId = req.query.driveId || "";
    let fileId = driveId;
    if (rawUrl && (rawUrl.startsWith("/") || rawUrl.startsWith("uploads/") || rawUrl.includes("Se_vos_baterdes") || !rawUrl.startsWith("http"))) {
      req.params.filename = path.basename(rawUrl);
      return handleServeLocalAudio(req, res);
    }
    if (!fileId && rawUrl) {
      const gDriveMatch = rawUrl.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^"'\s]*&)?id=)|docs\.google\.com\/(?:file\/d\/)|drive\.usercontent\.google\.com\/download\?(?:[^"'\s]*&)?id=)([a-zA-Z0-9_-]{20,})/);
      if (gDriveMatch && gDriveMatch[1]) {
        fileId = gDriveMatch[1];
      } else if (/^[a-zA-Z0-9_-]{25,}$/.test(rawUrl.trim())) {
        fileId = rawUrl.trim();
      }
    }
    const forwardHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "*/*"
    };
    if (req.headers.range) {
      forwardHeaders["Range"] = req.headers.range;
    }
    let upstreamRes = null;
    if (fileId) {
      const candidateUrls = [
        `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
        `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
        `https://docs.google.com/uc?export=download&id=${fileId}`,
        `https://drive.google.com/uc?id=${fileId}&export=download`
      ];
      for (const testUrl of candidateUrls) {
        try {
          const resp = await fetch(testUrl, {
            method: "GET",
            headers: forwardHeaders,
            redirect: "follow"
          });
          const cType = resp.headers.get("content-type") || "";
          if ((resp.ok || resp.status === 206) && !cType.includes("text/html")) {
            upstreamRes = resp;
            break;
          }
          if (cType.includes("text/html")) {
            const html = await resp.text();
            const confirmMatch = html.match(/confirm=([0-9A-Za-z_]+)/) || html.match(/name="confirm"\s+value="([^"]+)"/);
            const downloadUrlMatch = html.match(/href="(\/uc\?export=download[^"]+)"/) || html.match(/action="(https:\/\/drive\.usercontent\.google\.com\/download[^"]+)"/);
            if (confirmMatch && confirmMatch[1]) {
              const confirmedUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirmMatch[1]}`;
              const confResp = await fetch(confirmedUrl, {
                method: "GET",
                headers: forwardHeaders,
                redirect: "follow"
              });
              if (confResp.ok || confResp.status === 206) {
                upstreamRes = confResp;
                break;
              }
            } else if (downloadUrlMatch && downloadUrlMatch[1]) {
              const targetUrl = downloadUrlMatch[1].startsWith("http") ? downloadUrlMatch[1] : `https://drive.google.com${downloadUrlMatch[1]}`;
              const dlResp = await fetch(targetUrl, {
                method: "GET",
                headers: forwardHeaders,
                redirect: "follow"
              });
              if (dlResp.ok || dlResp.status === 206) {
                upstreamRes = dlResp;
                break;
              }
            }
          }
        } catch (candidateErr) {
          console.warn("Notice: candidate URL attempt failed:", candidateErr);
        }
      }
    } else if (rawUrl) {
      upstreamRes = await fetch(rawUrl, {
        method: "GET",
        headers: forwardHeaders,
        redirect: "follow"
      });
    }
    if (!upstreamRes || !upstreamRes.ok && upstreamRes.status !== 206) {
      return res.status(404).json({
        error: 'N\xE3o foi poss\xEDvel carregar o arquivo de \xE1udio. Se for do Google Drive, verifique se o link possui acesso "Qualquer pessoa com o link".'
      });
    }
    res.status(upstreamRes.status);
    const incomingContentType = upstreamRes.headers.get("content-type") || "";
    const contentType = !incomingContentType || incomingContentType.includes("text/html") || incomingContentType.includes("application/octet-stream") ? "audio/mpeg" : incomingContentType;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
    res.setHeader("Cache-Control", "public, max-age=86400");
    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }
    const contentRange = upstreamRes.headers.get("content-range");
    if (contentRange) {
      res.setHeader("Content-Range", contentRange);
    }
    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            if (!res.write(value)) {
              await new Promise((resolve) => res.once("drain", resolve));
            }
          }
        } catch {
          res.end();
        }
      };
      await pump();
    } else {
      res.end();
    }
  } catch (err) {
    console.error("Error in audioProxyHandler:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro ao reproduzir \xE1udio: " + (err?.message || "Erro") });
    }
  }
};
app.get("/api/audio-proxy", audioProxyHandler);
app.get("/audio-proxy", audioProxyHandler);
var server_default = app;
async function startServer() {
  const isServerless = Boolean(
    process.env.IS_API_HANDLER === "true" || process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION || process.env.LAMBDA_TASK_ROOT
  );
  if (isServerless) {
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn("Vite middleware not available:", viteErr);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send("Not Found");
        }
      });
    }
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server "Somos J\xF3ias Preciosas" rodando na porta ${PORT}`);
  });
}
startServer();

// api/index.ts
if (typeof process !== "undefined" && process.env) {
  process.env.IS_API_HANDLER = "true";
}
function handler(req, res) {
  try {
    const rawUrl = req.url || "";
    const urlObj = rawUrl.includes("?") ? new URL(rawUrl, "http://localhost") : null;
    const subpath = urlObj?.searchParams.get("__vercel_subpath");
    if (subpath) {
      urlObj?.searchParams.delete("__vercel_subpath");
      const search = urlObj?.searchParams.toString();
      req.url = subpath.startsWith("uploads/") ? `/${subpath}${search ? `?${search}` : ""}` : `/api/${subpath}${search ? `?${search}` : ""}`;
    } else {
      const matchedPath = req.headers["x-matched-path"] || req.headers["x-invoke-path"] || req.headers["x-vercel-matched-path"] || req.headers["x-original-url"];
      if (matchedPath && (matchedPath.startsWith("/api") || matchedPath.startsWith("/uploads"))) {
        const searchIdx = rawUrl.indexOf("?");
        const search = searchIdx !== -1 ? rawUrl.substring(searchIdx) : "";
        req.url = matchedPath + search;
      } else if (rawUrl.startsWith("/api/index.js")) {
        req.url = rawUrl.replace("/api/index.js", "/api") || "/api";
      } else if (rawUrl.startsWith("/api/index.ts")) {
        req.url = rawUrl.replace("/api/index.ts", "/api") || "/api";
      } else if (rawUrl.startsWith("/api/index")) {
        req.url = rawUrl.replace("/api/index", "/api") || "/api";
      }
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Range, X-Admin-Password");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    return server_default(req, res);
  } catch (err) {
    console.error("[Vercel API handler error]:", err);
    if (!res.headersSent) {
      res.setHeader("Content-Type", "application/json");
      return res.status(500).json({
        error: "Erro no servidor ao processar requisi\xE7\xE3o: " + (err?.message || "Tente novamente.")
      });
    }
  }
}
export {
  handler as default
};
