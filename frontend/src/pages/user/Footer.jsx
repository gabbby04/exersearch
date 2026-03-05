import { Link } from 'react-router-dom';
import { 
  Instagram, 
  Facebook, 
  Youtube, 
  Mail,
  MapPin,
  Phone
} from 'lucide-react';
import logo from '../../assets/exersearchlogo.png';
import './HeaderFooter.css';

const COLS = [
  {
    heading: 'Product',
    links: [
      { to: '/gyms', label: 'Find Gyms' },
      { to: '/workouts', label: 'Workout Plans' },
      { to: '/nutrition', label: 'Meal Planner' },
      { to: '/tracker', label: 'Progress Tracker' },
      { to: '/ai-bot', label: 'AI Assistant' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { to: '/blog', label: 'Blog' },
      { to: '/guides', label: 'Fitness Guides' },
      { to: '/exercises', label: 'Exercise Library' },
      { to: '/faqs', label: 'FAQs' },
      { to: '/api', label: 'API Docs' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { to: '/about', label: 'About Us' },
      { to: '/careers', label: 'Careers' },
      { to: '/press', label: 'Press Kit' },
      { to: '/partners', label: 'Partner Gyms' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { to: '/terms', label: 'Terms of Service' },
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/cookies', label: 'Cookie Policy' },
      { to: '/disclaimer', label: 'Disclaimer' },
    ],
  },
];
const XIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M18.244 2H21l-6.6 7.54L22 22h-6.828l-5.35-6.99L3.6 22H1l7.06-8.07L2 2h6.828l4.84 6.32L18.244 2z"/>
  </svg>
);


const SOCIALS = [
  { 
    name: 'Facebook', 
    href: 'https://facebook.com/exersearch',
    icon: Facebook,
    color: '#1877F2'
  },
  { 
    name: 'Instagram', 
    href: 'https://instagram.com/exersearch',
    icon: Instagram,
    color: '#E4405F'
  },
 
  { 
  name: 'X', 
  href: 'https://x.com/exersearch',
  icon: XIcon,
  color: '#000000'
  },
  { 
    name: 'YouTube', 
    href: 'https://youtube.com/@exersearch',
    icon: Youtube,
    color: '#FF0000'
  },
  { 
    name: 'Email', 
    href: 'mailto:hello@exersearch.com',
    icon: Mail,
    color: '#EA4335'
  },
  
];

export default function Footer() {
  return (
    <footer className="lnd-foot">
      <div className="lnd-foot__main">
        
        {/* Top Row: Brand + Links */}
        <div className="lnd-foot__top">
          
          {/* Brand Column */}
          <div className="lnd-foot__brand">
            <Link to="/">
              <img src={logo} alt="ExerSearch" className="lnd-foot__logo" />
            </Link>
            <p className="lnd-foot__desc">
              Your AI-powered fitness companion. Find gyms, plan workouts, and achieve your goals.
            </p>
            
            {/* Contact Info */}
            <div className="lnd-foot__contact">
              <div className="lnd-foot__contact-item">
                <MapPin size={14} />
                <span>Metro Manila, Philippines</span>
              </div>
              <div className="lnd-foot__contact-item">
                <Phone size={14} />
                <span>+63 123 456 7890</span>
              </div>
              <div className="lnd-foot__contact-item">
                <Mail size={14} />
                <span>hello@exersearch.com</span>
              </div>
            </div>
          </div>

          {/* Links Grid */}
          <div className="lnd-foot__links">
            {COLS.map(({ heading, links }) => (
              <div key={heading} className="lnd-foot__col">
                <p className="lnd-foot__col-head">{heading}</p>
                <ul>
                  {links.map(({ to, label }) => (
                    <li key={label}>
                      <Link to={to} className="lnd-foot__lnk">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>

        {/* Bottom Row: Socials + Legal */}
        <div className="lnd-foot__bottom">
          
          {/* Social Links */}
          <div className="lnd-foot__socials">
            <span className="lnd-foot__socials-label">Follow Us</span>
            <div className="lnd-foot__soc-grid">
              {SOCIALS.map(({ name, href, icon: Icon, color }) => (
                <a 
                  key={name}
                  href={href}
                  className="lnd-foot__soc"
                  aria-label={name}
                  style={{ '--social-color': color }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon size={16} strokeWidth={2} />
                </a>
              ))}
            </div>
          </div>

          {/* Legal Links */}
          <div className="lnd-foot__legal">
            <span>© {new Date().getFullYear()} ExerSearch. All rights reserved.</span>
            <span className="lnd-foot__separator">•</span>
            <Link to="/terms">Terms</Link>
            <span className="lnd-foot__separator">•</span>
            <Link to="/privacy">Privacy</Link>
            <span className="lnd-foot__separator">•</span>
            <Link to="/cookies">Cookies</Link>
          </div>

        </div>

      </div>
    </footer>
  );
}