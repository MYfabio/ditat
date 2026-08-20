# Qué se ha integrado y por qué — agosto de 2026

Documento de traspaso para quien siga el desarrollo. Va en castellano porque es
el idioma en que se decidió con el propietario; el código, los comentarios y los
commits siguen en catalán, como el resto del repositorio.

- **Rama de origen:** `claude/estas-en-dictat-4ke0e3`
- **Commit de fusión:** `47bf03a` (sobre `65be1df`)
- **Estado:** fusionado en `master` y desplegado en Railway
- **Manifiesto legible por máquina:** [`canvis-agost-2026.json`](./canvis-agost-2026.json)

El origen de los requisitos es la especificación
`especificacion_app_dictados_adaptativos.docx` v1.0, más peticiones directas del
propietario durante el desarrollo.

---

## Qué había antes

El ciclo funcionaba de punta a punta —se generaba un dictado, el alumno lo
entregaba por teclado o por foto, la IA lo corregía y se preparaba el
siguiente— pero con cuatro agujeros que lo dejaban lejos de ser un tutor
adaptativo:

1. **La foto no la leía nadie.** Se guardaba en `Submission.photoUrl` y ese
   campo no se usaba en ningún sitio del proyecto. El alumno veía una tabla de
   palabras; el docente ni siquiera la imagen.
2. **El perfil medía demasiado grueso.** Un dictado entero movía una sola
   regla. Quien acentúa bien las agudas y falla siempre las esdrújulas tiene un
   problema concreto, no «un problema de acentuación».
3. **Una lectura dudosa contaba como falta.** Si el OCR leía mal una letra, el
   alumno cargaba con el error. Es justo lo que una corrección no debe hacer.
4. **El docente no podía corregir a la IA.** Una clasificación equivocada se
   quedaba en el perfil y orientaba los siguientes dictados.

---

## 1. La corrección se dibuja sobre la foto

`src/lib/ai/ocr.ts` guarda ahora, además de la transcripción, **dónde cae cada
palabra y con qué confianza se leyó**. `src/lib/annotations.ts` convierte cada
error en una marca situada sobre la imagen, y
`src/components/dashboard/annotated-photo.tsx` las pinta.

| Marca | Cuándo |
|---|---|
| Subrayado con la forma correcta encima | La palabra está mal escrita |
| Tilde sobre la vocal que la lleva | Solo falla la acentuación |
| Gancho entre dos palabras | Falta una palabra |
| Trazo discontinuo y `?` | El OCR no lo leyó claro — no es una corrección |

**Por qué las coordenadas son relativas (0-1) y no píxeles:** así la capa de
marcas encaja sobre la foto se muestre al tamaño que se muestre, sin tener que
recordar las dimensiones originales. El SVG toma la proporción real de la
imagen al cargarla; si se dejara cuadrado y se estirara, la letra de las
correcciones saldría aplastada.

**Por qué la foto se sirve por `/api/submissions/[id]/photo`:** se guarda como
data URL dentro de la fila. El listado de entregas del docente cargaba la fila
entera, o sea todas las fotos de la clase, para mostrar nombres y puntuaciones.
Es el mismo motivo por el que la locución ya vivía en una tabla aparte. Solo
pueden verla el alumno y su docente.

## 2. El dominio se mide por subcompetencia

Tres piezas nuevas:

- **`src/lib/skill-taxonomy.ts`** — las 10 reglas se dividen en 35
  subcompetencias (`accentuacio.agudes`, `l-l.geminada`…). Versionada. La clave
  de la regla sola sigue siendo válida: es lo que ya había guardado y lo que
  elige el docente.
- **`src/lib/mastery.ts`** — cómo se calcula el dominio, aparte y versionado.
  Los intentos recientes pesan más que los viejos, porque interesa dónde está
  el alumno ahora y no dónde estaba: en alguien que va de 0,2 a 1,0, la media
  plana da 0,63 y ésta da 0,77. La confianza sube con evidencia repetida y baja
  con el tiempo. Todos los umbrales de la sección 9 de la spec están en
  `MASTERY_PARAMS`, para calibrarlos con datos reales sin tocar la lógica.
- **`StudentSkillState`** — la foto guardada y fechada de cada habilidad, con
  la versión de algoritmo y taxonomía con que se midió, para poder recalcular
  el día que cambien sin mezclar medidas viejas con nuevas.

**Un ajuste que salió de probarlo:** con el peso inicial de la confianza, una
habilidad vista una sola vez al 30 % le ganaba a otra medida ocho veces al
55 %. O sea que un mal día reorientaba el curso del alumno. Con
`confidenceWeight` a 0,75 gana la medida sólida, y en cuanto la floja acumula
evidencia pasa al frente.

## 3. Cada error se clasifica, y lo dudoso no penaliza

`src/lib/error-classification.ts` determina de cada diferencia **qué tipo es**
(omisión, adición, sustitución, puntuación, mayúsculas) y **a qué
subcompetencia pertenece**.

**Por qué es código y no una pregunta al modelo:** el perfil del alumno se
construye encima de esto. Con la misma entrada tiene que dar lo mismo hoy y
dentro de seis meses. Un modelo que un día diga «accentuació» y otro
«ortografia» para la misma palabra haría que el dominio de un alumno dependiera
de cuándo se corrigió. Va versionado (`CLASSIFIER_VERSION`) junto a la
corrección, para poder reclasificar más adelante sin mezclar.

Cuando una palabra no encaja en ninguna regla conocida **no se atribuye a
nada**. `carro→caro` es R/RR, una regla real del catalán que esta taxonomía no
cubre: se deja sin habilidad antes que mover un dominio que no toca.

**Confianza del OCR:** por debajo de 0,75 el error se muestra y se explica pero
no cuenta — no mueve el perfil, no baja la nota y sobre la foto sale como marca
de revisión. En una prueba con cuatro errores donde el OCR leyó mal uno, la
entrega pasa de 50 % a 63 %.

**Dos fuentes que no se mezclan.** El dominio solo se mide en la habilidad que
el dictado trabajaba, que es la única donde sabemos cuántas oportunidades tuvo
de acertar; poner un porcentaje a una habilidad que quizá salía dos veces en el
texto sería inventarse una medida. Los errores recurrentes en otras habilidades
(a partir de dos) se guardan aparte con confianza cero: no dicen cuánto domina,
pero sí que hay algo que mirar.

## 4. El docente enmienda a la IA

Cada error muestra a qué regla se le atribuyó y se puede enmendar: decir que no
era un error, o que era de otra regla. La enmienda se aplica sobre la
corrección guardada —así surte efecto de golpe en perfil, marcas y paneles— y
el perfil se recalcula al momento.

Además queda registrada en `TeacherOverride` con quién la hizo, qué había antes
y por qué. **El motivo es obligatorio:** una enmienda sin motivo no se entiende
pasado un tiempo, y sin ese registro dentro de un año nadie sabría si una
corrección la decidió el modelo o una persona.

## 5. Quien se prepara una certificación por su cuenta

La aplicación daba por hecho que todo el que escribe un dictado es alumno de
una clase. Ahora una persona puede entrar con su correo, elegir nivel MCER
(A1-C2) y pedirse ella misma el siguiente dictado, que sale de su perfil igual
que el de un alumno de clase. La única diferencia es quién pulsa el botón.

**Los niveles van aparte de los cursos escolares y no los sustituyen.** Un
adulto de A2 no es un niño de 4.º aunque ortográficamente se le pida lo mismo:
los textos son más largos (C1 son 140-180 palabras, frente a 120-150 de 4.º de
ESO), y la equivalencia con el currículo solo sirve para saber qué reglas se le
suponen aprendidas.

**El orden también cambia.** En la escuela se va de la primera regla a la
última, como avanza el curso. A quien se prepara un C1 se le suponen las
básicas, así que se empieza por arriba y se baja solo si de verdad falla. Sin
esto, su primer dictado era «c davant a, o, u», de segundo de primaria.

## 6. Retención de datos

La foto es el dato más sensible que guarda la aplicación —la caligrafía de un
menor— y se quedaba para siempre. `scripts/prune-submission-photos.mjs` la
vacía a partir de los 60 días y solo de entregas ya evaluadas: si aún no se ha
corregido, la foto es lo único que hay del trabajo del alumno. La entrega, la
puntuación y la corrección se conservan enteras.

**Va en un script separado del de audio** porque el audio es caché regenerable
y la foto no. Mezclarlos en uno llamado `prune-dictation-audio` invitaba a
borrar una cosa creyendo que borrabas la otra.

---

## Cambios de esquema

Sin carpeta de migraciones: el script `start` ejecuta `prisma db push
--accept-data-loss`. **Todo es aditivo salvo relajar una restricción; ningún
`DROP`.**

| Cambio | Para qué |
|---|---|
| `StudentSkillState` (nuevo) | Dominio, confianza y recencia por habilidad |
| `TeacherOverride` (nuevo) | Constancia de las enmiendas del docente |
| `Dictation.targetSubskill` | Habilidad concreta a la que apunta el dictado |
| `User.learningLevel` | Nivel MCER de quien aprende por su cuenta |
| `Dictation.teacherId` → opcional | Un dictado autónomo no tiene docente detrás |

## Variables de entorno

- **`AUTH_ALLOW_SELF_LEARNERS`** (por defecto `true`) — permite el alta sin
  centro. No expone datos de ninguna escuela: quien entra así se queda sin
  escuela y sin grupo, y las consultas van filtradas por escuela, grupo o su
  propio identificador. Lo que sí permite es alta sin invitación. **El
  propietario debe confirmar si quiere ese valor por defecto.**
- **`GOOGLE_CLOUD_VISION_API_KEY`** — ya existía, pero ahora es imprescindible:
  sin ella el OCR va simulado, no devuelve posiciones y **no se dibuja ninguna
  marca sobre la foto**.

## Qué se ha verificado y qué no

`next build` (TypeScript incluido) y `eslint`, limpios. La lógica se probó caso
por caso: 24 errores típicos de catalán en el clasificador (24/24), las cuatro
clases de marca, el cálculo de dominio en recencia y confianza, los techos y
suelos de dificultad, y la elección de habilidad para C1 y para 3.º de primaria.

**No verificado:** nada se ha ejecutado contra la base de datos de producción
ni contra las APIs reales de Vision, Claude o Gemini. En concreto, el parseo de
la respuesta de Google Vision no se ha visto con datos de verdad.

## Limitaciones conocidas

- Las entregas corregidas antes de este cambio no llevan clasificación:
  aparecerán como «Sense classificar». No es un fallo.
- El clasificador no cubre R/RR ni otras reglas que la taxonomía no incluye.
- Con dos errores en la misma palabra se queda con la primera regla que
  reconoce.
- El borrado de fotos y audio necesita un cron en producción: los scripts no se
  ejecutan solos.
- La puntuación numérica sigue visible para el alumno, en contra de la sección
  12 de la spec, **por decisión expresa del propietario**.

## Siguientes pasos

1. Poner `GOOGLE_CLOUD_VISION_API_KEY` y probar con una foto real.
2. Cron para los dos scripts de limpieza.
3. Copias de seguridad programadas (`pg_dump` desde GitHub Actions): Railway
   solo ofrece backups en plan Pro.
4. Analítica por subcompetencia en los paneles (spec 16): el dato ya se guarda
   pero no se muestra.
5. Trazabilidad de modelo y versión de prompt por corrección (spec 18).
6. Banco de dictados validados y validación del texto generado (spec 7 y 8).
