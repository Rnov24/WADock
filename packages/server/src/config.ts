import { z } from 'zod';

const configSchema = z.object({
    port: z.coerce.number().default(3000),
    adminPassword: z.string().min(1, 'ADMIN_PASSWORD is required'),
    dataDir: z.string().default('/data'),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    webhookTimeoutMs: z.coerce.number().default(10_000),
    webhookMaxRetries: z.coerce.number().default(3),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
    return configSchema.parse({
        port: process.env.PORT,
        adminPassword: process.env.ADMIN_PASSWORD,
        dataDir: process.env.DATA_DIR,
        logLevel: process.env.LOG_LEVEL,
        webhookTimeoutMs: process.env.WEBHOOK_TIMEOUT_MS,
        webhookMaxRetries: process.env.WEBHOOK_MAX_RETRIES,
    });
}
