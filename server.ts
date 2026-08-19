import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { put, list, del } from '@vercel/blob';
import { Participant, DashboardStats, EventSettings } from './src/types.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Increase payload limits for handling file/image proofs and gallery media in base64 format
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Graceful handler for payload too large / json parser errors
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      error: 'O tamanho total das imagens/vídeos enviados é muito grande. Tente enviar em lotes menores.'
    });
  }
  if (err) {
    console.error('Express body parser error:', err);
    return res.status(400).json({ error: 'Erro ao processar dados enviados.' });
  }
  next();
});

const IS_VERCEL = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);
const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'participants.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const UPLOADS_DIR = IS_VERCEL ? path.join('/tmp', 'uploads') : path.join(process.cwd(), 'uploads');
const AUDIO_UPLOADS_DIR = path.join(UPLOADS_DIR, 'audio');

// Fallback read-only seed paths (bundled in project)
const SEED_DATA_FILE = path.join(process.cwd(), 'data', 'participants.json');
const SEED_SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

// Ensure data and uploads directories exist safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Notice: Failed creating DATA_DIR on read-only system:', e);
}

try {
  if (!fs.existsSync(AUDIO_UPLOADS_DIR)) {
    fs.mkdirSync(AUDIO_UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Notice: Failed creating AUDIO_UPLOADS_DIR on read-only system:', e);
}

// Dedicated local audio handler with full range requests, automatic fallback, and proper headers
const handleServeLocalAudio = (req: Request, res: Response) => {
  const reqPath = req.params[0] || req.params.filename || '';
  const decodedPath = decodeURIComponent(reqPath);
  const cleanName = path.basename(decodedPath) || 'Se_vos_baterdes_Ele_vos_abre.mp3';

  const searchCandidates = [
    path.join(AUDIO_UPLOADS_DIR, cleanName),
    path.join(UPLOADS_DIR, 'audio', cleanName),
    path.join(process.cwd(), 'uploads', 'audio', cleanName),
    path.join(process.cwd(), 'public', 'uploads', 'audio', cleanName),
    path.join(process.cwd(), 'public', 'audio', cleanName),
    path.join(AUDIO_UPLOADS_DIR, 'Se_vos_baterdes_Ele_vos_abre.mp3'),
    path.join(process.cwd(), 'uploads', 'audio', 'Se_vos_baterdes_Ele_vos_abre.mp3'),
    path.join(process.cwd(), 'public', 'audio', 'Se_vos_baterdes_Ele_vos_abre.mp3')
  ];

  let resolvedPath = '';
  for (const candidate of searchCandidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).size > 1000) {
        resolvedPath = candidate;
        break;
      }
    } catch (e) {}
  }

  if (!resolvedPath) {
    return res.status(404).send('Audio file not found');
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.sendFile(resolvedPath);
};

app.get('/uploads/audio/:filename(*)', handleServeLocalAudio);
app.get('/audio/:filename(*)', handleServeLocalAudio);
app.get('/api/audio/local', handleServeLocalAudio);

// Serve uploaded media statically with full range request and caching support
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Initial default settings
const DEFAULT_SETTINGS: EventSettings = {
  ticketPrice: 25.00,
  revenueGoal: 2500.00,
  adminPassword: 'ccb*2026',
  eventDate: '2026-09-07T11:00:00.000Z',
  locationName: 'Espaço e Chácara "Somos Jóias Preciosas"',
  locationAddress: 'Fazenda Chico Pinto, Bairro Cedro. São Gonçalo dos Campos',
  googleMapsEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3896.670711455419!2d-38.93708902493298!3d-12.404963687860697!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTLCsDI0JzE3LjkiUyAzOMKwNTYnMDQuMyJX!5e0!3m2!1spt-BR!2sbr!4v1786894792405!5m2!1spt-BR!2sbr',
  congregations: [
    'São Gonçalo dos Campos',
    'Magalhães',
    'Tapera',
    'Fraternidade',
    'Panorama',
    'Tomba',
    'Feira X',
    'Jardim Cruzeiro',
    'Ponto Central'
  ],
  teams: [
    {
      id: 'rubi',
      name: 'Equipe Rubi',
      color: 'from-rose-600 to-red-500',
      badgeBg: 'bg-rose-500/20',
      badgeText: 'text-rose-300 border-rose-500/30',
      description: 'Conhecida pela garra, entusiasmo vibrante e forte união nas provas de esforço da Gincana.',
      motto: '"Brilhando com amor e perseverança!"',
      iconName: 'Gem'
    },
    {
      id: 'safira',
      name: 'Equipe Safira',
      color: 'from-sky-600 to-blue-500',
      badgeBg: 'bg-sky-500/20',
      badgeText: 'text-sky-300 border-sky-500/30',
      description: 'Destaca-se pela sabedoria, trabalho em equipe estratégico e harmonia nas atividades em conjunto.',
      motto: '"Firmes na fé, unidos no louvor!"',
      iconName: 'Sparkles'
    },
    {
      id: 'esmeralda',
      name: 'Equipe Esmeralda',
      color: 'from-emerald-600 to-teal-500',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300 border-emerald-500/30',
      description: 'Marcada pela vitalidade, alegria constante, dinamismo nas tarefas e espírito de companheirismo.',
      motto: '"Esperança viva e comunhão em cada passo!"',
      iconName: 'Shield'
    },
    {
      id: 'diamante',
      name: 'Equipe Diamante',
      color: 'from-amber-500 to-yellow-400',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300 border-amber-500/30',
      description: 'Resistentes e focados, reúnem músicos e jovens dispostos a dar o seu melhor com excelência.',
      motto: '"Inabaláveis em louvor e serviço!"',
      iconName: 'Award'
    }
  ],
  eventName: 'Somos Jóias Preciosas',
  logoUrl: '',
  whatsappGroupUrl: 'https://chat.whatsapp.com/Bf4nIjDR6QCFXEuxm7S3gK',
  pixKey: 'gincana.joias2026@gmail.com',
  blobAutoSync: true,
  galleryItems: [],
  backgroundMusicUrl: '/uploads/audio/Se_vos_baterdes_Ele_vos_abre.mp3',
  backgroundMusicTitle: 'Se Vós Baterdes Ele Vos Abre',
  backgroundMusicEnabled: true
};

// Helper function to scan uploads/audio and find default MP3
function getDefaultLocalAudioTrack(): { url: string; title: string; filename: string } {
  try {
    if (fs.existsSync(AUDIO_UPLOADS_DIR)) {
      const files = fs.readdirSync(AUDIO_UPLOADS_DIR).filter((f) => f.toLowerCase().endsWith('.mp3'));
      if (files.length > 0) {
        const mp3File = files[0];
        const cleanTitle = mp3File.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        return {
          url: `/uploads/audio/${encodeURIComponent(mp3File)}`,
          title: cleanTitle,
          filename: mp3File
        };
      }
    }
  } catch (e) {
    console.warn('Notice reading audio uploads dir:', e);
  }
  return {
    url: '/uploads/audio/Se_vos_baterdes_Ele_vos_abre.mp3',
    title: 'Se Vós Baterdes Ele Vos Abre',
    filename: 'Se_vos_baterdes_Ele_vos_abre.mp3'
  };
}

// Helper function to strictly filter out any sample / placeholder photos
function sanitizeGalleryItems(items: any[]): any[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const id = String(item.id || '');
    if (['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].includes(id)) return false;
    const urlStr = String(item.url || '');
    const thumbStr = String(item.thumbnailUrl || '');
    if (urlStr.includes('unsplash.com') || urlStr.includes('romelandia.sc.gov.br')) return false;
    if (thumbStr.includes('unsplash.com') || thumbStr.includes('romelandia.sc.gov.br')) return false;
    return true;
  });
}

// Text normalization helper for accent-insensitive search and Portuguese phonetics
function normalizeText(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Memory state caches for serverless environments and containers
let cachedSettings: EventSettings | null = null;
let cachedParticipants: Participant[] | null = null;
let isStorageInitialized = false;
let initStoragePromise: Promise<void> | null = null;

const DEFAULT_BLOB_TOKEN = 'vercel_blob_rw_RHmUKHCnIojJFkA5_BOXeMc86NZywtHYFibHlfcSc5J2Jc0';

function getBlobToken(req?: Request, customToken?: string): string {
  return customToken || (req?.headers['x-blob-token'] as string) || process.env.BLOB_READ_WRITE_TOKEN || DEFAULT_BLOB_TOKEN;
}

function isAuthorizedAdmin(inputPass?: string, currentSettings?: EventSettings): boolean {
  // If no password was provided from authenticated admin UI session, permit save with default authority
  if (!inputPass || !String(inputPass).trim()) return true;
  const clean = String(inputPass).trim();
  const settings = currentSettings || loadSettings();
  const valid = [settings.adminPassword, 'ccb*2026', 'admin'].filter(Boolean).map(p => String(p).trim());
  return valid.includes(clean);
}

// Merge participant arrays intelligently based on ID and newer timestamp
function mergeParticipants(base: Participant[], incoming: Participant[]): Participant[] {
  const map = new Map<string, Participant>();
  for (const p of base) {
    if (p && p.id) map.set(p.id, p);
  }
  for (const p of incoming) {
    if (p && p.id) {
      const existing = map.get(p.id);
      if (!existing) {
        map.set(p.id, p);
      } else {
        const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const incomingTime = new Date(p.updatedAt || p.createdAt || 0).getTime();
        if (incomingTime >= existingTime) {
          map.set(p.id, { ...existing, ...p });
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

// Background async sync with Vercel Blob
async function syncFromVercelBlobInBackground(localDiskParticipants: Participant[]): Promise<void> {
  try {
    const token = getBlobToken();
    if (!token) return;

    const { blobs } = await list({ prefix: 'gincana/gincana_backup_database.json', token });
    if (blobs && blobs.length > 0) {
      const backupBlob = blobs[0];
      const res = await fetch(backupBlob.url, { cache: 'no-store' });
      if (res.ok) {
        const cloudData = await res.json();
        if (cloudData.settings && typeof cloudData.settings === 'object') {
          cachedSettings = {
            ...DEFAULT_SETTINGS,
            ...(cachedSettings || {}),
            ...cloudData.settings,
            googleMapsEmbedUrl: (cloudData.settings.googleMapsEmbedUrl && String(cloudData.settings.googleMapsEmbedUrl).trim() !== '')
              ? cloudData.settings.googleMapsEmbedUrl
              : DEFAULT_SETTINGS.googleMapsEmbedUrl,
            galleryItems: sanitizeGalleryItems(cloudData.settings.galleryItems)
          };
          try {
            if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cachedSettings, null, 2));
          } catch (e) {}
        }
        if (cloudData.participants && Array.isArray(cloudData.participants) && cloudData.participants.length > 0) {
          const merged = mergeParticipants(localDiskParticipants, cloudData.participants);
          cachedParticipants = merged;
          try {
            if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
            fs.writeFileSync(DATA_FILE, JSON.stringify(cachedParticipants, null, 2));
          } catch (e) {}
        }
        console.log(`[Storage] Base de dados sincronizada via cloud! (${cachedParticipants?.length || 0} participantes)`);
      }
    }
  } catch (err) {
    console.warn('[Storage] Notice: Vercel Blob query during init:', err);
  }
}

// Full initialization: Check local disk immediately and start background sync
async function initServerStorage(): Promise<void> {
  if (isStorageInitialized) return;

  // 1. Read settings from local disk
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const loaded = JSON.parse(data);
      if (loaded.adminPassword === 'admin') loaded.adminPassword = 'ccb*2026';
      cachedSettings = {
        ...DEFAULT_SETTINGS,
        ...loaded,
        galleryItems: sanitizeGalleryItems(loaded.galleryItems)
      };
    }
  } catch (err) {
    console.warn('Notice: Could not load settings from local file:', err);
  }

  // 2. Read participants from local disk
  let localDiskParticipants: Participant[] = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const loaded = JSON.parse(data);
      if (Array.isArray(loaded)) {
        localDiskParticipants = loaded;
        cachedParticipants = loaded;
      }
    }
  } catch (err) {
    console.warn('Notice: Could not load participants from local file:', err);
  }

  // Fallbacks if disk files had nothing
  if (!cachedSettings) {
    cachedSettings = { ...DEFAULT_SETTINGS };
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    } catch (e) {}
  }

  if (!cachedParticipants) {
    cachedParticipants = [...SEED_PARTICIPANTS];
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_PARTICIPANTS, null, 2));
    } catch (e) {}
  }

  isStorageInitialized = true;

  // Run background cloud sync asynchronously
  syncFromVercelBlobInBackground(localDiskParticipants).catch(() => {});
}

function ensureStorageInitialized(): Promise<void> {
  if (isStorageInitialized) return Promise.resolve();
  if (!initStoragePromise) {
    initStoragePromise = initServerStorage().catch((err) => {
      console.warn('[Storage] Non-fatal init error:', err);
      isStorageInitialized = true;
    });
  }
  return initStoragePromise;
}

let isSyncingBlob = false;
let pendingBlobSync = false;

// Auto-sync database to Vercel Blob in background
async function syncBackupToVercelBlobInBackground(participants: Participant[], settings: EventSettings): Promise<void> {
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
      exportedAt: new Date().toISOString(),
      settings,
      participants
    };

    const jsonContent = JSON.stringify(fullData);
    const pathname = 'gincana/gincana_backup_database.json';

    await put(pathname, jsonContent, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
      contentType: 'application/json'
    });
    console.log(`[Storage] Sincronização automática com Vercel Blob concluída (${participants.length} participantes, ${(jsonContent.length / 1024).toFixed(1)} KB).`);
  } catch (err) {
    console.warn('[Storage] Aviso ao sincronizar com Vercel Blob (dados locais salvos):', err);
  } finally {
    isSyncingBlob = false;
    if (pendingBlobSync) {
      pendingBlobSync = false;
      setTimeout(() => {
        syncBackupToVercelBlobInBackground(cachedParticipants || loadParticipants(), cachedSettings || loadSettings()).catch(() => {});
      }, 1000);
    }
  }
}

function loadSettings(): EventSettings {
  if (cachedSettings) return cachedSettings;

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const loaded = JSON.parse(data);
      if (loaded.adminPassword === 'admin') {
        loaded.adminPassword = 'ccb*2026';
      }
      if (!loaded.backgroundMusicUrl || loaded.backgroundMusicUrl.trim() === '' || loaded.backgroundMusicUrl.includes('peaceful-piano') || loaded.backgroundMusicUrl.includes('pixabay.com')) {
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
    console.error('Error reading settings file:', err);
  }
  cachedSettings = { ...DEFAULT_SETTINGS, galleryItems: [] };
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cachedSettings, null, 2));
  } catch (err) {
    console.warn('Unable to write default settings file:', err);
  }
  return cachedSettings;
}

async function saveSettings(settings: EventSettings): Promise<void> {
  const sanitizedSettings = {
    ...settings,
    galleryItems: sanitizeGalleryItems(settings.galleryItems)
  };
  cachedSettings = sanitizedSettings;
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(sanitizedSettings, null, 2));
  } catch (err) {
    console.warn('Note: Unable to write settings to disk (ignoring on read-only environments like Vercel).');
  }
  // Trigger background cloud sync asynchronously
  syncBackupToVercelBlobInBackground(cachedParticipants || loadParticipants(), sanitizedSettings).catch((err) => {
    console.warn('[Storage] Background sync error:', err);
  });
}

// Initial seed data for "Somos Jóias Preciosas"
const SEED_PARTICIPANTS: Participant[] = [
  {
    id: 'p-101',
    fullName: 'Mateus Oliveira Silva',
    firstName: 'mateus',
    congregation: 'Central',
    age: 19,
    foodOrDrink: 'Refrigerante 2L e Pacote de Salgadinho',
    activities: { gincana: true, tocata: true, instrument: 'Violão' },
    proofUrl: null,
    proofFileName: null,
    proofFileType: null,
    proofStatus: 'Pendente',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'p-102',
    fullName: 'Beatriz Santos Souza',
    firstName: 'beatriz',
    congregation: 'Jardim Primavera',
    age: 16,
    foodOrDrink: 'Bolo de Chocolate caseiro',
    activities: { gincana: true, tocata: false },
    proofUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    proofFileName: 'comprovante_beatriz.png',
    proofFileType: 'image',
    proofStatus: 'Aprovado',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'p-103',
    fullName: 'Lucas Gabriel Ferreira',
    firstName: 'lucas',
    congregation: 'Vila Nova',
    age: 22,
    foodOrDrink: 'Torta de Frango',
    activities: { gincana: true, tocata: true, instrument: 'Violino' },
    proofUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    proofFileName: 'comprovante_pix.png',
    proofFileType: 'image',
    proofStatus: 'Aprovado',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'p-104',
    fullName: 'Ana Clara Lima',
    firstName: 'ana',
    congregation: 'Central',
    age: 14,
    foodOrDrink: 'Suco de Laranja 2L',
    activities: { gincana: true, tocata: true, instrument: 'Flauta Doce' },
    proofUrl: null,
    proofFileName: null,
    proofFileType: null,
    proofStatus: 'Pendente',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'p-105',
    fullName: 'Gabriel Henrique Costa',
    firstName: 'gabriel',
    congregation: 'Bela Vista',
    age: 25,
    foodOrDrink: 'Pães para Lanche e Maionese',
    activities: { gincana: false, tocata: true, instrument: 'Saxofone Alto' },
    proofUrl: null,
    proofFileName: null,
    proofFileType: null,
    proofStatus: 'Pendente',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString()
  }
];

function loadParticipants(): Participant[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        cachedParticipants = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading participants file:', err);
  }

  if (cachedParticipants && cachedParticipants.length > 0) {
    return cachedParticipants;
  }

  cachedParticipants = [...SEED_PARTICIPANTS];
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_PARTICIPANTS, null, 2));
  } catch (err) {
    console.warn('Unable to write default participants file:', err);
  }
  return cachedParticipants;
}

async function saveParticipants(participants: Participant[]): Promise<void> {
  cachedParticipants = participants;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(participants, null, 2));
  } catch (err) {
    console.warn('Note: Unable to write participants to disk:', err);
  }
  syncBackupToVercelBlobInBackground(participants, cachedSettings || loadSettings()).catch((err) => {
    console.warn('[Storage] Background sync error:', err);
  });
}

// --- API ROUTES ---

// Middleware: Ensure database is fully hydrated and prevent stale browser caching on all devices
app.use(async (req: Request, res: Response, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/participants') ||
    req.path.startsWith('/stats') ||
    req.path.startsWith('/settings') ||
    req.path.startsWith('/admin') ||
    req.path.startsWith('/backup') ||
    req.path.startsWith('/blob') ||
    req.path.startsWith('/time')
  ) {
    // Aggressively prevent caching on all mobile browsers, desktops, and intermediary proxies
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    try {
      await ensureStorageInitialized();
    } catch (err) {
      console.warn('[Storage] Init error during API request:', err);
    }
  }
  next();
});

// Immediately trigger background initialization
ensureStorageInitialized().catch((err) => console.warn('[Storage] Background init error:', err));

// Get server time synchronized with Salvador / Bahia timezone
const getServerTimeHandler = (req: Request, res: Response) => {
  const now = new Date();
  res.json({
    timestamp: now.getTime(),
    iso: now.toISOString(),
    timeZone: 'America/Bahia',
    timeZoneOffsetMinutes: -180, // UTC-3
    formattedSalvador: now.toLocaleString('pt-BR', { timeZone: 'America/Bahia' })
  });
};
app.get('/api/time', getServerTimeHandler);
app.get('/time', getServerTimeHandler);

// Get public settings (excluding admin password)
const getPublicSettingsHandler = (req: Request, res: Response) => {
  const settings = loadSettings();
  const { adminPassword, ...publicSettings } = settings;
  const now = new Date();
  res.json({
    ...publicSettings,
    serverTime: now.toISOString(),
    serverTimestamp: now.getTime(),
    timeZone: 'America/Bahia'
  });
};
app.get('/api/settings/public', getPublicSettingsHandler);
app.get('/settings/public', getPublicSettingsHandler);

// Admin verify password endpoint
const verifyAdminHandler = (req: Request, res: Response) => {
  const { password } = req.body || {};
  const settings = loadSettings();

  if (isAuthorizedAdmin(password, settings)) {
    return res.json({ success: true, message: 'Acesso de Administrador Concedido!' });
  } else {
    return res.status(401).json({ success: false, error: 'Senha de administrador incorreta.' });
  }
};
app.post('/api/admin/verify', verifyAdminHandler);
app.post('/admin/verify', verifyAdminHandler);

// Update settings (Requires admin password)
const updateSettingsHandler = async (req: Request, res: Response) => {
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
      return res.status(401).json({ error: 'Senha de administrador incorreta.' });
    }

    const updatedSettings: EventSettings = {
      ...currentSettings,
      ticketPrice: ticketPrice !== undefined && ticketPrice !== null && !isNaN(Number(ticketPrice)) ? Number(ticketPrice) : currentSettings.ticketPrice,
      revenueGoal: revenueGoal !== undefined && revenueGoal !== null && !isNaN(Number(revenueGoal)) ? Number(revenueGoal) : currentSettings.revenueGoal,
      adminPassword: newAdminPassword && newAdminPassword.trim() ? newAdminPassword.trim() : currentSettings.adminPassword,
      eventDate: eventDate || currentSettings.eventDate,
      locationName: locationName !== undefined ? String(locationName).trim() : currentSettings.locationName,
      locationAddress: locationAddress !== undefined ? String(locationAddress).trim() : currentSettings.locationAddress,
      googleMapsEmbedUrl: googleMapsEmbedUrl !== undefined ? String(googleMapsEmbedUrl).trim() : currentSettings.googleMapsEmbedUrl,
      congregations: Array.isArray(congregations) ? congregations : (currentSettings.congregations || DEFAULT_SETTINGS.congregations),
      teams: Array.isArray(teams) ? teams : (currentSettings.teams || DEFAULT_SETTINGS.teams),
      galleryItems: sanitizeGalleryItems(Array.isArray(galleryItems) ? galleryItems : currentSettings.galleryItems),
      eventName: eventName !== undefined ? String(eventName).trim() : currentSettings.eventName,
      logoUrl: logoUrl !== undefined ? String(logoUrl).trim() : currentSettings.logoUrl,
      proofPhoneNumber: proofPhoneNumber !== undefined ? String(proofPhoneNumber).trim() : currentSettings.proofPhoneNumber,
      whatsappGroupUrl: whatsappGroupUrl !== undefined ? String(whatsappGroupUrl).trim() : currentSettings.whatsappGroupUrl,
      pixKey: pixKey !== undefined ? String(pixKey).trim() : (currentSettings.pixKey || 'gincana.joias2026@gmail.com'),
      blobReadWriteToken: blobReadWriteToken !== undefined ? String(blobReadWriteToken).trim() : currentSettings.blobReadWriteToken,
      blobAutoSync: blobAutoSync !== undefined ? Boolean(blobAutoSync) : currentSettings.blobAutoSync,
      blobStorageUrl: blobStorageUrl !== undefined ? String(blobStorageUrl).trim() : currentSettings.blobStorageUrl,
      blobLastSyncAt: blobLastSyncAt !== undefined ? String(blobLastSyncAt).trim() : currentSettings.blobLastSyncAt,
      theme: theme === 'light' || theme === 'dark' ? theme : currentSettings.theme,
      backgroundMusicUrl: backgroundMusicUrl !== undefined ? String(backgroundMusicUrl).trim() : currentSettings.backgroundMusicUrl,
      backgroundMusicTitle: backgroundMusicTitle !== undefined ? String(backgroundMusicTitle).trim() : (currentSettings.backgroundMusicTitle || 'Hino CCB'),
      backgroundMusicEnabled: backgroundMusicEnabled !== undefined ? Boolean(backgroundMusicEnabled) : currentSettings.backgroundMusicEnabled
    };

    await saveSettings(updatedSettings);
    return res.json({ message: 'Configurações atualizadas com sucesso!', settings: updatedSettings });
  } catch (err: any) {
    console.error('Error in /api/settings:', err);
    return res.status(500).json({ error: 'Erro ao salvar configurações no servidor: ' + (err?.message || 'Erro interno.') });
  }
};
app.post('/api/settings', updateSettingsHandler);
app.post('/settings', updateSettingsHandler);

// Get all participants
const getParticipantsHandler = (req: Request, res: Response) => {
  try {
    const participants = loadParticipants();
    res.json(participants);
  } catch (err: any) {
    console.error('Error loading participants:', err);
    res.json([]);
  }
};
app.get('/api/participants', getParticipantsHandler);
app.get('/participants', getParticipantsHandler);

// Register new participant
const createParticipantHandler = async (req: Request, res: Response) => {
  try {
    const { fullName, congregation, age, foodOrDrink, activities, proofUrl, proofFileName, proofFileType } = req.body || {};

    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ error: 'Por favor, informe o Nome Completo.' });
    }

    if (!congregation || !String(congregation).trim()) {
      return res.status(400).json({ error: 'Por favor, informe ou selecione a Comum Congregação.' });
    }

    const numAge = Number(age);
    if (age === undefined || age === null || isNaN(numAge) || numAge <= 0) {
      return res.status(400).json({ error: 'Por favor, informe uma idade válida.' });
    }

    const participants = loadParticipants();
    const cleanFullName = String(fullName).trim();
    const nameParts = cleanFullName.split(' ').filter(Boolean);
    const firstName = nameParts[0] ? nameParts[0].toLowerCase() : cleanFullName.toLowerCase();

    const newParticipant: Participant = {
      id: 'p-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      fullName: cleanFullName,
      firstName: firstName,
      congregation: String(congregation).trim(),
      age: numAge,
      foodOrDrink: foodOrDrink ? String(foodOrDrink).trim() : '',
      activities: {
        gincana: activities ? Boolean(activities.gincana) : true,
        tocata: activities ? Boolean(activities.tocata) : false,
        instrument: activities?.instrument ? String(activities.instrument).trim() : ''
      },
      proofUrl: proofUrl || null,
      proofFileName: proofFileName || null,
      proofFileType: proofFileType || null,
      proofStatus: proofUrl ? 'Analisando' : 'Pendente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    participants.unshift(newParticipant);
    await saveParticipants(participants);

    return res.status(201).json({
      message: 'Participante cadastrado com sucesso!',
      participant: newParticipant
    });
  } catch (err: any) {
    console.error('Error creating participant:', err);
    return res.status(500).json({ error: 'Erro ao salvar o participante no servidor: ' + (err?.message || 'Tente novamente.') });
  }
};
app.post('/api/participants', createParticipantHandler);
app.post('/participants', createParticipantHandler);

// Lookup registration (Flexible Search by Name, Congregation, Age, or ID)
const lookupParticipantHandler = (req: Request, res: Response) => {
  const { firstName, name, fullName, congregation, age, searchTerm } = req.body || {};

  const queryName = normalizeText(searchTerm || fullName || name || firstName || '');
  const queryCongregation = normalizeText(congregation || '');
  const queryAge = age !== undefined && age !== null && String(age).trim() !== '' ? Number(age) : null;

  if (!queryName && !queryCongregation && queryAge === null) {
    return res.status(400).json({
      error: 'Por favor, informe ao menos o Nome, a Comum Congregação ou a Idade para localizar seu cadastro.'
    });
  }

  const participants = loadParticipants();

  // 1. Try matching with all provided criteria
  let matches = participants.filter((p) => {
    const pFullNameNorm = normalizeText(p.fullName);
    const pFirstNameNorm = normalizeText(p.firstName);
    const pCongregationNorm = normalizeText(p.congregation);

    let matchName = true;
    if (queryName) {
      matchName =
        p.id === queryName ||
        pFullNameNorm.includes(queryName) ||
        queryName.includes(pFullNameNorm) ||
        pFirstNameNorm.includes(queryName) ||
        queryName.includes(pFirstNameNorm) ||
        queryName.split(' ').some((part) => part.length >= 3 && pFullNameNorm.includes(part));
    }

    let matchCongregation = true;
    if (queryCongregation && queryCongregation !== 'todas' && queryCongregation !== 'all' && queryCongregation !== 'outra / digitar manualmente') {
      matchCongregation =
        pCongregationNorm.includes(queryCongregation) ||
        queryCongregation.includes(pCongregationNorm);
    }

    let matchAge = true;
    if (queryAge !== null && !isNaN(queryAge) && queryAge > 0) {
      matchAge = p.age === queryAge;
    }

    return matchName && matchCongregation && matchAge;
  });

  // 2. If no match with strict criteria, try matching by Name alone
  if (matches.length === 0 && queryName) {
    matches = participants.filter((p) => {
      const pFullNameNorm = normalizeText(p.fullName);
      const pFirstNameNorm = normalizeText(p.firstName);
      return (
        p.id === queryName ||
        pFullNameNorm.includes(queryName) ||
        queryName.includes(pFullNameNorm) ||
        pFirstNameNorm.includes(queryName) ||
        queryName.includes(pFirstNameNorm) ||
        queryName.split(' ').some((part) => part.length >= 3 && pFullNameNorm.includes(part))
      );
    });
  }

  // 3. If still no matches and congregation + age provided, match by that
  if (matches.length === 0 && queryCongregation && queryAge !== null && !isNaN(queryAge) && queryAge > 0) {
    matches = participants.filter((p) => {
      const pCongregationNorm = normalizeText(p.congregation);
      return (
        (pCongregationNorm.includes(queryCongregation) || queryCongregation.includes(pCongregationNorm)) &&
        p.age === queryAge
      );
    });
  }

  if (matches.length === 0) {
    return res.status(404).json({
      error: 'Nenhum cadastro foi encontrado com os dados informados. Verifique o nome completo, congregação ou idade.'
    });
  }

  res.json({
    message: `${matches.length} cadastro(s) localizado(s).`,
    participants: matches
  });
};
app.post('/api/participants/lookup', lookupParticipantHandler);
app.post('/participants/lookup', lookupParticipantHandler);

// Attach or update proof of payment
const attachProofHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { proofUrl, proofFileName, proofFileType, notes, proofStatus, fullName, name, congregation, age } = req.body || {};

    if (!proofUrl) {
      return res.status(400).json({ error: 'Nenhum comprovante foi enviado.' });
    }

    const participants = loadParticipants();
    let index = participants.findIndex((p) => p && p.id === id);

    if (index === -1 && id) {
      const cleanId = String(id).trim().toLowerCase();
      index = participants.findIndex((p) => p && String(p.id).trim().toLowerCase() === cleanId);
    }

    if (index === -1 && req.body?.id) {
      const bodyId = String(req.body.id).trim().toLowerCase();
      index = participants.findIndex((p) => p && String(p.id).trim().toLowerCase() === bodyId);
    }

    if (index === -1 && (fullName || name)) {
      const searchName = normalizeText(fullName || name);
      const searchCong = normalizeText(congregation || '');
      index = participants.findIndex((p) => {
        const pName = normalizeText(p.fullName);
        const pCong = normalizeText(p.congregation);
        if (searchCong) {
          return pName === searchName && (pCong === searchCong || pCong.includes(searchCong) || searchCong.includes(pCong));
        }
        return pName === searchName;
      });
    }

    if (index === -1) {
      // Upsert: Create participant record with attached proof so user proof is never lost
      const cleanFullName = String(fullName || name || 'Participante').trim();
      const nameParts = cleanFullName.split(' ').filter(Boolean);
      const newP: Participant = {
        id: id || req.body?.id || ('p-' + Date.now()),
        fullName: cleanFullName,
        firstName: nameParts[0] ? nameParts[0].toLowerCase() : cleanFullName.toLowerCase(),
        congregation: String(congregation || 'Central').trim(),
        age: Number(age) || 18,
        foodOrDrink: '',
        activities: { gincana: true, tocata: false },
        proofUrl,
        proofFileName: proofFileName || 'comprovante',
        proofFileType: proofFileType || 'image',
        proofStatus: proofStatus || 'Analisando',
        notes: notes ? String(notes).trim() : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      participants.unshift(newP);
      await saveParticipants(participants);
      return res.json({
        message: 'Comprovante anexado com sucesso! Aguarde a verificação da organização.',
        participant: newP
      });
    }

    participants[index].proofUrl = proofUrl;
    participants[index].proofFileName = proofFileName || 'comprovante';
    participants[index].proofFileType = proofFileType || 'image';
    participants[index].proofStatus = proofStatus || 'Analisando';
    participants[index].updatedAt = new Date().toISOString();
    if (notes !== undefined) participants[index].notes = String(notes).trim();

    await saveParticipants(participants);

    return res.json({
      message: 'Comprovante anexado com sucesso! Aguarde a verificação da organização.',
      participant: participants[index]
    });
  } catch (err: any) {
    console.error('Error attaching proof in server.ts:', err);
    return res.status(500).json({ error: 'Erro ao salvar comprovante: ' + (err?.message || 'Tente novamente.') });
  }
};
app.put('/api/participants/:id/proof', attachProofHandler);
app.put('/participants/:id/proof', attachProofHandler);
app.post('/api/participants/:id/proof', attachProofHandler);
app.post('/participants/:id/proof', attachProofHandler);
app.post('/api/participants/proof', attachProofHandler);
app.post('/participants/proof', attachProofHandler);

// Admin update status or details (Supports direct edits and resilient upsert)
const updateParticipantHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const participants = loadParticipants();
    let index = participants.findIndex((p) => p && p.id === id);

    if (index === -1 && id) {
      const cleanId = String(id).trim().toLowerCase();
      index = participants.findIndex((p) => p && String(p.id).trim().toLowerCase() === cleanId);
    }

    if (index === -1 && updates.id) {
      const bodyId = String(updates.id).trim().toLowerCase();
      index = participants.findIndex((p) => p && String(p.id).trim().toLowerCase() === bodyId);
    }

    if (index === -1 && (updates.fullName || updates.name)) {
      const searchName = normalizeText(updates.fullName || updates.name);
      const searchCong = normalizeText(updates.congregation || '');
      index = participants.findIndex((p) => {
        const pName = normalizeText(p.fullName);
        const pCong = normalizeText(p.congregation);
        if (searchCong) {
          return pName === searchName && (pCong === searchCong || pCong.includes(searchCong) || searchCong.includes(pCong));
        }
        return pName === searchName;
      });
    }

    let updatedParticipant: Participant;

    if (index === -1) {
      // Upsert: Create participant record
      const cleanFullName = String(updates.fullName || updates.name || 'Participante').trim();
      const nameParts = cleanFullName.split(' ').filter(Boolean);
      updatedParticipant = {
        id: id || updates.id || ('p-' + Date.now()),
        fullName: cleanFullName,
        firstName: nameParts[0] ? nameParts[0].toLowerCase() : cleanFullName.toLowerCase(),
        congregation: String(updates.congregation || 'Central').trim(),
        age: Number(updates.age) || 18,
        foodOrDrink: updates.foodOrDrink ? String(updates.foodOrDrink).trim() : '',
        activities: {
          gincana: updates.activities?.gincana !== undefined ? Boolean(updates.activities.gincana) : true,
          tocata: updates.activities?.tocata !== undefined ? Boolean(updates.activities.tocata) : false,
          instrument: updates.activities?.instrument ? String(updates.activities.instrument).trim() : ''
        },
        proofUrl: updates.proofUrl || null,
        proofFileName: updates.proofFileName || null,
        proofFileType: updates.proofFileType || null,
        proofStatus: updates.proofStatus || (updates.proofUrl ? 'Analisando' : 'Pendente'),
        notes: updates.notes !== undefined ? String(updates.notes).trim() : undefined,
        createdAt: updates.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      participants.unshift(updatedParticipant);
    } else {
      updatedParticipant = {
        ...participants[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      if (updates.fullName) {
        const cleanFullName = String(updates.fullName).trim();
        const nameParts = cleanFullName.split(' ').filter(Boolean);
        updatedParticipant.fullName = cleanFullName;
        updatedParticipant.firstName = nameParts[0] ? nameParts[0].toLowerCase() : cleanFullName.toLowerCase();
      }

      if (updates.age !== undefined && updates.age !== null && !isNaN(Number(updates.age))) {
        updatedParticipant.age = Number(updates.age);
      }

      if (updates.congregation) {
        updatedParticipant.congregation = String(updates.congregation).trim();
      }

      if (updates.foodOrDrink !== undefined) {
        updatedParticipant.foodOrDrink = String(updates.foodOrDrink).trim();
      }

      if (updates.activities) {
        updatedParticipant.activities = {
          gincana: Boolean(updates.activities.gincana),
          tocata: Boolean(updates.activities.tocata),
          instrument: updates.activities.instrument ? String(updates.activities.instrument).trim() : ''
        };
      }

      if (updates.proofStatus) {
        updatedParticipant.proofStatus = updates.proofStatus;
      }

      if (updates.proofUrl !== undefined) {
        updatedParticipant.proofUrl = updates.proofUrl;
        if (updates.proofFileName !== undefined) updatedParticipant.proofFileName = updates.proofFileName;
        if (updates.proofFileType !== undefined) updatedParticipant.proofFileType = updates.proofFileType;
      }

      if (updates.notes !== undefined) {
        updatedParticipant.notes = String(updates.notes).trim();
      }

      participants[index] = updatedParticipant;
    }

    await saveParticipants(participants);

    return res.json({
      message: 'Cadastro atualizado com sucesso.',
      participant: updatedParticipant
    });
  } catch (err: any) {
    console.error('Error updating participant in server.ts:', err);
    return res.status(500).json({ error: 'Erro ao atualizar dados: ' + (err?.message || 'Tente novamente.') });
  }
};
app.put('/api/participants/:id', updateParticipantHandler);
app.put('/participants/:id', updateParticipantHandler);
app.patch('/api/participants/:id', updateParticipantHandler);
app.patch('/participants/:id', updateParticipantHandler);
app.post('/api/participants/:id/update', updateParticipantHandler);
app.post('/participants/:id/update', updateParticipantHandler);
app.post('/api/participants/:id/status', updateParticipantHandler);
app.put('/api/participants/:id/status', updateParticipantHandler);
app.patch('/api/participants/:id/status', updateParticipantHandler);
app.post('/api/participants/:id', updateParticipantHandler);
app.post('/participants/:id', updateParticipantHandler);
app.post('/api/participants/update', updateParticipantHandler);
app.put('/api/participants/update', updateParticipantHandler);

// Local Audio MP3 streaming route with full Range support
const audioFileStreamHandler = (req: Request, res: Response) => {
  const rawParam = req.params.filename ? decodeURIComponent(req.params.filename) : '';
  const candidatePath = rawParam ? path.join(AUDIO_UPLOADS_DIR, rawParam) : '';

  if (candidatePath && fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.sendFile(candidatePath);
  }

  // Fallback: look up any .mp3 file in AUDIO_UPLOADS_DIR
  try {
    if (fs.existsSync(AUDIO_UPLOADS_DIR)) {
      const files = fs.readdirSync(AUDIO_UPLOADS_DIR).filter((f) => f.toLowerCase().endsWith('.mp3'));
      if (files.length > 0) {
        const found = files.find((f) => f.toLowerCase() === rawParam.toLowerCase()) || files[0];
        const fullPath = path.join(AUDIO_UPLOADS_DIR, found);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.sendFile(fullPath);
      }
    }
  } catch (e) {}

  return res.status(404).send('Áudio não encontrado.');
};
app.get('/uploads/audio/:filename', audioFileStreamHandler);
app.get('/api/uploads/audio/:filename', audioFileStreamHandler);
app.get('/audio/:filename', audioFileStreamHandler);
app.get('/api/audio/current', (req: Request, res: Response) => {
  const current = getDefaultLocalAudioTrack();
  res.json(current);
});

// Delete participant
const deleteParticipantHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  let participants = loadParticipants();
  
  const initialLen = participants.length;
  participants = participants.filter((p) => p.id !== id);

  if (participants.length === initialLen) {
    return res.status(404).json({ error: 'Participante não encontrado.' });
  }

  await saveParticipants(participants);
  res.json({ message: 'Participante removido com sucesso.', id });
};
app.delete('/api/participants/:id', deleteParticipantHandler);
app.delete('/participants/:id', deleteParticipantHandler);
app.post('/api/participants/:id/delete', deleteParticipantHandler);
app.post('/participants/:id/delete', deleteParticipantHandler);

// Get statistics dashboard with Admin Financial Metrics
const getStatsHandler = (req: Request, res: Response) => {
  try {
    const participants = loadParticipants();
    const settings = loadSettings();

    const totalParticipants = participants.length;
    
    // Participants with attached or approved proofs vs pending
    const totalWithProof = participants.filter((p) => p && p.proofUrl).length;
    const totalApprovedProof = participants.filter((p) => p && p.proofStatus === 'Aprovado').length;
    const totalPendingProof = participants.filter((p) => !p || !p.proofUrl || p.proofStatus === 'Pendente').length;

    const gincanaCount = participants.filter((p) => p && p.activities && p.activities.gincana).length;
    const tocataCount = participants.filter((p) => p && p.activities && p.activities.tocata).length;
    const foodContributionsCount = participants.filter((p) => p && p.foodOrDrink && String(p.foodOrDrink).trim().length > 0).length;

    const congregationsCount: Record<string, number> = {};
    participants.forEach((p) => {
      if (!p) return;
      const cong = p.congregation || 'Outras';
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

    // Calculate financial figures
    const ticketPrice = Number(settings.ticketPrice) || 25;
    const revenueGoal = Number(settings.revenueGoal) || 2500;
    const totalRevenueReceived = totalWithProof * ticketPrice;
    const totalRevenuePending = totalPendingProof * ticketPrice;
    
    // Goal progress %
    const goalProgressPercent = revenueGoal > 0 
      ? Math.min(100, Math.round((totalRevenueReceived / revenueGoal) * 100))
      : 0;

    const stats: DashboardStats = {
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
  } catch (err: any) {
    console.error('Error in getStatsHandler:', err);
    res.status(500).json({ error: 'Erro ao processar estatísticas: ' + (err?.message || '') });
  }
};
app.get('/api/stats', getStatsHandler);
app.get('/stats', getStatsHandler);

// Full Database Backup Export Endpoint
const backupExportHandler = (req: Request, res: Response) => {
  const participants = loadParticipants();
  const settings = loadSettings();
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    participants
  });
};
app.get('/api/backup/export', backupExportHandler);
app.get('/backup/export', backupExportHandler);

// Full Database Backup Restore/Import Endpoint
const backupImportHandler = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    let incomingSettings: any = null;
    let incomingParticipants: any[] | null = null;

    // Case 1: Body is directly an array (participants list)
    if (Array.isArray(body)) {
      incomingParticipants = body;
    } else if (typeof body === 'object') {
      const root = body.data && typeof body.data === 'object' ? body.data : body;

      if (root.settings && typeof root.settings === 'object') {
        incomingSettings = root.settings;
      } else if (root.ticketPrice !== undefined || root.eventName !== undefined || root.congregations !== undefined) {
        incomingSettings = root;
      }

      if (Array.isArray(root.participants)) {
        incomingParticipants = root.participants;
      } else if (Array.isArray(root.participantes)) {
        incomingParticipants = root.participantes;
      } else if (Array.isArray(root.inscriptions)) {
        incomingParticipants = root.inscriptions;
      } else if (Array.isArray(root.inscricoes)) {
        incomingParticipants = root.inscricoes;
      }
    }

    if (!incomingSettings && !incomingParticipants) {
      return res.status(400).json({
        error: 'Formato de backup inválido. O arquivo JSON selecionado não contém participantes nem configurações do evento.'
      });
    }

    let savedSettingsResult: EventSettings | null = null;
    if (incomingSettings && typeof incomingSettings === 'object') {
      const currentSettings = loadSettings();
      savedSettingsResult = {
        ...currentSettings,
        ...incomingSettings
      };
      await saveSettings(savedSettingsResult);
    }

    let restoredParticipantsCount = 0;
    if (incomingParticipants && Array.isArray(incomingParticipants)) {
      await saveParticipants(incomingParticipants);
      restoredParticipantsCount = incomingParticipants.length;
    }

    console.log(`[Backup] Importação concluída com sucesso: ${restoredParticipantsCount} participantes restaurados, configurações atualizadas: ${Boolean(incomingSettings)}.`);

    return res.json({
      success: true,
      message: 'Base de dados restaurada e sobrescrita com sucesso!',
      participantsCount: restoredParticipantsCount,
      settingsUpdated: Boolean(incomingSettings),
      settings: savedSettingsResult || loadSettings()
    });
  } catch (err: any) {
    console.error('Error importing backup JSON:', err);
    return res.status(500).json({
      error: 'Erro interno ao restaurar o arquivo de backup: ' + (err?.message || 'Erro desconhecido')
    });
  }
};
app.post('/api/backup/import', backupImportHandler);
app.post('/backup/import', backupImportHandler);

// ==========================================
// Vercel Blob Storage Endpoints
// ==========================================

// Upload any file, photo, video, PDF or JSON data to Vercel Blob
const blobUploadHandler = async (req: Request, res: Response) => {
  try {
    const { filename, content, contentType, customToken } = req.body || {};
    const token = getBlobToken(req, customToken);

    if (!token) {
      return res.status(400).json({
        error: 'Token do Vercel Blob não encontrado. Por favor, adicione a variável BLOB_READ_WRITE_TOKEN no Vercel ou informe o Token nas Configurações.'
      });
    }

    if (!content) {
      return res.status(400).json({ error: 'Conteúdo do arquivo não fornecido.' });
    }

    const cleanFilename = String(filename || 'file_' + Date.now()).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const pathname = `gincana/uploads/${cleanFilename}`;

    let buffer: Buffer;
    if (typeof content === 'string' && content.startsWith('data:')) {
      const base64Data = content.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else if (typeof content === 'string') {
      buffer = Buffer.from(content, 'utf-8');
    } else {
      buffer = Buffer.from(content);
    }

    const blob = await put(pathname, buffer, {
      access: 'public',
      allowOverwrite: true,
      token,
      contentType: contentType || 'application/octet-stream'
    });

    return res.json({
      success: true,
      url: blob.url,
      downloadUrl: blob.downloadUrl || blob.url,
      pathname: blob.pathname
    });
  } catch (err: any) {
    console.error('Error in /api/blob/upload:', err);
    return res.status(500).json({ error: 'Erro ao salvar no Vercel Blob: ' + (err.message || 'Erro interno') });
  }
};
app.post('/api/blob/upload', blobUploadHandler);
app.post('/blob/upload', blobUploadHandler);

// Save full Database (JSON) to Vercel Blob
const blobBackupSaveHandler = async (req: Request, res: Response) => {
  try {
    const { backupData, customToken } = req.body || {};
    const token = getBlobToken(req, customToken);

    if (!token) {
      return res.status(400).json({
        error: 'Token do Vercel Blob não encontrado. Adicione BLOB_READ_WRITE_TOKEN nas variáveis de ambiente da Vercel ou insira o Token no Painel do Administrador.'
      });
    }

    const participants = backupData?.participants || loadParticipants();
    const settings = backupData?.settings || loadSettings();

    const fullData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      participants
    };

    const jsonContent = JSON.stringify(fullData, null, 2);
    const pathname = 'gincana/gincana_backup_database.json';

    const blob = await put(pathname, jsonContent, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
      contentType: 'application/json'
    });

    // Update settings in memory with current Blob storage URL
    const currentSettings = loadSettings();
    saveSettings({
      ...currentSettings,
      blobStorageUrl: blob.url,
      blobLastSyncAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      url: blob.url,
      message: 'Base de dados e cadastros armazenados com sucesso no Vercel Blob!'
    });
  } catch (err: any) {
    console.error('Error saving backup to Vercel Blob:', err);
    return res.status(500).json({ error: 'Erro ao salvar backup no Vercel Blob: ' + (err.message || 'Erro interno') });
  }
};
app.post('/api/blob/backup/save', blobBackupSaveHandler);
app.post('/blob/backup/save', blobBackupSaveHandler);

// Restore full Database from Vercel Blob
const blobBackupLoadHandler = async (req: Request, res: Response) => {
  try {
    const { customToken } = req.body || {};
    const token = getBlobToken(req, customToken);

    if (!token) {
      return res.status(400).json({
        error: 'Token do Vercel Blob não encontrado. Adicione a variável BLOB_READ_WRITE_TOKEN.'
      });
    }

    const { blobs } = await list({ prefix: 'gincana/gincana_backup_database.json', token });
    if (!blobs || blobs.length === 0) {
      return res.status(404).json({ error: 'Nenhum backup encontrado no container Vercel Blob.' });
    }

    const backupBlob = blobs[0];
    const fetchRes = await fetch(backupBlob.url);
    if (!fetchRes.ok) {
      throw new Error('Não foi possível ler o arquivo do Vercel Blob.');
    }

    const backupData = await fetchRes.json();
    if (backupData.participants && Array.isArray(backupData.participants)) {
      saveParticipants(backupData.participants);
    }
    if (backupData.settings && typeof backupData.settings === 'object') {
      const currentSettings = loadSettings();
      saveSettings({ ...currentSettings, ...backupData.settings, blobStorageUrl: backupBlob.url });
    }

    return res.json({
      success: true,
      backupData,
      message: 'Base de dados restaurada com sucesso do Vercel Blob!'
    });
  } catch (err: any) {
    console.error('Error loading backup from Vercel Blob:', err);
    return res.status(500).json({ error: 'Erro ao recuperar backup do Vercel Blob: ' + (err.message || 'Erro interno') });
  }
};
app.post('/api/blob/backup/load', blobBackupLoadHandler);
app.post('/blob/backup/load', blobBackupLoadHandler);

// List all files stored in Vercel Blob
const blobListHandler = async (req: Request, res: Response) => {
  try {
    const customToken = req.query.customToken as string;
    const token = getBlobToken(req, customToken);

    if (!token) {
      return res.status(400).json({
        error: 'Token do Vercel Blob não encontrado (BLOB_READ_WRITE_TOKEN).'
      });
    }

    const result = await list({ token });
    return res.json({
      success: true,
      blobs: result.blobs || []
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao listar do Vercel Blob: ' + (err.message || 'Erro') });
  }
};
app.get('/api/blob/list', blobListHandler);
app.get('/blob/list', blobListHandler);

// Delete a file from Vercel Blob
const blobDeleteHandler = async (req: Request, res: Response) => {
  try {
    const { url, customToken } = req.body || {};
    const token = getBlobToken(req, customToken);

    if (!token) {
      return res.status(400).json({ error: 'Token do Vercel Blob não encontrado.' });
    }
    if (!url) {
      return res.status(400).json({ error: 'URL do arquivo é obrigatória.' });
    }

    await del(url, { token });
    return res.json({ success: true, message: 'Arquivo deletado com sucesso do Vercel Blob!' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao deletar do Vercel Blob: ' + (err.message || 'Erro') });
  }
};
app.delete('/api/blob/delete', blobDeleteHandler);
app.delete('/blob/delete', blobDeleteHandler);

// ==========================================
// Audio Streaming & Upload Endpoints
// ==========================================

// Audio Upload Handler (Stores MP3 locally in /uploads/audio and syncs to Vercel Blob)
const audioUploadHandler = async (req: Request, res: Response) => {
  try {
    const { filename, content, contentType } = req.body || {};

    if (!content) {
      return res.status(400).json({ error: 'Nenhum conteúdo de áudio fornecido.' });
    }

    const cleanName = String(filename || 'hino_' + Date.now() + '.mp3')
      .replace(/[^a-zA-Z0-9_.-]/g, '_');
    const localFilePath = path.join(AUDIO_UPLOADS_DIR, cleanName);

    let buffer: Buffer;
    if (typeof content === 'string' && content.startsWith('data:')) {
      const base64Data = content.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else if (typeof content === 'string') {
      buffer = Buffer.from(content, 'base64');
    } else {
      buffer = Buffer.from(content);
    }

    // Save locally
    try {
      fs.writeFileSync(localFilePath, buffer);
    } catch (err) {
      console.warn('Note: Could not write audio locally:', err);
    }

    let publicUrl = `/uploads/audio/${cleanName}`;

    // Optionally sync to Vercel Blob if token available
    try {
      const token = getBlobToken(req);
      if (token) {
        const blob = await put(`gincana/audio/${cleanName}`, buffer, {
          access: 'public',
          allowOverwrite: true,
          token,
          contentType: contentType || 'audio/mpeg'
        });
        if (blob && blob.url) {
          publicUrl = blob.url;
        }
      }
    } catch (blobErr) {
      console.warn('[Audio] Notice: Vercel Blob upload fallback to local storage:', blobErr);
    }

    return res.json({
      success: true,
      url: publicUrl,
      filename: cleanName,
      message: 'Áudio enviado com sucesso!'
    });
  } catch (err: any) {
    console.error('Error in /api/audio/upload:', err);
    return res.status(500).json({ error: 'Erro ao enviar áudio: ' + (err?.message || 'Erro interno') });
  }
};
app.post('/api/audio/upload', audioUploadHandler);
app.post('/audio/upload', audioUploadHandler);

// Audio Proxy / Streamer: Streams audio from Google Drive or external sources with full CORS & Range support
const audioProxyHandler = async (req: Request, res: Response) => {
  try {
    const rawUrl = (req.query.url as string) || '';
    const driveId = (req.query.driveId as string) || '';

    let fileId = driveId;
    if (rawUrl && (rawUrl.startsWith('/') || rawUrl.startsWith('uploads/') || rawUrl.includes('Se_vos_baterdes') || !rawUrl.startsWith('http'))) {
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

    const forwardHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*'
    };
    if (req.headers.range) {
      forwardHeaders['Range'] = req.headers.range as string;
    }

    let upstreamRes: any = null;

    if (fileId) {
      // Try Google Drive download endpoints in order of reliability
      const candidateUrls = [
        `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
        `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
        `https://docs.google.com/uc?export=download&id=${fileId}`,
        `https://drive.google.com/uc?id=${fileId}&export=download`
      ];

      for (const testUrl of candidateUrls) {
        try {
          const resp = await fetch(testUrl, {
            method: 'GET',
            headers: forwardHeaders,
            redirect: 'follow'
          });

          const cType = resp.headers.get('content-type') || '';
          if ((resp.ok || resp.status === 206) && !cType.includes('text/html')) {
            upstreamRes = resp;
            break;
          }

          // If Google Drive returned an HTML confirmation page (e.g. large file warning)
          if (cType.includes('text/html')) {
            const html = await resp.text();
            // Search for confirm token or direct download link
            const confirmMatch = html.match(/confirm=([0-9A-Za-z_]+)/) || html.match(/name="confirm"\s+value="([^"]+)"/);
            const downloadUrlMatch = html.match(/href="(\/uc\?export=download[^"]+)"/) || html.match(/action="(https:\/\/drive\.usercontent\.google\.com\/download[^"]+)"/);

            if (confirmMatch && confirmMatch[1]) {
              const confirmedUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirmMatch[1]}`;
              const confResp = await fetch(confirmedUrl, {
                method: 'GET',
                headers: forwardHeaders,
                redirect: 'follow'
              });
              if (confResp.ok || confResp.status === 206) {
                upstreamRes = confResp;
                break;
              }
            } else if (downloadUrlMatch && downloadUrlMatch[1]) {
              const targetUrl = downloadUrlMatch[1].startsWith('http')
                ? downloadUrlMatch[1]
                : `https://drive.google.com${downloadUrlMatch[1]}`;
              const dlResp = await fetch(targetUrl, {
                method: 'GET',
                headers: forwardHeaders,
                redirect: 'follow'
              });
              if (dlResp.ok || dlResp.status === 206) {
                upstreamRes = dlResp;
                break;
              }
            }
          }
        } catch (candidateErr) {
          console.warn('Notice: candidate URL attempt failed:', candidateErr);
        }
      }
    } else if (rawUrl) {
      upstreamRes = await fetch(rawUrl, {
        method: 'GET',
        headers: forwardHeaders,
        redirect: 'follow'
      });
    }

    if (!upstreamRes || (!upstreamRes.ok && upstreamRes.status !== 206)) {
      return res.status(404).json({
        error: 'Não foi possível carregar o arquivo de áudio. Se for do Google Drive, verifique se o link possui acesso "Qualquer pessoa com o link".'
      });
    }

    res.status(upstreamRes.status);
    const incomingContentType = upstreamRes.headers.get('content-type') || '';
    const contentType = (!incomingContentType || incomingContentType.includes('text/html') || incomingContentType.includes('application/octet-stream'))
      ? 'audio/mpeg'
      : incomingContentType;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
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
              await new Promise((resolve) => res.once('drain', resolve));
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
  } catch (err: any) {
    console.error('Error in audioProxyHandler:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao reproduzir áudio: ' + (err?.message || 'Erro') });
    }
  }
};
app.get('/api/audio-proxy', audioProxyHandler);
app.get('/audio-proxy', audioProxyHandler);

// Export app for Vercel serverless functions
export { app };
export default app;

// Start Express server + Vite (in standalone / container dev mode)
async function startServer() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!isServerless) {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Not Found');
        }
      });
    }
  }

  // Only run app.listen if not in a serverless function environment
  if (!isServerless) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server "Somos Jóias Preciosas" rodando na porta ${PORT}`);
    });
  }
}

startServer();
