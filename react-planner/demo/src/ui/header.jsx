import React from 'react';
import { UserMenu, useAuth } from './auth-modals.jsx';

// AI Logo Component - shared across the app
export const AILogo = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="aiGradientHeader" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2d3748" />
        <stop offset="100%" stopColor="#4a5568" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="20" r="18" fill="url(#aiGradientHeader)" opacity="0.9"/>
    <circle cx="15" cy="15" r="3" fill="#ffffff"/>
    <circle cx="25" cy="15" r="3" fill="#ffffff"/>
    <circle cx="20" cy="20" r="3" fill="#ffffff"/>
    <circle cx="15" cy="25" r="3" fill="#ffffff"/>
    <circle cx="25" cy="25" r="3" fill="#ffffff"/>
    <line x1="15" y1="15" x2="20" y2="20" stroke="#ffffff" strokeWidth="1.5" opacity="0.7"/>
    <line x1="25" y1="15" x2="20" y2="20" stroke="#ffffff" strokeWidth="1.5" opacity="0.7"/>
    <line x1="20" y1="20" x2="15" y2="25" stroke="#ffffff" strokeWidth="1.5" opacity="0.7"/>
    <line x1="20" y1="20" x2="25" y2="25" stroke="#ffffff" strokeWidth="1.5" opacity="0.7"/>
    <line x1="15" y1="15" x2="25" y2="15" stroke="#ffffff" strokeWidth="1.5" opacity="0.5"/>
    <line x1="15" y1="25" x2="25" y2="25" stroke="#ffffff" strokeWidth="1.5" opacity="0.5"/>
    <circle cx="12" cy="12" r="1.5" fill="#ffffff" opacity="0.8"/>
    <circle cx="28" cy="12" r="1.5" fill="#ffffff" opacity="0.8"/>
    <circle cx="12" cy="28" r="1.5" fill="#ffffff" opacity="0.8"/>
    <circle cx="28" cy="28" r="1.5" fill="#ffffff" opacity="0.8"/>
  </svg>
);

const Header = ({
  onBackToHome,
  onShowAI,
  onStartFromScratch,
  onScrollToFeatures,
  onShowGuide,
  currentPage = 'landing', // 'landing', 'ai', 'planner', 'tool', 'guide'
  isScrolled = false,
  isFixed = false
}) => {
  const auth = useAuth();

  const navStyle = {
    position: isFixed ? 'fixed' : 'relative',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    background: isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
    backdropFilter: isScrolled ? 'blur(10px)' : 'none',
    boxShadow: isScrolled ? '0 2px 20px rgba(0,0,0,0.1)' : '0 2px 20px rgba(0,0,0,0.2)',
    transition: 'all 0.3s ease',
    padding: '20px 40px'
  };

  const textColor = isScrolled ? '#333' : '#ffffff';
  const logoColor = isScrolled ? '#4a5568' : '#ffffff';

  return (
    <nav style={navStyle}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo */}
        <div 
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: logoColor,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onClick={onBackToHome}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <div style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AILogo />
          </div>
          <span>Archify</span>
        </div>

        {/* Navigation Links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '30px'
        }}>
          {/* Make with AI Link */}
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); onShowAI && onShowAI(); }} 
            style={{
              color: textColor,
              textDecoration: 'none',
              fontWeight: currentPage === 'ai' ? 'bold' : 500,
              transition: 'color 0.3s ease',
              cursor: 'pointer',
              borderBottom: currentPage === 'ai' ? `2px solid ${textColor}` : 'none',
              paddingBottom: currentPage === 'ai' ? '5px' : '0'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Make with AI
          </a>

          {/* Start from scratch Link */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onStartFromScratch && onStartFromScratch(); }}
            style={{
              color: textColor,
              textDecoration: 'none',
              fontWeight: currentPage === 'planner' ? 'bold' : 500,
              transition: 'color 0.3s ease',
              cursor: 'pointer',
              borderBottom: currentPage === 'planner' ? `2px solid ${textColor}` : 'none',
              paddingBottom: currentPage === 'planner' ? '5px' : '0'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Start from scratch
          </a>

          {/* Guide Link */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onShowGuide && onShowGuide(); }}
            style={{
              color: textColor,
              textDecoration: 'none',
              fontWeight: currentPage === 'guide' ? 'bold' : 500,
              transition: 'color 0.3s ease',
              cursor: 'pointer',
              borderBottom: currentPage === 'guide' ? `2px solid ${textColor}` : 'none',
              paddingBottom: currentPage === 'guide' ? '5px' : '0'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Guide
          </a>

          {/* Features Link - only on landing page */}
          {currentPage === 'landing' && onScrollToFeatures && (
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onScrollToFeatures(); }} 
              style={{
                color: textColor,
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Features
            </a>
          )}

          {/* Auth Buttons */}
          {auth.user ? (
            <UserMenu />
          ) : (
            <React.Fragment>
              <button 
                onClick={() => auth.setShowLoginModal(true)} 
                style={{
                  color: textColor,
                  background: 'transparent',
                  border: 'none',
                  fontWeight: 500,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'opacity 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Sign In
              </button>
              <button 
                onClick={() => auth.setShowSignupModal(true)} 
                style={{
                  padding: '12px 30px',
                  background: isScrolled ? 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)' : '#ffffff',
                  color: isScrolled ? '#ffffff' : '#4a5568',
                  border: 'none',
                  borderRadius: '25px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                }}
              >
                Sign Up
              </button>
            </React.Fragment>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;

