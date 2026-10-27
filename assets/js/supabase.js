/**
 * Juswa Portfolio — Supabase Realtime Integration
 * Manages Supabase client, presence tracking, broadcast channels for 2D room,
 * and database sync for the community live chat.
 * 
 * Includes an automated offline/demo fallback mode so all UI, movement,
 * and interactions work immediately before configuring Supabase credentials.
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CONFIGURATION
// Replace these with your actual Supabase project URL and anon public key:
// ============================================================================
export const SUPABASE_CONFIG = {
  url: import.meta.env?.VITE_SUPABASE_URL || 'https://stkrbcoadzsstkwtwzii.supabase.co',
  anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0a3JiY29hZHpzc3Rrd3R3emlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTc1MjUsImV4cCI6MjEwODY5MzUyNX0.P6pkrhemfgiDBIKtQnKAGNVRZ8Y7LitUIckZgOHzqdo'
};

/**
 * Checks if real credentials have been provided
 */
export function isSupabaseConfigured() {
  const url = SUPABASE_CONFIG.url;
  const key = SUPABASE_CONFIG.anonKey;
  return Boolean(
    url && 
    key && 
    !url.includes('YOUR_PROJECT_ID') && 
    !key.includes('YOUR_SUPABASE_ANON_KEY')
  );
}

let supabaseClient = null;

export function getSupabase() {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 15
          }
        }
      });
    } catch (err) {
      console.warn('Could not initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseClient;
}

/**
 * SQL Schema needed for Supabase.
 * Provide this to the user for 1-click execution in Supabase SQL Editor.
 */
export const SUPABASE_SQL_SCHEMA = `
-- ==========================================================
-- JUSWA COMMUNITY LIVE CHAT & PRESENCE SCHEMA
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ==========================================================

create table if not exists public.community_messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  nickname text not null,
  location text default 'Earth 🌍',
  device text default '💻',
  message text not null,
  avatar_id text default 'sketch-1'
);

-- Index for speedy ordering
create index if not exists idx_community_messages_created_at 
  on public.community_messages (created_at desc);

-- Enable Row Level Security (RLS)
alter table public.community_messages enable row level security;

-- Allow public read access to messages
create policy "Public can view messages" 
  on public.community_messages 
  for select 
  using (true);

-- Allow public to send messages (with simple character length validation)
create policy "Public can insert messages" 
  on public.community_messages 
  for insert 
  with check (char_length(message) <= 300 and char_length(nickname) <= 30);

-- Enable Realtime broadcasting on community_messages table
alter publication supabase_realtime add table public.community_messages;
`;
