import nodemailer from 'nodemailer';

let transporter;

export async function sendMail({ to, subject, html }) {
  if (!process.env.SMTP_USER) {
    console.log('[DEV MAIL]', { to, subject });
    return;
  }
  try {
    transporter ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, html });
  } catch (e) {
    console.error('Mail error:', e.message);
  }
}

const wrapHtml = (body) =>
  `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e0e0f5;border-radius:12px">
    <h2 style="color:#4338ca">SkillSwap</h2>${body}</div>`;

// إيميل لولي الأمر لما الابن يسجل
export function guardianEmail({ to, childName, registered }) {
  const link = registered
    ? `${process.env.CLIENT_URL}/login`
    : `${process.env.CLIENT_URL}/register?type=parent&email=${encodeURIComponent(to)}`;
  return {
    to,
    subject: 'SkillSwap | ابنك أنشأ حساب على المنصة',
    html: wrapHtml(`
      <p dir="rtl">مرحباً، ${childName} أنشأ حساباً على منصة SkillSwap وسجّل بياناتك كولي أمر. تقدر تسجّل كولي أمر لمتابعة نشاطه والموافقة على الجلسات المباشرة.</p>
      <p>${childName} created a SkillSwap account and listed you as a parent/guardian. You can register as a parent to follow their activity and approve live sessions.</p>
      <p><a href="${link}" style="background:#4338ca;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${registered ? 'Log in | تسجيل الدخول' : 'Register as Parent | سجّل كولي أمر'}</a></p>`),
  };
}

// دعوة لابن مش مسجل لما ولي الأمر يضيفه
export function childInviteEmail({ to, parentName }) {
  return {
    to,
    subject: 'SkillSwap | دعوة للانضمام',
    html: wrapHtml(`
      <p dir="rtl">${parentName} دعاك للانضمام إلى SkillSwap. سجّل بنفس الإيميل والرقم القومي وهيتم ربط حسابك تلقائياً.</p>
      <p>${parentName} invited you to join SkillSwap. Register with this email and your National ID to be linked automatically.</p>
      <p><a href="${process.env.CLIENT_URL}/register">Register | سجّل الآن</a></p>`),
  };
}