DO
$do$
BEGIN
    IF to_regtype('_pending_user_modifications_field') IS NULL THEN
        ALTER TYPE _tokentype ADD VALUE 'user_modification' AFTER 'user_verification';
        CREATE TYPE _pending_user_modifications_field AS ENUM ( 'email', 'password');
        CREATE TABLE IF NOT EXISTS pending_user_modifications (
            id SERIAL PRIMARY KEY,
            token_id INTEGER NULL REFERENCES tokens(id) ON UPDATE CASCADE ON DELETE CASCADE,
            field _pending_user_modifications_field,
            value VARCHAR(255) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            committed_at TIMESTAMP NULL
        );
        -- syncing max length of email with password to allow for dynamic input in pending modifications table
        -- we allow ourselves to do that because we have no users yet
        ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255);
    END IF;
END
$do$


