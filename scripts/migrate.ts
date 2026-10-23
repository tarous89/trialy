import {provisionRuntime} from './provision-runtime.js';
import { Postgres, migrate } from '../src/db/database.js';
const migrationUrl=process.env.MIGRATION_DATABASE_URL??process.env.DATABASE_URL;
if (!migrationUrl) throw new Error('MIGRATION_DATABASE_URL or DATABASE_URL required');
const db = new Postgres(migrationUrl);
try { await migrate(db); await provisionRuntime(db,process.env); console.log('Migrations applied'); } finally { await db.close(); }
