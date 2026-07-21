ALTER TABLE servers ADD COLUMN remote_id TEXT NOT NULL DEFAULT '';

UPDATE servers SET remote_id = id WHERE remote_id = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_servers_provider_remote_id
  ON servers(provider, remote_id);
