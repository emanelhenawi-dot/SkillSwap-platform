// الرقم القومي المصري: C YYMMDD GG SSSS X
// C: 2 = مواليد 1900-1999 ، 3 = مواليد 2000-2099
export function parseNationalId(id) {
  if (!/^\d{14}$/.test(id || '')) return null;
  const c = id[0];
  if (c !== '2' && c !== '3') return null;

  const year = (c === '2' ? 1900 : 2000) + Number(id.slice(1, 3));
  const month = Number(id.slice(3, 5));
  const day = Number(id.slice(5, 7));
  const birth = new Date(Date.UTC(year, month - 1, day));

  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) return null;
  const now = new Date();
  if (birth > now) return null;

  let age = now.getUTCFullYear() - year;
  if (now.getUTCMonth() < month - 1 || (now.getUTCMonth() === month - 1 && now.getUTCDate() < day)) age--;

  return { birthDate: birth, age, gender: Number(id[12]) % 2 ? 'male' : 'female' };
}