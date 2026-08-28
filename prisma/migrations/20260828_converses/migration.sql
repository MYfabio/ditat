-- Converses orals guiades. La veu no es desa mai: nomes transcripcio i
-- valoracio, que es el que el docent repassa.
CREATE TABLE IF NOT EXISTS "converses" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "transcripcions" JSONB NOT NULL,
    "avaluacio" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "converses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "converses_studentId_fkey" FOREIGN KEY ("studentId")
      REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "converses_studentId_createdAt_idx"
  ON "converses"("studentId", "createdAt");
