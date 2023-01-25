DO
$do$
BEGIN
    IF NOT EXISTS(
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users' and column_name='verified'
    ) THEN
        ALTER TABLE users ADD COLUMN verified BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END
$do$
