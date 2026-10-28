CREATE UNIQUE INDEX IF NOT EXISTS "coc_requests_installation_id_unique" ON "coc_requests" ("installation_id") WHERE "installation_id" IS NOT NULL;
