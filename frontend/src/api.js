import axios from 'axios';
import { SPONSOR_TIERS, TEAM_ROLES, canonical, sameId } from './utils';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const http = axios.create({ baseURL: BASE, withCredentials: true });

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

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

const toList = v => Array.isArray(v) ? v : [v?.items, v?.data, v?.results, v?.registrations, v?.events, v?.workshops, v?.sponsors, v?.team, v?.admins, v?.ambassadors].find(Array.isArray) ?? [];
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

// Backend wraps auth responses in { user: {...} }
const unwrapUser = v => toObject(v?.user ?? v);
const unwrapFest = v => toObject(v?.fest ?? v);
const unwrapPayment = v => toObject(v?.payment ?? v);
const unwrapEvent = v => toObject(v?.event ?? v);
const unwrapWorkshop = v => toObject(v?.workshop ?? v);
const unwrapTeam = v => toObject(v?.team ?? v);
const unwrapSponsor = v => toObject(v?.sponsor ?? v);
const unwrapMess = v => toObject(v?.mess ?? v);
const unwrapReg = v => toObject(v?.registration ?? v);
const unwrapAdmins = v => Array.isArray(v?.admins) ? v.admins : toList(v);

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
const normAdmins = v => unwrapAdmins(v).map(a => typeof a === 'string' ? a : a?.email).filter(Boolean).map(String);
const normAmbassador = a => {
  const o = toObject(a);
  return { ...o, id: entityId(o), name: str(o.name), email: str(o.email), phone: str(o.phone), college: str(o.college),
    city: str(o.city), course: str(o.course), year: str(o.year), socialLink: str(o.socialLink),
    motivation: str(o.motivation), reach: str(o.reach), status: canonical(o.status, ['pending', 'approved', 'rejected'], 'pending'), createdAt: iso(o.createdAt) };
};

const mapList = fn => v => toList(v).map(fn);
const byOrder = (a, b) => a.order - b.order;

const api = {
  signup: b => http.post('/api/auth/signup', b).then(v => normUser(unwrapUser(v))),
  login:  b => http.post('/api/auth/login', b).then(v => normUser(unwrapUser(v))),
  logout: () => http.post('/api/auth/logout'),
  me:     () => http.get('/api/auth/me').then(v => normUser(unwrapUser(v))),

  getFest:        () => http.get('/api/fest').then(v => normFest(unwrapFest(v))),
  getEvents:      () => http.get('/api/events').then(mapList(normEvent)),
  getEvent:       id => http.get(`/api/events/${id}`).then(normEvent),
  getWorkshops:   () => http.get('/api/workshops').then(mapList(normWorkshop)),
  getTeam:        () => http.get('/api/team').then(v => mapList(normMember)(v).sort(byOrder)),
  getSponsors:    () => http.get('/api/sponsors').then(mapList(normSponsor)),
  getMessOptions: () => http.get('/api/messoptions').then(mapList(normMess)),
  getPaymentInfo: () => http.get('/api/payment-info').then(v => normPayment(unwrapPayment(v))),

  createRegistration: form => http.post('/api/registrations', form).then(v => normReg(unwrapReg(v))),
  myRegistrations:    ()   => http.get('/api/registrations/me').then(mapList(normReg)),

  createMessRegistration: form => http.post('/api/mess/registrations', form).then(v => normMessReg(unwrapReg(v))),
  myMessRegistrations:    ()   => http.get('/api/mess/registrations/me').then(mapList(normMessReg)),

  applyCampusAmbassador: body => http.post('/api/campus-ambassadors', body).then(normAmbassador),

  admin: {
    updateFest:    b        => http.put('/api/admin/fest', b).then(v => normFest(unwrapFest(v))),
    updatePayment: b        => http.put('/api/admin/payment-info', b).then(v => normPayment(unwrapPayment(v))),

    events: {
      create: b       => http.post('/api/admin/events', b).then(v => normEvent(unwrapEvent(v))),
      update: (id, b) => http.put(`/api/admin/events/${id}`, b).then(v => normEvent(unwrapEvent(v))),
      remove: id      => http.delete(`/api/admin/events/${id}`),
    },
    workshops: {
      create: b       => http.post('/api/admin/workshops', b).then(v => normWorkshop(unwrapWorkshop(v))),
      update: (id, b) => http.put(`/api/admin/workshops/${id}`, b).then(v => normWorkshop(unwrapWorkshop(v))),
      remove: id      => http.delete(`/api/admin/workshops/${id}`),
    },
    team: {
      create: b       => http.post('/api/admin/team', b).then(v => normMember(unwrapTeam(v))),
      update: (id, b) => http.put(`/api/admin/team/${id}`, b).then(v => normMember(unwrapTeam(v))),
      remove: id      => http.delete(`/api/admin/team/${id}`),
    },
    sponsors: {
      create: b       => http.post('/api/admin/sponsors', b).then(v => normSponsor(unwrapSponsor(v))),
      update: (id, b) => http.put(`/api/admin/sponsors/${id}`, b).then(v => normSponsor(unwrapSponsor(v))),
      remove: id      => http.delete(`/api/admin/sponsors/${id}`),
    },

    updateMessOption: (id, b) => http.put(`/api/admin/mess-options/${id}`, b).then(v => normMess(unwrapMess(v))),

    upload: file => {
      const f = new FormData(); f.append('file', file); return http.post('/api/admin/uploads', f);
    },

    registrations:      params => http.get('/api/admin/registrations', { params }).then(mapList(normReg)),
    createRegistration: b      => http.post('/api/admin/registrations', b).then(v => normReg(unwrapReg(v))),
    decide:    (id, action, reason) => http.post(`/api/admin/registrations/${id}/${action}`, action === 'reject' ? { reason } : undefined),

    messRegistrations: params => http.get('/api/admin/mess/registrations', { params }).then(mapList(normMessReg)),
    decideMess: (id, action, reason) => http.post(`/api/admin/mess/registrations/${id}/${action}`, action === 'reject' ? { reason } : undefined),

    admins:      ()      => http.get('/api/admin/admins').then(normAdmins),
    addAdmin:    email   => http.post('/api/admin/admins', { email }),
    removeAdmin: email   => http.delete(`/api/admin/admins/${encodeURIComponent(email)}`),

    exportCsvUrl: () => `${BASE}/api/admin/registrations/export.csv`,

    ambassadors:      params      => http.get('/api/admin/campus-ambassadors', { params }).then(mapList(normAmbassador)),
    decideAmbassador: (id, action) => http.patch(`/api/admin/campus-ambassadors/${id}`, { status: action }),
  },
};
export default api;
