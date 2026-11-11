-- Declaracio d'us en el primer acces: "teacher" o "student".
-- IMPORTANT: es una preferencia d'UX (quin panell es proposa per defecte),
-- MAI un permis. El rol real (users.role) nomes el pot atorgar la
-- coordinacio del centre des de /school; aixi ningu es pot fer docent d'un
-- centre nomes dient-ho.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupIntent" TEXT
  CHECK ("signupIntent" IN ('teacher', 'student'));
