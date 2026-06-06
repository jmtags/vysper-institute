import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { Award, BarChart3, Check, Download, FileText, GraduationCap, Mail, Shield, Upload, User, Users, Settings } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../auth/AuthContext';
import { ContactMessage, ContactMessageStatus, fetchContactMessages, updateContactMessageStatus } from '../lib/contactMessages';
import { AnalyticsVisit, fetchWebsiteVisits } from '../lib/analytics';
import {
  fetchProfiles,
  fetchTrainingAddOns,
  fetchTrainingCategories,
  fetchTrainingProposalDetails,
  fetchTrainingProposals,
  fetchTrainingSpeakerIds,
  fetchTrainingDetails,
  fetchTrainings,
  fetchSpeakers,
  setTrainingActive,
  setTrainingAddOnActive,
  setSpeakerActive,
  Speaker,
  Training,
  TrainingAddOn,
  TrainingCategory,
  updateTrainingContent,
  updateTrainingSpeakers,
  updateProfileRole,
  updateTrainingProposalReview,
  updateTrainingProposalStatus,
  uploadSpeakerProfileImage,
  uploadTrainingImage,
  upsertTrainingAddOn,
  upsertSpeaker,
  upsertTraining
} from '../lib/trainingData';
import { BRAND_NAME } from '../branding';
import { downloadProposal } from '../lib/proposalDownload';
import { BulkCertificateInput, CertificateRecord, CertificateStatus, bulkUpsertCertificates, fetchCertificates, updateCertificateStatus, upsertCertificate } from '../lib/certificates';

interface DashboardPageProps {
  onNavigate: (page: string, data?: any) => void;
}

type AdminTab = 'proposals' | 'messages' | 'users' | 'trainings' | 'add-ons' | 'speakers' | 'certificates' | 'analytics';

const emptyTrainingForm = {
  id: '',
  categoryId: '',
  slug: '',
  title: '',
  shortDescription: '',
  overview: '',
  targetParticipants: '',
  objectivesText: '',
  outlineText: '',
  duration: 'Half-day',
  deliveryMode: 'Hybrid',
  imageIcon: 'brain',
  imageUrl: '',
  imagePosition: 'center center',
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

const emptyAddOnForm = {
  id: '',
  key: '',
  name: '',
  description: '',
  pricingType: 'fixed' as TrainingAddOn['pricing_type'],
  unitPrice: 0,
  sortOrder: 0,
  isActive: true
};

const emptyCertificateForm = {
  id: '',
  certificateNumber: '',
  recipientName: '',
  programTitle: '',
  issuedDate: new Date().toISOString().slice(0, 10),
  completionDate: '',
  facilitatorName: '',
  remarks: '',
  status: 'active' as CertificateStatus
};

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState<AdminTab>('proposals');
  const [proposals, setProposals] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [analyticsVisits, setAnalyticsVisits] = useState<AnalyticsVisit[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [trainingAddOns, setTrainingAddOns] = useState<TrainingAddOn[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [trainingForm, setTrainingForm] = useState(emptyTrainingForm);
  const [speakerForm, setSpeakerForm] = useState(emptySpeakerForm);
  const [addOnForm, setAddOnForm] = useState(emptyAddOnForm);
  const [certificateForm, setCertificateForm] = useState(emptyCertificateForm);
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
      const [proposalData, categoryData, trainingData, speakerData, addOnData] = await Promise.all([
        fetchTrainingProposals(),
        fetchTrainingCategories(),
        fetchTrainings(isAdmin),
        fetchSpeakers(isAdmin),
        fetchTrainingAddOns(isAdmin)
      ]);

      setProposals(proposalData);
      setCategories(categoryData);
      setTrainings(trainingData);
      setSpeakers(speakerData);
      setTrainingAddOns(addOnData);

      if (isAdmin) {
        const [profileData, messageData, visitData, certificateData] = await Promise.all([
          fetchProfiles(),
          fetchContactMessages(),
          fetchWebsiteVisits(),
          fetchCertificates()
        ]);
        setProfiles(profileData);
        setMessages(messageData);
        setAnalyticsVisits(visitData);
        setCertificates(certificateData);
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
    if (activeTab === 'add-ons') return 'Add-ons Management';
    if (activeTab === 'speakers') return 'Speaker Management';
    if (activeTab === 'certificates') return 'Certificate Verification';
    if (activeTab === 'analytics') return 'Website Analytics';
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
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write('<p style="font-family: Arial, sans-serif; padding: 24px;">Preparing your quotation...</p>');
    }

    try {
      const detail = await fetchTrainingProposalDetails(proposalId);
      await downloadProposal({
        proposalNumber: detail.proposal.proposal_number,
        status: detail.proposal.status,
        trainingTitle: detail.training.title,
        organizationName: detail.proposal.organization_name,
        contactPerson: detail.proposal.contact_person,
        contactEmail: detail.proposal.contact_email,
        contactPhone: detail.proposal.contact_phone,
        participants: detail.formData.participants,
        duration: detail.formData.duration,
        deliveryMode: detail.formData.mode,
        venue: detail.formData.venue,
        venueAddress: detail.formData.venueAddress,
        distanceKm: detail.formData.distanceKm,
        preferredDate: detail.formData.preferredDate,
        basePrice: detail.basePrice,
        transportFee: detail.transportFee,
        totalPrice: detail.totalPrice,
        trainingImageUrl: detail.training.image_url,
        trainingImagePosition: detail.training.image_position,
        addOns: detail.selectedAddOns.map((addOn: any) => ({
          name: addOn.name,
          quantity: addOn.quantity,
          totalPrice: addOn.totalPrice
        })),
        adminNotes: detail.proposal.admin_notes,
        declineReason: detail.proposal.decline_reason
      }, pdfWindow);
    } catch (err: any) {
      if (pdfWindow && !pdfWindow.closed) pdfWindow.close();
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
    let objectivesText = '';
    let outlineText = '';
    try {
      const [speakerData, detailData] = await Promise.all([
        fetchTrainingSpeakerIds(training.id),
        fetchTrainingDetails(training.id)
      ]);
      speakerIds = speakerData;
      objectivesText = detailData.objectives.join('\n');
      outlineText = detailData.outline.join('\n');
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
      objectivesText,
      outlineText,
      duration: training.duration,
      deliveryMode: training.delivery_mode,
      imageIcon: training.image_icon ?? 'brain',
      imageUrl: training.image_url ?? '',
      imagePosition: training.image_position ?? 'center center',
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
        imageUrl: trainingForm.imageUrl,
        imagePosition: trainingForm.imagePosition,
        minParticipants: Number(trainingForm.minParticipants),
        maxParticipants: Number(trainingForm.maxParticipants),
        basePrice: Number(trainingForm.basePrice),
        isActive: trainingForm.isActive
      });

      await updateTrainingSpeakers(trainingId, trainingForm.speakerIds);
      await updateTrainingContent(trainingId, {
        objectives: trainingForm.objectivesText.split('\n'),
        outline: trainingForm.outlineText.split('\n')
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

  const handleTrainingImageUpload = async (file: File) => {
    setSaving(true);
    setNotice('');
    setError('');

    try {
      const imageUrl = await uploadTrainingImage(file);
      setNotice('Training image uploaded. Save the training to keep this image.');
      return imageUrl;
    } catch (err: any) {
      setError(err.message ?? 'Unable to upload training image.');
      return '';
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

  const editAddOn = (addOn: TrainingAddOn) => {
    setAddOnForm({
      id: addOn.id,
      key: addOn.key,
      name: addOn.name,
      description: addOn.description ?? '',
      pricingType: addOn.pricing_type,
      unitPrice: addOn.unit_price,
      sortOrder: addOn.sort_order,
      isActive: addOn.is_active
    });
    setActiveTab('add-ons');
  };

  const handleAddOnSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');

    try {
      await upsertTrainingAddOn({
        id: addOnForm.id || undefined,
        key: addOnForm.key.trim(),
        name: addOnForm.name.trim(),
        description: addOnForm.description,
        pricingType: addOnForm.pricingType,
        unitPrice: Number(addOnForm.unitPrice),
        sortOrder: Number(addOnForm.sortOrder),
        isActive: addOnForm.isActive
      });

      setTrainingAddOns(await fetchTrainingAddOns(true));
      setAddOnForm(emptyAddOnForm);
      setNotice(addOnForm.id ? 'Add-on updated.' : 'Add-on created.');
      return true;
    } catch (err: any) {
      setError(err.message ?? 'Unable to save add-on.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAddOnActiveChange = async (addOnId: string, isActive: boolean) => {
    setSaving(true);
    setNotice('');
    setError('');

    try {
      await setTrainingAddOnActive(addOnId, isActive);
      setTrainingAddOns(await fetchTrainingAddOns(true));
      setNotice(isActive ? 'Add-on restored.' : 'Add-on deactivated.');
    } catch (err: any) {
      setError(err.message ?? 'Unable to update add-on.');
    } finally {
      setSaving(false);
    }
  };

  const editCertificate = (certificate: CertificateRecord) => {
    setCertificateForm({
      id: certificate.id,
      certificateNumber: certificate.certificate_number,
      recipientName: certificate.recipient_name,
      programTitle: certificate.program_title,
      issuedDate: certificate.issued_date,
      completionDate: certificate.completion_date ?? '',
      facilitatorName: certificate.facilitator_name ?? '',
      remarks: certificate.remarks ?? '',
      status: certificate.status
    });
    setActiveTab('certificates');
  };

  const handleCertificateSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');

    try {
      await upsertCertificate({
        id: certificateForm.id || undefined,
        certificateNumber: certificateForm.certificateNumber,
        recipientName: certificateForm.recipientName,
        programTitle: certificateForm.programTitle,
        issuedDate: certificateForm.issuedDate,
        completionDate: certificateForm.completionDate,
        facilitatorName: certificateForm.facilitatorName,
        remarks: certificateForm.remarks,
        status: certificateForm.status
      });

      setCertificates(await fetchCertificates());
      setCertificateForm(emptyCertificateForm);
      setNotice(certificateForm.id ? 'Certificate updated.' : 'Certificate created.');
      return true;
    } catch (err: any) {
      setError(err.message ?? 'Unable to save certificate.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCertificateStatusChange = async (certificateId: string, status: CertificateStatus) => {
    setSaving(true);
    setNotice('');
    setError('');

    try {
      await updateCertificateStatus(certificateId, status);
      setCertificates(await fetchCertificates());
      setNotice('Certificate status updated.');
    } catch (err: any) {
      setError(err.message ?? 'Unable to update certificate status.');
    } finally {
      setSaving(false);
    }
  };

  const handleCertificateBulkImport = async (file: File) => {
    setSaving(true);
    setNotice('');
    setError('');

    try {
      const text = await file.text();
      const rows = parseCertificateCsv(text);
      await bulkUpsertCertificates(rows);
      setCertificates(await fetchCertificates());
      setNotice(`${rows.length} certificate${rows.length === 1 ? '' : 's'} imported successfully.`);
    } catch (err: any) {
      setError(err.message ?? 'Unable to import certificate list.');
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

        {isAdmin && (
          <AdminKpiCards proposals={proposals} messages={messages} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
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
                  <AdminNavButton active={activeTab === 'add-ons'} onClick={() => setActiveTab('add-ons')} icon={<Check className="w-4 h-4" />} label="Add-ons" />
                  <AdminNavButton active={activeTab === 'speakers'} onClick={() => setActiveTab('speakers')} icon={<GraduationCap className="w-4 h-4" />} label="Speakers" />
                  <AdminNavButton active={activeTab === 'certificates'} onClick={() => setActiveTab('certificates')} icon={<Award className="w-4 h-4" />} label="Certificates" />
                  <AdminNavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 className="w-4 h-4" />} label="Analytics" />
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

              {!loading && !error && isAdmin && activeTab === 'analytics' && (
                <AnalyticsPanel visits={analyticsVisits} />
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
                  onImageUpload={handleTrainingImageUpload}
                />
              )}

              {!loading && !error && isAdmin && activeTab === 'add-ons' && (
                <AddOnsAdminPanel
                  addOns={trainingAddOns}
                  form={addOnForm}
                  saving={saving}
                  onFormChange={setAddOnForm}
                  onSubmit={handleAddOnSubmit}
                  onEdit={editAddOn}
                  onCancel={() => setAddOnForm(emptyAddOnForm)}
                  onActiveChange={handleAddOnActiveChange}
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

              {!loading && !error && isAdmin && activeTab === 'certificates' && (
                <CertificatesAdminPanel
                  certificates={certificates}
                  form={certificateForm}
                  saving={saving}
                  onFormChange={setCertificateForm}
                  onSubmit={handleCertificateSubmit}
                  onEdit={editCertificate}
                  onCancel={() => setCertificateForm(emptyCertificateForm)}
                  onStatusChange={handleCertificateStatusChange}
                  onBulkImport={handleCertificateBulkImport}
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

function AdminKpiCards({ proposals, messages }: { proposals: any[]; messages: ContactMessage[] }) {
  const pendingCount = proposals.filter((proposal) => proposal.status === 'submitted').length;
  const approvedCount = proposals.filter((proposal) => proposal.status === 'accepted').length;
  const estimatedRevenue = proposals
    .filter((proposal) => proposal.status === 'accepted')
    .reduce((total, proposal) => total + Number(proposal.total_price || 0), 0);
  const newMessages = messages.filter((message) => message.status === 'new').length;
  const trainingCounts = proposals.reduce<Record<string, number>>((counts, proposal) => {
    const title = proposal.training?.title ?? 'Unassigned Training';
    counts[title] = (counts[title] ?? 0) + 1;
    return counts;
  }, {});
  const mostRequested = Object.entries(trainingCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <KpiCard label="Pending Quotations" value={pendingCount.toLocaleString()} />
      <KpiCard label="Approved Quotations" value={approvedCount.toLocaleString()} />
      <KpiCard label="Estimated Revenue" value={`PHP ${estimatedRevenue.toLocaleString()}`} />
      <KpiCard label="New Messages" value={newMessages.toLocaleString()} />
      <KpiCard label="Most Requested" value={mostRequested ? mostRequested[0] : 'No requests yet'} compact />
    </div>
  );
}

function KpiCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-5 min-h-28">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className={`${compact ? 'text-lg' : 'text-2xl'} text-primary mt-2`} style={{ fontWeight: 700 }}>
        {value}
      </p>
    </div>
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
              {detail.formData.venue === 'client-site' && (
                <>
                  <InfoRow label="Client Site Address" value={detail.formData.venueAddress || 'Not provided'} />
                  <InfoRow label="Estimated Distance" value={`${detail.formData.distanceKm || 0} km`} />
                </>
              )}
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
              {detail.formData.venue === 'client-site' && (
                <InfoRow label="Transportation Fee" value={`PHP ${Number(detail.transportFee ?? 0).toLocaleString()}`} />
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

function AnalyticsPanel({ visits }: { visits: AnalyticsVisit[] }) {
  const today = new Date().toDateString();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const visitsToday = visits.filter((visit) => new Date(visit.created_at).toDateString() === today).length;
  const visitsThisWeek = visits.filter((visit) => new Date(visit.created_at) >= sevenDaysAgo).length;
  const uniqueVisitors = new Set(visits.map((visit) => visit.visitor_id).filter(Boolean)).size;

  const pageTotals = Object.values(visits.reduce<Record<string, { title: string; count: number }>>((totals, visit) => {
    const key = visit.page_key;
    totals[key] = totals[key] ?? { title: visit.page_title, count: 0 };
    totals[key].count += 1;
    return totals;
  }, {})).sort((a, b) => b.count - a.count);

  const trainingTotals = Object.values(visits
    .filter((visit) => visit.training_id)
    .reduce<Record<string, { title: string; count: number }>>((totals, visit) => {
      const key = visit.training_id as string;
      totals[key] = totals[key] ?? { title: visit.training?.title ?? visit.page_title, count: 0 };
      totals[key].count += 1;
      return totals;
    }, {}))
    .sort((a, b) => b.count - a.count);

  const dailyVisits = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    return {
      date: label,
      visits: visits.filter((visit) => visit.created_at.slice(0, 10) === key).length
    };
  });

  const pageChartData = pageTotals.slice(0, 6).map((row) => ({
    name: row.title.length > 18 ? `${row.title.slice(0, 18)}...` : row.title,
    visits: row.count
  }));

  const trainingChartData = trainingTotals.slice(0, 6).map((row) => ({
    name: row.title.length > 18 ? `${row.title.slice(0, 18)}...` : row.title,
    views: row.count
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnalyticsStat label="Total Visits" value={visits.length} />
        <AnalyticsStat label="Today" value={visitsToday} />
        <AnalyticsStat label="Last 7 Days" value={visitsThisWeek} />
        <AnalyticsStat label="Unique Visitors" value={uniqueVisitors} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnalyticsChartCard title="Daily Visits">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailyVisits} margin={{ top: 12, right: 12, bottom: 8, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.12)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="visits" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Page Visits">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pageChartData} margin={{ top: 12, right: 12, bottom: 8, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.12)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="visits" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>
      </div>

      <AnalyticsChartCard title="Training Views">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={trainingChartData} layout="vertical" margin={{ top: 12, right: 16, bottom: 8, left: 90 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.12)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={96} />
            <Tooltip />
            <Bar dataKey="views" fill="var(--secondary)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </AnalyticsChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsList title="Popular Pages" rows={pageTotals} emptyText="No page visits yet." />
        <AnalyticsList title="Most Viewed Trainings" rows={trainingTotals} emptyText="No training views yet." />
      </div>

      <div>
        <h3 className="mb-4 text-primary">Recent Visits</h3>
        <div className="space-y-3">
          {visits.slice(0, 12).map((visit) => (
            <div key={visit.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-muted rounded-lg p-4">
              <div>
                <p style={{ fontWeight: 600 }}>{visit.training?.title ?? visit.page_title}</p>
                <p className="text-sm text-foreground/60">
                  {visit.page_key.replace('-', ' ')}
                  {visit.referrer && ` / From ${visit.referrer}`}
                </p>
              </div>
              <p className="text-sm text-foreground/60">{new Date(visit.created_at).toLocaleString()}</p>
            </div>
          ))}

          {visits.length === 0 && (
            <div className="bg-muted rounded-lg p-6 text-center">
              <p className="text-foreground/60">No analytics data yet. Visits will appear after the SQL patch is run and visitors browse the website.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-muted rounded-lg p-4">
      <h3 className="mb-4 text-primary">{title}</h3>
      {children}
    </div>
  );
}

function AnalyticsStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted rounded-lg p-4">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="text-3xl text-primary mt-1" style={{ fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function AnalyticsList({ title, rows, emptyText }: {
  title: string;
  rows: Array<{ title: string; count: number }>;
  emptyText: string;
}) {
  return (
    <div>
      <h3 className="mb-4 text-primary">{title}</h3>
      <div className="space-y-3">
        {rows.slice(0, 8).map((row) => (
          <div key={row.title} className="flex items-center justify-between gap-4 bg-muted rounded-lg p-4">
            <p className="text-foreground/80">{row.title}</p>
            <p className="text-primary" style={{ fontWeight: 700 }}>{row.count}</p>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="bg-muted rounded-lg p-6 text-center">
            <p className="text-foreground/60">{emptyText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TrainingsAdminPanel({ categories, trainings, speakers, form, saving, onFormChange, onSubmit, onEdit, onCancel, onActiveChange, onImageUpload }: {
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
  onImageUpload: (file: File) => Promise<string>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
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

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const imageUrl = await onImageUpload(file);
    if (imageUrl) {
      onFormChange({ ...form, imageUrl });
    }
    event.target.value = '';
    setUploadingImage(false);
  };

  const imagePositionParts = form.imagePosition.match(/^(\d{1,3})% (\d{1,3})%$/);
  const imagePositionX = imagePositionParts ? Number(imagePositionParts[1]) : 50;
  const imagePositionY = imagePositionParts ? Number(imagePositionParts[2]) : 50;
  const setImagePosition = (x: number, y: number) => {
    onFormChange({ ...form, imagePosition: `${x}% ${y}%` });
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
              <TextareaField
                label="Learning Objectives"
                value={form.objectivesText}
                onChange={(value) => onFormChange({ ...form, objectivesText: value })}
                placeholder="Enter one learning objective per line"
              />
              <TextareaField
                label="Training Outline"
                value={form.outlineText}
                onChange={(value) => onFormChange({ ...form, outlineText: value })}
                placeholder="Enter one outline item per line"
              />

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
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4 items-start">
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt="Training preview"
                    className="h-28 w-full rounded-lg object-cover bg-muted border border-border"
                    style={{ objectPosition: form.imagePosition }}
                  />
                ) : (
                  <div className="h-28 w-full rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-border">
                    <GraduationCap className="w-9 h-9" />
                  </div>
                )}
                <div className="space-y-3">
                  <label className="block">
                    <span className="block mb-2">Upload Training Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={saving || uploadingImage}
                      className="w-full px-3 py-2 bg-card rounded-lg border border-border"
                    />
                  </label>
                  <Field label="Training Image URL" value={form.imageUrl} onChange={(value) => onFormChange({ ...form, imageUrl: value })} />
                  {form.imageUrl && (
                    <div className="space-y-3 rounded-lg border border-border bg-input-background p-3">
                      <div>
                        <label className="block mb-2 text-sm">Quick Position</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            ['Top', 50, 0],
                            ['Center', 50, 50],
                            ['Bottom', 50, 100]
                          ].map(([label, x, y]) => (
                            <button
                              key={String(label)}
                              type="button"
                              onClick={() => setImagePosition(Number(x), Number(y))}
                              className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block mb-1 text-sm">Horizontal Position</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={imagePositionX}
                          onChange={(event) => setImagePosition(Number(event.target.value), imagePositionY)}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-sm">Vertical Position</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={imagePositionY}
                          onChange={(event) => setImagePosition(imagePositionX, Number(event.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-foreground/60">
                    {uploadingImage ? 'Uploading image...' : 'Upload a JPG, PNG, WebP, or GIF up to 6MB.'}
                  </p>
                </div>
              </div>
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

function AddOnsAdminPanel({ addOns, form, saving, onFormChange, onSubmit, onEdit, onCancel, onActiveChange }: {
  addOns: TrainingAddOn[];
  form: typeof emptyAddOnForm;
  saving: boolean;
  onFormChange: (form: typeof emptyAddOnForm) => void;
  onSubmit: (event: FormEvent) => Promise<boolean>;
  onEdit: (addOn: TrainingAddOn) => void;
  onCancel: () => void;
  onActiveChange: (addOnId: string, isActive: boolean) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredAddOns = addOns.filter((addOn) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return [
      addOn.key,
      addOn.name,
      addOn.description,
      addOn.pricing_type
    ].some((value) => value?.toLowerCase().includes(query));
  });

  const handleAddAddOn = () => {
    onCancel();
    setShowForm(true);
  };

  const handleEditAddOn = (addOn: TrainingAddOn) => {
    onEdit(addOn);
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

  const formatPricing = (addOn: TrainingAddOn) => {
    if (addOn.pricing_type === 'included') return 'Included';
    if (addOn.pricing_type === 'per_participant') return `+PHP ${addOn.unit_price.toLocaleString()} per participant`;
    return `+PHP ${addOn.unit_price.toLocaleString()}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-primary">Add-ons Catalog</h3>
          <p className="text-sm text-foreground/60">Manage quotation add-ons shown in the training request builder.</p>
        </div>
        <Button onClick={handleAddAddOn}>Add Add-on</Button>
      </div>

      <div>
        <label className="block mb-2 text-sm">Search Add-ons</label>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name, key, description, or pricing type"
          className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[90] bg-black/45 flex items-center justify-center px-4 py-8">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmitForm} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex items-center justify-between gap-4 border-b border-border pb-4 mb-2">
                <div>
                  <h3 className="text-primary">{form.id ? 'Edit Add-on' : 'Create Add-on'}</h3>
                  <p className="text-sm text-foreground/60">Active add-ons are available in every training quotation request.</p>
                </div>
                <button type="button" onClick={handleCancelForm} className="px-3 py-2 rounded-lg hover:bg-muted text-foreground/70">
                  Close
                </button>
              </div>

              <Field label="Name" value={form.name} onChange={(value) => onFormChange({ ...form, name: value })} required />
              <Field label="Key" value={form.key} onChange={(value) => onFormChange({ ...form, key: value.toLowerCase().replace(/[^a-z0-9_]+/g, '_') })} required />
              <TextareaField label="Description" value={form.description} onChange={(value) => onFormChange({ ...form, description: value })} />

              <div>
                <label className="block mb-2">Pricing Type</label>
                <select
                  value={form.pricingType}
                  onChange={(event) => {
                    const pricingType = event.target.value as TrainingAddOn['pricing_type'];
                    onFormChange({ ...form, pricingType, unitPrice: pricingType === 'included' ? 0 : form.unitPrice });
                  }}
                  className="w-full px-3 py-2 bg-input-background rounded-lg border border-border"
                >
                  <option value="included">Included</option>
                  <option value="fixed">Fixed Price</option>
                  <option value="per_participant">Per Participant</option>
                </select>
              </div>

              <NumberField label="Unit Price" value={form.unitPrice} onChange={(value) => onFormChange({ ...form, unitPrice: value })} />
              <NumberField label="Sort Order" value={form.sortOrder} onChange={(value) => onFormChange({ ...form, sortOrder: value })} />

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(event) => onFormChange({ ...form, isActive: event.target.checked })} />
                Active
              </label>

              <div className="md:col-span-2 flex gap-3 justify-end border-t border-border pt-4 mt-2">
                <Button type="button" variant="outline" onClick={handleCancelForm}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : form.id ? 'Update Add-on' : 'Create Add-on'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredAddOns.map((addOn) => (
          <div key={addOn.id} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p style={{ fontWeight: 600 }}>{addOn.name}</p>
              <p className="text-sm text-foreground/60">
                {addOn.description || 'No description yet.'}
              </p>
              <p className="text-sm text-secondary mt-1">
                {formatPricing(addOn)}
                {!addOn.is_active && ' / Inactive'}
              </p>
              <p className="text-xs text-foreground/50 mt-1">Key: {addOn.key} / Sort: {addOn.sort_order}</p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button size="sm" variant="outline" onClick={() => handleEditAddOn(addOn)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => onActiveChange(addOn.id, !addOn.is_active)} disabled={saving}>
                {addOn.is_active ? 'Deactivate' : 'Restore'}
              </Button>
            </div>
          </div>
        ))}

        {filteredAddOns.length === 0 && (
          <div className="bg-muted rounded-lg p-6 text-center">
            <p className="text-foreground/60">No add-ons match your search.</p>
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

function CertificatesAdminPanel({ certificates, form, saving, onFormChange, onSubmit, onEdit, onCancel, onStatusChange, onBulkImport }: {
  certificates: CertificateRecord[];
  form: typeof emptyCertificateForm;
  saving: boolean;
  onFormChange: (form: typeof emptyCertificateForm) => void;
  onSubmit: (event: FormEvent) => Promise<boolean>;
  onEdit: (certificate: CertificateRecord) => void;
  onCancel: () => void;
  onStatusChange: (certificateId: string, status: CertificateStatus) => void;
  onBulkImport: (file: File) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredCertificates = certificates.filter((certificate) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return [
      certificate.certificate_number,
      certificate.recipient_name,
      certificate.program_title,
      certificate.facilitator_name,
      certificate.status
    ].some((value) => value?.toLowerCase().includes(query));
  });

  const handleAddCertificate = () => {
    onCancel();
    setShowForm(true);
  };

  const handleEditCertificate = (certificate: CertificateRecord) => {
    onEdit(certificate);
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

  const handleTemplateDownload = () => {
    const rows = [
      ['certificate_number', 'recipient_name', 'program_title', 'issued_date', 'completion_date', 'facilitator_name', 'remarks', 'status'],
      ['VYS-CERT-2026-0001', 'Juan Dela Cruz', 'Mental Health First Aid in the Workplace', '2026-06-06', '2026-06-05', 'Dr. Maria Santos', 'Completed with certificate of participation', 'active']
    ];
    const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vysper-certificate-import-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await onBulkImport(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-primary">Certificate Records</h3>
          <p className="text-sm text-foreground/60">Manage certificate numbers that clients can verify on the public Verify page.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleTemplateDownload}>
            <Download className="w-4 h-4" />
            Download Template
          </Button>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-primary hover:bg-muted cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload CSV
            <input type="file" accept=".csv,text/csv" onChange={handleImportChange} disabled={saving} className="sr-only" />
          </label>
          <Button onClick={handleAddCertificate}>Add Certificate</Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/60 p-4 text-sm text-foreground/70">
        Use the CSV template in Excel, keep the header row unchanged, then upload the saved CSV file. Required columns are certificate_number, recipient_name, program_title, and issued_date.
      </div>

      <div>
        <label className="block mb-2 text-sm">Search Certificates</label>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by certificate number, recipient, program, facilitator, or status"
          className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[90] bg-black/45 flex items-center justify-center px-4 py-8">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmitForm} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex items-center justify-between gap-4 border-b border-border pb-4 mb-2">
                <div>
                  <h3 className="text-primary">{form.id ? 'Edit Certificate' : 'Create Certificate'}</h3>
                  <p className="text-sm text-foreground/60">Use a unique certificate number exactly as it appears on the issued certificate.</p>
                </div>
                <button type="button" onClick={handleCancelForm} className="px-3 py-2 rounded-lg hover:bg-muted text-foreground/70">
                  Close
                </button>
              </div>

              <Field
                label="Certificate Number"
                value={form.certificateNumber}
                onChange={(value) => onFormChange({ ...form, certificateNumber: value.toUpperCase() })}
                required
              />
              <Field label="Recipient Name" value={form.recipientName} onChange={(value) => onFormChange({ ...form, recipientName: value })} required />
              <Field label="Program Title" value={form.programTitle} onChange={(value) => onFormChange({ ...form, programTitle: value })} required wide />

              <div>
                <label className="block mb-2">Issued Date</label>
                <input
                  type="date"
                  value={form.issuedDate}
                  onChange={(event) => onFormChange({ ...form, issuedDate: event.target.value })}
                  required
                  className="w-full px-3 py-2 bg-card rounded-lg border border-border"
                />
              </div>

              <div>
                <label className="block mb-2">Completion Date</label>
                <input
                  type="date"
                  value={form.completionDate}
                  onChange={(event) => onFormChange({ ...form, completionDate: event.target.value })}
                  className="w-full px-3 py-2 bg-card rounded-lg border border-border"
                />
              </div>

              <Field label="Facilitator" value={form.facilitatorName} onChange={(value) => onFormChange({ ...form, facilitatorName: value })} />

              <div>
                <label className="block mb-2">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => onFormChange({ ...form, status: event.target.value as CertificateStatus })}
                  className="w-full px-3 py-2 bg-card rounded-lg border border-border"
                >
                  <option value="active">Active</option>
                  <option value="revoked">Revoked</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <TextareaField label="Remarks" value={form.remarks} onChange={(value) => onFormChange({ ...form, remarks: value })} />

              <div className="md:col-span-2 flex gap-3 justify-end border-t border-border pt-4 mt-2">
                <Button type="button" variant="outline" onClick={handleCancelForm}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : form.id ? 'Update Certificate' : 'Create Certificate'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredCertificates.map((certificate) => (
          <div key={certificate.id} className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 p-4 bg-muted rounded-lg">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p style={{ fontWeight: 700 }} className="text-primary">{certificate.certificate_number}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                  certificate.status === 'active'
                    ? 'bg-secondary/20 text-secondary'
                    : certificate.status === 'revoked'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-foreground/10 text-foreground/60'
                }`}>
                  {certificate.status}
                </span>
              </div>
              <p className="mt-2" style={{ fontWeight: 600 }}>{certificate.recipient_name}</p>
              <p className="text-sm text-foreground/70">{certificate.program_title}</p>
              <p className="text-xs text-foreground/50 mt-1">
                Issued {new Date(certificate.issued_date).toLocaleDateString()}
                {certificate.completion_date && ` / Completed ${new Date(certificate.completion_date).toLocaleDateString()}`}
                {certificate.facilitator_name && ` / ${certificate.facilitator_name}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Button size="sm" variant="outline" onClick={() => handleEditCertificate(certificate)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => onStatusChange(certificate.id, 'active')} disabled={saving || certificate.status === 'active'}>
                Activate
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onStatusChange(certificate.id, 'revoked')} disabled={saving || certificate.status === 'revoked'}>
                Revoke
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onStatusChange(certificate.id, 'archived')} disabled={saving || certificate.status === 'archived'}>
                Archive
              </Button>
            </div>
          </div>
        ))}

        {filteredCertificates.length === 0 && (
          <div className="bg-muted rounded-lg p-6 text-center">
            <p className="text-foreground/60">No certificates match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function escapeCsvValue(value: string) {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/^\uFEFF/, '');
}

function parseCertificateCsv(csvText: string): BulkCertificateInput[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('The uploaded CSV has no certificate rows.');
  }

  const headers = splitCsvLine(lines[0]).map(normalizeCsvHeader);
  const requiredHeaders = ['certificate_number', 'recipient_name', 'program_title', 'issued_date'];
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required column${missingHeaders.length === 1 ? '' : 's'}: ${missingHeaders.join(', ')}.`);
  }

  const getValue = (values: string[], header: string) => {
    const index = headers.indexOf(header);
    return index >= 0 ? values[index]?.trim() ?? '' : '';
  };

  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line);
    const rowNumber = index + 2;
    const certificateNumber = getValue(values, 'certificate_number').toUpperCase();
    const recipientName = getValue(values, 'recipient_name');
    const programTitle = getValue(values, 'program_title');
    const issuedDate = getValue(values, 'issued_date');
    const completionDate = getValue(values, 'completion_date');
    const statusValue = getValue(values, 'status').toLowerCase() || 'active';
    const status = ['active', 'revoked', 'archived'].includes(statusValue) ? statusValue as CertificateStatus : null;

    if (!certificateNumber) throw new Error(`Row ${rowNumber}: certificate_number is required.`);
    if (!recipientName) throw new Error(`Row ${rowNumber}: recipient_name is required.`);
    if (!programTitle) throw new Error(`Row ${rowNumber}: program_title is required.`);
    if (!issuedDate) throw new Error(`Row ${rowNumber}: issued_date is required.`);
    if (Number.isNaN(Date.parse(issuedDate))) throw new Error(`Row ${rowNumber}: issued_date must be a valid date, ideally YYYY-MM-DD.`);
    if (completionDate && Number.isNaN(Date.parse(completionDate))) throw new Error(`Row ${rowNumber}: completion_date must be a valid date, ideally YYYY-MM-DD.`);
    if (!status) throw new Error(`Row ${rowNumber}: status must be active, revoked, or archived.`);

    return {
      certificateNumber,
      recipientName,
      programTitle,
      issuedDate,
      completionDate,
      facilitatorName: getValue(values, 'facilitator_name'),
      remarks: getValue(values, 'remarks'),
      status
    };
  });
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

function TextareaField({ label, value, onChange, required = false, placeholder = '' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="md:col-span-2">
      <label className="block mb-2">{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} rows={4} className="w-full px-3 py-2 bg-card rounded-lg border border-border" />
    </div>
  );
}
