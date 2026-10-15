-- Bancos SEGREGADOS: cada microservico tem o seu.
-- Na nuvem (Neon, Supabase, RDS) basta trocar a DATABASE_URL de cada servico.
CREATE DATABASE auth_db;
CREATE DATABASE estoque_db;
