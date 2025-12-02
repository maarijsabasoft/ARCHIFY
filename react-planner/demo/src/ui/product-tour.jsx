import React from 'react';

// Tour steps configuration - targeting main toolbar buttons (top/left bar)
var TOUR_STEPS = [
  {
    title: 'Welcome to Archify',
    description: 'This is your design workspace. Let me show you the main toolbar tools one by one.',
    position: 'center',
    icon: '🎨'
  },
  {
    title: 'New Project',
    description: 'Start a brand new project. Be sure to save your work before creating a new one.',
    buttonIndex: 0,
    position: 'right',
    icon: '📄'
  },
  {
    title: 'Save Project',
    description: 'Save your current design so you can open it again later.',
    buttonIndex: 1,
    position: 'right',
    icon: '💾'
  },
  {
    title: 'Load Project',
    description: 'Open a design you previously saved from your computer.',
    buttonIndex: 2,
    position: 'right',
    icon: '📂'
  },
  {
    title: 'Open Catalog',
    description: 'Browse the catalog to add furniture, doors, windows and more to your plan.',
    buttonIndex: 3,
    position: 'right',
    icon: '📦'
  },
  {
    title: '3D View',
    description: 'Switch to 3D view to see a realistic preview of your design.',
    buttonIndex: 4,
    position: 'right',
    icon: '🏠'
  },
  {
    title: '2D View',
    description: 'Go back to the 2D view where you draw and edit your floor plan.',
    buttonIndex: 5,
    position: 'right',
    icon: '📐'
  },
  {
    title: '3D First Person',
    description: 'Walk through your design in first-person mode to experience the space.',
    buttonIndex: 6,
    position: 'right',
    icon: '🚶'
  },
  {
    title: 'Undo',
    description: 'Undo your last action if you make a mistake.',
    buttonIndex: 7,
    position: 'right',
    icon: '↩️'
  },
  {
    title: 'Configure Project',
    description: 'Change project settings like units, grid and other preferences.',
    buttonIndex: 8,
    position: 'right',
    icon: '⚙️'
  },
  {
    title: 'Get Screenshot',
    description: 'Capture a high-quality image of your plan to share or download.',
    buttonIndex: 9,
    position: 'right',
    icon: '📸'
  },
  {
    title: 'You\'re Ready!',
    description: 'You\'re ready to design! Click the help button anytime to see this tour again.',
    position: 'center',
    icon: '🎉'
  }
];

// Tour Context
export var TourContext = React.createContext(null);

export function TourProvider(props) {
  var children = props.children;
  var _state1 = React.useState(false);
  var isActive = _state1[0];
  var setIsActive = _state1[1];
  
  var _state2 = React.useState(0);
  var currentStep = _state2[0];
  var setCurrentStep = _state2[1];
  
  var _state3 = React.useState(false);
  var hasSeenTour = _state3[0];
  var setHasSeenTour = _state3[1];

  React.useEffect(function() {
    var seen = localStorage.getItem('archify-tour-completed');
    if (seen) {
      setHasSeenTour(true);
    }
  }, []);

  function startTour() {
    setCurrentStep(0);
    setIsActive(true);
  }

  function endTour() {
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem('archify-tour-completed', 'true');
    setHasSeenTour(true);
  }

  function nextStep() {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      endTour();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  function skipTour() {
    endTour();
  }

  var value = {
    isActive: isActive,
    currentStep: currentStep,
    totalSteps: TOUR_STEPS.length,
    steps: TOUR_STEPS,
    hasSeenTour: hasSeenTour,
    startTour: startTour,
    endTour: endTour,
    nextStep: nextStep,
    prevStep: prevStep,
    skipTour: skipTour
  };

  return React.createElement(TourContext.Provider, { value: value }, children);
}

export function useTour() {
  var context = React.useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
}

// Tour Overlay Component
export function TourOverlay() {
  var tour = useTour();
  var _state = React.useState(null);
  var targetRect = _state[0];
  var setTargetRect = _state[1];
  
  var _state2 = React.useState({ x: 0, y: 0 });
  var tooltipPosition = _state2[0];
  var setTooltipPosition = _state2[1];

  React.useEffect(function() {
    if (!tour.isActive) return;

    var step = TOUR_STEPS[tour.currentStep];
    
    var updatePosition = function() {
      // For center position (intro/outro steps)
      if (step.position === 'center') {
        setTargetRect(null);
        setTooltipPosition({
          x: window.innerWidth / 2 - 180,
          y: window.innerHeight / 2 - 120
        });
        return;
      }

      // Find main toolbar (where project actions and view icons are)
      var toolbar = document.querySelector('.toolbar') || document.querySelector('[class*="toolbar"]');
      if (!toolbar) {
        setTargetRect(null);
        setTooltipPosition({
          x: window.innerWidth / 2 - 180,
          y: window.innerHeight / 2 - 120
        });
        return;
      }

      // Get all clickable elements in toolbar (the tool buttons)
      var buttons = toolbar.querySelectorAll('div[style*="cursor: pointer"], div[style*="cursor:pointer"]');
      
      if (step.buttonIndex !== undefined && buttons.length > step.buttonIndex) {
        var target = buttons[step.buttonIndex];
        var rect = target.getBoundingClientRect();
        setTargetRect(rect);
        
        // Position tooltip to the right of the sidebar button with arrow pointing left
        var tooltipWidth = 320;
        var x = rect.right + 20; // 20px gap from the button
        var y = rect.top + (rect.height / 2) - 60; // Center vertically with button
        
        // Keep tooltip in viewport
        if (y < 20) y = 20;
        if (y + 200 > window.innerHeight) y = window.innerHeight - 220;
        
        setTooltipPosition({ x: x, y: y });
      } else {
        setTargetRect(null);
        setTooltipPosition({
          x: window.innerWidth / 2 - 180,
          y: window.innerHeight / 2 - 120
        });
      }
    };

    // Initial update with delay for DOM to be ready
    var timeout = setTimeout(updatePosition, 150);
    
    // Update on resize
    window.addEventListener('resize', updatePosition);
    
    return function() {
      clearTimeout(timeout);
      window.removeEventListener('resize', updatePosition);
    };
  }, [tour.isActive, tour.currentStep]);

  if (!tour.isActive) return null;

  var step = TOUR_STEPS[tour.currentStep];
  var isCenter = step.position === 'center';

  // Styles
  var overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    pointerEvents: 'none'
  };

  var backdropStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    pointerEvents: 'auto'
  };

  // Highlight style for sidebar button
  var highlightStyle = targetRect ? {
    position: 'fixed',
    top: targetRect.top - 6,
    left: targetRect.left - 6,
    width: targetRect.width + 12,
    height: targetRect.height + 12,
    borderRadius: '10px',
    boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.75)',
    border: '3px solid #667eea',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
    transition: 'all 0.3s ease',
    animation: 'tourPulse 2s ease-in-out infinite'
  } : null;

  // Tooltip container style
  var tooltipStyle = {
    position: 'fixed',
    top: tooltipPosition.y,
    left: tooltipPosition.x,
    width: '320px',
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    padding: '20px 24px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    pointerEvents: 'auto',
    zIndex: 100000,
    animation: 'tourFadeIn 0.3s ease'
  };

  // Arrow pointing to the left (towards the sidebar button)
  var arrowStyle = !isCenter && targetRect ? {
    position: 'absolute',
    left: '-12px',
    top: '50px',
    width: 0,
    height: 0,
    borderTop: '12px solid transparent',
    borderBottom: '12px solid transparent',
    borderRight: '12px solid #1a1a2e',
    filter: 'drop-shadow(-3px 0 3px rgba(0,0,0,0.2))'
  } : null;

  // Arrow border (for glow effect)
  var arrowBorderStyle = !isCenter && targetRect ? {
    position: 'absolute',
    left: '-16px',
    top: '47px',
    width: 0,
    height: 0,
    borderTop: '15px solid transparent',
    borderBottom: '15px solid transparent',
    borderRight: '15px solid #667eea'
  } : null;

  var headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  };

  var iconStyle = {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    flexShrink: 0
  };

  var titleStyle = {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '700',
    margin: 0
  };

  var descriptionStyle = {
    color: '#a0a0a0',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '16px'
  };

  var progressContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px'
  };

  var dotsContainerStyle = {
    display: 'flex',
    gap: '6px'
  };

  var dotStyle = function(index) {
    return {
      width: index === tour.currentStep ? '20px' : '8px',
      height: '8px',
      borderRadius: '4px',
      backgroundColor: index === tour.currentStep ? '#667eea' : 
                       index < tour.currentStep ? '#22c55e' : 'rgba(255,255,255,0.2)',
      transition: 'all 0.3s ease'
    };
  };

  var stepTextStyle = {
    color: '#666',
    fontSize: '12px'
  };

  var buttonContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  var skipButtonStyle = {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#888',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  var navButtonsStyle = {
    display: 'flex',
    gap: '8px'
  };

  var backButtonStyle = {
    padding: '10px 18px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  var nextButtonStyle = {
    padding: '10px 22px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
  };

  return React.createElement('div', { style: overlayStyle },
    React.createElement('style', null, 
      '@keyframes tourFadeIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }' +
      '@keyframes tourPulse { 0%, 100% { box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.75), 0 0 0 0 rgba(102, 126, 234, 0.4); } 50% { box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.75), 0 0 20px 5px rgba(102, 126, 234, 0.6); } }'
    ),
    
    // Backdrop for center position only
    isCenter && React.createElement('div', { style: backdropStyle, onClick: tour.skipTour }),
    
    // Highlight box around target button
    targetRect && React.createElement('div', { style: highlightStyle }),
    
    // Tooltip
    React.createElement('div', { style: tooltipStyle },
      // Arrow pointing to sidebar
      arrowBorderStyle && React.createElement('div', { style: arrowBorderStyle }),
      arrowStyle && React.createElement('div', { style: arrowStyle }),
      
      // Header with icon and title
      React.createElement('div', { style: headerStyle },
        React.createElement('div', { style: iconStyle }, step.icon),
        React.createElement('h3', { style: titleStyle }, step.title)
      ),
      
      // Description
      React.createElement('p', { style: descriptionStyle }, step.description),
      
      // Progress
      React.createElement('div', { style: progressContainerStyle },
        React.createElement('div', { style: dotsContainerStyle },
          TOUR_STEPS.map(function(_, index) {
            return React.createElement('div', { key: index, style: dotStyle(index) });
          })
        ),
        React.createElement('span', { style: stepTextStyle },
          (tour.currentStep + 1) + ' / ' + tour.totalSteps
        )
      ),
      
      // Buttons
      React.createElement('div', { style: buttonContainerStyle },
        React.createElement('button', {
          onClick: tour.skipTour,
          style: skipButtonStyle,
          onMouseEnter: function(e) { e.target.style.color = '#fff'; },
          onMouseLeave: function(e) { e.target.style.color = '#888'; }
        }, 'Skip'),
        
        React.createElement('div', { style: navButtonsStyle },
          tour.currentStep > 0 && React.createElement('button', {
            onClick: tour.prevStep,
            style: backButtonStyle,
            onMouseEnter: function(e) { e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; },
            onMouseLeave: function(e) { e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }
          }, '← Back'),
          
          React.createElement('button', {
            onClick: tour.nextStep,
            style: nextButtonStyle,
            onMouseEnter: function(e) { 
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
            },
            onMouseLeave: function(e) { 
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }
          }, tour.currentStep === tour.totalSteps - 1 ? 'Finish ✓' : 'Next →')
        )
      )
    )
  );
}

// Welcome Modal for first-time users
export function WelcomeTourModal() {
  var tour = useTour();
  var _state = React.useState(true);
  var isVisible = _state[0];
  var setIsVisible = _state[1];

  // Only show if tour hasn't been seen and not currently active
  if (tour.hasSeenTour || tour.isActive || !isVisible) return null;

  // Check if we're on the tool page
  var isToolPage = window.location.pathname.includes('/tool');
  if (!isToolPage) return null;

  function handleStartTour() {
    setIsVisible(false);
    tour.startTour();
  }

  function handleSkip() {
    setIsVisible(false);
    localStorage.setItem('archify-tour-completed', 'true');
  }

  var overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99998,
    backdropFilter: 'blur(8px)'
  };

  var modalStyle = {
    backgroundColor: '#1a1a2e',
    borderRadius: '24px',
    padding: '48px',
    maxWidth: '440px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 30px 60px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    animation: 'welcomeFadeIn 0.4s ease'
  };

  var iconContainerStyle = {
    width: '90px',
    height: '90px',
    borderRadius: '24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 28px',
    fontSize: '42px',
    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
  };

  var titleStyle = {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '12px'
  };

  var subtitleStyle = {
    color: '#888',
    fontSize: '16px',
    lineHeight: '1.7',
    marginBottom: '36px'
  };

  var buttonContainerStyle = {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center'
  };

  var skipButtonStyle = {
    padding: '14px 28px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  var startButtonStyle = {
    padding: '14px 36px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
  };

  return React.createElement('div', { style: overlayStyle },
    React.createElement('style', null, 
      '@keyframes welcomeFadeIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }'
    ),
    React.createElement('div', { style: modalStyle },
      React.createElement('div', { style: iconContainerStyle }, '🏠'),
      React.createElement('h2', { style: titleStyle }, 'Welcome to Archify!'),
      React.createElement('p', { style: subtitleStyle },
        "Let's take a quick tour of the design tools. I'll show you each button on the sidebar and what it does."
      ),
      React.createElement('div', { style: buttonContainerStyle },
        React.createElement('button', {
          onClick: handleSkip,
          style: skipButtonStyle,
          onMouseEnter: function(e) { e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; },
          onMouseLeave: function(e) { e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }
        }, 'Skip'),
        React.createElement('button', {
          onClick: handleStartTour,
          style: startButtonStyle,
          onMouseEnter: function(e) { 
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.5)';
          },
          onMouseLeave: function(e) { 
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
          }
        }, 'Start Tour →')
      )
    )
  );
}

// Help button to restart tour
export function TourHelpButton() {
  var tour = useTour();
  var _state = React.useState(false);
  var isHovered = _state[0];
  var setIsHovered = _state[1];
  
  // Only show on tool page
  var isToolPage = window.location.pathname.includes('/tool');
  if (!isToolPage || tour.isActive) return null;

  var buttonStyle = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: isHovered ? 'auto' : '52px',
    height: '52px',
    borderRadius: isHovered ? '26px' : '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: isHovered ? '0 20px' : '0',
    fontSize: '20px',
    color: '#fff',
    fontWeight: '600',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s ease',
    zIndex: 9999
  };

  return React.createElement('button', {
    onClick: tour.startTour,
    style: buttonStyle,
    title: 'Start Tour',
    onMouseEnter: function() { setIsHovered(true); },
    onMouseLeave: function() { setIsHovered(false); }
  }, 
    '❓',
    isHovered && React.createElement('span', { style: { fontSize: '14px' } }, 'Tour')
  );
}

export default { TourProvider, useTour, TourOverlay, WelcomeTourModal, TourHelpButton };
