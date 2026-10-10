import { Postgres, migrate } from '../src/db/database.js';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const db = new Postgres(process.env.DATABASE_URL);
try { await migrate(db); console.log('Migrations applied'); } finally { await db.close(); }
