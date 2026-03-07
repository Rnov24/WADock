import { createHash, randomBytes } from 'node:crypto';
import { insertKey, deleteKey, listKeys, findKeyByHash, touchKeyLastUsed } from '../db/queries/keys.js';

const KEY_PREFIX = 'wdk_';

export function generateRawKey(): string {
    return KEY_PREFIX + randomBytes(32).toString('base64url');
}

export function hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
}

export interface CreateKeyResult {
    id: string;
    rawKey: string;
}

export function createApiKey(name: string, permissions: string[]): CreateKeyResult {
    const rawKey = generateRawKey();
    const keyHash = hashKey(rawKey);
    const id = insertKey(name, keyHash, permissions);
    return { id, rawKey };
}

export function revokeApiKey(id: string): boolean {
    return deleteKey(id);
}

export function getAllKeys() {
    return listKeys().map((row) => ({
        id: row.id,
        name: row.name,
        permissions: JSON.parse(row.permissions) as string[],
        createdAt: row.created_at,
        lastUsed: row.last_used,
    }));
}

export function verifyApiKey(rawKey: string) {
    const hash = hashKey(rawKey);
    const row = findKeyByHash(hash);
    if (!row) return null;

    touchKeyLastUsed(row.id);

    return {
        id: row.id,
        name: row.name,
        permissions: JSON.parse(row.permissions) as string[],
    };
}
