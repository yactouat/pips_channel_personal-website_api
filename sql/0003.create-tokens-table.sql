DO
$do$
BEGIN
IF to_regtype('_tokentype') IS NULL THEN
	CREATE TYPE _tokentype AS ENUM ( 'user_authentication', 'user_verification');
	CREATE TABLE IF NOT EXISTS tokens (
		id SERIAL PRIMARY KEY,
		token TEXT UNIQUE NOT NULL,
        expired SMALLINT NOT NULL DEFAULT 0
	);
    CREATE TABLE IF NOT EXISTS tokens_users(
        token_id INTEGER NOT NULL REFERENCES tokens(id) ON UPDATE CASCADE ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
        type _tokentype NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT token_user_type_pkey PRIMARY KEY (token_id, user_id, type)
    );
END IF;
END
$do$

