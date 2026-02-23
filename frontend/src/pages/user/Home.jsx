import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './UserHome.css';
import {
  Inbox, MapPin, Star, Heart, TrendingUp, Clock, Users,
  Navigation, X, ChevronRight, Zap, Target,
  Search, ArrowRight, Eye, Flame, Award,
  Activity, Bell, SlidersHorizontal, Check,
  Sparkles, Dumbbell, Trophy,
  BarChart2, RefreshCw, Bookmark, Tag, ShieldCheck,
  Wifi, Droplets, Wind, Coffee, Plus, Minus,
  MessageSquare, ThumbsUp, CalendarDays, HelpCircle,
  BookOpen, Phone, Mail, Instagram, Facebook, Twitter,
  ChevronDown, Gift, Percent, Utensils, UserCircle, Settings, LogOut
} from 'lucide-react';

export default function Home() {
  const [selectedView, setSelectedView] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [savedGyms, setSavedGyms] = useState([1, 3]);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [activePromo, setActivePromo] = useState(0);
  const [promoAnimating, setPromoAnimating] = useState(false);
  const [promoDir, setPromoDir] = useState('next');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [sortBy, setSortBy] = useState('match');
  const [openFaq, setOpenFaq] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const userName = 'John';
  const userStats = { gymsVisited: 12, savedGyms: 3, thisWeek: 4, streak: 7 };

  const [notifications, setNotifications] = useState([
    { id: 1, icon: Flame, title: '7-day streak!', message: 'Keep it going 💪', unread: true },
    { id: 2, icon: Gift, title: 'New deal unlocked', message: 'Free day pass available', unread: true },
  ]);

  const nearbyGyms = [
    { id: 1, name: 'IronForge Fitness', location: 'Kapitolyo, Pasig', distance: 0.3, rating: 4.8, reviews: 234, price: 150, monthlyPrice: 2500, tags: ['Powerlifting', '24/7', 'AC'], amenities: ['Shower', 'Locker', 'WiFi', 'Parking'], coordinates: [14.5764, 121.0851], image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80', openNow: true, trending: true, matchScore: 95, capacity: 72, crowdLevel: 'moderate', crowdPct: 55, hours: '5:00 AM - 12:00 AM', totalEquipment: 48, type: 'Powerlifting & Strength', deal: 'Free Day Pass' },
    { id: 2, name: 'FitZone Studio', location: 'Ortigas, Pasig', distance: 0.7, rating: 4.6, reviews: 156, price: 100, monthlyPrice: 1800, tags: ['Cardio', 'Classes', 'Yoga'], amenities: ['Shower', 'Locker', 'AC'], coordinates: [14.5800, 121.0900], image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80', openNow: true, trending: false, matchScore: 88, capacity: 45, crowdLevel: 'quiet', crowdPct: 20, hours: '6:00 AM - 10:00 PM', totalEquipment: 30, type: 'Cardio & Group Classes', deal: null },
    { id: 3, name: 'PowerHouse Pro', location: 'Capitol Commons', distance: 1.2, rating: 4.9, reviews: 312, price: 200, monthlyPrice: 3500, tags: ['CrossFit', 'Olympic', 'Pro'], amenities: ['Shower', 'Locker', 'WiFi', 'Parking', 'Sauna'], coordinates: [14.5720, 121.0920], image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80', openNow: true, trending: true, matchScore: 92, capacity: 85, crowdLevel: 'busy', crowdPct: 78, hours: '5:00 AM - 11:00 PM', totalEquipment: 65, type: 'CrossFit & Olympic', deal: '10% off Monthly' },
    { id: 4, name: 'Elite Fitness Hub', location: 'Rosario, Pasig', distance: 1.5, rating: 4.7, reviews: 189, price: 120, monthlyPrice: 2200, tags: ['Weights', 'Cardio'], amenities: ['Shower', 'Locker', 'AC', 'WiFi'], coordinates: [14.5680, 121.0880], image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&q=80', openNow: false, trending: false, matchScore: 85, capacity: 60, crowdLevel: 'closed', crowdPct: 0, hours: '6:00 AM - 9:00 PM', totalEquipment: 40, type: 'General Fitness', deal: null },
    { id: 5, name: 'Apex Athletic Club', location: 'San Antonio, Pasig', distance: 1.8, rating: 4.5, reviews: 98, price: 180, monthlyPrice: 3000, tags: ['MMA', 'Boxing', 'Weights'], amenities: ['Shower', 'Locker', 'WiFi', 'Parking', 'AC'], coordinates: [14.5710, 121.0840], image: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&q=80', openNow: true, trending: true, matchScore: 80, capacity: 55, crowdLevel: 'quiet', crowdPct: 25, hours: '6:00 AM - 10:00 PM', totalEquipment: 38, type: 'Combat Sports & Fitness', deal: 'Free Week Trial' },
  ];

  const promos = [
    { id: 1, badge: 'LIMITED DEAL', title: '3-Day Pass for \u20B1299', desc: 'Valid at IronForge & PowerHouse Pro', cta: 'Grab Deal', bg: 'linear-gradient(135deg,#2d0a02,#7a1e05,#d23f0b)', accent: '#ff7043', link: '/home/deals' },
    { id: 2, badge: 'WEEKEND PROMO', title: 'Bring a Friend Free', desc: 'Every Saturday & Sunday this month', cta: 'Learn More', bg: 'linear-gradient(135deg,#0a0d2d,#1b2069,#3b4de8)', accent: '#6b7ff5', link: '/home/deals' },
    { id: 3, badge: 'MEMBERS ONLY', title: '10% Off Monthly Plans', desc: 'Use code GYMFIND at checkout', cta: 'Claim Now', bg: 'linear-gradient(135deg,#0a2d18,#0d6e35,#10b981)', accent: '#34d399', link: '/home/deals' },
  ];

  const discoveryTips = [
    { id: 1, icon: Clock, title: 'Beat the Rush', message: 'IronForge is 40% less crowded 2-4 PM', color: '#10b981', bg: '#ecfdf5', link: '/home/gyms/1' },
    { id: 2, icon: Sparkles, title: 'New Equipment', message: 'PowerHouse added Olympic platforms', color: '#8b5cf6', bg: '#f5f3ff', link: '/home/gyms/3' },
    { id: 3, icon: Target, title: 'Perfect Match', message: '3 gyms match your preferences', color: '#3b82f6', bg: '#eff6ff', link: '/home/find-gyms' },
    { id: 4, icon: Flame, title: 'Hot This Week', message: "FitZone's Zumba is fully booked", color: '#f59e0b', bg: '#fffbeb', link: '/home/gyms/2' },
  ];

  const recentActivity = [
    { id: 1, gym: 'IronForge Fitness', gymId: 1, action: 'Completed leg day', time: '2 hours ago', icon: Activity, color: '#10b981' },
    { id: 2, gym: 'FitZone Studio', gymId: 2, action: 'Saved to favorites', time: 'Yesterday', icon: Heart, color: '#ef4444' },
    { id: 3, gym: 'PowerHouse Pro', gymId: 3, action: 'Viewed details', time: '2 days ago', icon: Eye, color: '#3b82f6' },
  ];

  const topReviews = [
    { id: 1, user: 'Maria S.', gym: 'IronForge Fitness', gymId: 1, rating: 5, comment: 'Best powerlifting gym in Pasig! Equipment is top-notch and the staff are super helpful.', time: '2 days ago', avatar: 'M' },
    { id: 2, user: 'Carlo R.', gym: 'PowerHouse Pro', gymId: 3, rating: 5, comment: 'Olympic platforms are a game changer. Worth every peso of the monthly fee.', time: '4 days ago', avatar: 'C' },
    { id: 3, user: 'Anika T.', gym: 'FitZone Studio', gymId: 2, rating: 4, comment: 'Love the yoga and Zumba classes. Very chill atmosphere, perfect for beginners.', time: '1 week ago', avatar: 'A' },
  ];

  const upcomingEvents = [
    { id: 1, title: 'Powerlifting Meetup', gym: 'IronForge Fitness', gymId: 1, date: 'Mar 1', day: 'Sat', time: '9:00 AM', spots: 12, color: '#d23f0b' },
    { id: 2, title: 'Zumba Masterclass', gym: 'FitZone Studio', gymId: 2, date: 'Mar 3', day: 'Mon', time: '7:00 PM', spots: 5, color: '#8b5cf6' },
    { id: 3, title: 'CrossFit Open WOD', gym: 'PowerHouse Pro', gymId: 3, date: 'Mar 5', day: 'Wed', time: '6:00 AM', spots: 20, color: '#10b981' },
  ];

  const faqs = [
    { id: 1, q: 'How does the day pass work?', a: 'Day passes let you access any gym for a full 24-hour period. Purchase directly through the app and show your QR code at the front desk.' },
    { id: 2, q: 'Can I cancel a gym visit?', a: 'Yes, you can cancel up to 2 hours before your scheduled visit for a full refund. Late cancellations may incur a small fee.' },
    { id: 3, q: 'How accurate is the crowd level?', a: 'Crowd levels are updated in real-time based on check-in data from gyms. They reflect the current capacity as a percentage of maximum.' },
    { id: 4, q: 'Can I book multiple gyms in one day?', a: 'Absolutely! With a multi-gym membership or individual day passes, you can visit different gyms in the same day.' },
  ];

  const weeklyGoal = { done: 4, target: 5 };
  const progressPct = Math.round((weeklyGoal.done / weeklyGoal.target) * 100);

  const amenityIcons = { Shower: Droplets, Locker: ShieldCheck, WiFi: Wifi, Parking: MapPin, AC: Wind, Sauna: Coffee };
  const crowdLabel = { quiet: 'Quiet', moderate: 'Moderate', busy: 'Busy', closed: 'Closed' };
  const crowdCls = { quiet: 'crowd--quiet', moderate: 'crowd--moderate', busy: 'crowd--busy', closed: 'crowd--closed' };

  const tabs = [
    { key: 'all', icon: MapPin, label: 'All Gyms' },
    { key: 'nearby', icon: Navigation, label: 'Nearby' },
    { key: 'saved', icon: Heart, label: 'Saved (' + savedGyms.length + ')' },
    { key: 'deals', icon: Tag, label: 'Deals' },
    { key: 'open', icon: ShieldCheck, label: 'Open Now' },
  ];

  const emptyMsg = {
    saved: { title: 'No saved gyms yet', desc: 'Tap the heart on any gym to save it here.' },
    nearby: { title: 'No gyms within 1km', desc: 'Try expanding your search radius in filters.' },
    deals: { title: 'No active deals', desc: 'Check back soon for promotions.' },
    open: { title: 'All gyms are closed', desc: 'Try again during opening hours.' },
    all: { title: 'No gyms found', desc: 'Try adjusting your filters or search.' },
  };

  const listSubtext = {
    nearby: 'Within 1km from your location',
    saved: 'Gyms you have bookmarked for easy access',
    deals: 'Limited-time promotions from partner gyms',
    open: 'Currently accepting walk-ins',
    all: nearbyGyms.filter((g) => g.openNow).length + ' open now  \u00B7  ' + nearbyGyms.filter((g) => g.trending).length + ' trending',
  };

  const toggleSave = (id) => setSavedGyms((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleAmenity = (a) => setSelectedAmenities((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a]);

  const goToPromo = (idx, dir) => {
    if (promoAnimating) return;
    setPromoDir(dir);
    setPromoAnimating(true);
    setTimeout(() => { setActivePromo(idx); setPromoAnimating(false); }, 320);
  };
  const nextPromo = () => goToPromo((activePromo + 1) % promos.length, 'next');
  const prevPromo = () => goToPromo((activePromo - 1 + promos.length) % promos.length, 'prev');

  const filteredGyms = (() => {
    let list = nearbyGyms.filter((gym) => {
      if (selectedView === 'nearby' && gym.distance > 1.0) return false;
      if (selectedView === 'saved' && !savedGyms.includes(gym.id)) return false;
      if (selectedView === 'deals' && !gym.deal) return false;
      if (selectedView === 'open' && !gym.openNow) return false;
      if (gym.price < priceRange[0] || gym.price > priceRange[1]) return false;
      if (selectedAmenities.length > 0 && !selectedAmenities.every((a) => gym.amenities.includes(a))) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!gym.name.toLowerCase().includes(q) && !gym.location.toLowerCase().includes(q) && !gym.tags.some((t) => t.toLowerCase().includes(q))) return false;
      }
      return true;
    });
    if (sortBy === 'match') list = [...list].sort((a, b) => b.matchScore - a.matchScore);
    else if (sortBy === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'distance') list = [...list].sort((a, b) => a.distance - b.distance);
    else if (sortBy === 'price') list = [...list].sort((a, b) => a.price - b.price);
    return list;
  })();

  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const t = setInterval(() => nextPromo(), 5000);
    return () => clearInterval(t);
  }, [activePromo, promoAnimating]);

  // Close both dropdowns on outside click or Escape
  useEffect(() => {
    const close = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    const esc = (e) => { if (e.key === 'Escape') { setNotifOpen(false); setProfileOpen(false); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);

  useEffect(() => {
    if (leafletLoaded) return;
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='; css.crossOrigin = '';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='; js.crossOrigin = '';
    js.onload = () => setLeafletLoaded(true);
    document.head.appendChild(js);
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInitialized) return;
    const L = window.L; if (!L) return;
    try {
      const map = L.map(mapRef.current, { center: [14.5764, 121.0851], zoom: 14, zoomControl: false });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap contributors &copy; CARTO', maxZoom: 19 }).addTo(map);
      mapInstanceRef.current = map; setMapInitialized(true);
    } catch (e) { console.error(e); }
  }, [leafletLoaded, mapInitialized]);

  useEffect(() => {
    if (!mapInitialized || !mapInstanceRef.current || !window.L) return;
    const L = window.L; const map = mapInstanceRef.current;
    markersRef.current.forEach((m) => { try { map.removeLayer(m); } catch (e) {} });
    markersRef.current = [];
    if (!filteredGyms.length) return;
    const markers = filteredGyms.map((gym) => {
      const isHot = gym.trending;
      const icon = L.divIcon({
        className: 'gm-host',
        html: '<div class="gm-pin' + (isHot ? ' gm-pin--hot' : '') + '"><div class="gm-pin__bubble"><span>&#8369;' + gym.price + '</span>' + (isHot ? '<span class="gm-pin__dot"></span>' : '') + '</div><div class="gm-pin__tip"></div></div>',
        iconSize: [72, 44], iconAnchor: [36, 44],
      });
      const popup = '<div class="gm-popup"><img class="gm-popup__img" src="' + gym.image + '" /><div class="gm-popup__body"><p class="gm-popup__name">' + gym.name + '</p><p class="gm-popup__loc">&#128205; ' + gym.location + '</p><div class="gm-popup__row"><span>&#11088; ' + gym.rating + '</span><span style="color:#d23f0b;font-weight:800">&#8369;' + gym.price + '/day</span><span style="color:' + (gym.openNow ? '#16a34a' : '#9ca3af') + ';font-weight:700">' + (gym.openNow ? 'Open' : 'Closed') + '</span></div></div></div>';
      const m = L.marker(gym.coordinates, { icon }).addTo(map).bindPopup(popup, { maxWidth: 220 });
      m.on('click', () => {
        const card = document.getElementById('gym-card-' + gym.id);
        if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.classList.add('highlight-flash'); setTimeout(() => card.classList.remove('highlight-flash'), 2000); }
      });
      return m;
    });
    markersRef.current = markers;
    try { const g = L.featureGroup(markers); if (g.getBounds().isValid()) map.fitBounds(g.getBounds().pad(0.2)); } catch (e) {}
  }, [mapInitialized, filteredGyms]);

  const handleZoomIn = () => { if (mapInstanceRef.current) mapInstanceRef.current.zoomIn(); };
  const handleZoomOut = () => { if (mapInstanceRef.current) mapInstanceRef.current.zoomOut(); };

  return (
    <div className="uhv-app">

      {/* ─── HEADER ─── */}
      <header className={'uhv-header' + (isScrolled ? ' scrolled' : '')}>
        <div className="uhv-header__inner">

          {/* ── LOGO + BRAND ── */}
          <div className="uhv-header__brand">
            <div className="uhv-header__logo">
              
              <img
                src="/gymlogo.png"
                alt="ExerSearch"
                className="uhv-header__logo-img"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
              />
              
              <span className="uhv-header__logo-fallback">E</span>
            </div>
            <div className="uhv-header__brand-copy">
              <span className="uhv-header__appname">
                <span className="brand-exer">Exer</span><span className="brand-search">Search</span>
              </span>
              <span className="uhv-header__city"><MapPin size={10} /> Pasig City</span>
            </div>
          </div>

          {/* ── SEARCH ── */}
          <div className="uhv-header__search-wrap">
            <Search size={14} className="uhv-header__search-icon" />
            <input className="uhv-header__search-input" type="text" placeholder="Search gyms, areas, tags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && <button className="uhv-header__search-clear" onClick={() => setSearchQuery('')}><X size={12} /></button>}
          </div>

          {/* ── ACTIONS ── */}
          <div className="uhv-header__actions">

            {/* Workout Plan button (replaces streak chip) */}
            <Link to="/home/workout-plan" className="uhv-chip uhv-chip--fire">
              <Flame size={12} /> Workout Plan
            </Link>

            {/* Meal Plan button (replaces pts chip) */}
            <Link to="/home/meal-plan" className="uhv-chip uhv-chip--meal">
              <Utensils size={12} /> Meal Plan
            </Link>

            {/* ── NOTIFICATIONS ── */}
            <div className="uhv-notif-wrap" ref={notifRef}>
              <button
                className={'uhv-notif' + (notifications.some(n => n.unread) ? ' has-unread' : '')}
                onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
              >
                <Bell size={16} />
                {notifications.some(n => n.unread) && <span className="uhv-notif__dot" />}
              </button>

              {notifOpen && (
                <div className="uhv-notif-pop">
                  <div className="uhv-notif-pop__hdr">
                    <span>Notifications</span>
                    <div className="uhv-notif-actions">
                      <button className="uhv-notif-clear" onClick={() => setNotifications([])}>Clear all</button>
                      <button className="uhv-notif-close" onClick={() => setNotifOpen(false)}><X size={14} /></button>
                    </div>
                  </div>
                  <div className="uhv-notif-pop__list">
                    {notifications.length === 0 && (
                      <div className="uhv-notif-empty">
                        <svg className="lucide-empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8m16 0H4m16 0l-2 7H6l-2-7"/>
                        </svg>
                        All caught up!
                      </div>
                    )}
                    {notifications.map(n => {
                      const Icon = n.icon;
                      return (
                        <button key={n.id} className={'uhv-notif-item' + (n.unread ? ' unread' : '')} onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x))}>
                          <div className="uhv-notif-icon"><Icon size={14} /></div>
                          <div className="uhv-notif-body"><p>{n.title}</p><span>{n.message}</span></div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── PROFILE DROPDOWN (replaces Filters button) ── */}
            <div className="uhv-profile-wrap" ref={profileRef}>
              <button className="uhv-profile-btn" onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}>
                <div className="uhv-profile-avatar">
                  {/* Replace /avatar.png with real user photo */}
                  <img
                    src="/avatar.png"
                    alt="Profile"
                    className="uhv-profile-avatar__img"
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                  />
                  <span className="uhv-profile-avatar__fallback">{userName[0]}</span>
                </div>
                <ChevronDown size={13} className={'uhv-profile-chevron' + (profileOpen ? ' open' : '')} />
              </button>

              {profileOpen && (
                <div className="uhv-profile-pop">
                  {/* User info header */}
                  <div className="uhv-profile-pop__top">
                    <div className="uhv-profile-pop__bigavatar">
                      <img src="/avatar.png" alt="Profile" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                      <span>{userName[0]}</span>
                    </div>
                    <div>
                      <p className="uhv-profile-pop__name">{userName} Dela Cruz</p>
                      <p className="uhv-profile-pop__email">john@email.com</p>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="uhv-profile-pop__menu">
                    <Link to="/home/profile" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                      <div className="uhv-pmi-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><UserCircle size={15} /></div>
                      My Profile
                    </Link>
                    <Link to="/home/workout-plan" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                      <div className="uhv-pmi-icon" style={{ background: '#fff7ed', color: '#ea580c' }}><Flame size={15} /></div>
                      Workout Plan
                    </Link>
                    <Link to="/home/meal-plan" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                      <div className="uhv-pmi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><Utensils size={15} /></div>
                      Meal Plan
                    </Link>
                    <Link to="/home/saved" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                      <div className="uhv-pmi-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><Heart size={15} /></div>
                      Saved Gyms
                    </Link>
                    <Link to="/home/settings" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                      <div className="uhv-pmi-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}><Settings size={15} /></div>
                      Settings
                    </Link>
                    <div className="uhv-profile-pop__divider" />
                    <button className="uhv-profile-menu-item uhv-profile-menu-item--logout" onClick={() => setProfileOpen(false)}>
                      <div className="uhv-pmi-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><LogOut size={15} /></div>
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="uhv-hero">
        <div className="uhv-hero__inner">
          <div className="uhv-hero__left">
            <p className="uhv-hero__greet">Good morning, {userName} &#128075;</p>
            <h1 className="uhv-hero__h1">Find Your<br /><em>Perfect Gym</em></h1>
            <p className="uhv-hero__sub">{nearbyGyms.length} gyms in Pasig &middot; {nearbyGyms.filter((g) => g.openNow).length} open now</p>
            <div className="uhv-hero__stats">
              <div className="uhv-hstat"><strong>{userStats.gymsVisited}</strong><span>Explored</span></div>
              <div className="uhv-hstat-div" />
              <div className="uhv-hstat"><strong>{userStats.savedGyms}</strong><span>Saved</span></div>
              <div className="uhv-hstat-div" />
              <div className="uhv-hstat"><strong>{userStats.thisWeek}</strong><span>This Week</span></div>
              <div className="uhv-hstat-div" />
              <div className="uhv-hstat"><strong>{userStats.streak}d</strong><span>Streak</span></div>
            </div>
          </div>

          <div className="uhv-hero__right">
            <div className="uhv-goal">
              <div className="uhv-goal__top">
                <div>
                  <p className="uhv-goal__label">Weekly Goal</p>
                  <p className="uhv-goal__value">{weeklyGoal.done} / {weeklyGoal.target} sessions</p>
                </div>
                <div className="uhv-goal__icon"><BarChart2 size={16} /></div>
              </div>
              <div className="uhv-goal__track"><div className="uhv-goal__fill" style={{ width: progressPct + '%' }} /></div>
              <p className="uhv-goal__note">{progressPct >= 100 ? 'Goal complete!' : (weeklyGoal.target - weeklyGoal.done) + ' more session' + (weeklyGoal.target - weeklyGoal.done !== 1 ? 's' : '') + ' to go'}</p>
            </div>

            <div className="uhv-promo-wrap">
              <div className={'uhv-promo' + (promoAnimating ? ' promo-' + promoDir : '')} style={{ background: promos[activePromo].bg }}>
                <span className="uhv-promo__badge">{promos[activePromo].badge}</span>
                <h3 className="uhv-promo__title">{promos[activePromo].title}</h3>
                <p className="uhv-promo__desc">{promos[activePromo].desc}</p>
                <Link to={promos[activePromo].link} className="uhv-promo__btn" style={{ background: promos[activePromo].accent }}>
                  {promos[activePromo].cta} <ArrowRight size={12} />
                </Link>
              </div>
              <div className="uhv-promo__controls">
                <button className="uhv-promo__arrow" onClick={prevPromo}><ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /></button>
                <div className="uhv-promo__dots">
                  {promos.map((_, i) => (
                    <button key={i} className={'uhv-promo__dot' + (i === activePromo ? ' active' : '')} onClick={() => goToPromo(i, i > activePromo ? 'next' : 'prev')} />
                  ))}
                </div>
                <button className="uhv-promo__arrow" onClick={nextPromo}><ChevronRight size={14} /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BODY ─── */}
      <div className="uhv-body">
        <div className="uhv-toolbar">
          <div className="uhv-tabs">
            {tabs.map(({ key, icon: Icon, label }) => (
              <button key={key} className={'uhv-tab' + (selectedView === key ? ' active' : '')} onClick={() => setSelectedView(key)}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          <div className="uhv-sort">
            <span className="uhv-sort__label">Sort by:</span>
            {[['match', 'Best Match'], ['rating', 'Rating'], ['distance', 'Distance'], ['price', 'Price']].map(([v, l]) => (
              <button key={v} className={'uhv-sort-btn' + (sortBy === v ? ' active' : '')} onClick={() => setSortBy(v)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="uhv-layout">
          <aside className="uhv-aside">
            <div className="uhv-map-card">
              <div className="uhv-map-topbar">
                <span className="uhv-map-count"><MapPin size={11} /> {filteredGyms.length} gyms</span>
                <div className="uhv-legend">
                  <span className="uhv-leg uhv-leg--q">Quiet</span>
                  <span className="uhv-leg uhv-leg--m">Moderate</span>
                  <span className="uhv-leg uhv-leg--b">Busy</span>
                </div>
              </div>
              <div ref={mapRef} className="uhv-map" />
              <div className="uhv-zoom">
                <button className="uhv-zoom__btn" onClick={handleZoomIn}><Plus size={14} /></button>
                <div className="uhv-zoom__divider" />
                <button className="uhv-zoom__btn" onClick={handleZoomOut}><Minus size={14} /></button>
              </div>
            </div>

            <div className="uhv-side-panel">
              <h3 className="uhv-side-panel__title"><Zap size={14} /> Top Picks For You</h3>
              <div className="uhv-picks">
                {[...nearbyGyms].sort((a, b) => b.matchScore - a.matchScore).slice(0, 3).map((gym) => (
                  <Link key={gym.id} to={'/home/gyms/' + gym.id} className="uhv-pick">
                    <img src={gym.image} alt={gym.name} className="uhv-pick__img" />
                    <div className="uhv-pick__info">
                      <p className="uhv-pick__name">{gym.name}</p>
                      <p className="uhv-pick__meta"><Navigation size={10} /> {gym.distance}km &nbsp;&middot;&nbsp; <Star size={10} fill="#f59e0b" color="#f59e0b" /> {gym.rating}</p>
                    </div>
                    <span className="uhv-pick__badge">{gym.matchScore}%</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="uhv-side-panel">
              <h3 className="uhv-side-panel__title"><Activity size={14} /> Recent Activity</h3>
              <div className="uhv-activity">
                {recentActivity.map((a) => {
                  const Icon = a.icon;
                  return (
                    <div key={a.id} className="uhv-activity__item">
                      <div className="uhv-activity__icon" style={{ background: a.color + '20', color: a.color }}><Icon size={13} /></div>
                      <div className="uhv-activity__body">
                        <Link to={'/home/gyms/' + a.gymId} className="uhv-activity__gym">{a.gym}</Link>
                        <p className="uhv-activity__action">{a.action}</p>
                        <span className="uhv-activity__time">{a.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="uhv-side-panel">
              <h3 className="uhv-side-panel__title"><Sparkles size={14} /> Discovery Tips</h3>
              <div className="uhv-tips">
                {discoveryTips.map((tip) => {
                  const Icon = tip.icon;
                  return (
                    <Link key={tip.id} to={tip.link} className="uhv-tip">
                      <div className="uhv-tip__icon" style={{ background: tip.bg, color: tip.color }}><Icon size={14} /></div>
                      <div className="uhv-tip__body"><strong>{tip.title}</strong><p>{tip.message}</p></div>
                      <ArrowRight size={13} className="uhv-tip__arrow" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="uhv-list">
            <div className="uhv-list__header">
              <div>
                <h2 className="uhv-list__title">
                  {selectedView === 'all' && 'All Gyms'}
                  {selectedView === 'nearby' && 'Gyms Near You'}
                  {selectedView === 'saved' && 'Saved Gyms'}
                  {selectedView === 'deals' && 'Active Deals'}
                  {selectedView === 'open' && 'Open Right Now'}
                  <span className="uhv-list__count">{filteredGyms.length}</span>
                </h2>
                <p className="uhv-list__sub">{listSubtext[selectedView]}</p>
              </div>
              {searchQuery && (
                <div className="uhv-search-tag">
                  Results for <strong>&quot;{searchQuery}&quot;</strong>
                  <button onClick={() => setSearchQuery('')}><X size={11} /></button>
                </div>
              )}
            </div>

            {filteredGyms.length > 0 ? (
              <div className="uhv-cards">
                {filteredGyms.map((gym) => (
                  <div key={gym.id} id={'gym-card-' + gym.id} className="uhv-card">
                    <div className="uhv-card__img-col">
                      <img src={gym.image} alt={gym.name} className="uhv-card__img" />
                      {gym.trending && <div className="uhv-badge-trending"><TrendingUp size={10} /> Trending</div>}
                      {gym.deal && <div className="uhv-badge-deal"><Tag size={10} /> {gym.deal}</div>}
                      <button className={'uhv-save-btn' + (savedGyms.includes(gym.id) ? ' saved' : '')} onClick={() => toggleSave(gym.id)}>
                        <Heart size={13} fill={savedGyms.includes(gym.id) ? 'currentColor' : 'none'} />
                      </button>
                      <div className={'uhv-crowd-badge ' + crowdCls[gym.crowdLevel]}>{crowdLabel[gym.crowdLevel]}</div>
                    </div>
                    <div className="uhv-card__content">
                      <div className="uhv-card__top-row">
                        <div className="uhv-card__title-block">
                          <h4 className="uhv-card__name">{gym.name}</h4>
                          <p className="uhv-card__loc"><MapPin size={11} /> {gym.location} &nbsp;&middot;&nbsp; <span className="uhv-card__type-label">{gym.type}</span></p>
                        </div>
                        <div className={'uhv-status-badge ' + (gym.openNow ? 'open' : 'closed')}>
                          <span className="uhv-status-dot" /> {gym.openNow ? 'Open' : 'Closed'}
                        </div>
                      </div>
                      <div className="uhv-card__tags">
                        {gym.tags.map((t, i) => <span key={i} className="uhv-card__tag">{t}</span>)}
                      </div>
                      <div className="uhv-card__meta-grid">
                        <div className="uhv-card__meta-item"><Navigation size={12} />{gym.distance}km away</div>
                        <div className="uhv-card__meta-item"><Star size={12} fill="#f59e0b" color="#f59e0b" />{gym.rating} <em>({gym.reviews})</em></div>
                        <div className="uhv-card__meta-item"><Users size={12} />Cap. {gym.capacity}</div>
                        <div className="uhv-card__meta-item"><Clock size={12} />{gym.hours}</div>
                        <div className="uhv-card__meta-item"><Dumbbell size={12} />{gym.totalEquipment} equipment</div>
                        <div className="uhv-card__meta-item"><Award size={12} />{gym.matchScore}% match</div>
                      </div>
                      <div className="uhv-card__crowd-row">
                        <span className="uhv-card__crowd-label">Crowd</span>
                        <div className="uhv-card__crowd-track">
                          <div className={'uhv-card__crowd-fill ' + crowdCls[gym.crowdLevel]} style={{ width: gym.crowdPct + '%' }} />
                        </div>
                        <span className="uhv-card__crowd-pct">{gym.crowdPct}%</span>
                      </div>
                      <div className="uhv-card__amenities">
                        {gym.amenities.map((a, i) => {
                          const Icon = amenityIcons[a] || ShieldCheck;
                          return <span key={i} className="uhv-card__amenity"><Icon size={10} /> {a}</span>;
                        })}
                      </div>
                      <div className="uhv-card__footer">
                        <div className="uhv-card__pricing">
                          <span className="uhv-card__price-main">&#8369;{gym.price}<small>/day</small></span>
                          <span className="uhv-card__price-month">&#8369;{gym.monthlyPrice.toLocaleString()}/mo</span>
                        </div>
                        <div className="uhv-card__btns">
                          <button className={'uhv-card__btn-save' + (savedGyms.includes(gym.id) ? ' saved' : '')} onClick={() => toggleSave(gym.id)}>
                            <Bookmark size={13} /> {savedGyms.includes(gym.id) ? 'Saved' : 'Save'}
                          </button>
                          <Link to={'/home/gyms/' + gym.id} className="uhv-card__btn-view">
                            View Details <ChevronRight size={13} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="uhv-empty">
                <div className="uhv-empty__ico"><Search size={28} /></div>
                <h4>{(emptyMsg[selectedView] || emptyMsg.all).title}</h4>
                <p>{(emptyMsg[selectedView] || emptyMsg.all).desc}</p>
                <button className="uhv-empty__btn" onClick={() => { setSearchQuery(''); setSelectedAmenities([]); setPriceRange([0, 500]); setSelectedView('all'); }}>
                  <RefreshCw size={12} /> Reset Filters
                </button>
              </div>
            )}
          </main>
        </div>

        {/* ═══════ BOTTOM SECTIONS ═══════ */}
        <section className="uhv-section">
          <div className="uhv-section__hdr">
            <div>
              <h2 className="uhv-section__title"><CalendarDays size={18} /> Upcoming Events</h2>
              <p className="uhv-section__sub">Classes and events at gyms near you</p>
            </div>
            <Link to="/home/events" className="uhv-section__link">See all <ChevronRight size={14} /></Link>
          </div>
          <div className="uhv-events">
            {upcomingEvents.map((ev) => (
              <Link key={ev.id} to={'/home/gyms/' + ev.gymId} className="uhv-event-card">
                <div className="uhv-event-card__date" style={{ background: ev.color + '15', borderColor: ev.color + '30' }}>
                  <span className="uhv-event-card__day-name" style={{ color: ev.color }}>{ev.day}</span>
                  <span className="uhv-event-card__day-num">{ev.date.split(' ')[1]}</span>
                </div>
                <div className="uhv-event-card__body">
                  <p className="uhv-event-card__title">{ev.title}</p>
                  <p className="uhv-event-card__gym"><MapPin size={10} /> {ev.gym}</p>
                  <p className="uhv-event-card__meta"><Clock size={10} /> {ev.time} &nbsp;&middot;&nbsp; <Users size={10} /> {ev.spots} spots left</p>
                </div>
                <div className="uhv-event-card__cta" style={{ background: ev.color }}>Join</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="uhv-section">
          <div className="uhv-section__hdr">
            <div>
              <h2 className="uhv-section__title"><MessageSquare size={18} /> What Members Are Saying</h2>
              <p className="uhv-section__sub">Real reviews from verified gym-goers</p>
            </div>
            <Link to="/home/reviews" className="uhv-section__link">All reviews <ChevronRight size={14} /></Link>
          </div>
          <div className="uhv-reviews">
            {topReviews.map((r) => (
              <div key={r.id} className="uhv-review-card">
                <div className="uhv-review-card__top">
                  <div className="uhv-review-card__avatar">{r.avatar}</div>
                  <div className="uhv-review-card__meta">
                    <p className="uhv-review-card__user">{r.user}</p>
                    <div className="uhv-review-card__stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={11} fill={i < r.rating ? '#f59e0b' : 'none'} color={i < r.rating ? '#f59e0b' : '#d1d5db'} />
                      ))}
                    </div>
                  </div>
                  <span className="uhv-review-card__time">{r.time}</span>
                </div>
                <p className="uhv-review-card__comment">&ldquo;{r.comment}&rdquo;</p>
                <Link to={'/home/gyms/' + r.gymId} className="uhv-review-card__gym"><MapPin size={10} /> {r.gym}</Link>
              </div>
            ))}
          </div>
        </section>

        <section className="uhv-section">
          <div className="uhv-section__hdr">
            <div>
              <h2 className="uhv-section__title"><HelpCircle size={18} /> Frequently Asked Questions</h2>
              <p className="uhv-section__sub">Quick answers to common questions</p>
            </div>
            <Link to="/home/help" className="uhv-section__link">Help center <ChevronRight size={14} /></Link>
          </div>
          <div className="uhv-faqs">
            {faqs.map((faq) => (
              <div key={faq.id} className={'uhv-faq' + (openFaq === faq.id ? ' open' : '')}>
                <button className="uhv-faq__q" onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}>
                  <span>{faq.q}</span>
                  <ChevronDown size={16} className="uhv-faq__chevron" />
                </button>
                <div className="uhv-faq__a"><p>{faq.a}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="uhv-cta-banner">
          <div className="uhv-cta-banner__inner">
            <div className="uhv-cta-banner__left">
              <div className="uhv-cta-banner__icon"><Gift size={22} /></div>
              <div>
                <h3 className="uhv-cta-banner__title">Refer a Friend, Get a Free Day Pass</h3>
                <p className="uhv-cta-banner__desc">Share your referral link and earn rewards every time someone joins.</p>
              </div>
            </div>
            <Link to="/home/referral" className="uhv-cta-banner__btn">Get My Link <ArrowRight size={14} /></Link>
          </div>
        </section>

        <section className="uhv-section">
          <div className="uhv-section__hdr">
            <div>
              <h2 className="uhv-section__title"><Phone size={18} /> Need Help?</h2>
              <p className="uhv-section__sub">Our support team is available 7 days a week</p>
            </div>
          </div>
          <div className="uhv-support-grid">
            <a href="mailto:support@exersearch.ph" className="uhv-support-card">
              <div className="uhv-support-card__icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><Mail size={20} /></div>
              <div><p className="uhv-support-card__label">Email Us</p><p className="uhv-support-card__val">support@exersearch.ph</p></div>
            </a>
            <a href="tel:+639000000000" className="uhv-support-card">
              <div className="uhv-support-card__icon" style={{ background: '#ecfdf5', color: '#10b981' }}><Phone size={20} /></div>
              <div><p className="uhv-support-card__label">Call Us</p><p className="uhv-support-card__val">+63 900 000 0000</p></div>
            </a>
            <Link to="/home/help" className="uhv-support-card">
              <div className="uhv-support-card__icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}><BookOpen size={20} /></div>
              <div><p className="uhv-support-card__label">Help Center</p><p className="uhv-support-card__val">Browse articles &amp; guides</p></div>
            </Link>
            <div className="uhv-support-card uhv-support-card--social">
              <p className="uhv-support-card__label">Follow Us</p>
              <div className="uhv-social-row">
                <a href="#" className="uhv-social-btn uhv-social-btn--ig"><Instagram size={16} /></a>
                <a href="#" className="uhv-social-btn uhv-social-btn--fb"><Facebook size={16} /></a>
                <a href="#" className="uhv-social-btn uhv-social-btn--tw"><Twitter size={16} /></a>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ─── FILTER MODAL ─── */}
      {showFilterModal && (
        <div className="uhv-overlay" onClick={() => setShowFilterModal(false)}>
          <div className="uhv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="uhv-modal__hdr">
              <h3><SlidersHorizontal size={16} /> Filters</h3>
              <button onClick={() => setShowFilterModal(false)}><X size={16} /></button>
            </div>
            <div className="uhv-modal__body">
              <div className="uhv-filter-group">
                <label>Price per Day</label>
                <div className="uhv-price-display">&#8369;{priceRange[0]} &mdash; &#8369;{priceRange[1]}</div>
                <div className="uhv-price-row">
                  <input type="number" value={priceRange[0]} onChange={(e) => setPriceRange([+e.target.value, priceRange[1]])} placeholder="Min" />
                  <span>to</span>
                  <input type="number" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], +e.target.value])} placeholder="Max" />
                </div>
              </div>
              <div className="uhv-filter-group">
                <label>Amenities</label>
                <div className="uhv-amenity-grid">
                  {['Shower', 'Locker', 'WiFi', 'Parking', 'AC', 'Sauna'].map((a) => (
                    <button key={a} className={'uhv-amenity-btn' + (selectedAmenities.includes(a) ? ' active' : '')} onClick={() => toggleAmenity(a)}>
                      {selectedAmenities.includes(a) && <Check size={11} />} {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="uhv-modal__ftr">
              <button className="uhv-modal-reset" onClick={() => { setPriceRange([0, 500]); setSelectedAmenities([]); }}>Reset</button>
              <button className="uhv-modal-apply" onClick={() => setShowFilterModal(false)}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}