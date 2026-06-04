import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Clock, Users, Monitor, CheckCircle, Star } from 'lucide-react';
import { fetchTrainingBySlug, fetchTrainingDetails, Training, TrainingDetails } from '../lib/trainingData';
import { trackWebsiteVisit } from '../lib/analytics';
import { downloadTrainingBrochure } from '../lib/brochureDownload';

interface TrainingDetailsPageProps {
  training: Partial<Training> & { slug?: string };
  onNavigate: (page: string, data?: any) => void;
}

export function TrainingDetailsPage({ training, onNavigate }: TrainingDetailsPageProps) {
  const [details, setDetails] = useState<TrainingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadDetails = async () => {
      const baseTraining = training.id ? training as Training : await fetchTrainingBySlug(training.slug ?? '');
      return fetchTrainingDetails(baseTraining.id);
    };

    loadDetails()
      .then((data) => {
        if (mounted) setDetails(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message ?? 'Unable to load training details.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [training.id, training.slug]);

  const currentTraining = details ?? training;

  useEffect(() => {
    if (!details) return;

    document.title = `${details.title} | VYSPER INSTITUTE`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', details.description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `${window.location.origin}/trainings/${details.slug}`);

    void trackWebsiteVisit({
      pageKey: 'training-details',
      pageTitle: details.title,
      trainingId: details.id
    });
  }, [details]);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-gradient-to-br from-primary/10 to-secondary/10 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-foreground/60 mb-4">
              <button onClick={() => onNavigate('trainings')} className="hover:text-primary">
                Trainings
              </button>
              <span>/</span>
              <span className="text-primary">{currentTraining.title ?? 'Training Details'}</span>
            </div>
            <h1 className="mb-4 text-primary">{currentTraining.title ?? 'Training Details'}</h1>
            <p className="text-xl text-foreground/80 max-w-3xl">
              {currentTraining.description ?? 'Loading training information...'}
            </p>
          </div>
          {currentTraining.image_url && (
            <img
              src={currentTraining.image_url}
              alt={currentTraining.title ?? 'Training image'}
              className="w-full h-64 rounded-xl object-cover shadow-sm border border-border bg-card"
            />
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading && (
          <div className="bg-card rounded-xl p-12 text-center shadow-sm border border-border">
            <p className="text-foreground/60">Loading training details...</p>
          </div>
        )}

        {error && (
          <div className="bg-card rounded-xl p-12 text-center shadow-sm border border-border">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-card rounded-xl p-8 shadow-sm border border-border">
                <h2 className="mb-4 text-primary">Overview</h2>
                <p className="text-foreground/80 leading-relaxed">
                  {currentTraining.overview}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-foreground/60">Duration</p>
                      <p style={{ fontWeight: 600 }}>{currentTraining.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-foreground/60">Mode</p>
                      <p style={{ fontWeight: 600 }}>{currentTraining.mode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-foreground/60">Group Size</p>
                      <p style={{ fontWeight: 600 }}>{currentTraining.min_participants}-{currentTraining.max_participants}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-card rounded-xl p-8 shadow-sm border border-border">
                <h2 className="mb-4 text-primary">Learning Objectives</h2>
                <div className="space-y-3">
                  {(details?.objectives ?? []).map((objective, index) => (
                    <div key={index} className="flex gap-3">
                      <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <p className="text-foreground/80">{objective}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-card rounded-xl p-8 shadow-sm border border-border">
                <h2 className="mb-4 text-primary">Target Participants</h2>
                <p className="text-foreground/80">
                  {currentTraining.target_participants}
                </p>
              </section>

              <section className="bg-card rounded-xl p-8 shadow-sm border border-border">
                <h2 className="mb-4 text-primary">Training Outline</h2>
                <div className="space-y-3">
                  {(details?.outline ?? []).map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0" style={{ fontWeight: 600 }}>
                        {index + 1}
                      </div>
                      <p className="text-foreground/80 pt-1">{item}</p>
                    </div>
                  ))}
                </div>
              </section>

              {(details?.speakers ?? []).length > 0 && (
                <section className="bg-card rounded-xl p-8 shadow-sm border border-border">
                  <h2 className="mb-6 text-primary">Keynote Speaker{(details?.speakers ?? []).length > 1 ? 's' : ''}</h2>
                  <div className="space-y-6">
                    {(details?.speakers ?? []).map((speaker) => (
                      <div key={speaker.id} className="grid grid-cols-1 sm:grid-cols-[96px_1fr] gap-5">
                        {speaker.profile_image_url ? (
                          <img
                            src={speaker.profile_image_url}
                            alt={speaker.full_name}
                            className="w-24 h-24 rounded-lg object-cover bg-muted"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-2xl" style={{ fontWeight: 700 }}>
                            {speaker.full_name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <h3 className="text-primary">{speaker.full_name}</h3>
                          {(speaker.title || speaker.specialty) && (
                            <p className="text-sm text-secondary mt-1">
                              {[speaker.title, speaker.specialty].filter(Boolean).join(' / ')}
                            </p>
                          )}
                          <p className="text-foreground/80 mt-3 leading-relaxed">
                            {speaker.bio_notes || 'Speaker bionotes will be available soon.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="bg-card rounded-xl p-8 shadow-sm border border-border">
                <h2 className="mb-6 text-primary">Testimonials</h2>
                <div className="space-y-6">
                  {(details?.testimonials ?? []).map((testimonial, index) => (
                    <div key={index} className="border-l-4 border-secondary pl-6">
                      <div className="flex gap-1 mb-2">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                        ))}
                      </div>
                      <p className="text-foreground/80 italic mb-3">"{testimonial.content}"</p>
                      <p style={{ fontWeight: 600 }} className="text-primary">{testimonial.client_name}</p>
                      <p className="text-sm text-foreground/60">{testimonial.client_role}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl p-6 shadow-md border border-border sticky top-24">
              <h3 className="mb-4 text-primary">Request a Quotation</h3>
                <div className="space-y-4 mb-6">
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-foreground/60 mb-1">Starting from</p>
                    <p className="text-3xl text-primary" style={{ fontWeight: 700 }}>
                      PHP {currentTraining.base_price?.toLocaleString()}
                    </p>
                  <p className="text-xs text-foreground/60 mt-1">Base quotation for standard package</p>
                  </div>
                  <div className="text-sm text-foreground/70 space-y-2">
                    <p>Professional facilitators</p>
                    <p>Training materials included</p>
                    <p>Certificates of completion</p>
                    <p>Post-training support</p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mb-3"
                  onClick={() => onNavigate('training-builder', currentTraining)}
                >
                  Request Quotation
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  disabled={!details}
                  onClick={() => {
                    if (!details) return;
                    const pdfWindow = window.open('', '_blank');
                    if (pdfWindow) {
                      pdfWindow.document.write('<p style="font-family: Arial, sans-serif; padding: 24px;">Preparing your brochure...</p>');
                    }
                    void downloadTrainingBrochure(details, pdfWindow);
                  }}
                >
                  Download Brochure
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
