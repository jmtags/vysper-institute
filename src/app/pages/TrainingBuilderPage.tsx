import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { BRAND_TRAINING_CENTER } from '../branding';
import { fetchTrainingAddOns, fetchUnavailableTrainingDates, Training, TrainingAddOn } from '../lib/trainingData';

const TRANSPORT_FREE_KM = 3;
const TRANSPORT_RATE_PER_KM = 75;

interface TrainingBuilderPageProps {
  training: Training | any;
  onNavigate: (page: string, data?: any) => void;
}

export function TrainingBuilderPage({ training: input, onNavigate }: TrainingBuilderPageProps) {
  const training = input.training ?? input;
  const existingProposal = input.proposal;
  const existingClientInfo = input.clientInfo;
  const [step, setStep] = useState(1);
  const [addOns, setAddOns] = useState<TrainingAddOn[]>([]);
  const [loadingAddOns, setLoadingAddOns] = useState(true);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [loadingUnavailableDates, setLoadingUnavailableDates] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    participants: input.formData?.participants ?? '',
    duration: input.formData?.duration ?? training.duration,
    mode: input.formData?.mode ?? training.mode,
    venue: input.formData?.venue ?? 'client-site',
    venueAddress: input.formData?.venueAddress ?? '',
    distanceKm: input.formData?.distanceKm ?? '',
    preferredDate: input.formData?.preferredDate ?? '',
    addOns: (input.formData?.addOns ?? {}) as Record<string, boolean>
  });

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetchTrainingAddOns(),
      fetchUnavailableTrainingDates({
        trainingId: training.id,
        excludeProposalId: existingProposal?.id ?? null
      })
    ])
      .then((data) => {
        if (!mounted) return;
        const [addOnData, bookedDates] = data;
        setAddOns(addOnData);
        setUnavailableDates(bookedDates);
        setFormData((current) => ({
          ...current,
          addOns: Object.fromEntries(addOnData.map((addOn) => [
            addOn.key,
            current.addOns[addOn.key] ?? (addOn.pricing_type === 'included')
          ]))
        }));
      })
      .finally(() => {
        if (mounted) {
          setLoadingAddOns(false);
          setLoadingUnavailableDates(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const steps = [
    { number: 1, title: 'Training Details' },
    { number: 2, title: 'Add-ons' },
    { number: 3, title: 'Review' }
  ];

  const participants = parseInt(formData.participants) || 0;

  const calculateBasePrice = () => {
    let basePrice = training.base_price;

    if (formData.duration === 'Whole-day' && training.duration !== 'Whole-day') basePrice += 10000;
    if (formData.duration === '2 hours' && training.duration !== '2 hours') basePrice = Math.max(0, basePrice - 5000);
    if (participants > training.max_participants) basePrice += 5000;

    return basePrice;
  };

  const selectedAddOns = addOns
    .filter((addOn) => formData.addOns[addOn.key])
    .map((addOn) => {
      const quantity = addOn.pricing_type === 'per_participant' ? participants : 1;
      const totalPrice = addOn.pricing_type === 'included' ? 0 : addOn.unit_price * quantity;
      return { ...addOn, quantity, totalPrice };
    });

  const calculatePrice = () => {
    return calculateBasePrice() + selectedAddOns.reduce((total, addOn) => total + addOn.totalPrice, 0) + calculateTransportFee();
  };

  const calculateTransportFee = () => {
    if (formData.venue !== 'client-site') return 0;
    const distance = Number(formData.distanceKm) || 0;
    const billableDistance = Math.max(0, Math.ceil(distance - TRANSPORT_FREE_KM));
    return billableDistance * TRANSPORT_RATE_PER_KM;
  };

  const today = new Date().toISOString().slice(0, 10);

  const validateTrainingDetails = () => {
    const errors: Record<string, string> = {};
    const participantCount = Number(formData.participants);

    if (!formData.participants) {
      errors.participants = 'Please enter the expected number of participants.';
    } else if (!Number.isInteger(participantCount) || participantCount <= 0) {
      errors.participants = 'Participants must be a whole number greater than 0.';
    }

    if (!formData.duration) errors.duration = 'Please select a preferred duration.';
    if (!formData.mode) errors.mode = 'Please select a mode of delivery.';
    if (!formData.venue) errors.venue = 'Please select a venue option.';
    if (formData.venue === 'client-site') {
      const distance = Number(formData.distanceKm);
      if (!formData.venueAddress.trim()) {
        errors.venueAddress = 'Please enter the client site address for transportation planning.';
      }
      if (!formData.distanceKm) {
        errors.distanceKm = 'Please enter the estimated distance in kilometers.';
      } else if (!Number.isFinite(distance) || distance < 0) {
        errors.distanceKm = 'Distance must be 0 or greater.';
      }
    }

    if (!formData.preferredDate) {
      errors.preferredDate = 'Please select a preferred training date.';
    } else if (formData.preferredDate < today) {
      errors.preferredDate = 'Preferred date cannot be in the past.';
    } else if (unavailableDates.includes(formData.preferredDate)) {
      errors.preferredDate = 'This training is already confirmed on the selected date. Please choose another date.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinue = () => {
    if (step === 1 && !validateTrainingDetails()) return;
    setValidationErrors({});
    setStep(step + 1);
  };

  const handleGenerateProposal = () => {
    if (!validateTrainingDetails()) {
      setStep(1);
      return;
    }

    onNavigate('proposal-preview', {
      training,
      proposal: existingProposal,
      clientInfo: existingClientInfo,
      formData,
      selectedAddOns,
      basePrice: calculateBasePrice(),
      totalPrice: calculatePrice(),
      transportFee: calculateTransportFee()
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2 text-primary">{existingProposal ? 'Update Training Quotation' : 'Request Training Quotation'}</h1>
          <p className="text-foreground/70">{training.title}</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => (
              <div key={s.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      step >= s.number
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border-2 border-border text-foreground/40'
                    }`}
                    style={{ fontWeight: 600 }}
                  >
                    {step > s.number ? <Check className="w-5 h-5" /> : s.number}
                  </div>
                  <p className="text-sm mt-2 text-center">{s.title}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-4 ${step > s.number ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl p-8 shadow-sm border border-border mb-6">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-primary">Training Details</h2>

              <div>
                <label className="block mb-2">Number of Participants</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.participants}
                  onChange={(event) => {
                    setFormData({ ...formData, participants: event.target.value });
                    setValidationErrors({ ...validationErrors, participants: '' });
                  }}
                  placeholder="e.g., 25"
                  className={`w-full px-4 py-3 bg-input-background rounded-lg border ${validationErrors.participants ? 'border-destructive' : 'border-border'}`}
                />
                {validationErrors.participants && <p className="text-sm text-destructive mt-2">{validationErrors.participants}</p>}
              </div>

              <div>
                <label className="block mb-2">Duration</label>
                <div className="space-y-2">
                  {['2 hours', 'Half-day', 'Whole-day'].map((duration) => (
                    <label key={duration} className="flex items-center gap-3 p-3 bg-input-background rounded-lg cursor-pointer hover:bg-muted">
                      <input
                        type="radio"
                        name="duration"
                        value={duration}
                        checked={formData.duration === duration}
                        onChange={(event) => {
                          setFormData({ ...formData, duration: event.target.value });
                          setValidationErrors({ ...validationErrors, duration: '' });
                        }}
                        className="w-4 h-4"
                      />
                      <span>{duration}</span>
                    </label>
                  ))}
                </div>
                {validationErrors.duration && <p className="text-sm text-destructive mt-2">{validationErrors.duration}</p>}
              </div>

              <div>
                <label className="block mb-2">Mode of Delivery</label>
                <div className="space-y-2">
                  {['Online', 'Face-to-Face', 'Hybrid'].map((mode) => (
                    <label key={mode} className="flex items-center gap-3 p-3 bg-input-background rounded-lg cursor-pointer hover:bg-muted">
                      <input
                        type="radio"
                        name="mode"
                        value={mode}
                        checked={formData.mode === mode}
                        onChange={(event) => {
                          setFormData({ ...formData, mode: event.target.value });
                          setValidationErrors({ ...validationErrors, mode: '' });
                        }}
                        className="w-4 h-4"
                      />
                      <span>{mode}</span>
                    </label>
                  ))}
                </div>
                {validationErrors.mode && <p className="text-sm text-destructive mt-2">{validationErrors.mode}</p>}
              </div>

              <div>
                <label className="block mb-2">Venue</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-input-background rounded-lg cursor-pointer hover:bg-muted">
                    <input
                      type="radio"
                      name="venue"
                      value="client-site"
                      checked={formData.venue === 'client-site'}
                      onChange={(event) => {
                        setFormData({ ...formData, venue: event.target.value });
                        setValidationErrors({ ...validationErrors, venue: '' });
                      }}
                      className="w-4 h-4"
                    />
                    <span>Client Site</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-input-background rounded-lg cursor-pointer hover:bg-muted">
                    <input
                      type="radio"
                      name="venue"
                      value="vysper-site"
                      checked={formData.venue === 'vysper-site'}
                      onChange={(event) => {
                        setFormData({ ...formData, venue: event.target.value });
                        setValidationErrors({ ...validationErrors, venue: '' });
                      }}
                      className="w-4 h-4"
                    />
                    <span>{BRAND_TRAINING_CENTER}</span>
                  </label>
                </div>
                {validationErrors.venue && <p className="text-sm text-destructive mt-2">{validationErrors.venue}</p>}
              </div>

              {formData.venue === 'client-site' && (
                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-4">
                  <div>
                    <label className="block mb-2">Client Site Address</label>
                    <input
                      type="text"
                      required
                      value={formData.venueAddress}
                      onChange={(event) => {
                        setFormData({ ...formData, venueAddress: event.target.value });
                        setValidationErrors({ ...validationErrors, venueAddress: '' });
                      }}
                      placeholder="Building, street, city, province"
                      className={`w-full px-4 py-3 bg-input-background rounded-lg border ${validationErrors.venueAddress ? 'border-destructive' : 'border-border'}`}
                    />
                    {validationErrors.venueAddress && <p className="text-sm text-destructive mt-2">{validationErrors.venueAddress}</p>}
                  </div>

                  <div>
                    <label className="block mb-2">Estimated Distance from VYSPER Institute (km)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      required
                      value={formData.distanceKm}
                      onChange={(event) => {
                        setFormData({ ...formData, distanceKm: event.target.value });
                        setValidationErrors({ ...validationErrors, distanceKm: '' });
                      }}
                      placeholder="e.g., 8"
                      className={`w-full px-4 py-3 bg-input-background rounded-lg border ${validationErrors.distanceKm ? 'border-destructive' : 'border-border'}`}
                    />
                    {validationErrors.distanceKm && <p className="text-sm text-destructive mt-2">{validationErrors.distanceKm}</p>}
                    <p className="text-sm text-foreground/60 mt-2">
                      First {TRANSPORT_FREE_KM} km is free. Additional distance is computed at PHP {TRANSPORT_RATE_PER_KM.toLocaleString()} per km.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block mb-2">Preferred Date</label>
                <TrainingDateCalendar
                  value={formData.preferredDate}
                  minDate={today}
                  unavailableDates={unavailableDates}
                  loading={loadingUnavailableDates}
                  onChange={(date) => {
                    setFormData({ ...formData, preferredDate: date });
                    setValidationErrors({ ...validationErrors, preferredDate: '' });
                  }}
                />
                {validationErrors.preferredDate && <p className="text-sm text-destructive mt-2">{validationErrors.preferredDate}</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-primary">Add-ons & Enhancements</h2>

              {loadingAddOns ? (
                <p className="text-foreground/60">Loading add-ons...</p>
              ) : (
                <div className="space-y-3">
                  {addOns.map((addOn) => (
                    <label key={addOn.id} className="flex items-start gap-3 p-4 bg-input-background rounded-lg cursor-pointer hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.addOns[addOn.key])}
                        disabled={addOn.pricing_type === 'included'}
                        onChange={(event) => setFormData({
                          ...formData,
                          addOns: { ...formData.addOns, [addOn.key]: event.target.checked }
                        })}
                        className="w-5 h-5 mt-0.5"
                      />
                      <div className="flex-1">
                        <p style={{ fontWeight: 600 }}>{addOn.name}</p>
                        <p className="text-sm text-foreground/60">{addOn.description}</p>
                        <p className="text-sm text-secondary mt-1">
                          {addOn.pricing_type === 'included'
                            ? 'Included'
                            : addOn.pricing_type === 'per_participant'
                              ? `+PHP ${addOn.unit_price.toLocaleString()} per participant`
                              : `+PHP ${addOn.unit_price.toLocaleString()}`}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-primary">Review Your Quotation Request</h2>

              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="mb-3">Training Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-foreground/60">Training:</span>
                      <span style={{ fontWeight: 600 }}>{training.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Participants:</span>
                      <span style={{ fontWeight: 600 }}>{formData.participants || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Duration:</span>
                      <span style={{ fontWeight: 600 }}>{formData.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Mode:</span>
                      <span style={{ fontWeight: 600 }}>{formData.mode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Venue:</span>
                      <span style={{ fontWeight: 600 }}>
                        {formData.venue === 'client-site' ? 'Client Site' : BRAND_TRAINING_CENTER}
                      </span>
                    </div>
                    {formData.venue === 'client-site' && (
                      <>
                        <div className="flex justify-between gap-4">
                          <span className="text-foreground/60">Client Site Address:</span>
                          <span className="text-right" style={{ fontWeight: 600 }}>{formData.venueAddress || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Estimated Distance:</span>
                          <span style={{ fontWeight: 600 }}>{formData.distanceKm || '0'} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Transportation Fee:</span>
                          <span style={{ fontWeight: 600 }}>PHP {calculateTransportFee().toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Preferred Date:</span>
                      <span style={{ fontWeight: 600 }}>{formData.preferredDate || 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-4">
                  <h3 className="mb-3">Selected Add-ons</h3>
                  <div className="space-y-2 text-sm">
                    {selectedAddOns.map((addOn) => (
                      <div key={addOn.id} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-secondary" />
                        <span>{addOn.name} {addOn.totalPrice === 0 ? '(Included)' : `(PHP ${addOn.totalPrice.toLocaleString()})`}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 border-2 border-primary/20">
                  <p className="text-sm text-foreground/60 mb-1">Total Investment</p>
                  <p className="text-4xl text-primary" style={{ fontWeight: 700 }}>
                    PHP {calculatePrice().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={handleContinue}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleGenerateProposal} disabled={!participants}>
              {existingProposal ? 'Review Updated Quotation' : 'Generate Quotation'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function TrainingDateCalendar({ value, minDate, unavailableDates, loading, onChange }: {
  value: string;
  minDate: string;
  unavailableDates: string[];
  loading: boolean;
  onChange: (date: string) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateKey(value || minDate));
  const unavailableSet = new Set(unavailableDates);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];

  const changeMonth = (offset: number) => {
    setVisibleMonth(new Date(year, month + offset, 1));
  };

  return (
    <div className="rounded-lg border border-border bg-input-background p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="h-9 w-9 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-primary" style={{ fontWeight: 700 }}>
          {visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="h-9 w-9 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-foreground/60 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} className="aspect-square" />;

          const dateKey = toDateKey(new Date(year, month, day));
          const isPast = dateKey < minDate;
          const isUnavailable = unavailableSet.has(dateKey);
          const disabled = isPast || isUnavailable || loading;
          const selected = value === dateKey;

          return (
            <button
              key={dateKey}
              type="button"
              disabled={disabled}
              onClick={() => onChange(dateKey)}
              title={isUnavailable ? 'This training is already confirmed on this date' : undefined}
              className={`aspect-square rounded-lg border text-sm transition-colors ${
                selected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : isUnavailable
                    ? 'bg-destructive/10 text-destructive border-destructive/20 cursor-not-allowed line-through'
                    : isPast
                      ? 'bg-muted text-foreground/30 border-border cursor-not-allowed'
                      : 'bg-card text-foreground border-border hover:bg-primary/10 hover:text-primary'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-foreground/60">
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-primary" /> Selected</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-destructive/20 border border-destructive/20" /> Booked</span>
        {loading && <span>Checking availability...</span>}
      </div>
    </div>
  );
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
