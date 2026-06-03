import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthProvider } from './auth/AuthContext';
import { AuthModal } from './components/AuthModal';
import { HomePage } from './pages/HomePage';
import { TrainingsListPage } from './pages/TrainingsListPage';
import { TrainingDetailsPage } from './pages/TrainingDetailsPage';
import { TrainingBuilderPage } from './pages/TrainingBuilderPage';
import { ProposalPreviewPage } from './pages/ProposalPreviewPage';
import { CoursePlayerPage } from './pages/CoursePlayerPage';
import { DashboardPage } from './pages/DashboardPage';
import { submitContactMessage } from './lib/contactMessages';
import { BRAND_NAME } from './branding';
import { trackWebsiteVisit } from './lib/analytics';

const publicRoutes: Record<string, string> = {
  home: '/',
  trainings: '/trainings',
  courses: '/online-courses',
  'digital-products': '/digital-products',
  'physical-products': '/physical-products',
  about: '/about',
  contact: '/contact',
  dashboard: '/dashboard'
};

function getRouteForPage(page: string, data?: any) {
  if (page === 'training-details' && data?.slug) return `/trainings/${data.slug}`;
  return publicRoutes[page] ?? '/';
}

function getPageFromPath(pathname: string) {
  const normalizedPath = pathname.replace(/\/$/, '') || '/';
  if (normalizedPath === '/') return { page: 'home', data: null };
  if (normalizedPath === '/trainings') return { page: 'trainings', data: null };
  if (normalizedPath.startsWith('/trainings/')) {
    return { page: 'training-details', data: { slug: normalizedPath.replace('/trainings/', '') } };
  }
  if (normalizedPath === '/online-courses') return { page: 'courses', data: null };
  if (normalizedPath === '/digital-products') return { page: 'digital-products', data: null };
  if (normalizedPath === '/physical-products') return { page: 'physical-products', data: null };
  if (normalizedPath === '/about') return { page: 'about', data: null };
  if (normalizedPath === '/contact') return { page: 'contact', data: null };
  if (normalizedPath === '/dashboard') return { page: 'dashboard', data: null };
  return { page: 'home', data: null };
}

function getPageMeta(page: string, data?: any) {
  const title = data?.title ? `${data.title} | ${BRAND_NAME}` : `${BRAND_NAME} | Learning, Wellness, Transformation`;
  const descriptions: Record<string, string> = {
    home: `${BRAND_NAME} provides learning, wellness, and transformation programs for organizations, schools, and professionals.`,
    trainings: 'Browse VYSPER Institute corporate training programs for mental health, workplace development, and school-based wellness.',
    courses: 'Online courses from VYSPER Institute are coming soon.',
    'digital-products': 'Digital resources and professional toolkits from VYSPER Institute are coming soon.',
    'physical-products': 'Training kits, books, and assessment tools from VYSPER Institute are coming soon.',
    about: `Learn about ${BRAND_NAME}, a provider of evidence-based training and organizational development programs.`,
    contact: `Contact ${BRAND_NAME} for training quotations, partnerships, and program inquiries.`,
    dashboard: `${BRAND_NAME} dashboard`
  };

  return {
    title,
    description: data?.description ?? descriptions[page] ?? descriptions.home
  };
}

function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-muted/30 py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-secondary mb-3" style={{ fontWeight: 600 }}>Coming Soon</p>
        <h1 className="mb-4 text-primary">{title}</h1>
        <p className="text-xl text-foreground/70">
          This service is being prepared for a later release. For the MVP, training programs and quotation requests are available now.
        </p>
      </div>
    </div>
  );
}

function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice('');
    setError('');

    try {
      await submitContactMessage(form);
      setForm({ name: '', email: '', message: '' });
      setNotice('Your message has been sent. Our team will get back to you soon.');
    } catch (err: any) {
      setError(err.message ?? 'Unable to send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="mb-3 text-center text-primary">Contact Us</h1>
        <p className="text-center text-foreground/70 mb-8">
          Send a message to VYSPER Institute and our team will respond as soon as possible.
        </p>
        <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-sm border border-border p-8 space-y-4">
          <div>
            <label className="block mb-2">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"
              required
            />
          </div>
          <div>
            <label className="block mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"
              required
            />
          </div>
          <div>
            <label className="block mb-2">Message</label>
            <textarea
              rows={5}
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"
              required
            />
          </div>

          {notice && <p className="text-sm text-secondary">{notice}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AppContent() {
  const initialRoute = useMemo(() => getPageFromPath(window.location.pathname), []);
  const [currentPage, setCurrentPage] = useState(initialRoute.page);
  const [pageData, setPageData] = useState<any>(initialRoute.data);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);

  const handleNavigation = (page: string, data?: any, replace = false) => {
    setCurrentPage(page);
    setPageData(data);
    const nextPath = getRouteForPage(page, data);
    if (window.location.pathname !== nextPath) {
      const historyMethod = replace ? 'replaceState' : 'pushState';
      window.history[historyMethod]({ page, data }, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      const route = getPageFromPath(window.location.pathname);
      setCurrentPage(route.page);
      setPageData(route.data);
      window.scrollTo({ top: 0 });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const meta = getPageMeta(currentPage, pageData);
    document.title = meta.title;

    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute('content', meta.description);

    const canonical = document.querySelector('link[rel="canonical"]');
    canonical?.setAttribute('href', `${window.location.origin}${getRouteForPage(currentPage, pageData)}`);

    if (currentPage !== 'training-details') {
      void trackWebsiteVisit({
        pageKey: currentPage,
        pageTitle: pageData?.title ?? meta.title
      });
    }
  }, [currentPage, pageData]);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigation} />;
      case 'trainings':
        return <TrainingsListPage onNavigate={handleNavigation} />;
      case 'training-details':
        return <TrainingDetailsPage training={pageData} onNavigate={handleNavigation} />;
      case 'training-builder':
        return <TrainingBuilderPage training={pageData} onNavigate={handleNavigation} />;
      case 'proposal-preview':
        return <ProposalPreviewPage data={pageData} onNavigate={handleNavigation} />;
      case 'courses':
        return <ComingSoonPage title="Online Courses" />;
      case 'course-player':
        return <CoursePlayerPage course={pageData} onNavigate={handleNavigation} />;
      case 'digital-products':
        return <ComingSoonPage title="Digital Products" />;
      case 'physical-products':
        return <ComingSoonPage title="Physical Products" />;
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigation} />;
      case 'about':
        return (
          <div className="min-h-screen bg-muted/30 py-20 px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="mb-6 text-primary">About {BRAND_NAME}</h1>
              <p className="text-xl text-foreground/70 leading-relaxed">
                {BRAND_NAME} is a premier provider of evidence-based training programs, online courses, and professional development resources.
                We specialize in psychological consultancy and organizational development, helping institutions and professionals
                create healthier, more effective workplaces and communities.
              </p>
            </div>
          </div>
        );
      case 'contact':
        return <ContactPage />;
      default:
        return <HomePage onNavigate={handleNavigation} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        onNavigate={handleNavigation}
        currentPage={currentPage}
        onLogin={() => setAuthMode('login')}
        onSignUp={() => setAuthMode('signup')}
        onLogout={() => handleNavigation('home')}
      />
      <main className="flex-1">
        {renderPage()}
      </main>
      <Footer />
      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onModeChange={setAuthMode}
          onAuthenticated={() => handleNavigation('dashboard')}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
