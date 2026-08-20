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

// Convert Participant to Supabase Row
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
  const now = new Date().toISOString();
  const createdAt = p.createdAt || (p as any).created_at || now;
  const updatedAt = p.updatedAt || (p as any).updated_at || now;

  let activities = p.activities;
  if (typeof activities === 'string') {
    try {
      activities = JSON.parse(activities);
    } catch {
      activities = { gincana: true, tocata: false };
    }
  } else if (!activities || typeof activities !== 'object') {
    activities = { gincana: true, tocata: false };
  }

  return {
    id: String(p.id).trim(),
    full_name: fullName,
    fullName: fullName,
    firstName: firstName,
    congregation: String(p.congregation || 'Central').trim(),
    age: Number(p.age) || 18,
    food_or_drink: foodOrDrink,
    foodOrDrink: foodOrDrink,
    activities: {
      gincana: Boolean(activities?.gincana),
      tocata: Boolean(activities?.tocata),
      instrument: activities?.instrument ? String(activities.instrument).trim() : ''
    },
    proof_url: proofUrl,
    proofUrl: proofUrl,
    proof_file_name: proofFileName,
    proofFileName: proofFileName,
    proof_file_type: proofFileType,
    proofFileType: proofFileType,
    proof_status: proofStatus,
    proofStatus: proofStatus,
    team_id: teamId,
    teamId: teamId,
    created_at: createdAt,
    createdAt: createdAt,
    updated_at: updatedAt,
    updatedAt: updatedAt
  };
}

// Convert Supabase Row to Participant
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
  const notes = row.notes ? String(row.notes).trim() : undefined;
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
    createdAt,
    updatedAt
  };
}

// Direct fetch from Supabase (usable on client or server)
export async function fetchParticipantsFromSupabaseDirect(): Promise<Participant[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      return null;
    }

    return data.map(participantFromSupabaseRow).filter((p) => p && p.fullName && p.id);
  } catch (err) {
    console.warn('[Supabase Direct] Error fetching participants:', err);
    return null;
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
    return !error;
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
