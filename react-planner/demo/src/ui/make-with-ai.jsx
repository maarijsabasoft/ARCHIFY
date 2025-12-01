import React from 'react';

const MakeWithAI = ({ onBackToHome, onStartFromScratch, onLoadDesign }) => {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [messages, setMessages] = React.useState([
    {
      role: 'assistant',
      content: "Hello! I'm your AI design assistant. I'll help you create your perfect floor plan. Let's start by understanding your needs. What type of space are you looking to design? (e.g., apartment, house, office, studio)"
    }
  ]);
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [sessionId, setSessionId] = React.useState(null);
  const [generatedDesign, setGeneratedDesign] = React.useState(null);
  const messagesEndRef = React.useRef(null);
  const chatContainerRef = React.useRef(null);

  const API_BASE_URL = 'http://localhost:5000/api';

  // Scroll to bottom of messages within the chat container only
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll handler for navbar
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Send message to backend
  const sendMessage = function(message) {
    if (!message.trim()) return;

    // Add user message to UI
    setMessages(function(prev) { return [...prev, { role: 'user', content: message }]; });
    setInputValue('');
    setIsLoading(true);

    fetch(API_BASE_URL + '/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        message: message
      })
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      console.log('API Response:', data);
      if (data.success) {
        setSessionId(data.session_id);
        setMessages(function(prev) { return [...prev, { role: 'assistant', content: data.message }]; });
        
        if (data.is_design && data.design) {
          console.log('Design detected! Setting generatedDesign state.');
          setGeneratedDesign(data.design);
          // Add confirmation message
          setMessages(function(prev) { return [...prev, { 
            role: 'assistant', 
            content: '✅ Floor plan generated successfully! Click the green "Load Design in Editor" button below to open it in the planner.' 
          }]; });
        }
      } else {
        console.error('API Error:', data.error);
        setMessages(function(prev) { return [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error: ' + (data.error || 'Unknown error') 
        }]; });
      }
      setIsLoading(false);
    })
    .catch(function(error) {
      console.error('Error sending message:', error);
      setMessages(function(prev) { return [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I could not connect to the server. Please make sure the backend is running.' 
      }]; });
      setIsLoading(false);
    });
  };

  // Generate design
  const generateDesign = function() {
    if (!sessionId) {
      setMessages(function(prev) { return [...prev, { 
        role: 'assistant', 
        content: 'Please describe your design requirements first before generating.' 
      }]; });
      return;
    }

    setIsLoading(true);
    setMessages(function(prev) { return [...prev, { 
      role: 'user', 
      content: 'Generate my floor plan design now.' 
    }]; });

    fetch(API_BASE_URL + '/generate-design', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId
      })
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      if (data.success && data.design) {
        setGeneratedDesign(data.design);
        setMessages(function(prev) { return [...prev, { 
          role: 'assistant', 
          content: 'I\'ve generated your floor plan design! Click "Load Design in Editor" to view and edit it in the planner.' 
        }]; });
      } else {
        setMessages(function(prev) { return [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I couldn\'t generate the design. ' + (data.error || 'Please try again.')
        }]; });
      }
      setIsLoading(false);
    })
    .catch(function(error) {
      console.error('Error generating design:', error);
      setMessages(function(prev) { return [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I could not connect to the server. Please make sure the backend is running.' 
      }]; });
      setIsLoading(false);
    });
  };

  // Reset conversation
  const resetConversation = function() {
    if (sessionId) {
      fetch(API_BASE_URL + '/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId })
      }).catch(function(error) {
        console.error('Error resetting:', error);
      });
    }

    setSessionId(null);
    setGeneratedDesign(null);
    setMessages([{
      role: 'assistant',
      content: "Hello! I'm your AI design assistant. I'll help you create your perfect floor plan. Let's start by understanding your needs. What type of space are you looking to design? (e.g., apartment, house, office, studio)"
    }]);
  };

  // Load design into editor
  const loadDesignInEditor = () => {
    if (generatedDesign) {
      // Store design in localStorage as backup
      localStorage.setItem('ai-generated-design', JSON.stringify(generatedDesign));
      
      if (onLoadDesign) {
        // Use the callback to load design directly
        onLoadDesign(generatedDesign);
      } else {
        // Fallback: navigate to tool
        onStartFromScratch();
      }
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // AI Logo Component
  const AILogo = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="aiGradientAI" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#764ba2" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#aiGradientAI)" opacity="0.9"/>
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

  // AI Architecture Animation Component
  const AIArchitectureAnimation = () => {
    const [animationPhase, setAnimationPhase] = React.useState(0);

    React.useEffect(() => {
      const interval = setInterval(() => {
        setAnimationPhase(prev => (prev + 1) % 4);
      }, 1500);
      return () => clearInterval(interval);
    }, []);

    return (
      <svg width="500" height="400" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* AI Neural Network Overlay */}
        <g opacity="0.3">
          <circle cx="100" cy="100" r="3" fill="#ffffff" className="ai-node"/>
          <circle cx="150" cy="80" r="3" fill="#ffffff" className="ai-node"/>
          <circle cx="200" cy="120" r="3" fill="#ffffff" className="ai-node"/>
          <circle cx="250" cy="90" r="3" fill="#ffffff" className="ai-node"/>
          <circle cx="300" cy="110" r="3" fill="#ffffff" className="ai-node"/>
          <line x1="100" y1="100" x2="150" y2="80" stroke="#ffffff" strokeWidth="1" opacity="0.5"/>
          <line x1="150" y1="80" x2="200" y2="120" stroke="#ffffff" strokeWidth="1" opacity="0.5"/>
          <line x1="200" y1="120" x2="250" y2="90" stroke="#ffffff" strokeWidth="1" opacity="0.5"/>
          <line x1="250" y1="90" x2="300" y2="110" stroke="#ffffff" strokeWidth="1" opacity="0.5"/>
        </g>

        {/* Building 1 */}
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

        {/* Building 2 */}
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

        {/* Building 3 */}
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

        {/* Ground */}
        <rect x="0" y="350" width="500" height="50" fill="rgba(255,255,255,0.1)"/>
        <circle cx="30" cy="340" r="25" fill="rgba(255,255,255,0.1)"/>
        <rect x="25" y="340" width="10" height="20" fill="rgba(255,255,255,0.15)"/>
        <circle cx="470" cy="340" r="25" fill="rgba(255,255,255,0.1)"/>
        <rect x="465" y="340" width="10" height="20" fill="rgba(255,255,255,0.15)"/>
      </svg>
    );
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
        @keyframes aiPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
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
        .ai-pulse { animation: aiPulse 2s ease-in-out infinite; }
        .fade-in-delay-1 { animation: fadeInUp 1s ease-out 0.2s both; }
        .fade-in-delay-2 { animation: fadeInUp 1s ease-out 0.4s both; }
        .fade-in-delay-3 { animation: fadeInUp 1s ease-out 0.6s both; }
        .ai-node { animation: aiPulse 3s ease-in-out infinite; }
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(10px)' : 'none',
        boxShadow: isScrolled ? '0 2px 20px rgba(0,0,0,0.1)' : 'none',
        transition: 'all 0.3s ease',
        padding: '20px 40px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: isScrolled ? '#667eea' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'color 0.3s ease',
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '30px'
          }}>
            <a href="#" onClick={(e) => { e.preventDefault(); }} style={{
              color: isScrolled ? '#333' : '#ffffff',
              textDecoration: 'none',
              fontWeight: 'bold',
              transition: 'color 0.3s ease',
              cursor: 'pointer',
              borderBottom: '2px solid #ffffff',
              paddingBottom: '5px'
            }}>Make with AI</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onStartFromScratch(); }} style={{
              color: isScrolled ? '#333' : '#ffffff',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'color 0.3s ease',
              cursor: 'pointer'
            }}>Start from scratch</a>
            <a href="#" onClick={(e) => { e.preventDefault(); }} style={{
              color: isScrolled ? '#333' : '#ffffff',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'color 0.3s ease',
              cursor: 'pointer'
            }}>Login</a>
            <button onClick={(e) => { e.preventDefault(); }} style={{
              padding: '12px 30px',
              background: '#ffffff',
              color: '#667eea',
              border: '2px solid #ffffff',
              borderRadius: '25px',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(255,255,255,0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,255,255,0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(255,255,255,0.3)';
            }}
            >Signup</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            }}>Design with AI</h1>
            <h2 style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.4rem)',
              marginBottom: '20px',
              fontWeight: 300,
              opacity: 0.95
            }}>AI-Powered Architecture Creation</h2>
            <p style={{
              fontSize: '1rem',
              marginBottom: '35px',
              lineHeight: '1.8',
              opacity: 0.9,
              maxWidth: '600px'
            }}>
              Describe your dream space and let AI transform your vision into detailed architectural plans.
              From modern apartments to traditional homes - create anything with intelligent prompts.
            </p>
            <div style={{
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap',
              marginTop: '-10px'
            }}>
              <button
                onClick={() => {
                  const chatSection = document.getElementById('chat-section');
                  if (chatSection) {
                    chatSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                style={{
                  padding: '15px 35px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: '#667eea',
                  backgroundColor: '#ffffff',
                  border: 'none',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  transform: 'translateY(0)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
                }}
              >
                Start Creating
              </button>
              <button
                onClick={() => {
                  const promptSection = document.getElementById('prompts-section');
                  if (promptSection) {
                    promptSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
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
                  transform: 'translateY(0)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.3)';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                }}
              >
                View Prompts
              </button>
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} className="slide-in-right">
            <div className="float">
              <AIArchitectureAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* AI Prompts Section */}
      <section id="prompts-section" style={{
        padding: '100px 20px',
        background: '#ffffff',
        color: '#333'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            marginBottom: '20px',
            color: '#667eea'
          }} className="fade-in-down">AI Architecture Prompts</h2>
          <p style={{
            textAlign: 'center',
            fontSize: '1.2rem',
            marginBottom: '60px',
            color: '#666',
            maxWidth: '700px',
            margin: '0 auto 60px'
          }} className="fade-in-up">
            Use these intelligent prompts to guide AI in creating your perfect architectural designs
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px'
          }}>
            {[
              {
                category: 'Residential',
                icon: '🏠',
                prompts: [
                  'Design a modern 3-bedroom apartment',
                  'Create a traditional 2-story family home',
                  'Design a minimalist studio apartment'
                ]
              },
              {
                category: 'Commercial',
                icon: '🏢',
                prompts: [
                  'Design a modern office space',
                  'Create a retail store layout',
                  'Design a restaurant with dining areas'
                ]
              },
              {
                category: 'Specialized',
                icon: '🎨',
                prompts: [
                  'Design an art studio',
                  'Create a home gym layout',
                  'Design a home office'
                ]
              },
              {
                category: 'Styles',
                icon: '🏛️',
                prompts: [
                  'Design Scandinavian-style living room',
                  'Create Mediterranean villa',
                  'Build industrial loft'
                ]
              },
              {
                category: 'Outdoor',
                icon: '🌳',
                prompts: [
                  'Design a backyard garden layout',
                  'Create outdoor patio design',
                  'Plan sustainable landscape'
                ]
              },
              {
                category: 'Luxury',
                icon: '💎',
                prompts: [
                  'Design luxury penthouse',
                  'Create smart home automation',
                  'Build premium spa bathroom'
                ]
              }
            ].map((category, idx) => (
              <div key={idx} style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                padding: '30px',
                borderRadius: '15px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                transition: 'transform 0.3s ease',
                cursor: 'pointer'
              }}
              className={`fade-in-delay-${(idx % 4) + 1}`}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{category.icon}</div>
                  <h3 style={{ fontSize: '1.2rem', color: '#667eea', margin: 0, fontWeight: 'bold' }}>{category.category}</h3>
                </div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {category.prompts.map((prompt, pIdx) => (
                    <li key={pIdx} style={{
                      padding: '8px 0',
                      borderBottom: pIdx < category.prompts.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                      fontSize: '0.85rem',
                      lineHeight: '1.4',
                      color: '#555',
                      cursor: 'pointer',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#667eea'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#555'}
                    >
                      {prompt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chatbot Interface Section */}
      <section id="chat-section" style={{
        padding: '100px 20px',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        color: '#333'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            marginBottom: '20px',
            color: '#667eea'
          }} className="fade-in-down">AI Design Assistant</h2>
          <p style={{
            textAlign: 'center',
            fontSize: '1.2rem',
            marginBottom: '60px',
            color: '#666',
            maxWidth: '700px',
            margin: '0 auto 60px'
          }} className="fade-in-up">
            Chat with our AI assistant to design your perfect floor plan. Describe your space and let AI create it for you!
          </p>

          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {/* Chat Header */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '20px 30px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  🤖
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Archify AI Assistant</h3>
                  <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                    {isLoading ? 'Thinking...' : 'Online • Ready to help with your designs'}
                  </p>
                </div>
              </div>
              <button
                onClick={resetConversation}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
              >
                New Chat
              </button>
            </div>

            {/* Chat Messages */}
            <div 
              ref={chatContainerRef}
              style={{
                height: '400px',
                padding: '30px',
                overflowY: 'auto',
                background: '#fafafa'
              }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  marginBottom: '20px',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: '15px'
                }}>
                  {msg.role === 'assistant' && (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      flexShrink: 0
                    }}>
                      🤖
                    </div>
                  )}
                  <div style={{
                    background: msg.role === 'user' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : '#ffffff',
                    padding: '15px 20px',
                    borderRadius: msg.role === 'user' 
                      ? '18px 18px 5px 18px' 
                      : '18px 18px 18px 5px',
                    boxShadow: msg.role === 'user' 
                      ? '0 2px 10px rgba(102, 126, 234, 0.3)' 
                      : '0 2px 10px rgba(0,0,0,0.1)',
                    maxWidth: '70%',
                    color: msg.role === 'user' ? '#ffffff' : '#333'
                  }}>
                    <p style={{ margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      flexShrink: 0
                    }}>
                      👤
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div style={{
                  display: 'flex',
                  marginBottom: '20px',
                  alignItems: 'flex-start',
                  gap: '15px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    🤖
                  </div>
                  <div style={{
                    background: '#ffffff',
                    padding: '15px 20px',
                    borderRadius: '18px 18px 18px 5px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <span style={{ animation: 'pulse 1s infinite', animationDelay: '0s' }}>●</span>
                      <span style={{ animation: 'pulse 1s infinite', animationDelay: '0.2s' }}>●</span>
                      <span style={{ animation: 'pulse 1s infinite', animationDelay: '0.4s' }}>●</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Generated Design Actions */}
            {generatedDesign && (
              <div style={{
                padding: '15px 30px',
                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '15px'
              }}>
                <span style={{ color: '#ffffff', fontWeight: 'bold' }}>
                  ✓ Design Generated Successfully!
                </span>
                <button
                  onClick={loadDesignInEditor}
                  style={{
                    padding: '10px 25px',
                    background: '#ffffff',
                    color: '#4CAF50',
                    border: 'none',
                    borderRadius: '25px',
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  Load Design in Editor
                </button>
              </div>
            )}

            {/* Chat Input */}
            <div style={{
              padding: '20px 30px',
              background: '#ffffff',
              borderTop: '1px solid #e9ecef',
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your space requirements..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '15px 20px',
                  border: '2px solid #e9ecef',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  background: isLoading ? '#f5f5f5' : '#fafafa',
                  opacity: isLoading ? 0.7 : 1
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
              />
              <button 
                onClick={() => sendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                style={{
                  padding: '15px 25px',
                  background: isLoading || !inputValue.trim() 
                    ? '#cccccc' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && inputValue.trim()) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                }}
              >
                Send
              </button>
            </div>

            {/* Quick Suggestions */}
            <div style={{
              padding: '20px 30px',
              background: '#f8f9fa',
              borderTop: '1px solid #e9ecef',
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              {[
                'Design a modern 2-bedroom apartment',
                'Create a small studio with kitchen',
                'Design an open-plan living room',
                'Create a home office space'
              ].map((suggestion, idx) => (
                <button 
                  key={idx} 
                  onClick={() => sendMessage(suggestion)}
                  disabled={isLoading}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(102, 126, 234, 0.1)',
                    color: '#667eea',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: isLoading ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.2)';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section style={{
        padding: '100px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#ffffff'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            marginBottom: '20px'
          }} className="fade-in-down">How AI Design Works</h2>
          <p style={{
            fontSize: '1.2rem',
            marginBottom: '60px',
            opacity: 0.9,
            maxWidth: '700px',
            margin: '0 auto 60px'
          }} className="fade-in-up">
            Transform your ideas into reality with our intelligent AI-powered design system
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '40px'
          }}>
            {[
              { step: '1', title: 'Describe Your Vision', desc: 'Tell AI about your space requirements, style preferences, and special features' },
              { step: '2', title: 'AI Generates Plans', desc: 'Our intelligent algorithms create detailed floorplans and 3D visualizations' },
              { step: '3', title: 'Refine & Customize', desc: 'Use our tools to adjust layouts, add furniture, and perfect your design' },
              { step: '4', title: 'Export & Share', desc: 'Download your designs in multiple formats for construction or sharing' }
            ].map((step, idx) => (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '40px 20px',
                borderRadius: '15px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'transform 0.3s ease'
              }}
              className={`fade-in-delay-${idx + 1}`}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: '#ffffff',
                  color: '#667eea',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  margin: '0 auto 20px',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
                }}>
                  {step.step}
                </div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '15px' }}>{step.title}</h3>
                <p style={{ opacity: 0.9, lineHeight: '1.6' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '100px 20px',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        color: '#ffffff',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            marginBottom: '30px'
          }} className="fade-in-down">Ready to Create with AI?</h2>
          <p style={{
            fontSize: '1.3rem',
            marginBottom: '40px',
            opacity: 0.95,
            lineHeight: '1.8'
          }} className="fade-in-up">
            Start designing your perfect space today. Whether you have a clear vision or just an idea,
            our AI will help bring your architectural dreams to life.
          </p>
          <button
            onClick={onStartFromScratch}
            style={{
              padding: '20px 60px',
              fontSize: '1.3rem',
              fontWeight: 'bold',
              color: '#f5576c',
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
            Start AI Design
          </button>
        </div>
      </section>

      {/* Footer Section */}
      <footer style={{
        padding: '60px 20px 30px',
        background: 'linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%)',
        color: '#ffffff'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '40px',
            marginBottom: '40px'
          }}>
            <div className="fade-in-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <AILogo />
                <h3 style={{ fontSize: '1.5rem', color: '#ffffff', margin: 0 }}>Archify</h3>
              </div>
              <p style={{ color: '#ffffff', lineHeight: '1.6', opacity: 0.9 }}>
                Create stunning 2D floorplans and visualize them in beautiful 3D.
                The ultimate tool for interior designers and architects.
              </p>
            </div>
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

export default MakeWithAI;
