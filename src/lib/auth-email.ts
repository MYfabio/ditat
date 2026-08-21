/**
 * Correu d'accés sense contrasenya.
 *
 * La plantilla que porta Auth.js de sèrie és en anglès i diu "Sign in to
 * www.dictats.cat". A un claustre que treballa en català, un correu així
 * sembla brossa i no s'obre.
 */

type VerificationParams = {
  identifier: string;
  url: string;
  provider: { apiKey?: string; from?: string };
};

/** Quant dura l'enllaç. Prou perquè algú el llegeixi més tard, no tant com per
 *  quedar-se viu dies a la safata d'entrada de qualsevol. */
export const MAGIC_LINK_MAX_AGE = 2 * 60 * 60;

function plantillaHtml(url: string) {
  return `<!doctype html>
<html lang="ca">
  <body style="margin:0;padding:24px;background:#f6f7f9;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px;">
          <tr><td>
            <p style="margin:0 0 4px;font-size:18px;font-weight:700;">dictats.cat</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Dictats en català amb correcció automàtica</p>

            <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">
              Prem el botó per entrar. No cal cap contrasenya.
            </p>

            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr><td style="border-radius:8px;background:#2563eb;">
                <a href="${url}" style="display:inline-block;padding:12px 24px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">
                  Entrar a dictats.cat
                </a>
              </td></tr>
            </table>

            <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b7280;">
              L'enllaç caduca en dues hores i només es pot fer servir un cop.
            </p>
            <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">
              Si no has demanat entrar, ignora aquest correu: sense prémer
              l'enllaç no passa res.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function plantillaText(url: string) {
  return [
    "dictats.cat",
    "",
    "Obre aquest enllaç per entrar. No cal cap contrasenya:",
    url,
    "",
    "L'enllaç caduca en dues hores i només es pot fer servir un cop.",
    "Si no has demanat entrar, ignora aquest correu.",
  ].join("\n");
}

export async function sendMagicLink({ identifier, url, provider }: VerificationParams) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: provider.from,
      to: identifier,
      subject: "El teu enllaç d'accés a dictats.cat",
      html: plantillaHtml(url),
      text: plantillaText(url),
    }),
  });

  if (!res.ok) {
    const detall = await res.text().catch(() => "");
    // El missatge arriba a la pantalla com a error genèric; el detall es queda
    // als registres del servidor, que és on cal mirar si un centre es queixa.
    console.error("Resend no ha pogut enviar l'enllaç d'accés:", res.status, detall);
    throw new Error("No s'ha pogut enviar el correu d'accés.");
  }
}
