export const PERMISSIONS = [
    'messages:send',
    'session:read',
    'session:write',
    'webhooks:read',
    'webhooks:write',
    'keys:read',
    'keys:write',
    'logs:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isValidPermission(p: string): p is Permission {
    return (PERMISSIONS as readonly string[]).includes(p);
}

export function hasPermission(
    granted: string[],
    required: Permission,
): boolean {
    if (granted.includes('full')) return true;
    return granted.includes(required);
}

export function validatePermissions(permissions: string[]): permissions is Permission[] {
    return permissions.every(
        (p) => p === 'full' || isValidPermission(p),
    );
}
