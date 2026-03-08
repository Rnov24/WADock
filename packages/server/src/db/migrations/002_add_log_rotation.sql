-- Adds log rotation triggers to keep the database size small and bounded.
-- We keep only the latest 1000 logs for each table.

-- Trigger for message_logs
CREATE TRIGGER IF NOT EXISTS trg_limit_message_logs
AFTER INSERT ON message_logs
BEGIN
    DELETE FROM message_logs 
    WHERE id IN (
        SELECT id FROM message_logs 
        ORDER BY timestamp DESC 
        LIMIT -1 OFFSET 1000
    );
END;

-- Trigger for delivery_logs
CREATE TRIGGER IF NOT EXISTS trg_limit_delivery_logs
AFTER INSERT ON delivery_logs
BEGIN
    DELETE FROM delivery_logs 
    WHERE id IN (
        SELECT id FROM delivery_logs 
        ORDER BY timestamp DESC 
        LIMIT -1 OFFSET 1000
    );
END;
