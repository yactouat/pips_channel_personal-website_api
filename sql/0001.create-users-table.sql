DO
$do$
BEGIN
IF to_regtype('_socialhandletype') IS NULL THEN
	CREATE TYPE _socialhandletype AS ENUM ( 'GitHub', 'LinkedIn');
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		email TEXT UNIQUE NOT NULL,
		socialHandle VARCHAR(39) UNIQUE NOT NULL,
		socialHandleType _socialhandletype NOT NULL,
		password VARCHAR(255) NOT NULL
	);
END IF;
END
$do$

