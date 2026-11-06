import { useSearchParams } from 'react-router';
import api from '../../api';
import CrudTab from './CrudTab';
import SingleForm from './SingleForm';
import RegTable from './RegTable';
import AdminsTab from './AdminsTab';
import { slugify } from './util';
import { SPONSOR_TIERS, TEAM_ROLES } from '../../utils';

const T = (path, label, type = 'text', extra = {}) => ({ path, label, type, ...extra });

const FEST = [T('name', 'Fest name', 'text', { required: true }), T('tagline', 'Tagline'), T('startDate', 'Start', 'datetime'), T('endDate', 'End', 'datetime'), T('venue', 'Venue'),
  T('aboutHtml', 'About content', 'rich'), T('heroImageUrl', 'Hero image', 'image'), T('contactEmail', 'Contact email', 'email'), T('contactPhone', 'Contact phone')];
const EVENT = [T('name', 'Name', 'text', { required: true }), T('category', 'Category', 'text', { required: true }), T('description', 'Description', 'textarea'), T('rules', 'Rules', 'textarea'), T('imageUrl', 'Image', 'image'),
  T('startTime', 'Starts', 'datetime'), T('endTime', 'Ends', 'datetime'), T('venue', 'Venue'), T('prizePool', 'Prize pool (₹)', 'number'), T('prizeBreakdown', '', 'prizes'), T('registrationFee', 'Fee (₹)', 'number'),
  T('teamSize.min', 'Team size min', 'number'), T('teamSize.max', 'Team size max', 'number'), T('registrationOpen', 'Registration open', 'checkbox'), T('contact.name', 'Contact name'), T('contact.phone', 'Contact phone')];
const WORKSHOP = [T('title', 'Title', 'text', { required: true }), T('description', 'Description', 'textarea'), T('imageUrl', 'Image', 'image'), T('speaker', 'Speaker'), T('startTime', 'Starts', 'datetime'), T('endTime', 'Ends', 'datetime'),
  T('venue', 'Venue'), T('fee', 'Fee (₹)', 'number'), T('seatsTotal', 'Total seats', 'number'), T('seatsLeft', 'Seats left', 'number')];
const TEAM = [T('name', 'Name', 'text', { required: true }), T('role', 'Role', 'select', { options: TEAM_ROLES }), T('department', 'Department'), T('photoUrl', 'Photo', 'image'),
  T('email', 'Email', 'email'), T('linkedinUrl', 'LinkedIn URL', 'url'), T('order', 'Display order', 'number')];
const SPONSOR = [T('name', 'Name', 'text', { required: true }), T('tier', 'Tier', 'select', { options: SPONSOR_TIERS }), T('logoUrl', 'Logo', 'image'), T('websiteUrl', 'Website', 'url')];
const MESS = [T('name', 'Name', 'text', { required: true }), T('description', 'Description', 'textarea'), T('price', 'Price (₹)', 'number'), T('imageUrl', 'Image', 'image')];
const PAYMENT = [T('qrImageUrl', 'Payment QR image', 'image'), T('upiId', 'UPI ID', 'text', { required: true }), T('note', 'Note shown to users', 'textarea')];

const TABS = [['fest', 'Fest Info'], ['events', 'Events'], ['workshops', 'Workshops'], ['team', 'Team'], ['sponsors', 'Sponsors'], ['mess', 'Mess Options'], ['payment', 'Payment QR'], ['regs', 'Registrations'], ['messregs', 'Mess Regs'], ['admins', 'Admins']];

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'fest', id = params.get('id');
  const panel = {
    fest: <SingleForm title="Fest info" load={api.getFest} save={api.admin.updateFest} fields={FEST} />,
    events: <CrudTab title="Event" load={api.getEvents} resource={api.admin.events} fields={EVENT} label={x => x.name} initialId={id} prepare={b => ({ ...b, slug: b.slug || slugify(b.name) })}
      blank={{ name: '', category: '', description: '', rules: '', imageUrl: '', startTime: '', endTime: '', venue: '', prizePool: 0, prizeBreakdown: [], registrationFee: 0, teamSize: { min: 1, max: 1 }, registrationOpen: true, contact: { name: '', phone: '' } }} />,
    workshops: <CrudTab title="Workshop" load={api.getWorkshops} resource={api.admin.workshops} fields={WORKSHOP} label={x => x.title} initialId={id}
      blank={{ title: '', description: '', imageUrl: '', speaker: '', startTime: '', endTime: '', venue: '', fee: 0, seatsTotal: 0, seatsLeft: 0 }} />,
    team: <CrudTab title="Team member" load={api.getTeam} resource={api.admin.team} fields={TEAM} label={x => `${x.name} (${x.role})`} initialId={id}
      blank={{ name: '', role: 'Member', department: '', photoUrl: '', email: '', linkedinUrl: '', order: 1 }} />,
    sponsors: <CrudTab title="Sponsor" load={api.getSponsors} resource={api.admin.sponsors} fields={SPONSOR} label={x => `${x.name} (${x.tier})`} initialId={id}
      blank={{ name: '', tier: 'Partner', logoUrl: '', websiteUrl: '' }} />,
    mess: <CrudTab title="Mess option" load={api.getMessOptions} resource={{ update: api.admin.updateMessOption }} fields={MESS} label={x => x.name} canCreate={false} canDelete={false} blank={{}} />,
    payment: <SingleForm title="Payment QR & UPI" load={api.getPaymentInfo} save={api.admin.updatePayment} fields={PAYMENT} />,
    regs: <RegTable />, messregs: <RegTable mess />, admins: <AdminsTab />,
  }[tab];

  return (
    <section className="page">
      <h1 className="page-title">Admin</h1>
      <p className="muted">UI is hidden for non-admins, but permissions are enforced by the server.</p>
      <div className="chips admin-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setParams({ tab: k })}>{l}</button>)}
      </div>
      <div key={tab + (id || '')} role="tabpanel">{panel}</div>
    </section>
  );
}
