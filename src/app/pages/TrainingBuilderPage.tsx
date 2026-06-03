import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Check } from 'lucide-react';
import { BRAND_TRAINING_CENTER } from '../branding';
import { fetchTrainingAddOns, Training, TrainingAddOn } from '../lib/trainingData';

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
  const [formData, setFormData] = useState({
    participants: input.formData?.participants ?? '',
    duration: input.formData?.duration ?? training.duration,
    mode: input.formData?.mode ?? training.mode,
    venue: input.formData?.venue ?? 'client-site',
    preferredDate: input.formData?.preferredDate ?? '',
    addOns: (input.formData?.addOns ?? {}) as Record<string, boolean>
  });

  useEffect(() => {
    let mounted = true;

    fetchTrainingAddOns()
      .then((data) => {
        if (!mounted) return;
        setAddOns(data);
        setFormData((current) => ({
          ...current,
          addOns: Object.fromEntries(data.map((addOn) => [
            addOn.key,
            current.addOns[addOn.key] ?? (addOn.pricing_type === 'included')
          ]))
        }));
      })
      .finally(() => {
        if (mounted) setLoadingAddOns(false);
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
    return calculateBasePrice() + selectedAddOns.reduce((total, addOn) => total + addOn.totalPrice, 0);
  };

  const handleGenerateProposal = () => {
    onNavigate('proposal-preview', {
      training,
      proposal: existingProposal,
      clientInfo: existingClientInfo,
      formData,
      selectedAddOns,
      basePrice: calculateBasePrice(),
      totalPrice: calculatePrice()
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
                  value={formData.participants}
                  onChange={(event) => setFormData({ ...formData, participants: event.target.value })}
                  placeholder="e.g., 25"
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"
                />
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
                        onChange={(event) => setFormData({ ...formData, duration: event.target.value })}
                        className="w-4 h-4"
                      />
                      <span>{duration}</span>
                    </label>
                  ))}
                </div>
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
                        onChange={(event) => setFormData({ ...formData, mode: event.target.value })}
                        className="w-4 h-4"
                      />
                      <span>{mode}</span>
                    </label>
                  ))}
                </div>
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
                      onChange={(event) => setFormData({ ...formData, venue: event.target.value })}
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
                      onChange={(event) => setFormData({ ...formData, venue: event.target.value })}
                      className="w-4 h-4"
                    />
                    <span>{BRAND_TRAINING_CENTER}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block mb-2">Preferred Date</label>
                <input
                  type="date"
                  value={formData.preferredDate}
                  onChange={(event) => setFormData({ ...formData, preferredDate: event.target.value })}
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"
                />
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
            <Button onClick={() => setStep(step + 1)}>
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
