import { Menu } from 'lucide-react';
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
  const menuItems = [
    { label: 'Trainings', page: 'trainings' },
    { label: 'Online Courses', page: 'courses' },
    { label: 'Digital Products', page: 'digital-products' },
    { label: 'Physical Products', page: 'physical-products' },
    { label: 'About', page: 'about' },
    { label: 'Contact', page: 'contact' }
  ];

  return (
    <nav className="bg-white border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => onNavigate('home')}
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
          </button>

          <div className="hidden md:flex items-center gap-8">
            {menuItems.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`transition-colors ${
                  currentPage === item.page
                    ? 'text-primary'
                    : 'text-foreground/70 hover:text-primary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="px-4 py-2 text-primary hover:bg-muted rounded-lg transition-colors"
                >
                  {profile?.role === 'admin' ? 'Admin' : 'Dashboard'}
                </button>
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

          <button className="md:hidden p-2">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  );
}
