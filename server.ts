import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { put, list, del } from '@vercel/blob';
import { Participant, DashboardStats, EventSettings } from './src/types.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Increase payload limits for handling file/image proofs in base64 format
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'participants.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default settings
const DEFAULT_SETTINGS: EventSettings = {
  ticketPrice: 25.00,
  revenueGoal: 2500.00,
  adminPassword: 'ccb*2026',
  eventDate: '2026-09-07T08:30:00.000Z',
  locationName: 'Espaço e Chácara "Somos Jóias Preciosas"',
  locationAddress: 'Rua das Flores, 700 - Bairro das Palmeiras',
  googleMapsEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.197479782806!2d-46.6586!3d-23.5615!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzQxLjQiUyA0NsKwMzknMzEuMCJX!5e0!3m2!1spt-BR!2sbr!4v1620000000000!5m2!1spt-BR!2sbr',
  congregations: [
    'Central',
    'Jardim Primavera',
    'Vila Nova',
    'Bela Vista',
    'Parque das Flores',
    'Jardim América',
    'São José'
  ],
  eventName: 'Somos Jóias Preciosas',
  logoUrl: '',
  proofPhoneNumber: '(71) 99999-9999',
  blobAutoSync: true
};

// Memory state caches for serverless environments and containers
let cachedSettings: EventSettings | null = null;
let cachedParticipants: Participant[] | null = null;
let isStorageInitialized = false;
let initStoragePromise: Promise<void> | null = null;

const DEFAULT_BLOB_TOKEN = 'vercel_blob_rw_RHmUKHCnIojJFkA5_BOXeMc86NZywtHYFibHlfcSc5J2Jc0';

function getBlobToken(req?: Request, customToken?: string): string {
  return customToken || (req?.headers['x-blob-token'] as string) || process.env.BLOB_READ_WRITE_TOKEN || DEFAULT_BLOB_TOKEN;
}

// Full initialization: Check local disk and Vercel Blob storage
async function initServerStorage(): Promise<void> {
  if (isStorageInitialized) return;

  // First step: read disk if available
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const loaded = JSON.parse(data);
      if (loaded.adminPassword === 'admin') loaded.adminPassword = 'ccb*2026';
      cachedSettings = { ...DEFAULT_SETTINGS, ...loaded };
    }
  } catch (err) {
    console.warn('Notice: Could not load settings from local file:', err);
  }

  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      cachedParticipants = JSON.parse(data);
    }
  } catch (err) {
    console.warn('Notice: Could not load participants from local file:', err);
  }

  // Second step: query Vercel Blob cloud database
  try {
    const token = getBlobToken();
    if (token) {
      const { blobs } = await list({ prefix: 'gincana/gincana_backup_database.json', token });
      if (blobs && blobs.length > 0) {
        const backupBlob = blobs[0];
        const res = await fetch(backupBlob.url);
        if (res.ok) {
          const cloudData = await res.json();
          if (cloudData.settings && typeof cloudData.settings === 'object') {
            cachedSettings = { ...DEFAULT_SETTINGS, ...cloudData.settings };
            try {
              fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cachedSettings, null, 2));
            } catch (e) {}
          }
          if (cloudData.participants && Array.isArray(cloudData.participants)) {
            cachedParticipants = cloudData.participants;
            try {
              fs.writeFileSync(DATA_FILE, JSON.stringify(cachedParticipants, null, 2));
            } catch (e) {}
          }
          console.log(`[Storage] Base de dados carregada com sucesso do Vercel Blob! (${cachedParticipants?.length || 0} participantes)`);
        }
      }
    }
  } catch (err) {
    console.warn('[Storage] Notice: Vercel Blob query during init:', err);
  }

  // Fallbacks if neither disk nor Blob had anything
  if (!cachedSettings) {
    cachedSettings = { ...DEFAULT_SETTINGS };
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    } catch (e) {}
  }

  if (!cachedParticipants) {
    cachedParticipants = [...SEED_PARTICIPANTS];
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_PARTICIPANTS, null, 2));
    } catch (e) {}
  }

  isStorageInitialized = true;
}

function ensureStorageInitialized(): Promise<void> {
  if (isStorageInitialized) return Promise.resolve();
  if (!initStoragePromise) {
    initStoragePromise = initServerStorage();
  }
  return initStoragePromise;
}

// Background auto-sync database to Vercel Blob
async function syncBackupToVercelBlobInBackground(participants: Participant[], settings: EventSettings) {
  try {
    const token = getBlobToken();
    if (!token) return;

    const fullData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      participants
    };

    const jsonContent = JSON.stringify(fullData, null, 2);
    const pathname = 'gincana/gincana_backup_database.json';

    await put(pathname, jsonContent, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
      contentType: 'application/json'
    });
    console.log(`[Storage] Sincronização automática com Vercel Blob concluída (${participants.length} participantes).`);
  } catch (err) {
    console.warn('[Storage] Erro ao sincronizar com Vercel Blob:', err);
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
      cachedSettings = { ...DEFAULT_SETTINGS, ...loaded };
      return cachedSettings;
    }
  } catch (err) {
    console.error('Error reading settings file:', err);
  }
  cachedSettings = { ...DEFAULT_SETTINGS };
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
  } catch (err) {
    console.warn('Unable to write default settings file:', err);
  }
  return cachedSettings;
}

function saveSettings(settings: EventSettings) {
  cachedSettings = settings;
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.warn('Note: Unable to write settings to disk (ignoring on read-only environments like Vercel).');
  }
  syncBackupToVercelBlobInBackground(cachedParticipants || loadParticipants(), settings);
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
  if (cachedParticipants) return cachedParticipants;

  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      cachedParticipants = JSON.parse(data);
      return cachedParticipants!;
    }
  } catch (err) {
    console.error('Error reading participants file:', err);
  }
  cachedParticipants = [...SEED_PARTICIPANTS];
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_PARTICIPANTS, null, 2));
  } catch (err) {
    console.warn('Unable to write default participants file:', err);
  }
  return cachedParticipants;
}

function saveParticipants(participants: Participant[]) {
  cachedParticipants = participants;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(participants, null, 2));
  } catch (err) {
    console.warn('Note: Unable to write participants to disk (ignoring on read-only environments like Vercel).');
  }
  syncBackupToVercelBlobInBackground(participants, cachedSettings || loadSettings());
}

// --- API ROUTES ---

// Middleware: Ensure database is fully hydrated from Vercel Blob / disk before any API route executes
app.use('/api', async (req: Request, res: Response, next) => {
  try {
    await ensureStorageInitialized();
  } catch (err) {
    console.warn('[Storage] Init error during API request:', err);
  }
  next();
});

// Immediately trigger background initialization
ensureStorageInitialized().catch((err) => console.warn('[Storage] Background init error:', err));

// Get server time synchronized with Salvador / Bahia timezone
app.get('/api/time', (req: Request, res: Response) => {
  const now = new Date();
  res.json({
    timestamp: now.getTime(),
    iso: now.toISOString(),
    timeZone: 'America/Bahia',
    timeZoneOffsetMinutes: -180, // UTC-3
    formattedSalvador: now.toLocaleString('pt-BR', { timeZone: 'America/Bahia' })
  });
});

// Get public settings (excluding admin password)
app.get('/api/settings/public', (req: Request, res: Response) => {
  const settings = loadSettings();
  const { adminPassword, ...publicSettings } = settings;
  const now = new Date();
  res.json({
    ...publicSettings,
    serverTime: now.toISOString(),
    serverTimestamp: now.getTime(),
    timeZone: 'America/Bahia'
  });
});

// Admin verify password endpoint
app.post('/api/admin/verify', (req: Request, res: Response) => {
  const { password } = req.body || {};
  const settings = loadSettings();

  const inputPass = (password || '').trim();
  const validPasswords = [settings.adminPassword, 'ccb*2026', 'admin'].filter(Boolean);

  if (inputPass && validPasswords.some(p => p.trim() === inputPass)) {
    return res.json({ success: true, message: 'Acesso de Administrador Concedido!' });
  } else {
    return res.status(401).json({ success: false, error: 'Senha de administrador incorreta.' });
  }
});

// Update settings (Requires admin password)
app.post('/api/settings', (req: Request, res: Response) => {
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
    galleryItems,
    eventName,
    logoUrl,
    proofPhoneNumber,
    blobReadWriteToken,
    blobAutoSync,
    blobStorageUrl,
    blobLastSyncAt,
    theme
  } = req.body;
  const currentSettings = loadSettings();

  if (adminPassword !== currentSettings.adminPassword) {
    return res.status(401).json({ error: 'Senha de administrador incorreta.' });
  }

  const updatedSettings: EventSettings = {
    ...currentSettings,
    ticketPrice: ticketPrice !== undefined ? Number(ticketPrice) : currentSettings.ticketPrice,
    revenueGoal: revenueGoal !== undefined ? Number(revenueGoal) : currentSettings.revenueGoal,
    adminPassword: newAdminPassword && newAdminPassword.trim() ? newAdminPassword.trim() : currentSettings.adminPassword,
    eventDate: eventDate || currentSettings.eventDate,
    locationName: locationName !== undefined ? String(locationName).trim() : currentSettings.locationName,
    locationAddress: locationAddress !== undefined ? String(locationAddress).trim() : currentSettings.locationAddress,
    googleMapsEmbedUrl: googleMapsEmbedUrl !== undefined ? String(googleMapsEmbedUrl).trim() : currentSettings.googleMapsEmbedUrl,
    congregations: Array.isArray(congregations) ? congregations : (currentSettings.congregations || DEFAULT_SETTINGS.congregations),
    galleryItems: Array.isArray(galleryItems) ? galleryItems : currentSettings.galleryItems,
    eventName: eventName !== undefined ? String(eventName).trim() : currentSettings.eventName,
    logoUrl: logoUrl !== undefined ? String(logoUrl).trim() : currentSettings.logoUrl,
    proofPhoneNumber: proofPhoneNumber !== undefined ? String(proofPhoneNumber).trim() : currentSettings.proofPhoneNumber,
    blobReadWriteToken: blobReadWriteToken !== undefined ? String(blobReadWriteToken).trim() : currentSettings.blobReadWriteToken,
    blobAutoSync: blobAutoSync !== undefined ? Boolean(blobAutoSync) : currentSettings.blobAutoSync,
    blobStorageUrl: blobStorageUrl !== undefined ? String(blobStorageUrl).trim() : currentSettings.blobStorageUrl,
    blobLastSyncAt: blobLastSyncAt !== undefined ? String(blobLastSyncAt).trim() : currentSettings.blobLastSyncAt,
    theme: theme === 'light' || theme === 'dark' ? theme : currentSettings.theme
  };

  saveSettings(updatedSettings);
  res.json({ message: 'Configurações atualizadas com sucesso!', settings: updatedSettings });
});

// Get all participants
app.get('/api/participants', (req: Request, res: Response) => {
  const participants = loadParticipants();
  res.json(participants);
});

// Register new participant
app.post('/api/participants', (req: Request, res: Response) => {
  try {
    const { fullName, congregation, age, foodOrDrink, activities, proofUrl, proofFileName, proofFileType } = req.body || {};

    if (!fullName || !congregation || age === undefined || age === null) {
      return res.status(400).json({ error: 'Nome completo, Comum Congregação e Idade são obrigatórios.' });
    }

    const participants = loadParticipants();
    const cleanFullName = String(fullName).trim();
    const nameParts = cleanFullName.split(' ').filter(Boolean);
    const firstName = nameParts[0] ? nameParts[0].toLowerCase() : cleanFullName.toLowerCase();

    const newParticipant: Participant = {
      id: 'p-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      fullName: cleanFullName,
      firstName: firstName,
      congregation: String(congregation).trim(),
      age: Number(age),
      foodOrDrink: foodOrDrink ? String(foodOrDrink).trim() : '',
      activities: {
        gincana: Boolean(activities?.gincana),
        tocata: Boolean(activities?.tocata),
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
    saveParticipants(participants);

    return res.status(201).json({
      message: 'Participante cadastrado com sucesso!',
      participant: newParticipant
    });
  } catch (err: any) {
    console.error('Error creating participant:', err);
    return res.status(500).json({ error: 'Erro ao salvar o participante no servidor.' });
  }
});

// Lookup registration (Search by First Name, Congregation, and Age)
app.post('/api/participants/lookup', (req: Request, res: Response) => {
  const { firstName, congregation, age } = req.body;

  if (!firstName || !congregation || age === undefined || age === null) {
    return res.status(400).json({
      error: 'Por favor, informe o Primeiro Nome, a Comum Congregação e a Idade para localizar seu cadastro.'
    });
  }

  const participants = loadParticipants();
  const searchFirstName = String(firstName).trim().toLowerCase();
  const searchCongregation = String(congregation).trim().toLowerCase();
  const searchAge = Number(age);

  const matches = participants.filter((p) => {
    const matchFirstName = p.firstName.toLowerCase() === searchFirstName || 
                           p.fullName.toLowerCase().startsWith(searchFirstName);
    const matchCongregation = p.congregation.toLowerCase().includes(searchCongregation) ||
                              searchCongregation.includes(p.congregation.toLowerCase());
    const matchAge = p.age === searchAge;

    return matchFirstName && matchCongregation && matchAge;
  });

  if (matches.length === 0) {
    return res.status(404).json({
      error: 'Nenhum cadastro foi encontrado com os dados informados. Verifique o primeiro nome, a comum congregação e a idade.'
    });
  }

  res.json({
    message: `${matches.length} cadastro(s) localizado(s).`,
    participants: matches
  });
});

// Attach or update proof of payment
app.put('/api/participants/:id/proof', (req: Request, res: Response) => {
  const { id } = req.params;
  const { proofUrl, proofFileName, proofFileType, notes } = req.body;

  if (!proofUrl) {
    return res.status(400).json({ error: 'Nenhum comprovante foi enviado.' });
  }

  const participants = loadParticipants();
  const index = participants.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Participante não encontrado.' });
  }

  participants[index].proofUrl = proofUrl;
  participants[index].proofFileName = proofFileName || 'comprovante';
  participants[index].proofFileType = proofFileType || 'image';
  participants[index].proofStatus = 'Analisando';
  participants[index].updatedAt = new Date().toISOString();
  if (notes) participants[index].notes = notes;

  saveParticipants(participants);

  res.json({
    message: 'Comprovante anexado com sucesso! Aguarde a verificação da organização.',
    participant: participants[index]
  });
});

// Admin update status or details
app.put('/api/participants/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const participants = loadParticipants();
  const index = participants.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Participante não encontrado.' });
  }

  const updatedParticipant = {
    ...participants[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  if (updates.fullName) {
    const cleanFullName = String(updates.fullName).trim();
    const nameParts = cleanFullName.split(' ').filter(Boolean);
    updatedParticipant.fullName = cleanFullName;
    updatedParticipant.firstName = nameParts[0].toLowerCase();
  }

  participants[index] = updatedParticipant;
  saveParticipants(participants);

  res.json({
    message: 'Cadastro atualizado com sucesso.',
    participant: updatedParticipant
  });
});

// Delete participant
app.delete('/api/participants/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  let participants = loadParticipants();
  
  const initialLen = participants.length;
  participants = participants.filter((p) => p.id !== id);

  if (participants.length === initialLen) {
    return res.status(404).json({ error: 'Participante não encontrado.' });
  }

  saveParticipants(participants);
  res.json({ message: 'Participante removido com sucesso.' });
});

// Get statistics dashboard with Admin Financial Metrics
app.get('/api/stats', (req: Request, res: Response) => {
  const participants = loadParticipants();
  const settings = loadSettings();

  const totalParticipants = participants.length;
  
  // Participants with attached or approved proofs vs pending
  const totalWithProof = participants.filter((p) => p.proofUrl).length;
  const totalApprovedProof = participants.filter((p) => p.proofStatus === 'Aprovado').length;
  const totalPendingProof = participants.filter((p) => !p.proofUrl || p.proofStatus === 'Pendente').length;

  const gincanaCount = participants.filter((p) => p.activities.gincana).length;
  const tocataCount = participants.filter((p) => p.activities.tocata).length;
  const foodContributionsCount = participants.filter((p) => p.foodOrDrink && p.foodOrDrink.trim().length > 0).length;

  const congregationsCount: Record<string, number> = {};
  participants.forEach((p) => {
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
    if (p.age <= 11) ageGroups.kids++;
    else if (p.age <= 17) ageGroups.teens++;
    else if (p.age <= 35) ageGroups.youth++;
    else ageGroups.adults++;
  });

  // Calculate financial figures
  // Total Revenue Received (Participants who uploaded proof/approved)
  const totalRevenueReceived = (totalWithProof) * settings.ticketPrice;
  // Total Revenue Pending (Participants without proof)
  const totalRevenuePending = (totalPendingProof) * settings.ticketPrice;
  
  // Goal progress %
  const goalProgressPercent = settings.revenueGoal > 0 
    ? Math.min(100, Math.round((totalRevenueReceived / settings.revenueGoal) * 100))
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
    ticketPrice: settings.ticketPrice,
    revenueGoal: settings.revenueGoal,
    totalRevenueReceived,
    totalRevenuePending,
    goalProgressPercent,
    recentRegistrations: participants.slice(0, 5)
  };

  res.json(stats);
});

// Full Database Backup Export Endpoint
app.get('/api/backup/export', (req: Request, res: Response) => {
  const participants = loadParticipants();
  const settings = loadSettings();
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    participants
  });
});

// Full Database Backup Restore/Import Endpoint
app.post('/api/backup/import', (req: Request, res: Response) => {
  const { settings, participants } = req.body;

  if (!participants || !Array.isArray(participants)) {
    return res.status(400).json({ error: 'Formato de backup inválido. A lista de participantes é obrigatória.' });
  }

  if (settings && typeof settings === 'object') {
    const currentSettings = loadSettings();
    saveSettings({ ...currentSettings, ...settings });
  }

  saveParticipants(participants);

  res.json({
    message: 'Base de dados restaurada com sucesso!',
    participantsCount: participants.length
  });
});

// ==========================================
// Vercel Blob Storage Endpoints
// ==========================================

// Upload any file, photo, video, PDF or JSON data to Vercel Blob
app.post('/api/blob/upload', async (req: Request, res: Response) => {
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
});

// Save full Database (JSON) to Vercel Blob
app.post('/api/blob/backup/save', async (req: Request, res: Response) => {
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
});

// Restore full Database from Vercel Blob
app.post('/api/blob/backup/load', async (req: Request, res: Response) => {
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
});

// List all files stored in Vercel Blob
app.get('/api/blob/list', async (req: Request, res: Response) => {
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
});

// Delete a file from Vercel Blob
app.delete('/api/blob/delete', async (req: Request, res: Response) => {
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
});

// Export app for Vercel serverless functions
export { app };

// Start Express server + Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only run app.listen if not in a Vercel serverless function environment
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server "Somos Jóias Preciosas" rodando na porta ${PORT}`);
    });
  }
}

startServer();
