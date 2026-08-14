import "server-only";

/**
 * Transactional email. If RESEND_API_KEY isn't configured, the message is
 * logged to the server console instead of sent — this is a real fallback
 * for local development, not a fake "email sent" success state. Callers
 * that need to know whether a real send happened can check the return value.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ sent: boolean; devLink?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `\n[email:not-configured] Would send to ${params.to}\nSubject: ${params.subject}\n\n${params.text}\n`
    );
    return { sent: false };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || "MENTA <no-reply@example.com>";

  const result = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
  });

  if (result.error) {
    console.error("[email] send failed", result.error);
    return { sent: false };
  }

  return { sent: true };
}
