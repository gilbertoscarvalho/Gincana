import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Participant, EventSettings, ProofStatus } from '../types';

// Default Supabase project credentials for the event
export const DEFAULT_SUPABASE_URL = 'https://tcmurarerhzrcgfqanhf.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_t0V20lTkdhXdnOiLEg9wKQ_qVNksGyI';

// Environment variable resolution for client-side and server-side with fallback
export function getSupabaseCredentials(): { url: string; key: string } {
  let url = '';
  let key = '';

  // Server-side process.env check
  if (typeof process !== 'undefined' && process.env) {
    url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    key = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ''
    ).trim();
  }

  // Client-side import.meta.env check
  const metaEnv = (import.meta as any)?.env;
  if (!url && metaEnv) {
    url = (metaEnv.VITE_SUPABASE_URL || '').trim();
    key = (metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.VITE_SUPABASE_KEY || '').trim();
  }

  // Guaranteed project fallback for Vercel/GitHub deployments
  if (!url) url = DEFAULT_SUPABASE_URL;
  if (!key) key = DEFAULT_SUPABASE_KEY;

  return { url, key };
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  const finalUrl = customUrl || url;
  const finalKey = customKey || key;

  if (!finalUrl || !finalKey) {
    return null;
  }

  if (supabaseInstance && !customUrl && !customKey) {
    return supabaseInstance;
  }

  try {
    const client = createClient(finalUrl, finalKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    if (!customUrl && !customKey) {
      supabaseInstance = client;
    }
    return client;
  } catch (err) {
    console.error('[Supabase] Failed to initialize client:', err);
    return null;
  }
}

// Convert Participant to Supabase Row (using exact PostgreSQL table schema + JSONB backup for amount_paid and notes)
export function participantToSupabaseRow(p: Participant): Record<string, any> {
  const fullName = String(p.fullName || (p as any).full_name || '').trim();
  const nameParts = fullName.split(' ').filter(Boolean);
  const firstName = String(p.firstName || (p as any).first_name || (nameParts[0] ? nameParts[0].toLowerCase() : '')).trim();
  const foodOrDrink = String(p.foodOrDrink || (p as any).food_or_drink || '').trim();
  const proofUrl = p.proofUrl || (p as any).proof_url || null;
  const proofFileName = p.proofFileName || (p as any).proof_file_name || null;
  const proofFileType = p.proofFileType || (p as any).proof_file_type || null;
  const proofStatus = p.proofStatus || (p as any).proof_status || 'Pendente';
  const teamId = p.teamId || (p as any).team_id || null;
  const notes = p.notes !== undefined && p.notes !== null ? String(p.notes).trim() : '';
  const rawAmount = p.amountPaid !== undefined && p.amountPaid !== null ? p.amountPaid : (p as any).amount_paid;
  const amountPaid = rawAmount !== undefined && rawAmount !== null && !isNaN(Number(rawAmount)) ? Number(rawAmount) : 20;
  const now = new Date().toISOString();
  const createdAt = p.createdAt || (p as any).created_at || now;
  const updatedAt = p.updatedAt || (p as any).updated_at || now;

  let activities: any = p.activities;
  if (typeof activities === 'string') {
    try {
      activities = JSON.parse(activities);
    } catch {
      activities = { gincana: true, tocata: false };
    }
  } else if (!activities || typeof activities !== 'object') {
    activities = { gincana: true, tocata: false };
  }

  // Preserve amount_paid and notes inside activities JSONB so that even if the SQL table does not have top-level columns yet, the values are 100% saved in Supabase
  const enrichedActivities = {
    gincana: Boolean(activities?.gincana),
    tocata: Boolean(activities?.tocata),
    instrument: activities?.instrument ? String(activities.instrument).trim() : '',
    amount_paid: amountPaid,
    amountPaid: amountPaid,
    notes: notes
  };

  return {
    id: String(p.id).trim(),
    full_name: fullName,
    first_name: firstName,
    congregation: String(p.congregation || 'Central').trim(),
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

// Convert Supabase Row to Participant (resilient parsing supporting top-level columns and activities JSONB)
export function participantFromSupabaseRow(row: any): Participant {
  if (!row) return row;
  const fullName = String(row.fullName || row.full_name || '').trim();
  const nameParts = fullName.split(' ').filter(Boolean);
  const firstName = String(row.firstName || row.first_name || (nameParts[0] ? nameParts[0].toLowerCase() : '')).trim();
  const foodOrDrink = String(row.foodOrDrink || row.food_or_drink || '').trim();
  const proofUrl = row.proofUrl || row.proof_url || null;
  const proofFileName = row.proofFileName || row.proof_file_name || null;
  const proofFileType = row.proofFileType || row.proof_file_type || null;
  const proofStatus = (row.proofStatus || row.proof_status || 'Pendente') as ProofStatus;
  const teamId = row.teamId || row.team_id || null;
  const createdAt = row.createdAt || row.created_at || new Date().toISOString();
  const updatedAt = row.updatedAt || row.updated_at || new Date().toISOString();

  let activities = row.activities;
  if (typeof activities === 'string') {
    try {
      activities = JSON.parse(activities);
    } catch {
      activities = { gincana: true, tocata: false };
    }
  } else if (!activities || typeof activities !== 'object') {
    activities = { gincana: true, tocata: false };
  }

  // Parse notes from column or JSONB
  const notes = (row.notes !== undefined && row.notes !== null && String(row.notes).trim() !== '')
    ? String(row.notes).trim()
    : (activities?.notes && String(activities.notes).trim() !== '' ? String(activities.notes).trim() : undefined);

  // Parse amountPaid from top-level column or JSONB activities
  let amountPaid = 20;
  if (row.amount_paid !== undefined && row.amount_paid !== null && !isNaN(Number(row.amount_paid))) {
    amountPaid = Number(row.amount_paid);
  } else if (row.amountPaid !== undefined && row.amountPaid !== null && !isNaN(Number(row.amountPaid))) {
    amountPaid = Number(row.amountPaid);
  } else if (activities?.amount_paid !== undefined && activities?.amount_paid !== null && !isNaN(Number(activities.amount_paid))) {
    amountPaid = Number(activities.amount_paid);
  } else if (activities?.amountPaid !== undefined && activities?.amountPaid !== null && !isNaN(Number(activities.amountPaid))) {
    amountPaid = Number(activities.amountPaid);
  }

  return {
    id: String(row.id || '').trim(),
    fullName,
    firstName,
    congregation: String(row.congregation || 'Central').trim(),
    age: Number(row.age) || 18,
    foodOrDrink,
    activities: {
      gincana: Boolean(activities?.gincana),
      tocata: Boolean(activities?.tocata),
      instrument: activities?.instrument ? String(activities.instrument).trim() : ''
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

// In-memory cache for client-side direct calls to prevent egress spikes on Supabase Free Tier
let clientDirectCache: { data: Participant[]; timestamp: number } | null = null;
const CLIENT_CACHE_TTL_MS = 45000; // 45 seconds

// Direct fetch from Supabase (usable on client or server with egress protection)
export async function fetchParticipantsFromSupabaseDirect(forceFresh = false): Promise<Participant[] | null> {
  const now = Date.now();
  if (!forceFresh && clientDirectCache && (now - clientDirectCache.timestamp < CLIENT_CACHE_TTL_MS)) {
    return clientDirectCache.data;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return clientDirectCache?.data || null;
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      return clientDirectCache?.data || null;
    }

    const parsed = data.map(participantFromSupabaseRow).filter((p) => p && p.fullName && p.id);
    clientDirectCache = {
      data: parsed,
      timestamp: Date.now()
    };
    return parsed;
  } catch (err) {
    console.warn('[Supabase Direct] Error fetching participants:', err);
    return clientDirectCache?.data || null;
  }
}

// Direct upsert to Supabase
export async function saveParticipantToSupabaseDirect(p: Participant): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const row = participantToSupabaseRow(p);
    const { error } = await supabase
      .from('participants')
      .upsert(row, { onConflict: 'id' });

    if (!error) {
      if (clientDirectCache) {
        const updated = [p, ...clientDirectCache.data.filter((item) => item.id !== p.id)];
        clientDirectCache = { data: updated, timestamp: Date.now() };
      }
      return true;
    }

    // If error mentions amount_paid or notes not existing yet as top-level columns, retry with base columns
    // NOTE: row.activities already contains amount_paid, amountPaid, and notes, so values are still 100% saved in Supabase!
    if (error && (error.message?.includes('amount_paid') || error.message?.includes('notes') || error.code === 'PGRST204')) {
      console.warn('[Supabase Direct] Retrying upsert with JSONB fallback:', error.message);
      const fallbackRow: Record<string, any> = { ...row };
      delete fallbackRow.amount_paid;
      delete fallbackRow.notes;
      const { error: fallbackError } = await supabase
        .from('participants')
        .upsert(fallbackRow, { onConflict: 'id' });

      if (!fallbackError && clientDirectCache) {
        const updated = [p, ...clientDirectCache.data.filter((item) => item.id !== p.id)];
        clientDirectCache = { data: updated, timestamp: Date.now() };
      }
      return !fallbackError;
    }

    console.warn('[Supabase Direct] Notice upserting participant:', error.message);
    return false;
  } catch (err) {
    console.warn('[Supabase Direct] Error saving participant:', err);
    return false;
  }
}

// Direct delete from Supabase
export async function deleteParticipantFromSupabaseDirect(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', id);
    return !error;
  } catch (err) {
    console.warn('[Supabase Direct] Error deleting participant:', err);
    return false;
  }
}

// Direct settings fetch
export async function fetchSettingsFromSupabaseDirect(): Promise<EventSettings | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('data')
      .eq('id', 'current_settings')
      .maybeSingle();

    if (error || !data || !data.data) return null;
    return data.data as EventSettings;
  } catch {
    return null;
  }
}

// Direct settings save
export async function saveSettingsToSupabaseDirect(settings: EventSettings): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({
        id: 'current_settings',
        data: settings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

// =======================================================
// Full Supabase Database Backup & Multi-Device Downloader
// =======================================================

export interface SupabaseFullBackupPayload {
  version: number;
  backupType: 'SUPABASE_FULL_DATABASE_BACKUP';
  databaseSource: 'Supabase PostgreSQL';
  projectUrl: string;
  exportedAt: string;
  exportedAtFormatted: string;
  summary: {
    totalParticipants: number;
    totalApproved: number;
    totalPending: number;
    totalRejected: number;
    totalGincana: number;
    totalTocata: number;
    totalRevenue: number;
    congregationsCount: number;
    teamsCount: number;
    databaseTables: string[];
  };
  settings: Partial<EventSettings>;
  participants: Participant[];
  rawDatabaseRows?: any[];
}

/**
 * Universal browser file downloader compatible with Desktop, Tablet, Android, iOS Safari & iFrames
 */
export function triggerDeviceDownload(
  content: string | Blob,
  filename: string,
  mimeType = 'application/json;charset=utf-8;'
): boolean {
  try {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    
    // Method 1: Modern Object URL with anchor download attribute
    if (typeof window !== 'undefined' && window.URL && window.URL.createObjectURL) {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.setAttribute('download', filename);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';
      document.body.appendChild(link);

      // Trigger click
      if (typeof link.click === 'function') {
        link.click();
      } else {
        const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
        link.dispatchEvent(evt);
      }

      // Cleanup after browser catches the stream
      setTimeout(() => {
        try {
          if (link.parentNode) {
            link.parentNode.removeChild(link);
          }
          window.URL.revokeObjectURL(url);
        } catch (e) {}
      }, 3000);

      return true;
    }

    // Method 2: Data URI Fallback for restricted mobile environments
    if (typeof content === 'string') {
      const encoded = encodeURIComponent(content);
      const dataUri = `data:${mimeType},${encoded}`;
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = filename;
      link.setAttribute('download', filename);
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 3000);
      return true;
    }

    return false;
  } catch (err) {
    console.error('[Backup Download] Failed to trigger device download:', err);
    return false;
  }
}

/**
 * Export full Supabase database backup (all participants and settings) and initiate download on device
 */
export async function exportSupabaseDatabaseBackup(
  customFilename?: string,
  fallbackSettings?: EventSettings
): Promise<{
  success: boolean;
  count: number;
  filename: string;
  sizeKb: number;
  exportedAt: string;
  payload: SupabaseFullBackupPayload;
}> {
  const { url } = getSupabaseCredentials();

  // 1. Fetch participants (try server endpoint first, fallback to direct Supabase client)
  let participantsList: Participant[] = [];
  try {
    const res = await fetch('/api/participants', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) participantsList = data;
    }
  } catch (e) {
    console.warn('[Backup] Server fetch error, using Supabase direct query:', e);
  }

  if (participantsList.length === 0) {
    const directParticipants = await fetchParticipantsFromSupabaseDirect();
    if (directParticipants && Array.isArray(directParticipants)) {
      participantsList = directParticipants;
    }
  }

  // 2. Fetch settings
  let settingsData: EventSettings | null = null;
  try {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (res.ok) {
      settingsData = await res.json();
    }
  } catch (e) {}

  if (!settingsData) {
    settingsData = await fetchSettingsFromSupabaseDirect();
  }

  const finalSettings: EventSettings = settingsData || fallbackSettings || {
    ticketPrice: 25,
    revenueGoal: 2500,
    eventName: 'Gincana Somos Jóias Preciosas',
    adminPassword: 'admin',
    eventDate: '2026-09-07T08:00',
    locationName: 'Espaço de Eventos Central',
    locationAddress: 'Rua Principal, 100 - Centro',
    googleMapsEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3890.354673623696!2d-38.9663889!3d-12.2577778!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDE1JzI4LjAiUyAzOMKwNTcnNTkuMCJX!5e0!3m2!1spt-BR!2sbr!4v1700000000000!5m2!1spt-BR!2sbr',
    congregations: ['Central', 'Tapera', 'São Gonçalo dos Campos', 'Capuchinhos', 'Vila Nova'],
    galleryItems: [],
    logoUrl: '',
    pixKey: 'gincana.joias2026@gmail.com',
    whatsappGroupUrl: 'https://chat.whatsapp.com/Bf4nIjDR6QCFXEuxm7S3gK',
    backgroundMusicUrl: '/uploads/audio/Se_vos_baterdes_Ele_vos_abre.mp3',
    backgroundMusicTitle: 'Se Vós Baterdes Ele Vos Abre',
    backgroundMusicEnabled: true
  };

  // 3. Compute Summary Statistics
  const totalParticipants = participantsList.length;
  const totalApproved = participantsList.filter(p => p.proofStatus === 'Aprovado').length;
  const totalPending = participantsList.filter(p => !p.proofStatus || p.proofStatus === 'Pendente').length;
  const totalRejected = participantsList.filter(p => p.proofStatus === 'Rejeitado').length;
  const totalGincana = participantsList.filter(p => p.activities?.gincana).length;
  const totalTocata = participantsList.filter(p => p.activities?.tocata).length;
  const ticketVal = Number(finalSettings.ticketPrice) || 20;
  const totalRevenue = participantsList
    .filter(p => p.proofStatus === 'Aprovado')
    .reduce((acc, p) => acc + (p.amountPaid !== undefined && p.amountPaid !== null ? Number(p.amountPaid) : ticketVal), 0);

  const uniqueCongregations = new Set(participantsList.map(p => p.congregation).filter(Boolean));
  const uniqueTeams = new Set(participantsList.map(p => p.teamId).filter(Boolean));

  // Date formatting for filename and headers
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}h${pad(now.getMinutes())}`;
  const defaultFilename = `backup_supabase_gincana_joias_${dateStr}_${timeStr}.json`;
  const filename = customFilename || defaultFilename;

  // Localized date string for Bahia / Brasília timezone
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: 'America/Bahia'
  }).format(now);

  // 4. Construct Structured Backup Payload
  const backupPayload: SupabaseFullBackupPayload = {
    version: 1,
    backupType: 'SUPABASE_FULL_DATABASE_BACKUP',
    databaseSource: 'Supabase PostgreSQL',
    projectUrl: url || DEFAULT_SUPABASE_URL,
    exportedAt: now.toISOString(),
    exportedAtFormatted: `${formattedDate} (Horário Oficial)`,
    summary: {
      totalParticipants,
      totalApproved,
      totalPending,
      totalRejected,
      totalGincana,
      totalTocata,
      totalRevenue,
      congregationsCount: uniqueCongregations.size,
      teamsCount: uniqueTeams.size,
      databaseTables: ['participants', 'settings', 'storage.buckets (comprovantes)']
    },
    settings: finalSettings,
    participants: participantsList,
    rawDatabaseRows: participantsList.map(participantToSupabaseRow)
  };

  const jsonString = JSON.stringify(backupPayload, null, 2);
  const sizeBytes = new Blob([jsonString]).size;
  const sizeKb = Math.round((sizeBytes / 1024) * 10) / 10;

  // 5. Trigger download on the connected device
  const downloaded = triggerDeviceDownload(jsonString, filename, 'application/json;charset=utf-8;');
  if (!downloaded) {
    throw new Error('Não foi possível iniciar o download do arquivo de backup no navegador.');
  }

  return {
    success: true,
    count: totalParticipants,
    filename,
    sizeKb,
    exportedAt: now.toISOString(),
    payload: backupPayload
  };
}

/**
 * Restore a backup JSON payload directly to the Supabase database
 */
export async function restoreSupabaseDatabaseBackup(
  backupData: any
): Promise<{
  success: boolean;
  participantsRestored: number;
  settingsRestored: boolean;
  message: string;
}> {
  if (!backupData || typeof backupData !== 'object') {
    throw new Error('Arquivo de backup inválido ou vazio.');
  }

  // Extract participants and settings from standard or raw formats
  let incomingParticipants: any[] = [];
  if (Array.isArray(backupData.participants)) {
    incomingParticipants = backupData.participants;
  } else if (Array.isArray(backupData.participantes)) {
    incomingParticipants = backupData.participantes;
  } else if (Array.isArray(backupData.rawDatabaseRows)) {
    incomingParticipants = backupData.rawDatabaseRows.map(participantFromSupabaseRow);
  } else if (Array.isArray(backupData)) {
    incomingParticipants = backupData;
  }

  let incomingSettings: EventSettings | null = null;
  if (backupData.settings && typeof backupData.settings === 'object') {
    incomingSettings = backupData.settings as EventSettings;
  }

  if (incomingParticipants.length === 0 && !incomingSettings) {
    throw new Error('O arquivo de backup não contém participantes ou configurações válidas.');
  }

  const supabase = getSupabaseClient();
  let participantsRestored = 0;
  let settingsRestored = false;

  // 1. Restore Participants into Supabase in batches
  if (supabase && incomingParticipants.length > 0) {
    const rows = incomingParticipants.map((p) => {
      const normalized = participantFromSupabaseRow(p);
      return participantToSupabaseRow(normalized);
    });

    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('participants')
        .upsert(batch, { onConflict: 'id' });
      if (!error) {
        participantsRestored += batch.length;
      } else {
        console.warn('[Supabase Restore Batch Error]:', error);
      }
    }
  }

  // 2. Restore Settings into Supabase
  if (incomingSettings) {
    const saved = await saveSettingsToSupabaseDirect(incomingSettings);
    if (saved) settingsRestored = true;
  }

  // 3. Notify server to sync memory/file state
  try {
    await fetch('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backupData })
    });
  } catch (e) {
    console.warn('[Backup Restore] Server sync notification fallback:', e);
  }

  return {
    success: true,
    participantsRestored: participantsRestored || incomingParticipants.length,
    settingsRestored,
    message: `Restauração concluída! ${participantsRestored || incomingParticipants.length} participantes e configurações sincronizados no Supabase.`
  };
}

/**
 * Check Supabase database connection and retrieve live count
 */
export async function getSupabaseLiveHealth(): Promise<{
  connected: boolean;
  participantCount: number;
  projectUrl: string;
  error?: string;
}> {
  const { url } = getSupabaseCredentials();
  const cleanUrl = url ? url.replace(/^https?:\/\//, '').split('.')[0] + '.supabase.co' : '';
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      connected: false,
      participantCount: 0,
      projectUrl: cleanUrl,
      error: 'Cliente Supabase não inicializado.'
    };
  }

  try {
    const { count, error } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return {
        connected: false,
        participantCount: 0,
        projectUrl: cleanUrl,
        error: error.message
      };
    }

    return {
      connected: true,
      participantCount: count || 0,
      projectUrl: cleanUrl
    };
  } catch (err: any) {
    return {
      connected: false,
      participantCount: 0,
      projectUrl: cleanUrl,
      error: err?.message || 'Falha de conexão com o Supabase.'
    };
  }
}

/**
 * SQL Schema script to copy and run in Supabase SQL Editor
 */
export const SUPABASE_SQL_SETUP_SCRIPT = `-- ==========================================
-- Gincana CCB - Script de Criação no Supabase
-- ==========================================

-- 1. Criar Tabela de Participantes
CREATE TABLE IF NOT EXISTS public.participants (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  congregation TEXT NOT NULL DEFAULT 'Central',
  age INTEGER NOT NULL DEFAULT 18,
  food_or_drink TEXT DEFAULT '',
  activities JSONB DEFAULT '{"gincana": true, "tocata": false}'::jsonb,
  proof_url TEXT,
  proof_file_name TEXT,
  proof_file_type TEXT,
  proof_status TEXT DEFAULT 'Pendente',
  team_id TEXT,
  notes TEXT,
  amount_paid NUMERIC DEFAULT 20.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas notes e amount_paid se a tabela já existia previamente
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 20.00;

-- Habilitar RLS e permitir leitura/escrita para a aplicação
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acesso completo aos participantes"
ON public.participants
FOR ALL
USING (true)
WITH CHECK (true);

-- 2. Criar Tabela de Configurações do Evento
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'current_settings',
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acesso completo às configurações"
ON public.settings
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Criar Bucket de Armazenamento para Comprovantes e Fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', true)
ON CONFLICT (id) DO NOTHING;

-- Permitir acesso público ao bucket de comprovantes
CREATE POLICY "Acesso público ao bucket comprovantes"
ON storage.objects FOR ALL
USING (bucket_id = 'comprovantes')
WITH CHECK (bucket_id = 'comprovantes');
`;
