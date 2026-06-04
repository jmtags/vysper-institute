import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { Brain, Clock, GraduationCap, Handshake, Leaf, MessageCircle, Monitor, Users } from 'lucide-react';
import { fetchTrainingCategories, fetchTrainings, Training, TrainingCategory } from '../lib/trainingData';

interface TrainingsListPageProps {
  onNavigate: (page: string, data?: any) => void;
}

const trainingIconMap = {
  brain: Brain,
  users: Users,
  school: GraduationCap,
  leaf: Leaf,
  message: MessageCircle,
  handshake: Handshake
};

export function TrainingsListPage({ onNavigate }: TrainingsListPageProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState('all');
  const [selectedMode, setSelectedMode] = useState('all');
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    Promise.all([fetchTrainingCategories(), fetchTrainings()])
      .then(([categoryData, trainingData]) => {
        if (!mounted) return;
        setCategories(categoryData);
        setTrainings(trainingData);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message ?? 'Unable to load trainings.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const durations = useMemo(() => [...new Set(trainings.map((training) => training.duration))], [trainings]);
  const modes = useMemo(() => [...new Set(trainings.map((training) => training.mode))], [trainings]);

  const filteredTrainings = trainings.filter((training) => {
    const categoryMatch = selectedCategory === 'all' || training.category?.name === selectedCategory;
    const durationMatch = selectedDuration === 'all' || training.duration === selectedDuration;
    const modeMatch = selectedMode === 'all' || training.mode === selectedMode;
    return categoryMatch && durationMatch && modeMatch;
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="mb-4 text-primary">Corporate Training Programs</h1>
          <p className="text-foreground/70">
            Browse our comprehensive catalog of evidence-based training programs
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border sticky top-24">
              <h3 className="mb-4 text-primary">Filters</h3>

              <div className="mb-6">
                <label className="block mb-2 text-sm">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="w-full px-3 py-2 bg-input-background rounded-lg border border-border"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block mb-2 text-sm">Duration</label>
                <select
                  value={selectedDuration}
                  onChange={(event) => setSelectedDuration(event.target.value)}
                  className="w-full px-3 py-2 bg-input-background rounded-lg border border-border"
                >
                  <option value="all">All Durations</option>
                  {durations.map((duration) => (
                    <option key={duration} value={duration}>{duration}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm">Mode</label>
                <select
                  value={selectedMode}
                  onChange={(event) => setSelectedMode(event.target.value)}
                  className="w-full px-3 py-2 bg-input-background rounded-lg border border-border"
                >
                  <option value="all">All Modes</option>
                  {modes.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-3">
            {loading && (
              <div className="bg-card rounded-xl p-12 text-center shadow-sm border border-border">
                <p className="text-foreground/60">Loading trainings...</p>
              </div>
            )}

            {error && (
              <div className="bg-card rounded-xl p-12 text-center shadow-sm border border-border">
                <p className="text-destructive">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTrainings.map((training) => {
                  const TrainingIcon = trainingIconMap[training.image_icon as keyof typeof trainingIconMap] ?? GraduationCap;

                  return (
                    <div
                      key={training.id}
                      className="bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow"
                    >
                    <div className="bg-gradient-to-br from-primary/5 to-secondary/5 h-36 flex items-center justify-center overflow-hidden">
                      {training.image_url ? (
                        <img src={training.image_url} alt={training.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-16 w-16 rounded-full border border-primary/15 bg-white/80 flex items-center justify-center shadow-sm">
                          <TrainingIcon className="h-8 w-8 text-primary" strokeWidth={1.6} />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs rounded-full mb-3">
                        {training.category?.name ?? 'Training'}
                      </span>
                      <h3 className="mb-2 text-primary">{training.title}</h3>
                      <p className="text-sm text-foreground/70 mb-4">
                        {training.description}
                      </p>
                      <div className="flex flex-wrap gap-3 mb-4 text-sm text-foreground/60">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{training.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Monitor className="w-4 h-4" />
                          <span>{training.mode}</span>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() => onNavigate('training-details', training)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {!loading && !error && filteredTrainings.length === 0 && (
              <div className="bg-card rounded-xl p-12 text-center shadow-sm border border-border">
                <p className="text-foreground/60">No trainings found matching your filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
