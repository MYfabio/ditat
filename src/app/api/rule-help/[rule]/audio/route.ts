import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrCreateRuleHelpAudio, type VersioAjuda } from "@/lib/ai/rule-help-audio";

/**
 * Serveix la locucio del repas d'una norma.
 *
 * Per a qui te dislexia, escoltar-la no es una comoditat: llegir un text sobre
 * ortografia es exactament la part que li costa. I com que les normes son deu
 * i no canvien, es genera un sol cop i despres ja no costa res.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ rule: string }> }
) {
  const { rule } = await params;
  const session = await auth();
  if (!session?.user) return new NextResponse(null, { status: 401 });

  const demanada = new URL(req.url).searchParams.get("v");
  const versio: VersioAjuda = demanada === "primaria" ? "primaria" : "completa";

  const audio = await getOrCreateRuleHelpAudio(rule, versio);
  // 204: no s'ha pogut generar. El client fara servir la veu del navegador,
  // que no es un error sino l'altra manera de sentir-ho.
  if (!audio) return new NextResponse(null, { status: 204 });

  return new NextResponse(new Uint8Array(audio.data), {
    headers: {
      "Content-Type": audio.mimeType,
      "Content-Length": String(audio.data.length),
      // La norma no canvia mai: el navegador se la pot quedar tot el dia.
      "Cache-Control": "private, max-age=86400",
    },
  });
}
