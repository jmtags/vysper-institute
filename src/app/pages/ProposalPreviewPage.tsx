import { useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { Download, CheckCircle, Edit } from 'lucide-react';
import { BRAND_LOGO, BRAND_NAME, BRAND_PROPOSAL_PREFIX, BRAND_TAGLINE, BRAND_TRAINING_CENTER } from '../branding';
import { useAuth } from '../auth/AuthContext';
import { createTrainingProposal, updateTrainingProposal } from '../lib/trainingData';
import { downloadProposal } from '../lib/proposalDownload';
import { AuthModal } from '../components/AuthModal';

interface ProposalPreviewPageProps {
  data: any;
  onNavigate: (page: string, data?: any) => void;
}

export function ProposalPreviewPage({ data, onNavigate }: ProposalPreviewPageProps) {
  const { user, profile } = useAuth();
  const { training, formData, selectedAddOns = [], basePrice, totalPrice, proposal } = data;
  const isExistingProposal = Boolean(proposal?.id);
  const proposalNumber = proposal?.proposal_number || `${BRAND_PROPOSAL_PREFIX}-PENDING`;
  const isAdmin = profile?.role === 'admin';
  const userCanEdit = !isExistingProposal || isAdmin || !['accepted', 'archived'].includes(proposal?.status);
  const statusLabel = proposal?.status === 'accepted'
    ? 'Approved'
    : proposal?.status === 'submitted'
      ? 'Pending Review'
      : proposal?.status;
  const [clientInfo, setClientInfo] = useState({
    organizationName: proposal?.organization_name ?? '',
    contactPerson: proposal?.contact_person ?? '',
    contactEmail: proposal?.contact_email ?? user?.email ?? '',
    contactPhone: proposal?.contact_phone ?? ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const [savedProposalNumber, setSavedProposalNumber] = useState(proposal?.proposal_number ?? '');

  const downloadData = useMemo(() => ({
    proposalNumber: savedProposalNumber || proposalNumber,
    trainingTitle: training.title,
    organizationName: clientInfo.organizationName,
    contactPerson: clientInfo.contactPerson,
    contactEmail: clientInfo.contactEmail,
    contactPhone: clientInfo.contactPhone,
    participants: formData.participants,
    duration: formData.duration,
    deliveryMode: formData.mode,
    venue: formData.venue,
    preferredDate: formData.preferredDate,
    basePrice,
    totalPrice,
    addOns: selectedAddOns.map((addOn: any) => ({
      name: addOn.name,
      quantity: addOn.quantity,
      totalPrice: addOn.totalPrice
    }))
  }), [basePrice, clientInfo, formData, proposalNumber, savedProposalNumber, selectedAddOns, totalPrice, training.title]);

  const validateClientInfo = () => {
    const errors: Record<string, string> = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!clientInfo.organizationName.trim()) errors.organizationName = 'Please enter your organization or company name.';
    if (!clientInfo.contactPerson.trim()) errors.contactPerson = 'Please enter the contact person for this quotation.';
    if (!clientInfo.contactEmail.trim()) {
      errors.contactEmail = 'Please enter an email address.';
    } else if (!emailPattern.test(clientInfo.contactEmail)) {
      errors.contactEmail = 'Please enter a valid email address.';
    }
    if (!clientInfo.contactPhone.trim()) errors.contactPhone = 'Please enter a contact phone number.';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitProposal = async () => {
    if (!validateClientInfo()) {
      setMessage('Please complete the required client information before submitting.');
      return;
    }

    if (!user) {
      setMessage('Please log in or create an account before submitting your quotation request.');
      return;
    }

    if (!userCanEdit) {
      setMessage('This quotation has been approved and can no longer be edited by the user.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const payload = {
        organizationName: clientInfo.organizationName,
        contactPerson: clientInfo.contactPerson,
        contactEmail: clientInfo.contactEmail,
        contactPhone: clientInfo.contactPhone,
        participants: parseInt(formData.participants),
        duration: formData.duration,
        deliveryMode: formData.mode,
        venue: formData.venue,
        preferredDate: formData.preferredDate,
        basePrice,
        totalPrice,
        addOns: selectedAddOns.map((addOn: any) => ({
          addOnId: addOn.id,
          quantity: addOn.quantity,
          unitPrice: addOn.unit_price,
          totalPrice: addOn.totalPrice
        }))
      };

      if (isExistingProposal) {
        await updateTrainingProposal({ proposalId: proposal.id, ...payload });
        setSavedProposalNumber(proposal.proposal_number);
        setMessage(`Quotation updated successfully: ${proposal.proposal_number}`);
        setTimeout(() => onNavigate('dashboard'), 900);
      } else {
        const createdProposal = await createTrainingProposal({
          userId: user.id,
          trainingId: training.id,
          ...payload
        });

        setSavedProposalNumber(createdProposal.proposal_number);
        setMessage(`Quotation request submitted successfully: ${createdProposal.proposal_number}`);
        setTimeout(() => onNavigate('dashboard'), 900);
      }
    } catch (error: any) {
      setMessage(error.message ?? 'Unable to save quotation request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 text-primary">Training Quotation</h1>
            <p className="text-foreground/60">
              Quotation ID: {savedProposalNumber || proposalNumber}
            </p>
            {proposal?.status && (
              <p className="text-sm text-secondary capitalize mt-1">Status: {statusLabel}</p>
            )}
          </div>
          <Button variant="outline" onClick={() => downloadProposal(downloadData)}>
            <Download className="w-4 h-4" />
            Download Quotation
          </Button>
        </div>

        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-secondary p-8 text-primary-foreground">
            <div className="flex items-center gap-4">
              <img src={BRAND_LOGO} alt="" className="h-16 w-16 object-contain" />
              <div>
                <h2 className="mb-1">{BRAND_NAME}</h2>
                <p>{BRAND_TAGLINE}</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {proposal?.status && (
              <section>
                <h3 className="mb-4 pb-2 border-b border-border text-primary">Quotation Status</h3>
                <QuotationStatusTimeline status={proposal.status} declineReason={proposal.decline_reason} />
              </section>
            )}

            {!userCanEdit && (
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-sm text-foreground/80">
                This quotation has been approved. Regular users can view and download it, but edits are locked.
              </div>
            )}

            {!user && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-5">
                <h3 className="text-primary mb-2">Account Required</h3>
                <p className="text-sm text-foreground/75 mb-4">
                  To protect your quotation request and let you track its status, please log in or create an account before submitting.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="button" onClick={() => setAuthMode('login')}>Log in</Button>
                  <Button type="button" variant="outline" onClick={() => setAuthMode('signup')}>Create Account</Button>
                </div>
              </div>
            )}

            <section>
              <h3 className="mb-4 pb-2 border-b border-border text-primary">Client Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <ClientInput label="Organization Name" value={clientInfo.organizationName} error={validationErrors.organizationName} disabled={!userCanEdit} onChange={(value) => {
                  setClientInfo({ ...clientInfo, organizationName: value });
                  setValidationErrors({ ...validationErrors, organizationName: '' });
                }} />
                <ClientInput label="Contact Person" value={clientInfo.contactPerson} error={validationErrors.contactPerson} disabled={!userCanEdit} onChange={(value) => {
                  setClientInfo({ ...clientInfo, contactPerson: value });
                  setValidationErrors({ ...validationErrors, contactPerson: '' });
                }} />
                <ClientInput label="Email Address" type="email" value={clientInfo.contactEmail} error={validationErrors.contactEmail} disabled={!userCanEdit} onChange={(value) => {
                  setClientInfo({ ...clientInfo, contactEmail: value });
                  setValidationErrors({ ...validationErrors, contactEmail: '' });
                }} />
                <ClientInput label="Phone Number" type="tel" value={clientInfo.contactPhone} error={validationErrors.contactPhone} disabled={!userCanEdit} onChange={(value) => {
                  setClientInfo({ ...clientInfo, contactPhone: value });
                  setValidationErrors({ ...validationErrors, contactPhone: '' });
                }} />
              </div>
            </section>

            <section>
              <h3 className="mb-4 pb-2 border-b border-border text-primary">Training Details</h3>
              <div className="bg-muted rounded-lg p-6 space-y-3 text-sm">
                <DetailRow label="Training Program" value={training.title} />
                <DetailRow label="Number of Participants" value={formData.participants} />
                <DetailRow label="Duration" value={formData.duration} />
                <DetailRow label="Mode of Delivery" value={formData.mode} />
                <DetailRow label="Venue" value={formData.venue === 'client-site' ? 'Client Site' : BRAND_TRAINING_CENTER} />
                <DetailRow label="Preferred Date" value={formData.preferredDate || 'To be confirmed'} />
              </div>
            </section>

            <section>
              <h3 className="mb-4 pb-2 border-b border-border text-primary">Cost Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Base Training Fee ({formData.duration})</span>
                  <span>PHP {basePrice.toLocaleString()}</span>
                </div>

                {selectedAddOns.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm mb-2" style={{ fontWeight: 600 }}>Add-ons:</p>
                    {selectedAddOns.map((addOn: any) => (
                      <div key={addOn.id} className="flex justify-between text-sm mb-2">
                        <span>{addOn.name} ({addOn.quantity}x)</span>
                        <span>PHP {addOn.totalPrice.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t-2 border-primary/20">
                  <div className="flex justify-between items-center">
                    <span style={{ fontWeight: 600 }}>Total Investment:</span>
                    <span className="text-3xl text-primary" style={{ fontWeight: 700 }}>
                      PHP {totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-secondary/10 rounded-lg p-6">
              <h4 className="mb-3 text-secondary">What's Included:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {['Expert facilitators', 'Training materials', 'Certificates', 'Post-training support'].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-secondary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {message && (
              <p className={`text-sm ${message.includes('successfully') ? 'text-secondary' : 'text-destructive'}`}>
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 flex gap-4 justify-end">
          {userCanEdit && (
            <Button variant="outline" onClick={() => onNavigate('training-builder', { training, proposal, formData, selectedAddOns, basePrice, totalPrice, clientInfo })}>
              <Edit className="w-4 h-4" />
              Edit Request
            </Button>
          )}
          {userCanEdit && (
            <Button onClick={handleSubmitProposal} disabled={submitting || (!isExistingProposal && Boolean(savedProposalNumber))}>
              {submitting ? 'Saving...' : isExistingProposal ? 'Update Quotation' : savedProposalNumber ? 'Submitted' : 'Submit Quotation Request'}
            </Button>
          )}
        </div>
      </div>
      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onModeChange={setAuthMode}
          onAuthenticated={() => {
            setAuthMode(null);
            setMessage('You are now signed in. Please review your details, then submit your quotation request.');
          }}
        />
      )}
    </div>
  );
}

function ClientInput({ label, value, onChange, disabled, type = 'text' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      <p className="text-foreground/60 mb-1">{label}</p>
      <input
        type={type}
        value={value}
        disabled={disabled}
        required
        onChange={(event) => onChange(event.target.value)}
        className={`w-full px-3 py-2 bg-input-background rounded-lg border ${error ? 'border-destructive' : 'border-border'} disabled:opacity-70`}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-foreground/60">{label}:</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function QuotationStatusTimeline({ status, declineReason }: { status: string; declineReason?: string | null }) {
  const steps = [
    { key: 'submitted', label: 'Pending Review' },
    { key: 'accepted', label: 'Approved' },
    { key: 'declined', label: 'Declined' },
    { key: 'archived', label: 'Archived' }
  ];
  const currentIndex = steps.findIndex((step) => step.key === status);

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
