import { Mail, Phone, MapPin } from 'lucide-react';
import { BRAND_EMAIL, BRAND_LOGO, BRAND_NAME, BRAND_TAGLINE } from '../branding';

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={BRAND_LOGO} alt="" className="h-14 w-14 object-contain" />
              <h3 className="text-xl" style={{ fontWeight: 700 }}>{BRAND_NAME}</h3>
            </div>
            <p className="text-primary-foreground/80 text-sm">
              {BRAND_TAGLINE}
            </p>
          </div>

          <div>
            <h4 className="mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>Corporate Trainings</li>
              <li>Online Courses</li>
              <li>Digital Products</li>
              <li>Physical Products</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>About Us</li>
              <li>Our Team</li>
              <li><a href="/verify" className="hover:text-primary-foreground">Verify Certificate</a></li>
              <li>Testimonials</li>
              <li>Contact</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4">Contact</h4>
            <div className="space-y-3 text-sm text-primary-foreground/80">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{BRAND_EMAIL}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Metro Manila, Philippines</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-sm text-primary-foreground/60">
          &copy; 2026 {BRAND_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
