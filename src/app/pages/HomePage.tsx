import { Button } from '../components/Button';
import { BookOpen, GraduationCap, ShoppingBag, Package, Star } from 'lucide-react';
import { BRAND_HERO_IMAGE, BRAND_NAME, BRAND_TAGLINE } from '../branding';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const services = [
    {
      icon: GraduationCap,
      title: 'Corporate Trainings',
      description: 'Customized training programs for organizations and institutions',
      page: 'trainings'
    },
    {
      icon: BookOpen,
      title: 'Online Courses',
      description: 'Self-paced learning modules on various topics',
      page: 'courses'
    },
    {
      icon: ShoppingBag,
      title: 'Digital Products',
      description: 'E-books, templates, and digital resources',
      page: 'digital-products'
    },
    {
      icon: Package,
      title: 'Physical Products',
      description: 'Training kits, books, and assessment tools',
      page: 'physical-products'
    }
  ];

  const steps = [
    { number: '01', title: 'Select Training', description: 'Choose from our comprehensive catalog' },
    { number: '02', title: 'Request Quotation', description: 'Customize the program and submit your request' },
    { number: '03', title: 'Admin Review', description: 'Our team reviews and approves the quotation' },
    { number: '04', title: 'Coordinate Schedule', description: 'Finalize the date, venue, and next steps' }
  ];

  const testimonials = [
    {
      name: 'Dr. Maria Santos',
      role: 'HR Director, Global Tech Corp',
      content: 'VYSPER Institute transformed our workplace culture. The training was evidence-based, engaging, and highly impactful.',
      rating: 5
    },
    {
      name: 'Prof. Juan Dela Cruz',
      role: 'School Administrator',
      content: 'The mental health programs for our faculty were exceptional. Highly professional and well-structured.',
      rating: 5
    },
    {
      name: 'Sarah Reyes',
      role: 'Learning & Development Manager',
      content: 'Outstanding training quality. The team is knowledgeable, responsive, and truly cares about outcomes.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <img src={BRAND_HERO_IMAGE} alt={BRAND_NAME} className="mx-auto mb-7 h-auto w-full max-w-xl object-contain" />
          <p className="text-lg text-secondary mb-3" style={{ fontWeight: 600 }}>{BRAND_TAGLINE}</p>
          <h1 className="text-5xl mb-6 text-primary" style={{ fontWeight: 700 }}>
            Learning that strengthens wellness and transformation.
          </h1>
          <p className="text-xl text-foreground/70 mb-8 max-w-2xl mx-auto">
            Evidence-based training programs for institutions and professionals
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => onNavigate('trainings')}>
              Explore Trainings
            </Button>
            <Button size="lg" variant="outline" onClick={() => onNavigate('courses')}>
              Browse Courses
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-center mb-12 text-primary">Our Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <button
                key={index}
                onClick={() => onNavigate(service.page)}
                className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md hover:border-primary/30 transition-all text-left"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="mb-2 text-primary">{service.title}</h3>
                <p className="text-sm text-foreground/70">{service.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-muted py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center mb-12 text-primary">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-2xl" style={{ fontWeight: 700 }}>
                  {step.number}
                </div>
                <h3 className="mb-2">{step.title}</h3>
                <p className="text-sm text-foreground/70">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-center mb-12 text-primary">What Our Clients Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-foreground/80 mb-4 italic">"{testimonial.content}"</p>
              <div>
                <p style={{ fontWeight: 600 }} className="text-primary">{testimonial.name}</p>
                <p className="text-sm text-foreground/60">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
