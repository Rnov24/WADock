import { createHmac } from 'node:crypto';
import { listActiveWebhooks, type WebhookRow } from '../db/queries/webhooks.js';
import { insertDeliveryLog } from '../db/queries/logs.js';
import type { GatewayEvent } from '../events/schemas.js';
import type { Config } from '../config.js';

export function createDispatcher(config: Config) {
    async function dispatch(event: GatewayEvent): Promise<void> {
        const webhooks = listActiveWebhooks();

        const matching = webhooks.filter((wh) => {
            const subscribedEvents = JSON.parse(wh.events) as string[];
            return subscribedEvents.includes('*') || subscribedEvents.includes(event.type);
        });

        await Promise.allSettled(
            matching.map((wh) => deliverWithRetry(wh, event, config)),
        );
    }

    return { dispatch };
}

async function deliverWithRetry(
    webhook: WebhookRow,
    event: GatewayEvent,
    config: Config,
): Promise<void> {
    const delays = [0, 1_000, 5_000, 30_000];
    const maxAttempts = Math.min(config.webhookMaxRetries + 1, delays.length);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (attempt > 1) {
            await sleep(delays[attempt - 1] ?? 30_000);
        }

        try {
            const body = JSON.stringify(event);
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-WADock-Event': event.type,
            };

            if (webhook.secret) {
                const signature = createHmac('sha256', webhook.secret)
                    .update(body)
                    .digest('hex');
                headers['X-WADock-Signature'] = signature;
            }

            const controller = new AbortController();
            const timeout = setTimeout(
                () => controller.abort(),
                config.webhookTimeoutMs,
            );

            const response = await fetch(webhook.url, {
                method: 'POST',
                headers,
                body,
                signal: controller.signal,
            });

            clearTimeout(timeout);

            insertDeliveryLog({
                webhook_id: webhook.id,
                event_type: event.type,
                status_code: response.status,
                success: response.ok ? 1 : 0,
                attempt,
                error: response.ok ? null : `HTTP ${response.status}`,
                timestamp: Date.now(),
            });

            if (response.ok) return;
        } catch (err) {
            insertDeliveryLog({
                webhook_id: webhook.id,
                event_type: event.type,
                status_code: null,
                success: 0,
                attempt,
                error: err instanceof Error ? err.message : String(err),
                timestamp: Date.now(),
            });
        }
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
