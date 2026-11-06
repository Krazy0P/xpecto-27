// Optional Express mock of API_CONTRACT.md. Run: npm run mock-server  (then VITE_USE_MOCK=false, VITE_API_URL=http://127.0.0.1:3000)
// In-memory only; passwords are plain text. NEVER use this in production.
import express from 'express'; import cors from 'cors'; import multer from 'multer';
import fs from 'fs'; import path from 'path'; import crypto from 'crypto'; import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const rd = n => JSON.parse(fs.readFileSync(path.join(dir, '../src/mock', n + '.json'), 'utf8'));
const db = { fest: rd('fest'), events: rd('events'), workshops: rd('workshops'), team: rd('team'), sponsors: rd('sponsors'), messoptions: rd('mess'),
  payment: rd('payment'), regs: [], messRegs: [], users: [], admins: ['b25347@students.iitmandi.ac.in'] };
let nid = 100;
const up = path.join(dir, 'uploads'); fs.mkdirSync(up, { recursive: true });
const upload = multer({ storage: multer.diskStorage({ destination: up, filename: (r, f, cb) => cb(null, crypto.randomUUID() + path.extname(f.originalname)) }), limits: { fileSize: 5 * 1024 * 1024 } });

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }), express.json());
app.use('/static/uploads', express.static(up));
const err = (res, s, code, message) => res.status(s).json({ error: { code, message } });
const sessions = new Map();
const pub = u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, college: u.college, role: db.admins.includes(u.email) ? 'admin' : 'user' });
const user = req => sessions.get(/sid=(\w+)/.exec(req.headers.cookie || '')?.[1]);
const needUser = (req, res, next) => { const u = user(req); if (!u) return err(res, 401, 'UNAUTHENTICATED', 'Please log in.'); req.user = pub(u); next(); };
const needAdmin = (req, res, next) => needUser(req, res, () => req.user.role === 'admin' ? next() : err(res, 403, 'FORBIDDEN', 'Admins only.'));
const startSession = (res, u) => { const sid = crypto.randomBytes(16).toString('hex'); sessions.set(sid, u); res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax`); res.json(pub(u)); };

// Auth
app.post('/api/auth/signup', (req, res) => {
  const b = req.body; if (!b.email || !b.password || !b.name) return err(res, 422, 'VALIDATION', 'Name, email and password are required.');
  if (db.users.some(u => u.email === b.email)) return err(res, 422, 'VALIDATION', 'Email already registered.');
  const u = { id: nid++, ...b }; db.users.push(u); startSession(res, u);
});
app.post('/api/auth/login', (req, res) => { const u = db.users.find(x => x.email === req.body.email && x.password === req.body.password); u ? startSession(res, u) : err(res, 401, 'UNAUTHENTICATED', 'Wrong email or password.'); });
app.post('/api/auth/logout', (req, res) => { sessions.delete(/sid=(\w+)/.exec(req.headers.cookie || '')?.[1]); res.json({ ok: true }); });
app.get('/api/auth/me', needUser, (req, res) => res.json(req.user));

// Public reads
app.get('/api/fest', (q, r) => r.json(db.fest));
for (const k of ['events', 'workshops', 'sponsors', 'messoptions']) app.get('/api/' + k, (q, r) => r.json(db[k]));
app.get('/api/team', (q, r) => r.json([...db.team].sort((a, b) => a.order - b.order)));
app.get('/api/events/:id', (q, r) => { const e = db.events.find(x => String(x.id) === q.params.id); e ? r.json(e) : err(r, 404, 'NOT_FOUND', 'Event not found.'); });
app.get(['/api/payment-info', '/api/paymentinfo'], (q, r) => r.json(db.payment));

// Registrations
const dupTxn = t => t === 'DUPLICATE123' || [...db.regs, ...db.messRegs].some(r => r.transactionId === t);
const shot = f => f ? `/static/uploads/${f.filename}` : '';
app.post('/api/registrations', needUser, upload.single('screenshot'), (req, res) => {
  const { kind, targetId, transactionId, teamName } = req.body;
  if (dupTxn(transactionId)) return err(res, 409, 'DUPLICATE_TRANSACTION', 'This transaction ID is already used.');
  if (db.regs.some(r => r.userId === req.user.id && r.kind === kind && r.targetId === Number(targetId))) return err(res, 409, 'ALREADY_REGISTERED', 'You are already registered.');
  const t = (kind === 'event' ? db.events : db.workshops).find(x => x.id === Number(targetId)); if (!t) return err(res, 404, 'NOT_FOUND', 'Target not found.');
  const row = { id: nid++, kind, targetId: t.id, targetName: t.name || t.title, transactionId, screenshotUrl: shot(req.file), status: 'pending', amount: t.registrationFee ?? t.fee, createdAt: new Date().toISOString(), teamName: teamName || null, userId: req.user.id };
  db.regs.push(row); res.json(row);
});
app.get('/api/registrations/me', needUser, (q, r) => r.json(db.regs.filter(x => x.userId === q.user.id)));
app.post('/api/mess/registrations', needUser, upload.single('screenshot'), (req, res) => {
  const { messOption, transactionId } = req.body; const o = db.messoptions.find(m => m.id === messOption);
  if (!o) return err(res, 422, 'VALIDATION', 'Unknown mess option.');
  if (dupTxn(transactionId)) return err(res, 409, 'DUPLICATE_TRANSACTION', 'This transaction ID is already used.');
  const row = { id: nid++, messOption, transactionId, screenshotUrl: shot(req.file), status: 'pending', amount: o.price, createdAt: new Date().toISOString(), confirmationQrUrl: null, userId: req.user.id };
  db.messRegs.push(row); res.json(row);
});
app.get('/api/mess/registrations/me', needUser, (q, r) => r.json(db.messRegs.filter(x => x.userId === q.user.id)));

// Admin
const withUser = r => ({ ...r, user: (({ id, name, email, phone, college }) => ({ id, name, email, phone, college }))(db.users.find(u => u.id === r.userId) || {}) });
for (const [p, k] of [['events', 'events'], ['workshops', 'workshops'], ['team', 'team'], ['sponsors', 'sponsors']]) {
  app.post(`/api/admin/${p}`, needAdmin, (q, r) => { const x = { ...q.body, id: nid++ }; db[k].push(x); r.json(x); });
  app.put(`/api/admin/${p}/:id`, needAdmin, (q, r) => { db[k] = db[k].map(x => String(x.id) === q.params.id ? { ...q.body, id: x.id } : x); r.json(db[k].find(x => String(x.id) === q.params.id)); });
  app.delete(`/api/admin/${p}/:id`, needAdmin, (q, r) => { db[k] = db[k].filter(x => String(x.id) !== q.params.id); r.json({ ok: true }); });
}
app.put('/api/admin/fest', needAdmin, (q, r) => r.json(db.fest = q.body));
app.put('/api/admin/payment-info', needAdmin, (q, r) => r.json(db.payment = q.body));
app.put('/api/admin/mess-options/:id', needAdmin, (q, r) => { db.messoptions = db.messoptions.map(m => m.id === q.params.id ? { ...q.body, id: m.id } : m); r.json(db.messoptions.find(m => m.id === q.params.id)); });
app.post('/api/admin/uploads', needAdmin, upload.single('file'), (q, r) => r.json({ url: shot(q.file) }));
const filt = (list, q) => list.filter(x => Object.entries(q).every(([k, v]) => !v || String(x[k]) === v)).map(withUser);
app.get('/api/admin/registrations', needAdmin, (q, r) => r.json(filt(db.regs, q.query)));
app.get('/api/admin/registrations/export.csv', needAdmin, (q, r) => { r.type('text/csv').send(['id,email,kind,target,transactionId,amount,status', ...db.regs.map(x => [x.id, withUser(x).user.email, x.kind, x.targetName, x.transactionId, x.amount, x.status].join(','))].join('\n')); });
const decide = (list, qr) => (q, r) => { if (!['approve', 'reject'].includes(q.params.action)) return err(r, 404, 'NOT_FOUND', 'Not found.'); const x = db[list].find(y => String(y.id) === q.params.id); if (!x) return err(r, 404, 'NOT_FOUND', 'Not found.');
  x.status = q.params.action === 'approve' ? 'approved' : 'rejected'; if (qr && x.status === 'approved') x.confirmationQrUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#fff"/><text x="100" y="105" text-anchor="middle" font-size="14">MOCK QR #' + x.id + '</text></svg>'); r.json(x); };
app.post('/api/admin/registrations/:id/:action', needAdmin, decide('regs'));
app.get('/api/admin/mess/registrations', needAdmin, (q, r) => r.json(filt(db.messRegs, q.query)));
app.post('/api/admin/mess/registrations/:id/:action', needAdmin, decide('messRegs', true));
app.get('/api/admin/admins', needAdmin, (q, r) => r.json(db.admins));
app.post('/api/admin/admins', needAdmin, (q, r) => { if (!db.admins.includes(q.body.email)) db.admins.push(q.body.email); r.json({ ok: true }); });
app.delete('/api/admin/admins/:email', needAdmin, (q, r) => { db.admins = db.admins.filter(a => a !== q.params.email); r.json({ ok: true }); });

app.use((e, q, r, n) => e.code === 'LIMIT_FILE_SIZE' ? err(r, 413, 'FILE_TOO_LARGE', 'File exceeds 5 MB.') : err(r, 500, 'SERVER', e.message));
app.listen(3000, () => console.log('Mock API on http://127.0.0.1:3000'));
