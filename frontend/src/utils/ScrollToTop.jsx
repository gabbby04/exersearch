import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down 300px
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const styles = {
    button: {
      position: 'fixed',
      bottom: '8rem',   
      right: '2rem',
      width: '50px',
      height: '50px',
      background: '#d4660a',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transition: 'all 0.3s ease',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(100px)',
      pointerEvents: isVisible ? 'auto' : 'none',
    }
  };

  return (
    <button 
      onClick={scrollToTop} 
      style={styles.button}
      onMouseOver={(e) => {
        e.currentTarget.style.background = '#ff8533';
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = '#d4660a';
        e.currentTarget.style.transform = isVisible ? 'translateY(0)' : 'translateY(100px)';
      }}
      aria-label="Scroll to top"
    >
      <ArrowUp size={24} strokeWidth={3} />
    </button>
  );
}