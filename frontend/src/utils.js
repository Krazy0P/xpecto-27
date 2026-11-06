export const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';
export const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '';
export const fmtMoney = n => '₹' + Number(n || 0).toLocaleString('en-IN');
export const dayMon = iso => iso ? { d: new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' }), m: new Date(iso).toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }).toUpperCase() } : { d: '--', m: '' };

export const sameId = (a, b) => a != null && b != null && String(a) === String(b);
export const capitalize = s => s ? s[0].toUpperCase() + s.slice(1) : '';

export const SPONSOR_TIERS = ['Title', 'Gold', 'Diamond', 'Silver', 'Partner'];
export const TEAM_ROLES = ['Convenor', 'Co-Convenor', 'Team Head', 'Member'];

export const canonical = (value, options, fallback) => {
  const key = String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  return options.find(o => o.toLowerCase().replace(/[\s_-]+/g, '') === key) ?? fallback;
};

export const groupSponsors = list => {
  const valid = list.filter(s => typeof s.logoUrl === 'string' && s.logoUrl.trim());
  const by = tier => valid.filter(s => s.tier === tier);
  return { all: valid, title: by('Title'), gold: by('Gold'), diamond: by('Diamond'), silver: by('Silver'), partner: by('Partner') };
};

export const istDayCount = (startIso, endIso) => {
  const day = iso => Date.parse(new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const n = Math.round((day(endIso) - day(startIso)) / 864e5) + 1;
  return Number.isFinite(n) ? Math.max(1, n) : 1;
};
