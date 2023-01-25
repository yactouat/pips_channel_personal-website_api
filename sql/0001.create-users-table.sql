CREATE TYPE _socialHandleType AS ENUM ( 'GitHub', 'LinkedIn');
CREATE TABLE IF NOT EXISTS users (
	id SERIAL PRIMARY KEY,
	email TEXT UNIQUE NOT NULL,
	socialHandle VARCHAR(39) UNIQUE NOT NULL,
	socialHandleType _socialHandleType NOT NULL,
	password VARCHAR(255) NOT NULL
);