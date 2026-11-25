import { OAuth2Client } from 'google-auth-library';

export async function verifyGoogle(credential) {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
  const p = ticket.getPayload();
  if (!p?.email_verified) throw new Error('Unverified Google email');
  return p; // { sub, email, name, ... }
}