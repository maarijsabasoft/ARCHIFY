import React from 'react';
import ReactDOM from 'react-dom';
import ContainerDimensions from 'react-container-dimensions';
import Immutable, {Map} from 'immutable';
import immutableDevtools from 'immutable-devtools';
import {createStore} from 'redux';
import {Provider} from 'react-redux';

import MyCatalog from './catalog/mycatalog';

import ToolbarScreenshotButton from './ui/toolbar-screenshot-button';
import LandingPage from './ui/landing-page';
import MakeWithAI from './ui/make-with-ai';
import Header, { AILogo } from './ui/header';
import { AuthProvider, LoginModal, SignupModal, VerificationModal, ForgotPasswordModal, ResetPasswordModal, UserMenu } from './ui/auth-modals';
import { TourProvider, TourOverlay, WelcomeTourModal, TourHelpButton } from './ui/product-tour';
import { SubscriptionProvider, PricingSection, AccountPage } from './ui/subscription';

import {
  Models as PlannerModels,
  reducer as PlannerReducer,
  ReactPlanner,
  Plugins as PlannerPlugins,
} from 'react-planner'; //react-planner

//define state
let AppState = Map({
  'react-planner': new PlannerModels.State()
});

//define reducer
let reducer = (state, action) => {
  state = state || AppState;
  state = state.update('react-planner', plannerState => PlannerReducer(plannerState, action));
  return state;
};

let blackList = isProduction === true ? [] : [
  'UPDATE_MOUSE_COORDS',
  'UPDATE_ZOOM_SCALE',
  'UPDATE_2D_CAMERA'
];

if( !isProduction ) {
  console.info('Environment is in development and these actions will be blacklisted', blackList);
  console.info('Enable Chrome custom formatter for Immutable pretty print');
  immutableDevtools( Immutable );
}

//init store
let store = createStore(
  reducer,
  null,
  !isProduction && window.devToolsExtension ?
    window.devToolsExtension({
      features: {
        pause   : true,     // start/pause recording of dispatched actions
        lock    : true,     // lock/unlock dispatching actions and side effects
        persist : true,     // persist states on page reloading
        export  : true,     // export history of actions in a file
        import  : 'custom', // import history of actions from a file
        jump    : true,     // jump back and forth (time travelling)
        skip    : true,     // skip (cancel) actions
        reorder : true,     // drag and drop actions in the history list
        dispatch: true,     // dispatch custom actions or action creators
        test    : true      // generate tests for the selected actions
      },
      actionsBlacklist: blackList,
      maxAge: 999999
    }) :
    f => f
);

let plugins = [
  PlannerPlugins.Keyboard(),
  PlannerPlugins.Autosave('react-planner_v0'),
  PlannerPlugins.ConsoleDebugger(),
];

let toolbarButtons = [
  ToolbarScreenshotButton,
];

// Main App Component with Multiple Views
class App extends React.Component {
  constructor(props) {
    super(props);
    // Check URL path for initial view
    const path = window.location.pathname;
    let initialView = 'landing';
    if (path === '/tool' || path.endsWith('/tool')) {
      initialView = 'tool';
    } else if (path === '/planner' || path.endsWith('/planner')) {
      initialView = 'planner';
    } else if (path === '/pricing' || path.endsWith('/pricing')) {
      initialView = 'pricing';
    } else if (path === '/account' || path.endsWith('/account')) {
      initialView = 'account';
    }
    
    this.state = {
      currentView: initialView, // 'landing', 'ai', 'planner', 'tool', 'pricing', 'account'
      aiGeneratedDesign: null
    };
    this.handleGetStarted = this.handleGetStarted.bind(this);
    this.handleBackToHome = this.handleBackToHome.bind(this);
    this.handleShowAI = this.handleShowAI.bind(this);
    this.handleOpenTool = this.handleOpenTool.bind(this);
    this.handleLoadDesign = this.handleLoadDesign.bind(this);
    this.handleShowPricing = this.handleShowPricing.bind(this);
    this.handleShowAccount = this.handleShowAccount.bind(this);
  }

  componentDidMount() {
    // Clear any corrupted autosave data on mount
    // This is a one-time fix for invalid item types
    try {
      const autosaved = localStorage.getItem('react-planner_v0');
      if (autosaved) {
        const parsed = JSON.parse(autosaved);
        // Check if there are any items and validate them
        if (parsed && parsed.layers) {
          let hasInvalidItems = false;
          const validTypes = ['sofa', 'table', 'sedia', 'armchairs', 'bench', 'bookcase', 'wardrobe',
            'kitchen', 'sink', 'fridge', 'tv', 'desk', 'conditioner', 'trash', 'wall',
            'door', 'window', 'double door', 'sliding door', 'sash window'];
          
          Object.keys(parsed.layers).forEach(function(layerId) {
            const layer = parsed.layers[layerId];
            if (layer.items) {
              Object.keys(layer.items).forEach(function(itemId) {
                if (validTypes.indexOf(layer.items[itemId].type) === -1) {
                  hasInvalidItems = true;
                }
              });
            }
          });
          
          if (hasInvalidItems) {
            console.warn('Clearing corrupted autosave with invalid items');
            localStorage.removeItem('react-planner_v0');
          }
        }
      }
    } catch (e) {
      localStorage.removeItem('react-planner_v0');
    }

    // Handle browser back/forward navigation
    window.addEventListener('popstate', () => {
      const path = window.location.pathname;
      if (path === '/tool' || path.endsWith('/tool')) {
        this.setState({ currentView: 'tool' });
      } else if (path === '/planner' || path.endsWith('/planner')) {
        this.setState({ currentView: 'planner' });
      } else if (path === '/pricing' || path.endsWith('/pricing')) {
        this.setState({ currentView: 'pricing' });
      } else if (path === '/account' || path.endsWith('/account')) {
        this.setState({ currentView: 'account' });
      } else {
        this.setState({ currentView: 'landing' });
      }
    });
  }

  handleGetStarted() {
    this.setState({ currentView: 'planner' });
  }

  handleShowAI() {
    this.setState({ currentView: 'ai' });
  }

  handleBackToHome() {
    window.history.pushState({}, '', '/');
    this.setState({ currentView: 'landing' });
  }

  handleOpenTool() {
    window.history.pushState({}, '', '/tool');
    this.setState({ currentView: 'tool' });
  }

  handleLoadDesign(design) {
    // Store the design and navigate to tool view
    this.setState({ 
      aiGeneratedDesign: design,
      currentView: 'tool' 
    });
    window.history.pushState({}, '', '/tool');
  }

  handleShowPricing() {
    window.history.pushState({}, '', '/pricing');
    this.setState({ currentView: 'pricing' });
  }

  handleShowAccount() {
    window.history.pushState({}, '', '/account');
    this.setState({ currentView: 'account' });
  }

  render() {
    if (this.state.currentView === 'landing') {
      return <LandingPage onGetStarted={this.handleGetStarted} onShowAI={this.handleShowAI} />;
    }

    if (this.state.currentView === 'ai') {
      return <MakeWithAI 
        onBackToHome={this.handleBackToHome} 
        onStartFromScratch={this.handleGetStarted}
        onLoadDesign={this.handleLoadDesign}
      />;
    }

    if (this.state.currentView === 'pricing') {
      return (
        <div>
          <Header 
            onBackToHome={this.handleBackToHome}
            onShowAI={this.handleShowAI}
            onStartFromScratch={this.handleGetStarted}
            currentPage="pricing"
            isScrolled={true}
            isFixed={true}
          />
          <div style={{ paddingTop: '80px' }}>
            <PricingSection onClose={this.handleBackToHome} />
          </div>
        </div>
      );
    }

    if (this.state.currentView === 'account') {
      return (
        <div>
          <Header 
            onBackToHome={this.handleBackToHome}
            onShowAI={this.handleShowAI}
            onStartFromScratch={this.handleGetStarted}
            currentPage="account"
            isScrolled={true}
            isFixed={true}
          />
          <div style={{ paddingTop: '80px' }}>
            <AccountPage onBackToHome={this.handleBackToHome} />
          </div>
        </div>
      );
    }

    if (this.state.currentView === 'planner') {
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
        <svg width="400" height="300" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          <rect x="0" y="350" width="500" height="50" fill="rgba(255,255,255,0.1)"/>
          <circle cx="30" cy="340" r="25" fill="rgba(255,255,255,0.1)"/>
          <rect x="25" y="340" width="10" height="20" fill="rgba(255,255,255,0.15)"/>
          <circle cx="470" cy="340" r="25" fill="rgba(255,255,255,0.1)"/>
          <rect x="465" y="340" width="10" height="20" fill="rgba(255,255,255,0.15)"/>
        </svg>
      );
    };

    return (
      <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @keyframes windowGlow {
            0%, 100% { opacity: 0.1; }
            50% { opacity: 0.6; }
          }
          @keyframes buildingRise {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
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
          .window-glow { animation: windowGlow 2s ease-in-out infinite; }
          .building-1.animate { animation: buildingRise 1.5s ease-out; }
          .building-2.animate { animation: buildingRise 1.5s ease-out 0.3s both; }
          .building-3.animate { animation: buildingRise 1.5s ease-out 0.6s both; }
          .float { animation: float 3s ease-in-out infinite; }
          .slide-in-left { animation: slideInLeft 1s ease-out; }
          .slide-in-right { animation: slideInRight 1s ease-out; }
          #tool-container {
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
          }
          #tool-container * {
            overscroll-behavior: contain;
          }

          /* Override React Planner toolbar background */
          .toolbar, .toolbar-container, [class*="toolbar"], [class*="Toolbar"] {
            background: linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%) !important;
          }

          /* Override any toolbar background colors */
          [class*="toolbar"] [class*="background"],
          [class*="Toolbar"] [class*="background"],
          .toolbar-background,
          .toolbar-bg {
            background: linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%) !important;
          }

          /* Override specific toolbar elements */
          .toolbar-wrapper,
          .toolbar-main,
          .toolbar-content {
            background: linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%) !important;
          }

          /* Override React Planner sidebar background */
          .sidebar, .sidebar-container, [class*="sidebar"], [class*="Sidebar"] {
            background: linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%) !important;
          }

          /* Override sidebar background colors */
          [class*="sidebar"] [class*="background"],
          [class*="Sidebar"] [class*="background"],
          .sidebar-background,
          .sidebar-bg {
            background: linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%) !important;
          }

          /* Override specific sidebar elements */
          .sidebar-wrapper,
          .sidebar-main,
          .sidebar-content,
          .sidebar-panel {
            background: linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%) !important;
          }

          /* Ensure toolbar and sidebar text/icons are visible on gradient */
          [class*="toolbar"] *,
          [class*="sidebar"] * {
            color: white !important;
          }

          /* Keep input fields text black on white background */
          [class*="sidebar"] input,
          [class*="sidebar"] select,
          [class*="sidebar"] textarea {
            color: #333 !important;
            background: white !important;
          }

          [class*="toolbar"] button,
          [class*="toolbar"] .button,
          [class*="sidebar"] button,
          [class*="sidebar"] .button {
            background: rgba(255, 255, 255, 0.2) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            color: white !important;
          }

          [class*="toolbar"] button:hover,
          [class*="toolbar"] .button:hover,
          [class*="sidebar"] button:hover,
          [class*="sidebar"] .button:hover {
            background: rgba(255, 255, 255, 0.3) !important;
            border-color: rgba(255, 255, 255, 0.5) !important;
          }

          /* Fix catalog positioning to appear in same location as the grid tool */
          #tool-container div[style*="position: fixed"][style*="left: 50px"] {
            position: absolute !important;
            top: 0 !important;
            left: 50px !important;
            height: calc(100% - 20px) !important;
            z-index: 100 !important;
          }
        `}</style>
        {/* Navbar */}
        <Header 
          onBackToHome={this.handleBackToHome}
          onShowAI={this.handleShowAI}
          onStartFromScratch={this.handleOpenTool}
          currentPage="planner"
          isScrolled={false}
          isFixed={false}
        />
        
        {/* Hero Banner */}
        <section style={{
          width: '100%',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: '60px 20px 40px',
          boxSizing: 'border-box',
          marginTop: '-40px'
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
              }}>Start Designing</h1>
              <h2 style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.4rem)',
                marginBottom: '20px',
                fontWeight: 300,
                opacity: 0.95
              }}>Build Your Vision from Scratch</h2>
              <p style={{
                fontSize: '1rem',
                marginBottom: '35px',
                lineHeight: '1.8',
                opacity: 0.9,
                maxWidth: '600px'
              }}>
                Create your perfect floorplan with our intuitive design tools. 
                Drag, drop, and customize to bring your vision to life.
                From walls to furniture - design anything with precision.
              </p>
              <div style={{
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap',
                marginTop: '-10px'
              }}>
                <button
                  onClick={this.handleOpenTool}
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
                  Open Design Tool
                </button>
                <button
                  onClick={this.handleShowAI}
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
                  Try with AI
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

        {/* Get Started Section */}
        <section style={{
          width: '100%',
          padding: '100px 40px',
          background: 'linear-gradient(135deg, rgb(240, 147, 251) 0%, rgb(245, 87, 108) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '800px',
            color: '#ffffff'
          }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 'bold',
              marginBottom: '25px',
              textShadow: '2px 2px 8px rgba(0,0,0,0.2)'
            }}>Ready to Create?</h2>
            <p style={{
              fontSize: '1.25rem',
              marginBottom: '40px',
              lineHeight: '1.8',
              opacity: 0.95
            }}>
              Launch the full design tool and start building your dream floorplan. 
              Draw walls, add furniture, and visualize in stunning 3D.
            </p>
            <button
              onClick={this.handleOpenTool}
              style={{
                padding: '20px 60px',
                fontSize: '1.4rem',
                fontWeight: 'bold',
                color: '#f5576c',
                backgroundColor: '#ffffff',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '2px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 15px 50px rgba(0,0,0,0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.25)';
              }}
            >
              Get Started
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
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <AILogo />
                  <h3 style={{ fontSize: '1.5rem', color: '#ffffff', margin: 0 }}>Archify</h3>
                </div>
                <p style={{ color: '#ffffff', lineHeight: '1.6', opacity: 0.9 }}>
                  Create stunning 2D floorplans and visualize them in beautiful 3D. 
                  The ultimate tool for interior designers and architects.
                </p>
              </div>
              <div>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Product</h4>
                <ul style={{ listStyle: 'none', padding: 0, color: '#ffffff', opacity: 0.9 }}>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Features</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Pricing</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Documentation</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Updates</li>
                </ul>
              </div>
              <div>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Company</h4>
                <ul style={{ listStyle: 'none', padding: 0, color: '#ffffff', opacity: 0.9 }}>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>About</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Blog</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Careers</li>
                  <li style={{ marginBottom: '10px', cursor: 'pointer' }}>Contact</li>
                </ul>
              </div>
              <div>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Support</h4>
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
              opacity: 0.9,
              fontSize: '0.9rem'
            }}>
              <p>© 2024 Archify. All rights reserved. Built with ❤️ for designers.</p>
            </div>
          </div>
        </footer>
      </div>
    );
    }

    // Standalone Tool View - Full screen, no header/footer
    if (this.state.currentView === 'tool') {
      // Valid catalog items - only these will be loaded
      const validItems = [
        'sofa', 'table', 'sedia', 'armchairs', 'bench', 'bookcase', 'wardrobe',
        'kitchen', 'sink', 'fridge', 'tv', 'desk', 'conditioner', 'trash',
        'umbrella-stand', 'hanger', 'coat-hook', 'cube', 'projector', 'blackboard',
        'camera', 'balcony', 'simple-stair', 'chairdesk', 'hub', 'hiroos',
        'school desk', 'double school desk', 'child chair desk', 'canteen table',
        'canteen cart', 'cleaning cart', 'fire-extinguisher', 'smoke-detector',
        'radiator-old-style', 'termosifone_alluminio', 'recycling-bins', 'router_wifi',
        'schneider', 'teaching-post', 'text', 'three- phase panel', 'naspo',
        'monitor_pc', 'metal_detector', 'multimedia chalkboard', 'image',
        'pannello_elettrico', 'round column', 'square column'
      ];
      const validHoles = [
        'door', 'double door', 'sliding door', 'window', 'sash window',
        'venetian-blind-window', 'window-curtain', 'gate', 'panic door', 'double panic door'
      ];
      const validLines = ['wall'];

      // Function to sanitize design by removing invalid elements
      const sanitizeDesign = function(design) {
        if (!design || !design.layers) return design;
        
        var sanitized = JSON.parse(JSON.stringify(design)); // Deep clone
        
        Object.keys(sanitized.layers).forEach(function(layerId) {
          var layer = sanitized.layers[layerId];
          
          // FIX: Ensure vertex object keys match their id fields
          if (layer.vertices) {
            var fixedVertices = {};
            Object.keys(layer.vertices).forEach(function(key) {
              var vertex = layer.vertices[key];
              var correctId = vertex.id || key;
              vertex.id = correctId;
              fixedVertices[correctId] = vertex;
            });
            layer.vertices = fixedVertices;
          }
          
          // FIX: Ensure line object keys match their id fields and vertices exist
          if (layer.lines) {
            var fixedLines = {};
            Object.keys(layer.lines).forEach(function(key) {
              var line = layer.lines[key];
              var correctId = line.id || key;
              line.id = correctId;
              
              // Check if vertices referenced by this line exist
              var verticesExist = true;
              if (line.vertices && layer.vertices) {
                line.vertices.forEach(function(vId) {
                  if (!layer.vertices[vId]) {
                    console.warn('Line ' + correctId + ' references non-existent vertex: ' + vId);
                    verticesExist = false;
                  }
                });
              }
              
              // Only keep line if vertices exist and type is valid
              if (verticesExist && validLines.indexOf(line.type) !== -1) {
                fixedLines[correctId] = line;
              } else {
                console.warn('Removed invalid line:', correctId);
              }
            });
            layer.lines = fixedLines;
          }
          
          // FIX: Ensure hole object keys match their id fields
          if (layer.holes) {
            var fixedHoles = {};
            Object.keys(layer.holes).forEach(function(key) {
              var hole = layer.holes[key];
              var correctId = hole.id || key;
              hole.id = correctId;
              
              // Check if line referenced by this hole exists
              var lineExists = hole.line && layer.lines && layer.lines[hole.line];
              
              if (lineExists && validHoles.indexOf(hole.type) !== -1) {
                fixedHoles[correctId] = hole;
                // Ensure line has this hole in its holes array
                if (!layer.lines[hole.line].holes) {
                  layer.lines[hole.line].holes = [];
                }
                if (layer.lines[hole.line].holes.indexOf(correctId) === -1) {
                  layer.lines[hole.line].holes.push(correctId);
                }
              } else {
                console.warn('Removed invalid hole:', correctId, 'type:', hole.type);
              }
            });
            layer.holes = fixedHoles;
          }
          
          // Update vertex lines arrays to only include existing lines
          if (layer.vertices && layer.lines) {
            Object.keys(layer.vertices).forEach(function(vId) {
              var vertex = layer.vertices[vId];
              if (vertex.lines) {
                vertex.lines = vertex.lines.filter(function(lineId) {
                  return layer.lines[lineId] !== undefined;
                });
              }
            });
          }
          
          // Remove ALL items - AI-generated items cause property errors because
          // react-planner expects Immutable.js Maps for properties (element.properties.get('altitude').get('length'))
          // but JSON loading creates plain objects. Users must add items manually in the editor.
          if (layer.items && Object.keys(layer.items).length > 0) {
            console.warn('Removing AI-generated items - items require Immutable.js properties. Add items manually in editor.');
            layer.items = {};
          }
          
          // Remove ALL areas - they cause "Element undefined does not exist in catalog" errors
          if (layer.areas) {
            console.warn('Removing all areas to prevent catalog errors');
            layer.areas = {};
          }
        });
        
        return sanitized;
      };

      // Load AI-generated design if available (from state or localStorage)
      let designToLoad = this.state.aiGeneratedDesign;
      
      // Check localStorage if no design in state
      if (!designToLoad) {
        const storedDesign = localStorage.getItem('ai-generated-design');
        if (storedDesign) {
          try {
            designToLoad = JSON.parse(storedDesign);
            // Clear localStorage after reading
            localStorage.removeItem('ai-generated-design');
          } catch (e) {
            console.error('Failed to parse stored design:', e);
          }
        }
      }
      
      if (designToLoad) {
        // Clear the autosave to prevent loading old invalid data
        localStorage.removeItem('react-planner_v0');
        
        // Sanitize the design to remove invalid elements
        designToLoad = sanitizeDesign(designToLoad);
        console.log('Loading sanitized design:', designToLoad);
        
        // Dispatch loadProject action with the sanitized AI-generated design
        setTimeout(() => {
          store.dispatch({
            type: 'LOAD_PROJECT',
            sceneJSON: designToLoad
          });
          // Clear the design after loading
          this.setState({ aiGeneratedDesign: null });
        }, 500);
      }
      
      // Also sanitize the autosaved design if it exists
      const autosavedDesign = localStorage.getItem('react-planner_v0');
      if (autosavedDesign) {
        try {
          const parsed = JSON.parse(autosavedDesign);
          const sanitized = sanitizeDesign(parsed);
          localStorage.setItem('react-planner_v0', JSON.stringify(sanitized));
        } catch (e) {
          // If parsing fails, remove the corrupted data
          localStorage.removeItem('react-planner_v0');
        }
      }

      return (
        <TourProvider>
          <div style={{
            width: '100vw',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            background: '#ffffff',
            overflow: 'hidden'
          }}>
            <style>{`
              /* Override React Planner toolbar background */
              .toolbar, .toolbar-container, [class*="toolbar"], [class*="Toolbar"] {
                background: linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%) !important;
              }
              [class*="toolbar"] [class*="background"],
              [class*="Toolbar"] [class*="background"],
              .toolbar-background,
              .toolbar-bg,
              .toolbar-wrapper,
              .toolbar-main,
              .toolbar-content {
                background: linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%) !important;
              }
              /* Override React Planner sidebar background */
              .sidebar, .sidebar-container, [class*="sidebar"], [class*="Sidebar"] {
                background: linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%) !important;
              }
              [class*="sidebar"] [class*="background"],
              [class*="Sidebar"] [class*="background"],
              .sidebar-background,
              .sidebar-bg,
              .sidebar-wrapper,
              .sidebar-main,
              .sidebar-content,
              .sidebar-panel {
                background: linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%) !important;
              }
              [class*="toolbar"] *,
              [class*="sidebar"] * {
                color: white !important;
              }
              [class*="sidebar"] input,
              [class*="sidebar"] select,
              [class*="sidebar"] textarea {
                color: #333 !important;
                background: white !important;
              }
              [class*="toolbar"] button,
              [class*="toolbar"] .button,
              [class*="sidebar"] button,
              [class*="sidebar"] .button {
                background: rgba(255, 255, 255, 0.2) !important;
                border-color: rgba(255, 255, 255, 0.3) !important;
                color: white !important;
              }
              [class*="toolbar"] button:hover,
              [class*="toolbar"] .button:hover,
              [class*="sidebar"] button:hover,
              [class*="sidebar"] .button:hover {
                background: rgba(255, 255, 255, 0.3) !important;
                border-color: rgba(255, 255, 255, 0.5) !important;
              }
            `}</style>
            <Provider store={store}>
              <ContainerDimensions>
                {({width, height}) =>
                  <ReactPlanner
                    catalog={MyCatalog}
                    width={width}
                    height={height}
                    plugins={plugins}
                    toolbarButtons={toolbarButtons}
                    stateExtractor={state => state.get('react-planner')}
                  />
                }
              </ContainerDimensions>
            </Provider>
            {/* Product Tour Components */}
            <WelcomeTourModal />
            <TourOverlay />
            <TourHelpButton />
          </div>
        </TourProvider>
      );
    }
  }
}

//render
ReactDOM.render(
  <AuthProvider>
    <SubscriptionProvider>
      <App />
      <LoginModal />
      <SignupModal />
      <VerificationModal />
      <ForgotPasswordModal />
      <ResetPasswordModal />
    </SubscriptionProvider>
  </AuthProvider>,
  document.getElementById('app')
);

