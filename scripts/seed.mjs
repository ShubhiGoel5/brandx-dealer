// Reset the demo database: `npm run seed`
import fs from 'node:fs';
import path from 'node:path';
import { openDb } from '../lib/db.js';
import { seed } from '../lib/seed.js';

const file = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'dealer.db');
for (const suffix of ['', '-wal', '-shm']) fs.rmSync(file + suffix, { force: true });
const d = openDb(file);
seed(d);
console.log(`Seeded ${file}:`, d.prepare('SELECT (SELECT COUNT(*) FROM models) models, (SELECT COUNT(*) FROM used_cars) used, (SELECT COUNT(*) FROM leads) leads, (SELECT COUNT(*) FROM users) users').get());
