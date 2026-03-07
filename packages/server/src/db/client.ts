import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { join } from 'node:path';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';

let db: SqlJsDatabase;
let dbPath: string;

export function getDb(): SqlJsDatabase {
    if (!db) {
        throw new Error('Database not initialized. Call initDb() first.');
    }
    return db;
}

export async function initDb(dataDir: string): Promise<SqlJsDatabase> {
    mkdirSync(dataDir, { recursive: true });
    dbPath = join(dataDir, 'wadock.db');

    const SQL = await initSqlJs();

    if (existsSync(dbPath)) {
        const fileBuffer = readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA foreign_keys = ON;');

    runMigrations(db);
    persist();

    return db;
}

function runMigrations(database: SqlJsDatabase): void {
    database.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id   INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

    const migrationsDir = new URL('./migrations', import.meta.url).pathname
        // Fix Windows paths: strip leading slash from /C:/...
        .replace(/^\/([A-Za-z]:)/, '$1');

    let files: string[];
    try {
        files = readdirSync(migrationsDir)
            .filter((f) => f.endsWith('.sql'))
            .sort();
    } catch {
        return;
    }

    const appliedStmt = database.prepare('SELECT name FROM _migrations');
    const applied = new Set<string>();
    while (appliedStmt.step()) {
        const row = appliedStmt.getAsObject();
        applied.add(row.name as string);
    }
    appliedStmt.free();

    for (const file of files) {
        if (applied.has(file)) continue;

        const sql = readFileSync(join(migrationsDir, file), 'utf-8');
        database.run(sql);
        database.run(
            'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)',
            [file, Date.now()],
        );
    }
}

/** Persist the database to disk */
export function persist(): void {
    if (db && dbPath) {
        const data = db.export();
        const buffer = Buffer.from(data);
        writeFileSync(dbPath, buffer);
    }
}

export function closeDb(): void {
    if (db) {
        persist();
        db.close();
    }
}

// --- Helper utilities for query execution ---

/**
 * Run a query that returns rows (SELECT).
 * Returns an array of plain objects.
 */
export function queryAll<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
): T[] {
    const stmt = db.prepare(sql);
    stmt.bind(params as (string | number | null | Uint8Array)[]);
    const results: T[] = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
}

/**
 * Run a query that returns a single row.
 */
export function queryOne<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
): T | undefined {
    const results = queryAll<T>(sql, params);
    return results[0];
}

/**
 * Run a mutation query (INSERT, UPDATE, DELETE).
 * Returns the number of rows changed.
 */
export function execute(sql: string, params: unknown[] = []): number {
    db.run(sql, params as (string | number | null | Uint8Array)[]);
    const changes = db.getRowsModified();
    persist(); // Auto-persist after mutations
    return changes;
}
