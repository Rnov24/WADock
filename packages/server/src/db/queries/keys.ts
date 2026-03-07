import { queryAll, queryOne, execute } from '../client.js';
import { ulid } from 'ulid';

export interface ApiKeyRow {
    id: string;
    name: string;
    key_hash: string;
    permissions: string;
    created_at: number;
    last_used: number | null;
}

export function findKeyByHash(hash: string): ApiKeyRow | undefined {
    return queryOne<ApiKeyRow>(
        'SELECT * FROM api_keys WHERE key_hash = ?',
        [hash],
    );
}

export function listKeys(): Omit<ApiKeyRow, 'key_hash'>[] {
    return queryAll<Omit<ApiKeyRow, 'key_hash'>>(
        'SELECT id, name, permissions, created_at, last_used FROM api_keys ORDER BY created_at DESC',
    );
}

export function insertKey(name: string, keyHash: string, permissions: string[]): string {
    const id = ulid();
    execute(
        'INSERT INTO api_keys (id, name, key_hash, permissions, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, name, keyHash, JSON.stringify(permissions), Date.now()],
    );
    return id;
}

export function deleteKey(id: string): boolean {
    const changes = execute('DELETE FROM api_keys WHERE id = ?', [id]);
    return changes > 0;
}

export function touchKeyLastUsed(id: string): void {
    execute('UPDATE api_keys SET last_used = ? WHERE id = ?', [Date.now(), id]);
}
