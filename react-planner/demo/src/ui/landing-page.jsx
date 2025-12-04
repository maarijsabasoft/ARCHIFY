import React from 'react';
import Header, { AILogo } from './header';
import { useSubscription } from './subscription';
import { useAuth } from './auth-modals.jsx';

const LandingPage = ({ onGetStarted, onShowAI }) => {
  var auth = useAuth();
  var subscriptionContext = useSubscription();
  var createCheckoutSession = subscriptionContext.createCheckoutSession;
  var subscription = subscriptionContext.subscription;
  var [checkoutLoading, setCheckoutLoading] = React.useState(null);

  var handlePlanClick = function(planName) {
    if (planName === 'Free') {
      onGetStarted();
      return;
    }
    
    // Both Pro and Enterprise redirect to Stripe checkout
    setCheckoutLoading(planName);
    var plan = planName.toLowerCase();
    
    createCheckoutSession(plan, 'monthly')
      .then(function() {
        setCheckoutLoading(null);
      })
      .catch(function(error) {
        alert('Failed to start checkout: ' + error.message);
        setCheckoutLoading(null);
      });
  };
  const [isHoveredScratch, setIsHoveredScratch] = React.useState(false);
  const [isHoveredAI, setIsHoveredAI] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Mobile detection
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll handler for navbar
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Architecture Animation Component
  const ArchitectureAnimation = () => {
    const [animationPhase, setAnimationPhase] = React.useState(0);

    React.useEffect(() => {
      const interval = setInterval(() => {
        setAnimationPhase(prev => (prev + 1) % 4);
      }, 2000);
      return () => clearInterval(interval);
    }, []);

    return (
      <svg width="500" height="400" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Building 1 - Left */}
        <g className={`building-1 ${animationPhase >= 0 ? 'animate' : ''}`}>
          <rect x="50" y="150" width="120" height="200" rx="5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
          <rect x="70" y="180" width="30" height="40" rx="2" fill={animationPhase >= 1 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="120" y="180" width="30" height="40" rx="2" fill={animationPhase >= 1 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="70" y="240" width="30" height="40" rx="2" fill={animationPhase >= 2 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="120" y="240" width="30" height="40" rx="2" fill={animationPhase >= 2 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="70" y="300" width="30" height="40" rx="2" fill={animationPhase >= 3 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="120" y="300" width="30" height="40" rx="2" fill={animationPhase >= 3 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="85" y="120" width="50" height="30" rx="3" fill="rgba(255,255,255,0.2)"/>
        </g>

        {/* Building 2 - Center */}
        <g className={`building-2 ${animationPhase >= 1 ? 'animate' : ''}`}>
          <rect x="200" y="100" width="100" height="250" rx="5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
          <rect x="220" y="130" width="25" height="35" rx="2" fill={animationPhase >= 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="255" y="130" width="25" height="35" rx="2" fill={animationPhase >= 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="220" y="180" width="25" height="35" rx="2" fill={animationPhase >= 1 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="255" y="180" width="25" height="35" rx="2" fill={animationPhase >= 1 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="220" y="230" width="25" height="35" rx="2" fill={animationPhase >= 2 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="255" y="230" width="25" height="35" rx="2" fill={animationPhase >= 2 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="220" y="280" width="25" height="35" rx="2" fill={animationPhase >= 3 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="255" y="280" width="25" height="35" rx="2" fill={animationPhase >= 3 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="215" y="70" width="70" height="30" rx="3" fill="rgba(255,255,255,0.2)"/>
        </g>

        {/* Building 3 - Right */}
        <g className={`building-3 ${animationPhase >= 2 ? 'animate' : ''}`}>
          <rect x="330" y="180" width="120" height="170" rx="5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
          <rect x="350" y="210" width="30" height="40" rx="2" fill={animationPhase >= 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="400" y="210" width="30" height="40" rx="2" fill={animationPhase >= 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="350" y="270" width="30" height="40" rx="2" fill={animationPhase >= 1 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="400" y="270" width="30" height="40" rx="2" fill={animationPhase >= 1 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="350" y="330" width="30" height="40" rx="2" fill={animationPhase >= 2 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="400" y="330" width="30" height="40" rx="2" fill={animationPhase >= 2 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} className="window-glow"/>
          <rect x="365" y="150" width="50" height="30" rx="3" fill="rgba(255,255,255,0.2)"/>
        </g>

        {/* Ground/Foundation */}
        <rect x="0" y="350" width="500" height="50" fill="rgba(255,255,255,0.1)"/>
        
        {/* Trees/Environment */}
        <circle cx="30" cy="340" r="25" fill="rgba(255,255,255,0.1)"/>
        <rect x="25" y="340" width="10" height="20" fill="rgba(255,255,255,0.15)"/>
        <circle cx="470" cy="340" r="25" fill="rgba(255,255,255,0.1)"/>
        <rect x="465" y="340" width="10" height="20" fill="rgba(255,255,255,0.15)"/>
      </svg>
    );
  };

  // SVG Vector Icons for Features
  const DesignIcon = () => (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#4a5568" opacity="0.2"/>
      <rect x="20" y="25" width="40" height="30" rx="3" fill="#4a5568"/>
      <line x1="30" y1="35" x2="50" y2="35" stroke="white" strokeWidth="2"/>
      <line x1="30" y1="42" x2="45" y2="42" stroke="white" strokeWidth="2"/>
      <line x1="30" y1="49" x2="40" y2="49" stroke="white" strokeWidth="2"/>
    </svg>
  );

  const PreviewIcon = () => (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#2d3748" opacity="0.2"/>
      <path d="M25 30 L40 20 L55 30 L55 50 L40 60 L25 50 Z" fill="#2d3748"/>
      <path d="M30 35 L40 28 L50 35 L50 48 L40 55 L30 48 Z" fill="white" opacity="0.8"/>
    </svg>
  );

  const DragIcon = () => (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#f093fb" opacity="0.2"/>
      <rect x="30" y="30" width="20" height="20" rx="2" fill="#f093fb"/>
      <circle cx="35" cy="35" r="2" fill="white"/>
      <circle cx="40" cy="35" r="2" fill="white"/>
      <circle cx="45" cy="35" r="2" fill="white"/>
      <circle cx="35" cy="40" r="2" fill="white"/>
      <circle cx="45" cy="40" r="2" fill="white"/>
      <circle cx="35" cy="45" r="2" fill="white"/>
      <circle cx="40" cy="45" r="2" fill="white"/>
      <circle cx="45" cy="45" r="2" fill="white"/>
    </svg>
  );

  const CustomizeIcon = () => (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#4facfe" opacity="0.2"/>
      <circle cx="40" cy="40" r="15" fill="#4facfe"/>
      <circle cx="40" cy="40" r="8" fill="white"/>
    </svg>
  );

  const ExportIcon = () => (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#43e97b" opacity="0.2"/>
      <path d="M30 25 L30 45 L50 45 L50 35 L45 35 L45 30 L30 30 Z" fill="#43e97b"/>
      <path d="M35 40 L40 45 L45 40" stroke="white" strokeWidth="2" fill="none"/>
    </svg>
  );

  const CollaborateIcon = () => (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#fa709a" opacity="0.2"/>
      <circle cx="35" cy="35" r="8" fill="#fa709a"/>
      <circle cx="45" cy="35" r="8" fill="#fa709a"/>
      <path d="M25 50 Q35 45 40 50 Q45 45 55 50" stroke="#fa709a" strokeWidth="3" fill="none"/>
    </svg>
  );

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features-section');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes windowGlow {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.6; }
        }
        @keyframes buildingRise {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .fade-in-down { animation: fadeInDown 1s ease-out; }
        .fade-in-up { animation: fadeInUp 1s ease-out; }
        .float { animation: float 3s ease-in-out infinite; }
        .slide-in-left { animation: slideInLeft 1s ease-out; }
        .slide-in-right { animation: slideInRight 1s ease-out; }
        .pulse { animation: pulse 2s ease-in-out infinite; }
        .window-glow { animation: windowGlow 2s ease-in-out infinite; }
        .building-1.animate { animation: buildingRise 1.5s ease-out; }
        .building-2.animate { animation: buildingRise 1.5s ease-out 0.3s both; }
        .building-3.animate { animation: buildingRise 1.5s ease-out 0.6s both; }
        .fade-in-delay-1 { animation: fadeInUp 1s ease-out 0.2s both; }
        .fade-in-delay-2 { animation: fadeInUp 1s ease-out 0.4s both; }
        .fade-in-delay-3 { animation: fadeInUp 1s ease-out 0.6s both; }
        .fade-in-delay-4 { animation: fadeInUp 1s ease-out 0.8s both; }

        /* ===== RESPONSIVE DESIGN ===== */

        /* Global mobile fixes */
        @media (max-width: 768px) {
          * {
            overflow-x: hidden !important;
            max-width: 100vw !important;
          }

          body, html {
            overflow-x: hidden !important;
            max-width: 100vw !important;
          }
        }

        /* Mobile First - Base styles are for mobile */
        @media (max-width: 480px) {
          .hero-section {
            padding: 20px !important;
            text-align: center !important;
            width: 100vw !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }

          .hero-content {
            flex-direction: column !important;
            gap: 30px !important;
            text-align: center !important;
            width: 100% !important;
            overflow-x: hidden !important;
          }

          .hero-text {
            padding-left: 0 !important;
            padding-right: 0 !important;
            width: 100% !important;
            overflow-x: hidden !important;
          }

          .hero-visual {
            order: -1 !important;
            max-width: 100% !important;
            width: 100% !important;
            overflow-x: hidden !important;
          }

          .hero-buttons {
            flex-direction: column !important;
            gap: 15px !important;
            align-items: center !important;
            width: 100% !important;
            overflow-x: hidden !important;
          }

          .hero-button {
            width: 100% !important;
            max-width: 300px !important;
            overflow-x: hidden !important;
          }

          .features-section {
            padding: 40px 20px !important;
          }

          .features-grid {
            grid-template-columns: 1fr !important;
            gap: 30px !important;
          }

          .pricing-section {
            padding: 40px 20px !important;
          }

          .pricing-cards {
            flex-direction: column !important;
            align-items: center !important;
          }

          .pricing-card {
            width: 100% !important;
            max-width: 400px !important;
          }

          .architecture-animation {
            height: 300px !important;
          }

          .stat-item {
            margin-bottom: 20px !important;
          }
        }

        @media (max-width: 768px) {
          .hero-section {
            padding: 40px 20px !important;
            min-height: auto !important;
          }

          .hero-content {
            padding: 20px 0 !important;
          }

          .hero-title {
            font-size: 2.5rem !important;
            line-height: 1.2 !important;
          }

          .hero-subtitle {
            font-size: 1.1rem !important;
            line-height: 1.4 !important;
          }

          .features-section h2 {
            font-size: 2rem !important;
          }

          .feature-card {
            padding: 20px !important;
          }

          .pricing-section h2 {
            font-size: 2rem !important;
          }

          .footer-section {
            padding: 40px 20px !important;
            text-align: center !important;
          }

          .footer-content {
            flex-direction: column !important;
            gap: 30px !important;
            text-align: center !important;
          }

          .footer-cta-section {
            text-align: center !important;
            margin-bottom: 30px !important;
          }

          .footer-cta-buttons {
            justify-content: center !important;
            gap: 15px !important;
          }

          .footer-links-section {
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
            gap: 30px !important;
            text-align: center !important;
          }

          .social-links {
            justify-content: center !important;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .hero-section {
            padding: 60px 40px !important;
          }

          .features-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .pricing-cards {
            justify-content: center !important;
            gap: 20px !important;
          }

          .pricing-card {
            flex: 0 1 400px !important;
          }
        }

        @media (min-width: 1025px) {
          .hero-section {
            padding: 80px 60px !important;
          }

          .features-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }

          .pricing-cards {
            justify-content: center !important;
          }
        }

        /* Touch-friendly interactions for mobile */
        @media (hover: none) and (pointer: coarse) {
          .hero-button,
          .pricing-button,
          .feature-card,
          button,
          a[role="button"] {
            min-height: 44px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .hero-button:hover,
          .pricing-button:hover,
          .feature-card:hover {
            transform: none !important;
          }

          .hero-button:active,
          .pricing-button:active,
          .feature-card:active {
            transform: scale(0.98) !important;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .hero-section {
            background: linear-gradient(135deg, #000428 0%, #004e92 100%) !important;
          }

          .feature-card {
            border: 2px solid #ffffff !important;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* Navbar */}
      <Header 
        onBackToHome={() => {}}
        onShowAI={onShowAI}
        onStartFromScratch={onGetStarted}
        onScrollToFeatures={scrollToFeatures}
        currentPage="landing"
        isScrolled={isScrolled}
        isFixed={true}
      />

      {/* Hero Section */}
      <section style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
        color: '#ffffff',
        padding: '120px 20px 40px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: '1400px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '60px',
          zIndex: 1
        }}>
          <div style={{ flex: '1', minWidth: '400px', paddingLeft: '60px' }} className="slide-in-left">
            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 'bold',
              marginBottom: '20px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              lineHeight: '1.2'
            }}>Design Your Perfect Space</h1>
            <h2 style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.4rem)',
              marginBottom: '20px',
              fontWeight: 300,
              opacity: 0.95
            }}>Create stunning 2D floorplans and visualize them in beautiful 3D</h2>
            <p style={{
              fontSize: '1rem',
              marginBottom: '35px',
              lineHeight: '1.8',
              opacity: 0.9,
              maxWidth: '600px'
            }}>
              Bring your interior design ideas to life with our powerful planning tools. 
              Whether you start from scratch or use AI assistance, create professional designs in minutes.
            </p>
            <div style={{
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap',
              marginTop: '-10px'
            }}>
              <button
                onClick={onGetStarted}
                onMouseEnter={() => setIsHoveredScratch(true)}
                onMouseLeave={() => setIsHoveredScratch(false)}
                style={{
                  padding: '15px 35px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: '#4a5568',
                  backgroundColor: '#ffffff',
                  border: 'none',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  transform: isHoveredScratch ? 'translateY(-5px)' : 'translateY(0)',
                  boxShadow: isHoveredScratch ? '0 15px 40px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.3)'
                }}
              >
                Start from scratch
              </button>
              <button
                onClick={(e) => { e.preventDefault(); onShowAI(); }}
                onMouseEnter={() => setIsHoveredAI(true)}
                onMouseLeave={() => setIsHoveredAI(false)}
                style={{
                  padding: '15px 35px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: '2px solid rgba(255,255,255,0.5)',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  backdropFilter: 'blur(10px)',
                  transform: isHoveredAI ? 'translateY(-5px)' : 'translateY(0)',
                  boxShadow: isHoveredAI ? '0 15px 40px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.2)'
                }}
              >
                Start with AI
              </button>
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} className="slide-in-right">
            <div className="float">
              <ArchitectureAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" style={{
        padding: '100px 20px',
        background: '#ffffff',
        color: '#333'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            marginBottom: '20px',
            color: '#4a5568'
          }} className="fade-in-down">Powerful Features</h2>
          <p style={{
            textAlign: 'center',
            fontSize: '1.2rem',
            marginBottom: '60px',
            color: '#666',
            maxWidth: '600px',
            margin: '0 auto 60px'
          }} className="fade-in-up">
            Everything you need to create professional floorplans and 3D visualizations
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '40px'
          }}>
            {[
              { icon: <DesignIcon />, title: '2D Design', desc: 'Draw precise floorplans with intuitive tools' },
              { icon: <PreviewIcon />, title: '3D Preview', desc: 'Visualize your designs in stunning 3D' },
              { icon: <DragIcon />, title: 'Drag & Drop', desc: 'Add furniture and objects with ease' },
              { icon: <CustomizeIcon />, title: 'Customize', desc: 'Fully customizable objects and textures' },
              { icon: <ExportIcon />, title: 'Export', desc: 'Export your designs in multiple formats' },
              { icon: <CollaborateIcon />, title: 'Collaborate', desc: 'Share and collaborate on projects' }
            ].map((feature, idx) => (
              <div key={idx} style={{
                textAlign: 'center',
                padding: '40px 20px',
                borderRadius: '15px',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                transition: 'transform 0.3s ease',
                cursor: 'pointer'
              }}
              className={`fade-in-delay-${(idx % 4) + 1}`}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '15px', color: '#333' }}>{feature.title}</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tutorial Section */}
      <section id="tutorials" style={{
        padding: '100px 20px',
        background: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
        color: '#ffffff'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            marginBottom: '20px'
          }} className="fade-in-down">📺 Video Tutorial</h2>
          <p style={{
            fontSize: '1.2rem',
            marginBottom: '50px',
            opacity: 0.9,
            maxWidth: '700px',
            margin: '0 auto 50px'
          }} className="fade-in-up">
            Watch this quick tutorial to learn how to create professional floorplans with Archify
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '24px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} className="fade-in-up">
            <div style={{
              position: 'relative',
              paddingBottom: '53.125%',
              height: 0,
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}>
              <iframe 
                src="https://www.loom.com/embed/fbb86c21c5f7441bacfb062310b4c8c7?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                frameBorder="0" 
                webkitallowfullscreen="true"
                mozallowfullscreen="true"
                allowFullScreen={true}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
              />
            </div>
          </div>
          <div style={{
            marginTop: '40px',
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={onGetStarted}
              style={{
                padding: '16px 40px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                color: '#4a5568',
                backgroundColor: '#ffffff',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={function(e) {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={function(e) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
              }}
            >
              Try It Yourself →
            </button>
            <button
              onClick={onShowAI}
              style={{
                padding: '16px 40px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                color: '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: '2px solid rgba(255,255,255,0.5)',
                borderRadius: '50px',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={function(e) {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={function(e) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
              }}
            >
              🤖 Make with AI
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{
        padding: '100px 20px',
        background: '#f8f9fa',
        color: '#333'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            marginBottom: '20px',
            color: '#4a5568'
          }} className="fade-in-down">Simple Pricing</h2>
          <p style={{
            textAlign: 'center',
            fontSize: '1.2rem',
            marginBottom: '60px',
            color: '#666',
            maxWidth: '600px',
            margin: '0 auto 60px'
          }} className="fade-in-up">
            Choose the plan that works for you
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px',
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            {[
              { name: 'Free', price: '$0', features: ['Basic 2D design', 'Limited objects', 'Community support'], buttonText: 'Get Started' },
              { name: 'Pro', price: '$29', features: ['Full 2D & 3D', 'Unlimited objects', 'Export options', 'Priority support'], popular: true, buttonText: 'Upgrade to Pro' },
              { name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'Team collaboration', 'API access', 'Dedicated support'], buttonText: 'Contact Sales' }
            ].map(function(plan, idx) {
              var isCurrentPlan = subscription && subscription.plan === plan.name.toLowerCase();
              var isLoading = checkoutLoading === plan.name;
              
              return (
              <div key={idx} style={{
                background: plan.popular ? 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)' : '#ffffff',
                color: plan.popular ? '#ffffff' : '#333',
                padding: '40px 30px',
                borderRadius: '20px',
                boxShadow: plan.popular ? '0 20px 60px rgba(102, 126, 234, 0.4)' : '0 10px 30px rgba(0,0,0,0.1)',
                transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.3s ease',
                position: 'relative'
              }}
              className={'fade-in-delay-' + (idx + 1)}
              onMouseEnter={function(e) { e.currentTarget.style.transform = plan.popular ? 'scale(1.08)' : 'scale(1.05)'; }}
              onMouseLeave={function(e) { e.currentTarget.style.transform = plan.popular ? 'scale(1.05)' : 'scale(1)'; }}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#43e97b',
                    color: '#fff',
                    padding: '5px 20px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}>POPULAR</div>
                )}
                <h3 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{plan.name}</h3>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '30px' }}>
                  {plan.price}
                  {plan.price !== 'Custom' && <span style={{ fontSize: '1rem' }}>/mo</span>}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px' }}>
                  {plan.features.map(function(feature, fIdx) {
                    return (
                    <li key={fIdx} style={{
                      padding: '10px 0',
                      borderBottom: '1px solid ' + (plan.popular ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)')
                    }}>
                      ✓ {feature}
                    </li>
                  );})}
                </ul>
                <button
                  onClick={function() { handlePlanClick(plan.name); }}
                  disabled={isCurrentPlan || isLoading}
                  style={{
                    width: '100%',
                    padding: '15px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: isCurrentPlan ? 'default' : 'pointer',
                    background: plan.popular ? '#ffffff' : '#4a5568',
                    color: plan.popular ? '#4a5568' : '#ffffff',
                    transition: 'all 0.3s ease',
                    opacity: isLoading ? 0.7 : 1
                  }}
                  onMouseEnter={function(e) {
                    if (!isCurrentPlan) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
                    }
                  }}
                  onMouseLeave={function(e) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {isLoading ? 'Processing...' : (isCurrentPlan ? 'Current Plan' : plan.buttonText)}
                </button>
              </div>
            );})}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '100px 20px',
        background: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
        color: '#ffffff',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            marginBottom: '30px'
          }} className="fade-in-down">Start from Scratch</h2>
          <p style={{
            fontSize: '1.3rem',
            marginBottom: '40px',
            opacity: 0.95,
            lineHeight: '1.8'
          }} className="fade-in-up">
            Join thousands of designers creating amazing floorplans and 3D visualizations. 
            Start your project today - it's free!
          </p>
          <button
            onClick={onGetStarted}
            style={{
              padding: '20px 60px',
              fontSize: '1.3rem',
              fontWeight: 'bold',
              color: '#4a5568',
              backgroundColor: '#ffffff',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
            className="fade-in-up"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
            }}
          >
            Start Designing Now
          </button>
        </div>
      </section>

      {/* Footer Section */}
      <footer style={{
        padding: '60px 20px 30px',
        background: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
        color: '#ffffff'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '60px',
            marginBottom: '40px',
            flexWrap: 'wrap'
          }}>
            {/* Left side - 2 CTA sections */}
            <div style={{ flex: '1', minWidth: '300px' }}>
              <div className="fade-in-up footer-cta-section" style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <AILogo />
                  <h3 style={{ fontSize: '1.5rem', color: '#ffffff', margin: 0 }}>Archify</h3>
                </div>
                <p style={{ color: '#ffffff', lineHeight: '1.6', opacity: 0.9, marginBottom: '20px' }}>
                  Create stunning 2D floorplans and visualize them in beautiful 3D.
                  The ultimate tool for interior designers and architects.
                </p>
                <div className="footer-cta-buttons" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => auth.setShowSignupModal(true)}
                    style={{
                      padding: '12px 24px',
                      background: '#ffffff',
                      color: '#4a5568',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.95rem'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                  >
                    Sign Up Free
                  </button>
                  <button
                    onClick={() => auth.setShowLoginModal(true)}
                    style={{
                      padding: '12px 24px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.95rem'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </div>

            {/* Right side - Links sections */}
            <div className="footer-links-section" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '40px',
              flex: '2',
              minWidth: '400px'
            }}>
              <div className="fade-in-delay-1">
                <h4 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#ffffff' }}>Product</h4>
                <ul style={{ listStyle: 'none', padding: 0, color: '#ffffff', opacity: 0.9 }}>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Features</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Pricing</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Documentation</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Updates</li>
                </ul>
              </div>
              <div className="fade-in-delay-2">
                <h4 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#ffffff' }}>Company</h4>
                <ul style={{ listStyle: 'none', padding: 0, color: '#ffffff', opacity: 0.9 }}>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>About</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Blog</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Careers</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Contact</li>
                </ul>
              </div>
              <div className="fade-in-delay-3">
                <h4 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#ffffff' }}>Support</h4>
                <ul style={{ listStyle: 'none', padding: 0, color: '#ffffff', opacity: 0.9 }}>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Help Center</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Community</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Privacy</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Terms</li>
                </ul>
              </div>
            </div>
          </div>
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: '30px',
            textAlign: 'center',
            color: '#ffffff',
            opacity: 0.8,
            fontSize: '0.9rem'
          }} className="fade-in-up">
            <p>© 2024 Archify. All rights reserved. Built with ❤️ for designers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
