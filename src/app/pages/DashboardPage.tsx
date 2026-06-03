import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { FileText, GraduationCap, Mail, Shield, User, Users, Settings } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ContactMessage, ContactMessageStatus, fetchContactMessages, updateContactMessageStatus } from '../lib/contactMessages';
import {
  fetchProfiles,
  fetchTrainingCategories,
  fetchTrainingProposalDetails,
  fetchTrainingProposals,
  fetchTrainingSpeakerIds,
  fetchTrainings,
  fetchSpeakers,
  setTrainingActive,
  setSpeakerActive,
  Speaker,
  Training,
  TrainingCategory,
  updateTrainingSpeakers,
  updateProfileRole,
  updateTrainingProposalReview,
  updateTrainingProposalStatus,
  uploadSpeakerProfileImage,
  upsertSpeaker,
  upsertTraining
} from '../lib/trainingData';
import { BRAND_NAME } from '../branding';
import { downloadProposal } from '../lib/proposalDownload';

interface DashboardPageProps {
  onNavigate: (page: string, data?: any) => void;
}

type AdminTab = 'proposals' | 'messages' | 'users' | 'trainings' | 'speakers';

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
  isActive: true,
  speakerIds: [] as string[]
};

const emptySpeakerForm = {
  id: '',
  fullName: '',
  title: '',
  specialty: '',
  bioNotes: '',
  profileImageUrl: '',
  sortOrder: 0,
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
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [trainingForm, setTrainingForm] = useState(emptyTrainingForm);
  const [speakerForm, setSpeakerForm] = useState(emptySpeakerForm);
  const [quotationReview, setQuotationReview] = useState<any | null>(null);
  const [reviewForm, setReviewForm] = useState({
    status: 'submitted',
    adminNotes: '',
    declineReason: ''
  });
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      const [proposalData, categoryData, trainingData, speakerData] = await Promise.all([
        fetchTrainingProposals(),
        fetchTrainingCategories(),
        fetchTrainings(isAdmin),
        fetchSpeakers(isAdmin)
      ]);

      setProposals(proposalData);
      setCategories(categoryData);
      setTrainings(trainingData);
      setSpeakers(speakerData);

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
    if (activeTab === 'speakers') return 'Speaker Management';
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

  const handleReviewProposal = async (proposalId: string) => {
    setSaving(true);
    setError('');

    try {
      const detail = await fetchTrainingProposalDetails(proposalId);
      setQuotationReview(detail);
      setReviewForm({
        status: detail.proposal.status,
        adminNotes: detail.proposal.admin_notes ?? '',
        declineReason: detail.proposal.decline_reason ?? ''
      });
    } catch (err: any) {
      setError(err.message ?? 'Unable to open quotation review.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReview = async (statusOverride?: string) => {
    if (!quotationReview) return;

    const nextStatus = (statusOverride ?? reviewForm.status) as any;
    if (nextStatus === 'declined' && !reviewForm.declineReason.trim()) {
      setError('Please add a decline reason before declining the quotation.');
      return;
    }

    setSaving(true);
    setNotice('');
    setError('');

    try {
      await updateTrainingProposalReview({
        proposalId: quotationReview.proposal.id,
        status: nextStatus,
        adminNotes: reviewForm.adminNotes,
        declineReason: reviewForm.declineReason
      });

      setProposals((current) => current.map((proposal) => proposal.id === quotationReview.proposal.id
        ? {
            ...proposal,
            status: nextStatus,
            admin_notes: reviewForm.adminNotes,
            decline_reason: nextStatus === 'declined' ? reviewForm.declineReason : null
          }
        : proposal
      ));
      setQuotationReview(null);
      setNotice(nextStatus === 'accepted'
        ? 'Quotation request approved.'
        : nextStatus === 'declined'
          ? 'Quotation request declined.'
          : 'Quotation review updated.'
      );
    } catch (err: any) {
      setError(err.message ?? 'Unable to save quotation review.');
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

  const editTraining = async (training: Training) => {
    let speakerIds: string[] = [];
    try {
      speakerIds = await fetchTrainingSpeakerIds(training.id);
    } catch {
      speakerIds = [];
    }

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
      isActive: training.is_active,
      speakerIds
    });
    setActiveTab('trainings');
  };

  const handleTrainingSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');

    try {
      const trainingId = await upsertTraining({
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

      await updateTrainingSpeakers(trainingId, trainingForm.speakerIds);
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

  const editSpeaker = (speaker: Speaker) => {
    setSpeakerForm({
      id: speaker.id,
      fullName: speaker.full_name,
      title: speaker.title ?? '',
      specialty: speaker.specialty ?? '',
      bioNotes: speaker.bio_notes ?? '',
      profileImageUrl: speaker.profile_image_url ?? '',
      sortOrder: speaker.sort_order,
      isActive: speaker.is_active
    });
    setActiveTab('speakers');
  };

  const handleSpeakerSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');

    try {
      await upsertSpeaker({
        id: speakerForm.id || undefined,
        fullName: speakerForm.fullName,
        title: speakerForm.title,
        specialty: speakerForm.specialty,
        bioNotes: speakerForm.bioNotes,
        profileImageUrl: speakerForm.profileImageUrl,
        sortOrder: Number(speakerForm.sortOrder),
        isActive: speakerForm.isActive
      });

      setSpeakers(await fetchSpeakers(true));
      setSpeakerForm(emptySpeakerForm);
      setNotice(speakerForm.id ? 'Speaker updated.' : 'Speaker created.');
      return true;
    } catch (err: any) {
      setError(err.message ?? 'Unable to save speaker.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSpeakerActiveChange = async (speakerId: string, isActive: boolean) => {
    setSaving(true);
    setNotice('');
    setError('');

    try {
      await setSpeakerActive(speakerId, isActive);
      setSpeakers(await fetchSpeakers(true));
      setNotice(isActive ? 'Speaker restored.' : 'Speaker deactivated.');
    } catch (err: any) {
      setError(err.message ?? 'Unable to update speaker.');
    } finally {
      setSaving(false);
    }
  };

  const handleSpeakerImageUpload = async (file: File) => {
    setSaving(true);
    setNotice('');
    setError('');

    try {
      const imageUrl = await uploadSpeakerProfileImage(file);
      setNotice('Speaker photo uploaded. Save the speaker to keep this photo.');
      return imageUrl;
    } catch (err: any) {
      setError(err.message ?? 'Unable to upload speaker photo.');
      return '';
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
                  <AdminNavButton active={activeTab === 'speakers'} onClick={() => setActiveTab('speakers')} icon={<GraduationCap className="w-4 h-4" />} label="Speakers" />
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
                  onReviewProposal={handleReviewProposal}
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
                  speakers={speakers}
                  form={trainingForm}
                  saving={saving}
                  onFormChange={setTrainingForm}
                  onSubmit={handleTrainingSubmit}
                  onEdit={editTraining}
                  onCancel={() => setTrainingForm(emptyTrainingForm)}
                  onActiveChange={handleTrainingActiveChange}
                />
              )}

              {!loading && !error && isAdmin && activeTab === 'speakers' && (
                <SpeakersAdminPanel
                  speakers={speakers}
                  form={speakerForm}
                  saving={saving}
                  onFormChange={setSpeakerForm}
                  onSubmit={handleSpeakerSubmit}
                  onEdit={editSpeaker}
                  onCancel={() => setSpeakerForm(emptySpeakerForm)}
                  onActiveChange={handleSpeakerActiveChange}
                  onImageUpload={handleSpeakerImageUpload}
                />
              )}
            </section>
          </div>
        </div>
      </div>

      {quotationReview && (
        <QuotationReviewModal
          detail={quotationReview}
          form={reviewForm}
          saving={saving}
          onFormChange={setReviewForm}
          onClose={() => setQuotationReview(null)}
          onSave={handleSaveReview}
        />
      )}
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

function ProposalPanel({ proposals, isAdmin, saving, onStatusChange, onOpenProposal, onReviewProposal, onDownloadProposal, onBrowseTrainings }: {
  proposals: any[];
  isAdmin: boolean;
  saving: boolean;
  onStatusChange: (proposalId: string, status: any) => void;
  onOpenProposal: (proposalId: string, edit: boolean) => void;
  onReviewProposal: (proposalId: string) => void;
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
            <Button size="sm" variant="outline" onClick={() => isAdmin ? onReviewProposal(proposal.id) : onOpenProposal(proposal.id, false)} disabled={saving}>
              {isAdmin ? 'Review' : 'View'}
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
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm capitalize">
                {proposal.status === 'accepted' ? 'approved' : proposal.status === 'submitted' ? 'pending review' : proposal.status}
              </span>
            ) : (
              <StatusTimeline status={proposal.status} declineReason={proposal.decline_reason} compact />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusTimeline({ status, declineReason, compact = false }: { status: string; declineReason?: string | null; compact?: boolean }) {
  const steps = [
    { key: 'submitted', label: 'Pending Review' },
    { key: 'accepted', label: 'Approved' },
    { key: 'declined', label: 'Declined' },
    { key: 'archived', label: 'Archived' }
  ];
  const currentIndex = steps.findIndex((step) => step.key === status);

  if (compact) {
    return (
      <div className="min-w-[170px]">
        <span className={`inline-block px-3 py-1 rounded-full text-sm capitalize ${
          status === 'accepted'
            ? 'bg-secondary/20 text-secondary'
            : status === 'declined'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-primary/10 text-primary'
        }`}>
          {status === 'accepted' ? 'Approved' : status === 'submitted' ? 'Pending Review' : status}
        </span>
        {status === 'declined' && declineReason && (
          <p className="text-xs text-destructive mt-2 max-w-xs">{declineReason}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        {steps.map((step, index) => {
          const active = step.key === status;
          const complete = currentIndex >= index && status !== 'declined';
          return (
            <div key={step.key} className={`rounded-lg border p-3 text-sm ${
              active
                ? 'border-primary bg-primary/10 text-primary'
                : complete
                  ? 'border-secondary/30 bg-secondary/10 text-secondary'
                  : 'border-border bg-muted text-foreground/60'
            }`}>
              {step.label}
            </div>
          );
        })}
      </div>
      {status === 'declined' && declineReason && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm text-destructive" style={{ fontWeight: 600 }}>Decline Reason</p>
          <p className="text-sm text-foreground/80 mt-1">{declineReason}</p>
        </div>
      )}
    </div>
  );
}

function QuotationReviewModal({ detail, form, saving, onFormChange, onClose, onSave }: {
  detail: any;
  form: { status: string; adminNotes: string; declineReason: string };
  saving: boolean;
  onFormChange: (form: { status: string; adminNotes: string; declineReason: string }) => void;
  onClose: () => void;
  onSave: (statusOverride?: string) => void;
}) {
  const proposal = detail.proposal;
  const training = detail.training;

  return (
    <div className="fixed inset-0 z-[95] bg-black/45 flex items-center justify-center px-4 py-8">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-primary">Quotation Review</h2>
            <p className="text-sm text-foreground/60">Quotation #{proposal.proposal_number}</p>
          </div>
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg hover:bg-muted text-foreground/70">
            Close
          </button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-primary mb-3">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <InfoItem label="Organization" value={proposal.organization_name || 'Not provided'} />
              <InfoItem label="Contact Person" value={proposal.contact_person || 'Not provided'} />
              <InfoItem label="Email" value={proposal.contact_email || 'Not provided'} />
              <InfoItem label="Phone" value={proposal.contact_phone || 'Not provided'} />
            </div>
          </section>

          <section>
            <h3 className="text-primary mb-3">Training Package</h3>
            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              <InfoRow label="Program" value={training.title} />
              <InfoRow label="Participants" value={detail.formData.participants} />
              <InfoRow label="Duration" value={detail.formData.duration} />
              <InfoRow label="Delivery Mode" value={detail.formData.mode} />
              <InfoRow label="Venue" value={detail.formData.venue === 'client-site' ? 'Client Site' : 'VYSPER Institute Training Center'} />
              <InfoRow label="Preferred Date" value={detail.formData.preferredDate || 'To be confirmed'} />
            </div>
          </section>

          <section>
            <h3 className="text-primary mb-3">Add-ons and Pricing</h3>
            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              <InfoRow label="Base Training Fee" value={`PHP ${Number(detail.basePrice).toLocaleString()}`} />
              {detail.selectedAddOns.length > 0 ? detail.selectedAddOns.map((addOn: any) => (
                <InfoRow key={addOn.id} label={`${addOn.name} (${addOn.quantity}x)`} value={`PHP ${Number(addOn.totalPrice).toLocaleString()}`} />
              )) : (
                <p className="text-foreground/60">No paid add-ons selected.</p>
              )}
              <div className="pt-3 border-t border-border flex justify-between gap-4 text-base">
                <span style={{ fontWeight: 600 }}>Total Price</span>
                <span className="text-primary" style={{ fontWeight: 700 }}>PHP {Number(detail.totalPrice).toLocaleString()}</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-primary mb-3">User Status Timeline</h3>
            <StatusTimeline status={form.status} declineReason={form.declineReason} />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Status</label>
              <select
                value={form.status}
                onChange={(event) => onFormChange({ ...form, status: event.target.value })}
                className="w-full px-3 py-2 bg-input-background rounded-lg border border-border"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Pending Review</option>
                <option value="accepted">Approved</option>
                <option value="declined">Declined</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block mb-2">Admin Notes</label>
              <textarea
                value={form.adminNotes}
                onChange={(event) => onFormChange({ ...form, adminNotes: event.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-input-background rounded-lg border border-border"
                placeholder="Internal notes for the admin team"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-2">Decline Reason</label>
              <textarea
                value={form.declineReason}
                onChange={(event) => onFormChange({ ...form, declineReason: event.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-input-background rounded-lg border border-border"
                placeholder="Visible to the user when the quotation is declined"
              />
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-border flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="outline" onClick={() => onSave('declined')} disabled={saving}>
            Decline
          </Button>
          <Button type="button" variant="secondary" onClick={() => onSave('accepted')} disabled={saving}>
            Approve
          </Button>
          <Button type="button" onClick={() => onSave()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Review'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted rounded-lg p-3">
      <p className="text-xs text-foreground/60">{label}</p>
      <p className="text-foreground/90">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-foreground/60">{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
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

function TrainingsAdminPanel({ categories, trainings, speakers, form, saving, onFormChange, onSubmit, onEdit, onCancel, onActiveChange }: {
  categories: TrainingCategory[];
  trainings: Training[];
  speakers: Speaker[];
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

              <div className="md:col-span-2">
                <label className="block mb-2">Keynote Speaker/s</label>
                {speakers.length === 0 ? (
                  <p className="text-sm text-foreground/60 bg-input-background rounded-lg border border-border p-3">
                    No speakers available yet. Add speakers from the Speakers module first.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {speakers.map((speaker) => (
                      <label key={speaker.id} className="flex items-start gap-3 p-3 bg-input-background rounded-lg border border-border">
                        <input
                          type="checkbox"
                          checked={form.speakerIds.includes(speaker.id)}
                          onChange={(event) => {
                            const speakerIds = event.target.checked
                              ? [...form.speakerIds, speaker.id]
                              : form.speakerIds.filter((speakerId) => speakerId !== speaker.id);
                            onFormChange({ ...form, speakerIds });
                          }}
                          className="mt-1"
                        />
                        <span>
                          <span className="block" style={{ fontWeight: 600 }}>{speaker.full_name}</span>
                          <span className="block text-xs text-foreground/60">{speaker.specialty || speaker.title || 'Speaker'}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

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

function SpeakersAdminPanel({ speakers, form, saving, onFormChange, onSubmit, onEdit, onCancel, onActiveChange, onImageUpload }: {
  speakers: Speaker[];
  form: typeof emptySpeakerForm;
  saving: boolean;
  onFormChange: (form: typeof emptySpeakerForm) => void;
  onSubmit: (event: FormEvent) => Promise<boolean>;
  onEdit: (speaker: Speaker) => void;
  onCancel: () => void;
  onActiveChange: (speakerId: string, isActive: boolean) => void;
  onImageUpload: (file: File) => Promise<string>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const filteredSpeakers = speakers.filter((speaker) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return [
      speaker.full_name,
      speaker.title,
      speaker.specialty,
      speaker.bio_notes
    ].some((value) => value?.toLowerCase().includes(query));
  });

  const handleAddSpeaker = () => {
    onCancel();
    setShowForm(true);
  };

  const handleEditSpeaker = (speaker: Speaker) => {
    onEdit(speaker);
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

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const imageUrl = await onImageUpload(file);
    if (imageUrl) {
      onFormChange({ ...form, profileImageUrl: imageUrl });
    }
    event.target.value = '';
    setUploadingImage(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-primary">Speaker Directory</h3>
          <p className="text-sm text-foreground/60">Manage keynote speakers, bionotes, specialties, and profile images.</p>
        </div>
        <Button onClick={handleAddSpeaker}>Add Speaker</Button>
      </div>

      <div>
        <label className="block mb-2 text-sm">Search Speakers</label>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name, title, specialty, or bionotes"
          className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[90] bg-black/45 flex items-center justify-center px-4 py-8">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmitForm} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex items-center justify-between gap-4 border-b border-border pb-4 mb-2">
                <div>
                  <h3 className="text-primary">{form.id ? 'Edit Speaker' : 'Create Speaker'}</h3>
                  <p className="text-sm text-foreground/60">Add profile details that will appear on training pages.</p>
                </div>
                <button type="button" onClick={handleCancelForm} className="px-3 py-2 rounded-lg hover:bg-muted text-foreground/70">
                  Close
                </button>
              </div>

              <Field label="Full Name" value={form.fullName} onChange={(value) => onFormChange({ ...form, fullName: value })} required />
              <Field label="Title" value={form.title} onChange={(value) => onFormChange({ ...form, title: value })} />
              <Field label="Specialty" value={form.specialty} onChange={(value) => onFormChange({ ...form, specialty: value })} wide />
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-[96px_1fr] gap-4 items-start">
                {form.profileImageUrl ? (
                  <img src={form.profileImageUrl} alt="Speaker preview" className="h-24 w-24 rounded-lg object-cover bg-muted border border-border" />
                ) : (
                  <div className="h-24 w-24 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-border">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                )}
                <div className="space-y-3">
                  <label className="block">
                    <span className="block mb-2">Upload Profile Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={saving || uploadingImage}
                      className="w-full px-3 py-2 bg-card rounded-lg border border-border"
                    />
                  </label>
                  <Field label="Profile Image URL" value={form.profileImageUrl} onChange={(value) => onFormChange({ ...form, profileImageUrl: value })} />
                  <p className="text-xs text-foreground/60">
                    {uploadingImage ? 'Uploading photo...' : 'Upload a JPG, PNG, or WebP image up to 5MB.'}
                  </p>
                </div>
              </div>
              <TextareaField label="Bionotes" value={form.bioNotes} onChange={(value) => onFormChange({ ...form, bioNotes: value })} />
              <NumberField label="Sort Order" value={form.sortOrder} onChange={(value) => onFormChange({ ...form, sortOrder: value })} />

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(event) => onFormChange({ ...form, isActive: event.target.checked })} />
                Active
              </label>

              <div className="md:col-span-2 flex gap-3 justify-end border-t border-border pt-4 mt-2">
                <Button type="button" variant="outline" onClick={handleCancelForm}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : form.id ? 'Update Speaker' : 'Create Speaker'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredSpeakers.map((speaker) => (
          <div key={speaker.id} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 p-4 bg-muted rounded-lg">
            <div className="flex gap-4">
              {speaker.profile_image_url ? (
                <img src={speaker.profile_image_url} alt={speaker.full_name} className="h-16 w-16 rounded-lg object-cover bg-card" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <GraduationCap className="w-7 h-7" />
                </div>
              )}
              <div>
                <p style={{ fontWeight: 600 }}>{speaker.full_name}</p>
                <p className="text-sm text-foreground/60">
                  {[speaker.title, speaker.specialty].filter(Boolean).join(' / ') || 'No title or specialty'}
                  {!speaker.is_active && ' / Inactive'}
                </p>
                <p className="text-sm text-foreground/70 mt-2 line-clamp-2">{speaker.bio_notes || 'No bionotes yet.'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button size="sm" variant="outline" onClick={() => handleEditSpeaker(speaker)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => onActiveChange(speaker.id, !speaker.is_active)} disabled={saving}>
                {speaker.is_active ? 'Deactivate' : 'Restore'}
              </Button>
            </div>
          </div>
        ))}

        {filteredSpeakers.length === 0 && (
          <div className="bg-muted rounded-lg p-6 text-center">
            <p className="text-foreground/60">No speakers match your search.</p>
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
