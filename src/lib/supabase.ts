import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://huwcgdlarvmmjurysqar.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2NnZGxhcnZtbWp1cnlzcWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NDExOTAsImV4cCI6MjA5MTAxNzE5MH0.den6CkOntZz71ZILAEeilZoX0rhj1g-CxugJWg-pLBU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** Map admin URL type names to actual DB table names. */
export const TABLE_MAP: Record<string, string> = {
  lessons: 'lessons',
  articles: 'articles',
  entries: 'reference_entries',
  saints: 'saints',
  tracks: 'tracks',
  pillars: 'pillars',
}
