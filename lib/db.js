// SQLite connection + schema. The database file is created and seeded on first use,
// so `npm run dev` / a fresh deploy works with zero setup.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { seed } from './seed.js';

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS cities (id INTEGER PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS showrooms (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, city_id INTEGER NOT NULL REFERENCES cities(id),
  kind TEXT NOT NULL CHECK (kind IN ('showroom','yard')), address TEXT NOT NULL, phone TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, tagline_en TEXT NOT NULL, tagline_hi TEXT NOT NULL,
  body TEXT NOT NULL CHECK (body IN ('hatch','sedan','suv')), seats INTEGER NOT NULL,
  about_en TEXT NOT NULL, about_hi TEXT NOT NULL, colours TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY, model_id INTEGER NOT NULL REFERENCES models(id), name TEXT NOT NULL,
  fuel TEXT NOT NULL, transmission TEXT NOT NULL, engine TEXT NOT NULL, power TEXT NOT NULL, mileage TEXT NOT NULL,
  features TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS price_rules (
  id INTEGER PRIMARY KEY, variant_id INTEGER NOT NULL REFERENCES variants(id), city_id INTEGER NOT NULL REFERENCES cities(id),
  ex_showroom INTEGER NOT NULL CHECK (ex_showroom > 0), road_tax_pct REAL NOT NULL CHECK (road_tax_pct BETWEEN 0 AND 30),
  insurance INTEGER NOT NULL CHECK (insurance >= 0), registration INTEGER NOT NULL CHECK (registration >= 0),
  tcs_pct REAL NOT NULL DEFAULT 0 CHECK (tcs_pct BETWEEN 0 AND 10), accessories INTEGER NOT NULL DEFAULT 0 CHECK (accessories >= 0),
  valid_until TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by INTEGER, UNIQUE (variant_id, city_id));
CREATE TABLE IF NOT EXISTS used_cars (
  id INTEGER PRIMARY KEY, stock_id TEXT UNIQUE NOT NULL, slug TEXT UNIQUE NOT NULL, model_id INTEGER NOT NULL REFERENCES models(id),
  variant TEXT NOT NULL, fuel TEXT NOT NULL, transmission TEXT NOT NULL, year INTEGER NOT NULL, km INTEGER NOT NULL,
  owners INTEGER NOT NULL, price INTEGER NOT NULL CHECK (price > 0), colour TEXT NOT NULL, reg_no TEXT NOT NULL,
  location_id INTEGER NOT NULL REFERENCES showrooms(id),
  status TEXT NOT NULL CHECK (status IN ('available','booked','sold','hidden')), inspection TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS past_sales (
  id INTEGER PRIMARY KEY, model_id INTEGER NOT NULL REFERENCES models(id), variant TEXT NOT NULL, fuel TEXT NOT NULL,
  year INTEGER NOT NULL, km INTEGER NOT NULL, sold_price INTEGER NOT NULL, sold_on TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('consultant','used_manager','admin')), showroom_id INTEGER REFERENCES showrooms(id));
CREATE TABLE IF NOT EXISTS consultant_models (user_id INTEGER NOT NULL REFERENCES users(id), model_id INTEGER NOT NULL REFERENCES models(id), PRIMARY KEY (user_id, model_id));
CREATE TABLE IF NOT EXISTS demo_cars (
  id INTEGER PRIMARY KEY, showroom_id INTEGER NOT NULL REFERENCES showrooms(id), variant_id INTEGER NOT NULL REFERENCES variants(id),
  colour TEXT NOT NULL, label TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, source TEXT NOT NULL,
  showroom_id INTEGER REFERENCES showrooms(id), city_id INTEGER REFERENCES cities(id),
  model_id INTEGER REFERENCES models(id), variant_id INTEGER REFERENCES variants(id), used_car_id INTEGER REFERENCES used_cars(id),
  message TEXT NOT NULL DEFAULT '', trade_in TEXT, lang TEXT NOT NULL DEFAULT 'en',
  consent INTEGER NOT NULL, consent_source TEXT NOT NULL, consent_at TEXT NOT NULL, opted_out INTEGER NOT NULL DEFAULT 0, opt_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','test_drive','negotiation','won','lost')),
  assigned_to INTEGER REFERENCES users(id), assign_rule TEXT,
  created_at TEXT NOT NULL, sla_due_at TEXT NOT NULL, first_response_at TEXT, ai TEXT);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE TABLE IF NOT EXISTS test_drives (
  id INTEGER PRIMARY KEY, token TEXT UNIQUE NOT NULL, lead_id INTEGER NOT NULL REFERENCES leads(id),
  demo_car_id INTEGER NOT NULL REFERENCES demo_cars(id), slot_start TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')), created_at TEXT NOT NULL);
-- one confirmed booking per demo car per slot: the database, not app code, prevents double-booking
CREATE UNIQUE INDEX IF NOT EXISTS uq_slot ON test_drives(demo_car_id, slot_start) WHERE status = 'confirmed';
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY, lead_id INTEGER NOT NULL REFERENCES leads(id), channel TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('ack','reply')),
  body TEXT NOT NULL, sent_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS lead_events (
  id INTEGER PRIMARY KEY, lead_id INTEGER NOT NULL REFERENCES leads(id), type TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '',
  user_id INTEGER REFERENCES users(id), created_at TEXT NOT NULL);
`;

/** Open a database and ensure the schema exists (no seeding). */
export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const d = new Database(file);
  d.pragma('journal_mode = WAL');
  d.pragma('foreign_keys = ON');
  d.exec(SCHEMA);
  return d;
}

/** Process-wide connection; seeds demo data the first time the file is empty. */
export function db() {
  if (!globalThis.__brandxDb) {
    const file = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'dealer.db');
    const d = openDb(file);
    if (d.prepare('SELECT COUNT(*) AS c FROM users').get().c === 0) {
      seed(d);
    }
    globalThis.__brandxDb = d;
  }
  return globalThis.__brandxDb;
}
