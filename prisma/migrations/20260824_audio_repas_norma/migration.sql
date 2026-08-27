-- Locucio del repas d'una norma, generada un cop i reutilitzada sempre.
--
-- Nomes hi ha deu normes i no canvien mai, aixi que la primera vegada que algu
-- prem "Escoltar" es genera i ja no es torna a demanar. La clau es la regla i
-- la versio: "b-v:primaria" o "b-v:completa".
CREATE TABLE IF NOT EXISTS "rule_help_audio" (
    "clau" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_help_audio_pkey" PRIMARY KEY ("clau")
);
