import axios from 'axios';
import fest from './mock/fest.json';
import events from './mock/events.json';
import workshops from './mock/workshops.json';
import team from './mock/team.json';
import sponsors from './mock/sponsors.json';
import mess from './mock/mess.json';
import payment from './mock/payment.json';
import { SPONSOR_TIERS, TEAM_ROLES, canonical, sameId } from './utils';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const http = axios.create({ baseURL: BASE, withCredentials: true });

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => Promise.reject(new ApiError(status, code, message));

const ASSET_KEYS = ['imageUrl', 'photoUrl', 'logoUrl', 'qrImageUrl', 'heroImageUrl', 'screenshotUrl', 'confirmationQrUrl', 'url'];
const mapAssets = (v, fn) => Array.isArray(v) ? v.map(x => mapAssets(x, fn)) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ASSET_KEYS.includes(k) && typeof x === 'string' ? fn(x) : mapAssets(x, fn)])) : v;
http.interceptors.request.use(c => {
  if (c.data && c.data.constructor === Object) c.data = mapAssets(c.data, u => BASE && u.startsWith(BASE + '/') ? u.slice(BASE.length) : u);
  return c;
});
http.interceptors.response.use(r => mapAssets(r.data, u => BASE && u.startsWith('/') ? BASE + u : u), e => {
  const err = e.response?.data?.error;
  return Promise.reject(new ApiError(e.response?.status || 0, err?.code || 'SERVER', err?.message || 'Network error'));
});

const toList = v => Array.isArray(v) ? v : [v?.items, v?.data, v?.results].find(Array.isArray) ?? [];
const toObject = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const str = v => v == null ? '' : String(v);
const num = (v, d = 0) => { const n = Number(v); return v !== '' && v != null && Number.isFinite(n) ? n : d; };
const iso = v => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d.toISOString() : ''; };
const nullableStr = v => v ? String(v) : null;
const entityId = o => o.id ?? o._id;

const normPrizes = v => (Array.isArray(v) ? v : Object.entries(toObject(v)).map(([position, amount]) => ({ position, amount })))
  .map(p => ({ position: str(p?.position), amount: num(p?.amount) }));
const normTeamSize = v => {
  if (typeof v === 'number' || typeof v === 'string') return { min: num(v, 1), max: num(v, 1) };
  const t = toObject(v);
  const min = num(t.min, 1);
  return { min, max: Math.max(min, num(t.max, min)) };
};

const normUser = u => { const o = toObject(u); return { ...o, id: o.id, name: str(o.name), email: str(o.email), phone: str(o.phone), college: str(o.college), role: o.role === 'admin' ? 'admin' : 'user' }; };
const normFest = f => { const o = toObject(f); return { ...o, name: str(o.name), tagline: str(o.tagline), startDate: iso(o.startDate), endDate: iso(o.endDate), venue: str(o.venue), aboutHtml: str(o.aboutHtml), heroImageUrl: str(o.heroImageUrl), contactEmail: str(o.contactEmail), contactPhone: str(o.contactPhone) }; };
const normEvent = e => {
  const o = toObject(e), c = toObject(o.contact);
  return { ...o, id: entityId(o), slug: str(o.slug), name: str(o.name), category: str(o.category), description: str(o.description), rules: str(o.rules), imageUrl: str(o.imageUrl),
    startTime: iso(o.startTime), endTime: iso(o.endTime), venue: str(o.venue), prizePool: num(o.prizePool), prizeBreakdown: normPrizes(o.prizeBreakdown),
    registrationFee: num(o.registrationFee), teamSize: normTeamSize(o.teamSize), registrationOpen: o.registrationOpen !== false && o.registrationOpen !== 'false', contact: { name: str(c.name), phone: str(c.phone) } };
};
const normWorkshop = w => {
  const o = toObject(w), total = num(o.seatsTotal);
  return { ...o, id: entityId(o), title: str(o.title), description: str(o.description), imageUrl: str(o.imageUrl), speaker: str(o.speaker), startTime: iso(o.startTime), endTime: iso(o.endTime),
    venue: str(o.venue), fee: num(o.fee), seatsTotal: total, seatsLeft: total ? Math.min(total, Math.max(0, num(o.seatsLeft))) : Math.max(0, num(o.seatsLeft)) };
};
const normMember = m => { const o = toObject(m); return { ...o, id: entityId(o), name: str(o.name), role: canonical(o.role, TEAM_ROLES, 'Member'), department: str(o.department), photoUrl: str(o.photoUrl), email: str(o.email), linkedinUrl: str(o.linkedinUrl), order: num(o.order, 9999) }; };
const normSponsor = s => { const o = toObject(s); return { ...o, id: entityId(o), name: str(o.name), tier: canonical(o.tier, SPONSOR_TIERS, 'Partner'), logoUrl: str(o.logoUrl), websiteUrl: str(o.websiteUrl) }; };
const normMess = m => { const o = toObject(m); return { ...o, id: str(entityId(o)), name: str(o.name), description: str(o.description), price: num(o.price), imageUrl: str(o.imageUrl) }; };
const normPayment = p => { const o = toObject(p); return { ...o, qrImageUrl: str(o.qrImageUrl), upiId: str(o.upiId), note: str(o.note) }; };
const STATUSES = ['pending', 'approved', 'rejected'];
const normReg = r => {
  const o = toObject(r), target = toObject(o.target);
  return { ...o, id: o.id, kind: o.kind === 'workshop' ? 'workshop' : 'event', targetId: o.targetId ?? target.id, targetName: str(o.targetName || target.name || target.title), transactionId: str(o.transactionId),
    screenshotUrl: str(o.screenshotUrl), status: canonical(o.status, STATUSES, 'pending'), amount: num(o.amount), createdAt: iso(o.createdAt), teamName: str(o.teamName),
    participantName: str(o.participantName || o.user?.name), participantEmail: str(o.participantEmail || o.user?.email), participantPhone: str(o.participantPhone || o.user?.phone),
    college: str(o.college || o.user?.college), visitDays: num(o.visitDays), competitions: Array.isArray(o.competitions) ? o.competitions.map(String) : [], competitionNames: Array.isArray(o.competitionNames) ? o.competitionNames.map(String) : [], user: o.user ? normUser(o.user) : null };
};
const normMessReg = r => {
  const o = toObject(r), opt = toObject(o.messOption);
  const optionId = str(typeof o.messOption === 'object' ? opt.id : o.messOption);
  return { ...o, id: o.id, messOption: optionId, messName: str(opt.name || o.messName), transactionId: str(o.transactionId), screenshotUrl: str(o.screenshotUrl), status: canonical(o.status, STATUSES, 'pending'),
    amount: num(o.amount), createdAt: iso(o.createdAt), confirmationQrUrl: nullableStr(o.confirmationQrUrl), user: o.user ? normUser(o.user) : null };
};
const normAdmins = v => toList(v).map(a => typeof a === 'string' ? a : a?.email).filter(Boolean).map(String);
const normAmbassador = a => {
  const o = toObject(a);
  return { ...o, id: entityId(o), name: str(o.name), email: str(o.email), phone: str(o.phone), college: str(o.college),
    city: str(o.city), course: str(o.course), year: str(o.year), socialLink: str(o.socialLink),
    motivation: str(o.motivation), reach: str(o.reach), status: canonical(o.status, ['pending', 'approved', 'rejected'], 'pending'), createdAt: iso(o.createdAt) };
};

const mapList = fn => v => toList(v).map(fn);
const byOrder = (a, b) => a.order - b.order;

const db = {
  fest: { ...fest }, events: [...events], workshops: [...workshops], team: [...team],
  sponsors: [...sponsors], mess: [...mess], payment: { ...payment },
  regs: [], messRegs: [], users: [],
  admins: ['b25347@students.iitmandi.ac.in'], ambassadors: [],
};
const delay = v => new Promise(r => setTimeout(() => r(structuredClone(v)), 250));
const readStoredUser = () => { try { return JSON.parse(localStorage.getItem('mockUser') || 'null'); } catch { return null; } };
const withRole = u => ({ ...u, role: db.admins.includes(u.email) ? 'admin' : 'user' });
const getUser = () => { const u = readStoredUser(); return u ? withRole(u) : null; };
const needUser = () => getUser() || fail(401, 'UNAUTHENTICATED', 'Please log in.');
const needAdmin = () => { const u = getUser(); return !u ? fail(401, 'UNAUTHENTICATED', 'Please log in.') : u.role !== 'admin' ? fail(403, 'FORBIDDEN', 'Admins only.') : null; };
const userIdFor = email => [...email].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const storeUser = u => { localStorage.setItem('mockUser', JSON.stringify(u)); return u; };
let nextId = 100;

const read = (mock, real, normalize) => (USE_MOCK ? delay(mock()) : real()).then(normalize);

function mockRegister(list, body, extra) {
  if (body.transactionId === 'DUPLICATE123' || [...db.regs, ...db.messRegs].some(r => r.transactionId === body.transactionId))
    return fail(409, 'DUPLICATE_TRANSACTION', 'This transaction ID is already used.');
  const row = { id: nextId++, transactionId: body.transactionId, screenshotUrl: '', status: 'pending', createdAt: new Date().toISOString(), ...extra };
  list.push(row);
  return delay(row);
}

const crud = (path, key, normalize) => ({
  create: b => (USE_MOCK ? needAdmin() || delay((db[key].push({ ...b, id: nextId++ }), db[key].at(-1))) : http.post(`/api/admin/${path}`, b)).then(normalize),
  update: (id, b) => (USE_MOCK ? needAdmin() || delay((db[key] = db[key].map(x => sameId(x.id, id) ? { ...x, ...b, id: x.id } : x), db[key].find(x => sameId(x.id, id)))) : http.put(`/api/admin/${path}/${id}`, b)).then(normalize),
  remove: id => USE_MOCK ? needAdmin() || delay((db[key] = db[key].filter(x => !sameId(x.id, id)), { ok: true })) : http.delete(`/api/admin/${path}/${id}`),
});

const decideRow = (list, id, action, extra = {}) => {
  db[list] = db[list].map(r => sameId(r.id, id) ? { ...r, status: action === 'approve' ? 'approved' : 'rejected', ...extra } : r);
  return delay({ ok: true });
};

const api = {
  signup: b => USE_MOCK
    ? (db.users.some(u => u.email === b.email) ? fail(422, 'VALIDATION', 'Email already registered.')
      : (() => { const { password, ...rest } = b; const u = withRole({ ...rest, id: userIdFor(b.email) }); db.users.push(u); return delay(storeUser(u)).then(normUser); })())
    : http.post('/api/auth/signup', b).then(normUser),
  login: b => USE_MOCK
    ? (() => { const known = db.users.find(x => x.email === b.email); const u = withRole({ name: b.email.split('@')[0], phone: '', college: 'IIT Mandi', ...known, email: b.email, id: userIdFor(b.email) }); return delay(storeUser(u)).then(normUser); })()
    : http.post('/api/auth/login', b).then(normUser),
  logout: () => USE_MOCK ? (localStorage.removeItem('mockUser'), delay({ ok: true })) : http.post('/api/auth/logout'),
  me: () => (USE_MOCK ? (getUser() ? delay(getUser()) : fail(401, 'UNAUTHENTICATED', 'Not logged in.')) : http.get('/api/auth/me')).then(normUser),

  getFest: () => read(() => db.fest, () => http.get('/api/fest'), normFest),
  getEvents: () => read(() => db.events, () => http.get('/api/events'), mapList(normEvent)),
  getEvent: id => (USE_MOCK
    ? (db.events.find(e => sameId(e.id, id)) ? delay(db.events.find(e => sameId(e.id, id))) : fail(404, 'NOT_FOUND', 'Event not found.'))
    : http.get(`/api/events/${id}`)).then(normEvent),
  getWorkshops: () => read(() => db.workshops, () => http.get('/api/workshops'), mapList(normWorkshop)),
  getTeam: () => read(() => db.team, () => http.get('/api/team'), v => mapList(normMember)(v).sort(byOrder)),
  getSponsors: () => read(() => db.sponsors, () => http.get('/api/sponsors'), mapList(normSponsor)),
  getMessOptions: () => read(() => db.mess, () => http.get('/api/messoptions'), mapList(normMess)),
  getPaymentInfo: () => read(() => db.payment, () => http.get('/api/payment-info'), normPayment),

  createRegistration: form => {
    if (!USE_MOCK) return http.post('/api/registrations', form).then(normReg);
    const u = needUser(); if (u.then) return u;
    const kind = form.get('kind'), targetId = Number(form.get('targetId'));
    if (db.regs.some(r => r.kind === kind && sameId(r.targetId, targetId) && sameId(r.userId, u.id))) return fail(409, 'ALREADY_REGISTERED', 'You are already registered.');
    const t = (kind === 'event' ? db.events : db.workshops).find(x => sameId(x.id, targetId));
    return mockRegister(db.regs, { transactionId: form.get('transactionId') },
      { kind, targetId, userId: u.id, targetName: t?.name || t?.title, amount: t?.registrationFee ?? t?.fee ?? 0, teamName: form.get('teamName') }).then(normReg);
  },
  myRegistrations: () => (USE_MOCK ? (getUser() ? delay(db.regs.filter(r => sameId(r.userId, getUser().id))) : needUser()) : http.get('/api/registrations/me')).then(mapList(normReg)),
  createMessRegistration: form => {
    if (!USE_MOCK) return http.post('/api/mess/registrations', form).then(normMessReg);
    const u = needUser(); if (u.then) return u;
    const opt = db.mess.find(m => sameId(m.id, form.get('messOption')));
    return mockRegister(db.messRegs, { transactionId: form.get('transactionId') },
      { messOption: opt?.id, userId: u.id, amount: opt?.price ?? 0, confirmationQrUrl: null }).then(normMessReg);
  },
  myMessRegistrations: () => (USE_MOCK ? (getUser() ? delay(db.messRegs.filter(r => sameId(r.userId, getUser().id))) : needUser()) : http.get('/api/mess/registrations/me')).then(mapList(normMessReg)),
  applyCampusAmbassador: body => USE_MOCK
    ? (db.ambassadors.some(a => a.email.toLowerCase() === body.email.toLowerCase())
      ? fail(409, 'ALREADY_APPLIED', 'An application with this email already exists.')
      : delay((db.ambassadors.push({ ...body, id: nextId++, status: 'pending', createdAt: new Date().toISOString() }), db.ambassadors.at(-1))).then(normAmbassador))
    : http.post('/api/campus-ambassadors', body).then(normAmbassador),

  admin: {
    updateFest: b => (USE_MOCK ? needAdmin() || delay((db.fest = b, b)) : http.put('/api/admin/fest', b)).then(normFest),
    updatePayment: b => (USE_MOCK ? needAdmin() || delay((db.payment = b, b)) : http.put('/api/admin/payment-info', b)).then(normPayment),
    events: crud('events', 'events', normEvent), workshops: crud('workshops', 'workshops', normWorkshop),
    team: crud('team', 'team', normMember), sponsors: crud('sponsors', 'sponsors', normSponsor),
    updateMessOption: (id, b) => (USE_MOCK ? needAdmin() || delay((db.mess = db.mess.map(m => sameId(m.id, id) ? { ...m, ...b, id: m.id } : m), db.mess.find(m => sameId(m.id, id)))) : http.put(`/api/admin/mess-options/${id}`, b)).then(normMess),
    upload: file => {
      if (USE_MOCK) return needAdmin() || delay({ url: URL.createObjectURL(file) });
      const f = new FormData(); f.append('file', file); return http.post('/api/admin/uploads', f);
    },
    registrations: params => (USE_MOCK ? needAdmin() || delay(db.regs.map(r => ({ ...r, user: getUser() }))) : http.get('/api/admin/registrations', { params })).then(mapList(normReg)),
    createRegistration: b => {
      if (!USE_MOCK) return http.post('/api/admin/registrations', b).then(normReg);
      const admin = needAdmin(); if (admin?.then) return admin;
      const row = { ...b, id: nextId++, kind: 'event', status: 'approved', amount: 0, transactionId: '', createdAt: new Date().toISOString(), source: 'admin' };
      db.regs.push(row);
      return delay(row).then(normReg);
    },
    decide: (id, action, reason) => USE_MOCK
      ? needAdmin() || decideRow('regs', id, action)
      : http.post(`/api/admin/registrations/${id}/${action}`, action === 'reject' ? { reason } : undefined),
    messRegistrations: params => (USE_MOCK ? needAdmin() || delay(db.messRegs.map(r => ({ ...r, user: getUser() }))) : http.get('/api/admin/mess/registrations', { params })).then(mapList(normMessReg)),
    decideMess: (id, action, reason) => USE_MOCK
      ? needAdmin() || decideRow('messRegs', id, action, { confirmationQrUrl: action === 'approve' ? '' : null })
      : http.post(`/api/admin/mess/registrations/${id}/${action}`, action === 'reject' ? { reason } : undefined),
    admins: () => read(() => db.admins, () => http.get('/api/admin/admins'), normAdmins),
    addAdmin: email => USE_MOCK ? needAdmin() || delay((db.admins.includes(email) || db.admins.push(email), { ok: true })) : http.post('/api/admin/admins', { email }),
    removeAdmin: email => USE_MOCK ? needAdmin() || delay((db.admins = db.admins.filter(a => a !== email), { ok: true })) : http.delete(`/api/admin/admins/${encodeURIComponent(email)}`),
    exportCsvUrl: () => `${BASE}/api/admin/registrations/export.csv`,
    ambassadors: params => (USE_MOCK ? needAdmin() || delay(db.ambassadors) : http.get('/api/admin/campus-ambassadors', { params })).then(mapList(normAmbassador)),
    decideAmbassador: (id, action) => USE_MOCK
      ? needAdmin() || delay((db.ambassadors = db.ambassadors.map(a => sameId(a.id, id) ? { ...a, status: action } : a), { ok: true }))
      : http.patch(`/api/admin/campus-ambassadors/${id}`, { status: action }),
  },
};
export default api;
