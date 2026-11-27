import { hashToken, randomCode } from './helpers.js';
import { sendMail, verifyCodeEmail } from './mailer.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_MS = 60 * 1000;

export async function issueEmailCode(user) {
  const code = randomCode();
  user.emailCode = {
    hash: hashToken(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
    sentAt: new Date(),
    attempts: 0,
  };
  await user.save();
  await sendMail(verifyCodeEmail({ to: user.email, code }));
}

export const canResend = (user) =>
  !user.emailCode?.sentAt || Date.now() - user.emailCode.sentAt.getTime() >= RESEND_MS;