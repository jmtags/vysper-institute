import { useState } from 'react';
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
import { BRAND_NAME } from './branding';

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

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [pageData, setPageData] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);

  const handleNavigation = (page: string, data?: any) => {
    setCurrentPage(page);
    setPageData(data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        return (
          <div className="min-h-screen bg-muted/30 py-20 px-6">
            <div className="max-w-2xl mx-auto">
              <h1 className="mb-6 text-center text-primary">Contact Us</h1>
              <div className="bg-card rounded-xl shadow-sm border border-border p-8">
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2">Name</label>
                    <input type="text" className="w-full px-4 py-3 bg-input-background rounded-lg border border-border" />
                  </div>
                  <div>
                    <label className="block mb-2">Email</label>
                    <input type="email" className="w-full px-4 py-3 bg-input-background rounded-lg border border-border" />
                  </div>
                  <div>
                    <label className="block mb-2">Message</label>
                    <textarea rows={5} className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"></textarea>
                  </div>
                  <button className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
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
