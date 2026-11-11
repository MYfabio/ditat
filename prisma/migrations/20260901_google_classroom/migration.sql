-- Google Classroom, NOMES LECTURA (estandard aulaia).
--
-- Un grup classe pot venir d'un curs de Classroom: googleClassroomId es clau
-- unica, aixi que tornar a importar el mateix curs actualitza el grup i mai
-- en crea un de duplicat.
ALTER TABLE "ClassGroup" ADD COLUMN IF NOT EXISTS "googleClassroomId" TEXT;
ALTER TABLE "ClassGroup" ADD COLUMN IF NOT EXISTS "googleCourseName" TEXT;
ALTER TABLE "ClassGroup" ADD COLUMN IF NOT EXISTS "classroomSyncedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "ClassGroup_googleClassroomId_key"
  ON "ClassGroup"("googleClassroomId");

-- Connexio del docent amb Classroom: separada del compte d'acces (entrar a
-- dictats.cat no dona mai permis sobre Classroom) i amb els tokens xifrats en
-- repos. Si l'usuari s'esborra, la connexio marxa amb ell.
CREATE TABLE IF NOT EXISTS "GoogleConnection" (
    "userId" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleConnection_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "GoogleConnection_userId_fkey" FOREIGN KEY ("userId")
      REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
