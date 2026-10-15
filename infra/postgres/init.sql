-- Bancos SEGREGADOS:
--   * usuarios  -> Firestore (Firebase, na nuvem)  -> usado pelo auth-service
--   * estoque   -> PostgreSQL (este banco)         -> usado pelo estoque-service e pelo worker
-- Na nuvem (Neon, Supabase, RDS) basta trocar a DATABASE_URL do estoque.
CREATE DATABASE estoque_db;
