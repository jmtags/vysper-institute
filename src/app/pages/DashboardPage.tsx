import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { FileText, GraduationCap, Mail, Shield, User, Users, Settings } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ContactMessage, ContactMessageStatus, fetchContactMessages, updateContactMessageStatus } from '../lib/contactMessages';
import {
  fetchProfiles,
  fetchTrainingCategories,
  fetchTrainingProposalDetails,
  fetchTrainingProposals,
  fetchTrainings,
  setTrainingActive,
  Training,
  TrainingCategory,
  updateProfileRole,
  updateTrainingProposalStatus,
  upsertTraining
} from '../lib/trainingData';
import { BRAND_NAME } from '../branding';
import { downloadProposal } from '../lib/proposalDownload';

interface DashboardPageProps {
  onNavigate: (page: string, data?: any) => void;
}

type AdminTab = 'proposals' | 'messages' | 'users' | 'trainings';

const emptyTrainingForm = {
  id: '',
  categoryId: '',
  slug: '',
  title: '',
  shortDescription: '',
  overview: '',
  targetParticipants: '',
  duration: 'Half-day',
  deliveryMode: 'Hybrid',
  imageIcon: 'brain',
  minParticipants: 15,
  maxParticipants: 30,
  basePrice: 25000,
  isActive: true
};

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState<AdminTab>('proposals');
  const [proposals, setProposals] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [trainingForm, setTrainingForm] = useState(emptyTrainingForm);
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      const [proposalData, categoryData, trainingData] = await Promise.all([
        fetchTrainingProposals(),
        fetchTrainingCategories(),
        fetchTrainings(isAdmin)
      ]);

      setProposals(proposalData);
      setCategories(categoryData);
      setTrainings(trainingData);

      if (isAdmin) {
        const [profileData, messageData] = await Promise.all([
          fetchProfiles(),
          fetchContactMessages()
        ]);
        setProfiles(profileData);
        setMessages(messageData);
      }
    } catch (err: any) {
      setError(err.message ?? 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user, isAdmin]);

  const dashboardTitle = useMemo(() => {
    if (!isAdmin) return 'My Training Quotations';
    if (activeTab === 'users') return 'User Management';
    if (activeTab === 'trainings') return 'Training Management';
    if (activeTab === 'messages') return 'Contact Messages';
    return 'Quotation Requests';
  }, [activeTab, isAdmin]);

  const handleStatusChange = async (proposalId: string, status: any) => {
    setSaving(true);
    setNotice('');
    try {
      await updateTrainingProposalStatus(proposalId, status);
      setProposals((current) => current.map((proposal) => proposal.id === proposalId ? { ...proposal, status } : proposal));
      setNotice(status === 'accepted' ? 'Quotation request approved.' : 'Quotation status updated.');
    } catch (err: any) {
      setError(err.message ?? 'Unable to update quotation request.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenProposal = async (proposalId: string, edit: boolean) => {
    setSaving(true);
    setError('');

    try {
      const detail = await fetchTrainingProposalDetails(proposalId);
      if (edit) {
        onNavigate('training-builder', {
          ...detail,
          clientInfo: {
            organizationName: detail.proposal.organization_name ?? '',
            contactPerson: detail.proposal.contact_person ?? '',
            contactEmail: detail.proposal.contact_email ?? '',
            contactPhone: detail.proposal.contact_phone ?? ''
          }
        });
      } else {
        onNavigate('proposal-preview', detail);
      }
    } catch (err: any) {
      setError(err.message ?? 'Unable to open quotation request.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadProposal = async (proposalId: string) => {
    setSaving(true);
    setError('');

    try {
      const detail = await fetchTrainingProposalDetails(proposalId);
      downloadProposal({
        proposalNumber: detail.proposal.proposal_number,
        trainingTitle: detail.training.title,
        organizationName: detail.proposal.organization_name,
        contactPerson: detail.proposal.contact_person,
        contactEmail: detail.proposal.contact_email,
        contactPhone: detail.proposal.contact_phone,
        participants: detail.formData.participants,
        duration: detail.formData.duration,
        deliveryMode: detail.formData.mode,
        venue: detail.formData.venue,
        preferredDate: detail.formData.preferredDate,
        basePrice: detail.basePrice,
        totalPrice: detail.totalPrice,
        addOns: detail.selectedAddOns.map((addOn: any) => ({
          name: addOn.name,
          quantity: addOn.quantity,
          totalPrice: addOn.totalPrice
        }))
      });
    } catch (err: any) {
      setError(err.message ?? 'Unable to download quotation.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (profileId: string, role: 'admin' | 'user') => {
    setSaving(true);
    setNotice('');
    try {
      await updateProfileRole(profileId, role);
      setProfiles((current) => current.map((item) => item.id === profileId ? { ...item, role } : item));
      setNotice('User role updated.');
    } catch (err: any) {
      setError(err.message ?? 'Unable to update role.');
    } finally {
      setSaving(false);
    }
  };

  const handleMessageStatusChange = async (messageId: string, status: ContactMessageStatus) => {
    setSaving(true);
    setNotice('');
    setError('');

    try {
      await updateContactMessageStatus(messageId, status);
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, status } : message));
      setNotice('Message status updated.');
    } catch (err: any) {
      setError(err.message ?? 'Unable to update message.');
    } finally {
      setSaving(false);
    }
  };

  const editTraining = (training: Training) => {
    setTrainingForm({
      id: training.id,
      categoryId: training.category_id ?? '',
      slug: training.slug,
      title: training.title,
      shortDescription: training.short_description,
      overview: training.overview,
      targetParticipants: training.target_participants ?? '',
      duration: training.duration,
      deliveryMode: training.delivery_mode,
      imageIcon: training.image_icon ?? 'brain',
      minParticipants: training.min_participants,
      maxParticipants: training.max_participants,
      basePrice: training.base_price,
      isActive: training.is_active
    });
    setActiveTab('trainings');
  };

  const handleTrainingSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');

    try {
      await upsertTraining({
        id: trainingForm.id || undefined,
        categoryId: trainingForm.categoryId || null,
        slug: trainingForm.slug,
        title: trainingForm.title,
        shortDescription: trainingForm.shortDescription,
        overview: trainingForm.overview,
        targetParticipants: trainingForm.targetParticipants,
        duration: trainingForm.duration,
        deliveryMode: trainingForm.deliveryMode,
        imageIcon: trainingForm.imageIcon,
        minParticipants: Number(trainingForm.minParticipants),
        maxParticipants: Number(trainingForm.maxParticipants),
        basePrice: Number(trainingForm.basePrice),
        isActive: trainingForm.isActive
      });

      setTrainings(await fetchTrainings(true));
      setTrainingForm(emptyTrainingForm);
      setNotice(trainingForm.id ? 'Training updated.' : 'Training created.');
      return true;
    } catch (err: any) {
      setError(err.message ?? 'Unable to save training.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleTrainingActiveChange = async (trainingId: string, isActive: boolean) => {
    setSaving(true);
    setNotice('');
    try {
      await setTrainingActive(trainingId, isActive);
      setTrainings(await fetchTrainings(true));
      setNotice(isActive ? 'Training restored.' : 'Training deactivated.');
    } catch (err: any) {
      setError(err.message ?? 'Unable to update training.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-muted/30 py-20 px-6">
        <div className="max-w-2xl mx-auto text-center bg-card rounded-xl shadow-sm border border-border p-8">
          <h1 className="mb-3 text-primary">Login Required</h1>
          <p className="text-foreground/70 mb-6">
            Please login or create an account to view your training workspace.
          </p>
          <Button onClick={() => onNavigate('trainings')}>Browse Trainings</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-primary">Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}</h1>
          <p className="text-foreground/70">Your {BRAND_NAME} {isAdmin ? 'admin console' : 'training workspace'}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-primary-foreground">
                  {isAdmin ? <Shield className="w-7 h-7" /> : <User className="w-7 h-7" />}
                </div>
                <div>
                  <p style={{ fontWeight: 600 }} className="text-primary">{profile?.full_name ?? 'VYSPER User'}</p>
                  <p className="text-sm text-foreground/60">{profile?.email ?? user.email}</p>
                  <p className="text-xs text-secondary mt-1">{isAdmin ? 'Admin account' : 'Regular user account'}</p>
                </div>
              </div>

              {isAdmin ? (
                <nav className="space-y-2">
                  <AdminNavButton active={activeTab === 'proposals'} onClick={() => setActiveTab('proposals')} icon={<FileText className="w-4 h-4" />} label="Quotations" />
                  <AdminNavButton active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} icon={<Mail className="w-4 h-4" />} label="Messages" />
                  <AdminNavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users className="w-4 h-4" />} label="Users" />
                  <AdminNavButton active={activeTab === 'trainings'} onClick={() => setActiveTab('trainings')} icon={<Settings className="w-4 h-4" />} label="Trainings" />
                </nav>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => onNavigate('trainings')}>
                  <GraduationCap className="w-4 h-4" />
                  Browse Trainings
                </Button>
              )}
            </div>
          </aside>

          <div className="lg:col-span-3 space-y-6">
            <section className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-primary">{dashboardTitle}</h2>
                {isAdmin && <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={loading}>Refresh</Button>}
              </div>

              {loading && <p className="text-foreground/60">Loading...</p>}
              {error && <p className="text-destructive mb-4">{error}</p>}
              {notice && <p className="text-secondary mb-4">{notice}</p>}

              {!loading && !error && activeTab === 'proposals' && (
                <ProposalPanel
                  proposals={proposals}
                  isAdmin={isAdmin}
                  saving={saving}
                  onStatusChange={handleStatusChange}
                  onOpenProposal={handleOpenProposal}
                  onDownloadProposal={handleDownloadProposal}
                  onBrowseTrainings={() => onNavigate('trainings')}
                />
              )}

              {!loading && !error && isAdmin && activeTab === 'users' && (
                <UsersPanel profiles={profiles} currentUserId={user.id} saving={saving} onRoleChange={handleRoleChange} />
              )}

              {!loading && !error && isAdmin && activeTab === 'messages' && (
                <MessagesPanel messages={messages} saving={saving} onStatusChange={handleMessageStatusChange} />
              )}

              {!loading && !error && isAdmin && activeTab === 'trainings' && (
                <TrainingsAdminPanel
                  categories={categories}
                  trainings={trainings}
                  form={trainingForm}
                  saving={saving}
                  onFormChange={setTrainingForm}
                  onSubmit={handleTrainingSubmit}
                  onEdit={editTraining}
                  onCancel={() => setTrainingForm(emptyTrainingForm)}
                  onActiveChange={handleTrainingActiveChange}
                />
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminNavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground/80'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ProposalPanel({ proposals, isAdmin, saving, onStatusChange, onOpenProposal, onDownloadProposal, onBrowseTrainings }: {
  proposals: any[];
  isAdmin: boolean;
  saving: boolean;
  onStatusChange: (proposalId: string, status: any) => void;
  onOpenProposal: (proposalId: string, edit: boolean) => void;
  onDownloadProposal: (proposalId: string) => void;
  onBrowseTrainings: () => void;
}) {
  if (proposals.length === 0) {
    return (
      <div className="bg-muted rounded-lg p-6 text-center">
        <p className="text-foreground/70 mb-4">No quotation requests yet.</p>
        <Button onClick={onBrowseTrainings}>Request a Training Quotation</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {proposals.map((proposal) => (
        <div key={proposal.id} className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p style={{ fontWeight: 600 }}>{proposal.training?.title ?? 'Training Quotation'}</p>
            <p className="text-sm text-foreground/60 mt-1">
              Quotation #{proposal.proposal_number} · {new Date(proposal.created_at).toLocaleDateString()}
            </p>
            {isAdmin && (
              <p className="text-sm text-foreground/60 mt-1">
                {proposal.organization_name || 'No organization'} · {proposal.contact_email || 'No email'}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <p className="text-primary" style={{ fontWeight: 700 }}>PHP {Number(proposal.total_price).toLocaleString()}</p>
            <Button size="sm" variant="outline" onClick={() => onOpenProposal(proposal.id, false)} disabled={saving}>
              View
            </Button>
            {(isAdmin || !['accepted', 'archived'].includes(proposal.status)) && (
              <Button size="sm" variant="outline" onClick={() => onOpenProposal(proposal.id, true)} disabled={saving}>
                Edit
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onDownloadProposal(proposal.id)} disabled={saving}>
              Download
            </Button>
            {isAdmin ? (
              <select
                value={proposal.status}
                disabled={saving}
                onChange={(event) => onStatusChange(proposal.id, event.target.value)}
                className="px-3 py-2 bg-card rounded-lg border border-border capitalize"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Pending Review</option>
                <option value="accepted">Approved</option>
                <option value="declined">Declined</option>
                <option value="archived">Archived</option>
              </select>
            ) : (
              <span className="px-3 py-1 bg-secondary/20 text-secondary rounded-full text-sm capitalize">
                {proposal.status === 'accepted' ? 'approved' : proposal.status === 'submitted' ? 'pending review' : proposal.status}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersPanel({ profiles, currentUserId, saving, onRoleChange }: {
  profiles: any[];
  currentUserId: string;
  saving: boolean;
  onRoleChange: (profileId: string, role: 'admin' | 'user') => void;
}) {
  return (
    <div className="space-y-3">
      {profiles.map((item) => (
        <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p style={{ fontWeight: 600 }}>{item.full_name || 'Unnamed User'}</p>
            <p className="text-sm text-foreground/60">{item.email || 'No email saved'}</p>
            <p className="text-xs text-foreground/50 mt-1">Joined {new Date(item.created_at).toLocaleDateString()}</p>
          </div>
          <select
            value={item.role}
            disabled={saving || item.id === currentUserId}
            onChange={(event) => onRoleChange(item.id, event.target.value as 'admin' | 'user')}
            className="px-3 py-2 bg-card rounded-lg border border-border capitalize"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
      ))}
    </div>
  );
}

function MessagesPanel({ messages, saving, onStatusChange }: {
  messages: ContactMessage[];
  saving: boolean;
  onStatusChange: (messageId: string, status: ContactMessageStatus) => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="bg-muted rounded-lg p-6 text-center">
        <p className="text-foreground/70">No contact messages yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div key={message.id} className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 p-4 bg-muted rounded-lg">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p style={{ fontWeight: 600 }}>{message.name}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                message.status === 'new'
                  ? 'bg-accent/20 text-accent'
                  : message.status === 'read'
                    ? 'bg-secondary/20 text-secondary'
                    : 'bg-foreground/10 text-foreground/60'
              }`}>
                {message.status}
              </span>
            </div>
            <a href={`mailto:${message.email}`} className="text-sm text-primary hover:underline">
              {message.email}
            </a>
            <p className="text-sm text-foreground/80 mt-3 whitespace-pre-wrap">{message.message}</p>
            <p className="text-xs text-foreground/50 mt-3">
              Sent {new Date(message.created_at).toLocaleString()}
            </p>
          </div>
          <div className="xl:text-right">
            <select
              value={message.status}
              disabled={saving}
              onChange={(event) => onStatusChange(message.id, event.target.value as ContactMessageStatus)}
              className="px-3 py-2 bg-card rounded-lg border border-border capitalize"
            >
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrainingsAdminPanel({ categories, trainings, form, saving, onFormChange, onSubmit, onEdit, onCancel, onActiveChange }: {
  categories: TrainingCategory[];
  trainings: Training[];
  form: typeof emptyTrainingForm;
  saving: boolean;
  onFormChange: (form: typeof emptyTrainingForm) => void;
  onSubmit: (event: FormEvent) => Promise<boolean>;
  onEdit: (training: Training) => void;
  onCancel: () => void;
  onActiveChange: (trainingId: string, isActive: boolean) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredTrainings = trainings.filter((training) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return [
      training.title,
      training.short_description,
      training.category?.name,
      training.duration,
      training.mode,
      training.slug
    ].some((value) => value?.toLowerCase().includes(query));
  });

  const handleAddTraining = () => {
    onCancel();
    setShowForm(true);
  };

  const handleEditTraining = (training: Training) => {
    onEdit(training);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    onCancel();
    setShowForm(false);
  };

  const handleSubmitForm = async (event: FormEvent) => {
    const saved = await onSubmit(event);
    if (saved) setShowForm(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-primary">Training Catalog</h3>
          <p className="text-sm text-foreground/60">Search, edit, or add corporate training programs.</p>
        </div>
        <Button onClick={handleAddTraining}>Add Training</Button>
      </div>

      <div>
        <label className="block mb-2 text-sm">Search Trainings</label>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by title, category, duration, mode, or slug"
          className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[90] bg-black/45 flex items-center justify-center px-4 py-8">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmitForm} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex items-center justify-between gap-4 border-b border-border pb-4 mb-2">
                <div>
                  <h3 className="text-primary">{form.id ? 'Edit Training' : 'Create Training'}</h3>
                  <p className="text-sm text-foreground/60">Fill in the training details, then save to update the catalog.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-2 rounded-lg hover:bg-muted text-foreground/70"
                >
                  Close
                </button>
              </div>

              <Field label="Title" value={form.title} onChange={(value) => onFormChange({ ...form, title: value })} required />
              <Field label="Slug" value={form.slug} onChange={(value) => onFormChange({ ...form, slug: value })} required />
              <Field label="Short Description" value={form.shortDescription} onChange={(value) => onFormChange({ ...form, shortDescription: value })} required wide />
              <TextareaField label="Overview" value={form.overview} onChange={(value) => onFormChange({ ...form, overview: value })} required />
              <TextareaField label="Target Participants" value={form.targetParticipants} onChange={(value) => onFormChange({ ...form, targetParticipants: value })} />

              <div>
                <label className="block mb-2">Category</label>
                <select value={form.categoryId} onChange={(event) => onFormChange({ ...form, categoryId: event.target.value })} className="w-full px-3 py-2 bg-input-background rounded-lg border border-border">
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <Field label="Duration" value={form.duration} onChange={(value) => onFormChange({ ...form, duration: value })} required />
              <Field label="Delivery Mode" value={form.deliveryMode} onChange={(value) => onFormChange({ ...form, deliveryMode: value })} required />
              <Field label="Icon Key" value={form.imageIcon} onChange={(value) => onFormChange({ ...form, imageIcon: value })} />
              <NumberField label="Base Price" value={form.basePrice} onChange={(value) => onFormChange({ ...form, basePrice: value })} />
              <NumberField label="Min Participants" value={form.minParticipants} onChange={(value) => onFormChange({ ...form, minParticipants: value })} />
              <NumberField label="Max Participants" value={form.maxParticipants} onChange={(value) => onFormChange({ ...form, maxParticipants: value })} />

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(event) => onFormChange({ ...form, isActive: event.target.checked })} />
                Active
              </label>

              <div className="md:col-span-2 flex gap-3 justify-end border-t border-border pt-4 mt-2">
                <Button type="button" variant="outline" onClick={handleCancelForm}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : form.id ? 'Update Training' : 'Create Training'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredTrainings.map((training) => (
          <div key={training.id} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p style={{ fontWeight: 600 }}>{training.title}</p>
              <p className="text-sm text-foreground/60">
                {training.category?.name ?? 'Uncategorized'} · {training.duration} · {training.mode}
                {!training.is_active && ' · Inactive'}
              </p>
              <p className="text-sm text-primary mt-1">PHP {training.base_price.toLocaleString()}</p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button size="sm" variant="outline" onClick={() => handleEditTraining(training)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => onActiveChange(training.id, !training.is_active)} disabled={saving}>
                {training.is_active ? 'Deactivate' : 'Restore'}
              </Button>
            </div>
          </div>
        ))}

        {filteredTrainings.length === 0 && (
          <div className="bg-muted rounded-lg p-6 text-center">
            <p className="text-foreground/60">No trainings match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required = false, wide = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="block mb-2">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} className="w-full px-3 py-2 bg-card rounded-lg border border-border" />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <label className="block mb-2">{label}</label>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full px-3 py-2 bg-card rounded-lg border border-border" />
    </div>
  );
}

function TextareaField({ label, value, onChange, required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="md:col-span-2">
      <label className="block mb-2">{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} rows={4} className="w-full px-3 py-2 bg-card rounded-lg border border-border" />
    </div>
  );
}
