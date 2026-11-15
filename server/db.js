import { neon } from '@neondatabase/serverless';
import defaults from '../site-defaults.js';

let client;
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
  client ??= neon(process.env.DATABASE_URL);
  return client;
}

export async function initialize(sql = db()) {
  await sql.transaction([
    sql`CREATE TABLE IF NOT EXISTS site_content (
      section text PRIMARY KEY, data jsonb NOT NULL, revision integer NOT NULL DEFAULT 1
    )`,
    sql`CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash text PRIMARY KEY, expires_at timestamptz NOT NULL
    )`,
    sql`CREATE TABLE IF NOT EXISTS rate_limits (
      rate_key text PRIMARY KEY, window_start timestamptz NOT NULL, count integer NOT NULL
    )`,
    sql`CREATE TABLE IF NOT EXISTS leads (
      id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL, phone text NOT NULL,
      company text NOT NULL, needs text NOT NULL, products text[] NOT NULL, plan_name text,
      status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
      email_status text NOT NULL CHECK (email_status IN ('pending','unconfigured','failed','sent')),
      email_id text, created_at timestamptz NOT NULL DEFAULT now(),
      status_updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    sql`CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at DESC, id DESC)`,
    ...Object.entries(defaults).map(([section, data]) =>
      sql`INSERT INTO site_content (section, data) VALUES (${section}, ${JSON.stringify(data)}::jsonb)
          ON CONFLICT (section) DO NOTHING`)
  ]);
}

export async function allContent() {
  const rows = await db()`SELECT section, data, revision FROM site_content WHERE section = ANY(${Object.keys(defaults)}::text[])`;
  if (!Object.keys(defaults).every(section => rows.some(row => row.section === section))) {
    throw new Error('Run npm run db:init');
  }
  return Object.fromEntries(rows.map(row => [row.section, row]));
}
