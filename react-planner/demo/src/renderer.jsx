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
    this.state = {
      currentView: 'landing' // 'landing', 'ai', 'planner'
    };
    this.handleGetStarted = this.handleGetStarted.bind(this);
    this.handleBackToHome = this.handleBackToHome.bind(this);
    this.handleShowAI = this.handleShowAI.bind(this);
  }

  handleGetStarted() {
    this.setState({ currentView: 'planner' });
  }

  handleShowAI() {
    this.setState({ currentView: 'ai' });
  }

  handleBackToHome() {
    this.setState({ currentView: 'landing' });
  }

  render() {
    if (this.state.currentView === 'landing') {
      return <LandingPage onGetStarted={this.handleGetStarted} onShowAI={this.handleShowAI} />;
    }

    if (this.state.currentView === 'ai') {
      return <MakeWithAI onBackToHome={this.handleBackToHome} onStartFromScratch={this.handleGetStarted} />;
    }

    if (this.state.currentView === 'planner') {
      // AI Logo Component
    const AILogo = () => (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="aiGradientTool" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="100%" stopColor="#764ba2" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="18" fill="url(#aiGradientTool)" opacity="0.9"/>
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
          .window-glow { animation: windowGlow 2s ease-in-out infinite; }
          .building-1.animate { animation: buildingRise 1.5s ease-out; }
          .building-2.animate { animation: buildingRise 1.5s ease-out 0.3s both; }
          .building-3.animate { animation: buildingRise 1.5s ease-out 0.6s both; }
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
        <nav style={{
          width: '100%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
          padding: '20px 40px',
          zIndex: 1000
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
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              transition: 'opacity 0.3s ease'
            }}
            onClick={this.handleBackToHome}
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
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'opacity 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >Make with AI</a>
              <a href="#" onClick={(e) => { e.preventDefault(); }} style={{
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'opacity 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >Features</a>
              <a href="#" onClick={(e) => { e.preventDefault(); }} style={{
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'opacity 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >Login</a>
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
        
        {/* Hero Banner */}
        <section style={{
          width: '100%',
          padding: '60px 40px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            maxWidth: '1400px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '40px',
            zIndex: 1
          }}>
            <div style={{ flex: '1', minWidth: '300px', paddingLeft: '60px' }}>
              <h1 style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                fontWeight: 'bold',
                marginBottom: '15px',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                lineHeight: '1.2'
              }}>Start Designing</h1>
              <p style={{
                fontSize: '1rem',
                marginBottom: '0',
                lineHeight: '1.6',
                opacity: 0.9,
                maxWidth: '500px'
              }}>
                Create your perfect floorplan with our intuitive design tools. 
                Drag, drop, and customize to bring your vision to life.
              </p>
            </div>
            <div style={{ flex: '1', minWidth: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ transform: 'scale(0.8)' }}>
                <ArchitectureAnimation />
              </div>
            </div>
          </div>
        </section>

        {/* Gradient Space Above Tool */}
        <div style={{ width: '100%', height: '100px', background: 'linear-gradient(135deg, rgb(240, 147, 251) 0%, rgb(245, 87, 108) 100%)' }}></div>

        {/* Tool Section */}
        <div
          id="tool-container"
          style={{
            width: '100%',
            height: '100vh',
            minHeight: '800px',
            position: 'relative',
            background: '#ffffff'
          }}
          onWheel={(e) => {
            // Always prevent page scroll when wheel event occurs inside tool container
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseEnter={(e) => {
            // Prevent page scroll when mouse enters tool area
            document.body.style.overflow = 'hidden';
          }}
          onMouseLeave={(e) => {
            // Restore page scroll when mouse leaves tool area
            document.body.style.overflow = 'auto';
          }}
        >
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
        </div>

        {/* Gradient Space Below Tool */}
        <div style={{ width: '100%', height: '100px', background: 'linear-gradient(135deg, rgb(240, 147, 251) 0%, rgb(245, 87, 108) 100%)' }}></div>

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
  }
}

//render
ReactDOM.render(
  <App />,
  document.getElementById('app')
);

