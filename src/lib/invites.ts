import * as jose from "jose";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface InvitePayload {
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  invitedBy: string;
}

export async function createInviteToken(payload: InvitePayload): Promise<string> {
  const secret = new TextEncoder().encode(process.env.CLERK_SECRET_KEY);

  const token = await new jose.SignJWT({
    workspaceId: payload.workspaceId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return token;
}

export async function verifyInviteToken(token: string) {
  const secret = new TextEncoder().encode(process.env.CLERK_SECRET_KEY);

  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as {
      workspaceId: string;
      email: string;
      role: "admin" | "editor" | "viewer";
    };
  } catch {
    return null;
  }
}

export async function sendInviteEmail(payload: InvitePayload) {
  const token = await createInviteToken(payload);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const inviteUrl = `${appUrl}/invite/${token}`;

  await resend.emails.send({
    from: "ContentElevatr <hello@contentelevatr.com>",
    to: payload.email,
    subject: `You've been invited to ${payload.workspaceName} on ContentElevatr`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>You're invited! 🎉</h2>
        <p><strong>${payload.invitedBy}</strong> has invited you to join
        <strong>${payload.workspaceName}</strong> on ContentElevatr as
        <strong>${payload.role}</strong>.</p>
        <a href="${inviteUrl}"
           style="display: inline-block; padding: 12px 24px; background: #6366f1;
                  color: white; text-decoration: none; border-radius: 8px;
                  margin-top: 16px;">
          Accept Invitation
        </a>
        <p style="color: #888; font-size: 14px; margin-top: 24px;">
          This invitation expires in 7 days.
        </p>
      </div>
    `,
  });

  return token;
}
