import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { BRAND_LOGO, BRAND_NAME, BRAND_TAGLINE } from '../branding';
import { useAuth } from '../auth/AuthContext';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  onLogin: () => void;
  onSignUp: () => void;
  onLogout: () => void;
}

export function Navbar({ onNavigate, currentPage, onLogin, onSignUp, onLogout }: NavbarProps) {
  const { profile, user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuItems = [
    { label: 'Trainings', page: 'trainings', href: '/trainings' },
    { label: 'Online Courses', page: 'courses', href: '/online-courses' },
    { label: 'Digital Products', page: 'digital-products', href: '/digital-products' },
    { label: 'Physical Products', page: 'physical-products', href: '/physical-products' },
    { label: 'About', page: 'about', href: '/about' },
    { label: 'Contact', page: 'contact', href: '/contact' }
  ];

  return (
    <nav className="bg-white border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <a
            href="/"
            onClick={(event) => {
              event.preventDefault();
                  setMobileMenuOpen(false);
                  onNavigate('home');
            }}
            className="flex items-center gap-3 text-left"
            aria-label={`${BRAND_NAME} home`}
          >
            <img src={BRAND_LOGO} alt="" className="h-12 w-12 object-contain" />
            <span className="hidden sm:flex flex-col leading-none">
              <span className="text-lg tracking-tight text-primary" style={{ fontWeight: 700 }}>
                {BRAND_NAME}
              </span>
              <span className="mt-1 text-[11px] text-secondary">{BRAND_TAGLINE}</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {menuItems.map((item) => (
              <a
                key={item.page}
                href={item.href}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(item.page);
                }}
                className={`transition-colors ${
                  currentPage === item.page
                    ? 'text-primary'
                    : 'text-foreground/70 hover:text-primary'
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <a
                  href="/dashboard"
                  onClick={(event) => {
                    event.preventDefault();
                  onNavigate('dashboard');
                  }}
                  className="px-4 py-2 text-primary hover:bg-muted rounded-lg transition-colors"
                >
                  {profile?.role === 'admin' ? 'Admin' : 'Dashboard'}
                </a>
                <button
                  onClick={async () => {
                    await signOut();
                    onLogout();
                  }}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={onLogin} className="px-4 py-2 text-primary hover:bg-muted rounded-lg transition-colors">
                  Log in
                </button>
                <button onClick={onSignUp} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  Sign up
                </button>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <div className="flex flex-col gap-1">
              {menuItems.map((item) => (
                <a
                  key={item.page}
                  href={item.href}
                  onClick={(event) => {
                    event.preventDefault();
                    setMobileMenuOpen(false);
                    onNavigate(item.page);
                  }}
                  className={`px-3 py-3 rounded-lg ${
                    currentPage === item.page
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/70 hover:bg-muted hover:text-primary'
                  }`}
                >
                  {item.label}
                </a>
              ))}

              <div className="border-t border-border mt-3 pt-3 flex flex-col gap-2">
                {user ? (
                  <>
                    <a
                      href="/dashboard"
                      onClick={(event) => {
                        event.preventDefault();
                        setMobileMenuOpen(false);
                        onNavigate('dashboard');
                      }}
                      className="px-3 py-3 rounded-lg text-primary hover:bg-muted"
                    >
                      {profile?.role === 'admin' ? 'Admin' : 'Dashboard'}
                    </a>
                    <button
                      onClick={async () => {
                        await signOut();
                        setMobileMenuOpen(false);
                        onLogout();
                      }}
                      className="px-3 py-3 bg-primary text-primary-foreground rounded-lg text-left"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLogin();
                      }}
                      className="px-3 py-3 rounded-lg text-primary hover:bg-muted text-left"
                    >
                      Log in
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onSignUp();
                      }}
                      className="px-3 py-3 bg-primary text-primary-foreground rounded-lg text-left"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
