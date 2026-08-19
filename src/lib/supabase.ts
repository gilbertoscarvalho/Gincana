import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Participant, EventSettings } from '../types';

// Environment variable resolution for client-side and server-side
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

/**
 * SQL Schema script to copy and run in Supabase SQL Editor
 */
export const SUPABASE_SQL_SETUP_SCRIPT = `-- ==========================================
-- Gincana CCB - Script de Criação no Supabase
-- ==========================================

-- 1. Criar Tabela de Participantes
CREATE TABLE IF NOT EXISTS public.participants (
  id TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  congregation TEXT NOT NULL DEFAULT 'Central',
  age INTEGER NOT NULL DEFAULT 18,
  "foodOrDrink" TEXT DEFAULT '',
  activities JSONB DEFAULT '{"gincana": true, "tocata": false}'::jsonb,
  "proofUrl" TEXT,
  "proofFileName" TEXT,
  "proofFileType" TEXT,
  "proofStatus" TEXT DEFAULT 'Pendente',
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
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
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
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
