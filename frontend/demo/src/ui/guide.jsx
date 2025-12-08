import React from 'react';
import Header, { AILogo } from './header';
import { useAuth } from './auth-modals.jsx';

const Guide = ({ onBackToHome, onShowAI, onStartFromScratch }) => {
  const auth = useAuth();

  const sectionStyle = {
    padding: '80px 40px',
    maxWidth: '1200px',
    margin: '0 auto',
    lineHeight: '1.8'
  };

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    marginBottom: '30px',
    border: '1px solid #e2e8f0'
  };

  const stepStyle = {
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    borderRadius: '8px',
    padding: '20px',
    margin: '15px 0',
    borderLeft: '4px solid #4a5568'
  };

  const featureCardStyle = {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    borderRadius: '12px',
    padding: '25px',
    margin: '15px 0',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
  };

  const keywordStyle = {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '500',
    margin: '4px',
    textTransform: 'lowercase'
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <Header
        onBackToHome={onBackToHome}
        onShowAI={onShowAI}
        onStartFromScratch={onStartFromScratch}
        currentPage="guide"
        isScrolled={true}
        isFixed={true}
      />

      <div style={{ paddingTop: '100px' }}>
        {/* Hero Section */}
        <section style={{
          ...sectionStyle,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
          color: 'white',
          marginTop: '-20px',
          paddingTop: '100px',
          paddingBottom: '80px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
            <AILogo />
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', margin: 0 }}>Archify Guide</h1>
          </div>
          <p style={{ fontSize: '1.3rem', opacity: 0.9, maxWidth: '800px', margin: '0 auto' }}>
            Your complete guide to mastering AI-powered floor planning. Learn everything about creating,
            customizing, and visualizing your dream spaces with Archify.
          </p>
          <div style={{ marginTop: '30px' }}>
            <span style={keywordStyle}>ai-powered</span>
            <span style={keywordStyle}>floor-planning</span>
            <span style={keywordStyle}>interior-design</span>
            <span style={keywordStyle}>3d-visualization</span>
            <span style={keywordStyle}>architecture</span>
          </div>
        </section>

        {/* What is Archify */}
        <section style={sectionStyle}>
          <div style={cardStyle}>
            <h2 style={{ color: '#2d3748', marginBottom: '20px', fontSize: '2rem' }}>What is Archify?</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
              <strong>Archify</strong> is a revolutionary AI-powered floor planning tool that transforms how architects,
              interior designers, and homeowners create and visualize spaces. Using advanced artificial intelligence
              combined with professional architectural tools, Archify makes floor planning accessible to everyone.
            </p>
            <p>
              Whether you're planning a cozy apartment, a modern office, a bustling restaurant, or an entire house,
              Archify provides the tools and intelligence to bring your vision to life with professional-grade results.
            </p>
          </div>
        </section>

        {/* Core Features */}
        <section style={sectionStyle}>
          <h2 style={{ color: '#2d3748', textAlign: 'center', marginBottom: '40px', fontSize: '2.5rem' }}>
            Core Features
          </h2>

          <div style={featureCardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '15px', fontSize: '1.5rem' }}>AI-Powered Design Generation</h3>
            <p style={{ marginBottom: '15px' }}>
              Describe your space in plain English, and our advanced AI understands your requirements to generate
              professional floor plans automatically. No technical expertise required!
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={keywordStyle}>natural-language</span>
              <span style={keywordStyle}>intelligent-layout</span>
              <span style={keywordStyle}>automated-design</span>
              <span style={keywordStyle}>space-optimization</span>
            </div>
          </div>

          <div style={featureCardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '15px', fontSize: '1.5rem' }}>Professional 2D Floor Planning</h3>
            <p style={{ marginBottom: '15px' }}>
              Create detailed floor plans with our intuitive drag-and-drop interface. Draw walls, add doors,
              windows, and customize every aspect of your space with precision tools.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={keywordStyle}>drag-drop</span>
              <span style={keywordStyle}>precision-tools</span>
              <span style={keywordStyle}>wall-drawing</span>
              <span style={keywordStyle}>door-placement</span>
            </div>
          </div>

          <div style={featureCardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '15px', fontSize: '1.5rem' }}>3D Visualization</h3>
            <p style={{ marginBottom: '15px' }}>
              See your designs come to life in stunning 3D. Walk through your spaces virtually and experience
              how they will look and feel in reality.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={keywordStyle}>3d-rendering</span>
              <span style={keywordStyle}>virtual-reality</span>
              <span style={keywordStyle}>space-visualization</span>
              <span style={keywordStyle}>real-time-preview</span>
            </div>
          </div>

          <div style={featureCardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '15px', fontSize: '1.5rem' }}>Comprehensive Furniture Catalog</h3>
            <p style={{ marginBottom: '15px' }}>
              Choose from hundreds of furniture items, appliances, and accessories. Our catalog includes everything
              from beds and sofas to kitchen appliances and office equipment.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={keywordStyle}>furniture-catalog</span>
              <span style={keywordStyle}>appliances</span>
              <span style={keywordStyle}>decor-accessories</span>
              <span style={keywordStyle}>professional-items</span>
            </div>
          </div>

          <div style={featureCardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '15px', fontSize: '1.5rem' }}>Material & Texture Library</h3>
            <p style={{ marginBottom: '15px' }}>
              Customize your spaces with realistic materials including parquet flooring, ceramic tiles,
              various wall textures, and professional finishes.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={keywordStyle}>floor-textures</span>
              <span style={keywordStyle}>wall-materials</span>
              <span style={keywordStyle}>realistic-rendering</span>
              <span style={keywordStyle}>material-library</span>
            </div>
          </div>

          <div style={featureCardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '15px', fontSize: '1.5rem' }}>Auto-Save & Cloud Storage</h3>
            <p style={{ marginBottom: '15px' }}>
              Never lose your work with automatic saving and cloud storage. Access your designs from any device
              and continue working where you left off.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={keywordStyle}>auto-save</span>
              <span style={keywordStyle}>cloud-storage</span>
              <span style={keywordStyle}>cross-device</span>
              <span style={keywordStyle}>backup</span>
            </div>
          </div>
        </section>

        {/* Getting Started */}
        <section style={sectionStyle}>
          <h2 style={{ color: '#2d3748', textAlign: 'center', marginBottom: '40px', fontSize: '2.5rem' }}>
            Getting Started
          </h2>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Step 1: Choose Your Starting Method</h3>

            <div style={stepStyle}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Option A: Make with AI (Recommended for beginners)</h4>
              <p style={{ margin: '0 0 15px 0' }}>
                Perfect for users who want to describe their space in plain English and let AI do the heavy lifting.
              </p>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Click "Make with AI" from the homepage or navigation</li>
                <li>Describe your space (e.g., "2 bedroom apartment with modern kitchen and home office")</li>
                <li>Chat with our AI assistant to refine your requirements</li>
                <li>Click "Load Design in Editor" when satisfied</li>
              </ol>
            </div>

            <div style={stepStyle}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Option B: Start from Scratch (For experienced users)</h4>
              <p style={{ margin: '0 0 15px 0' }}>
                Ideal for users who want complete creative control and prefer building from the ground up.
              </p>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Click "Start from scratch" from the homepage or navigation</li>
                <li>Open the design tool in a new tab</li>
                <li>Begin drawing walls and creating your layout manually</li>
              </ol>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Step 2: Account Setup (Optional but Recommended)</h3>
            <div style={stepStyle}>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Click "Sign Up" in the top navigation</li>
                <li>Enter your email and create a password</li>
                <li>Verify your email address</li>
                <li>Access premium features and cloud storage</li>
              </ol>
            </div>
          </div>
        </section>

        {/* AI Design Process */}
        <section style={sectionStyle}>
          <h2 style={{ color: '#2d3748', textAlign: 'center', marginBottom: '40px', fontSize: '2.5rem' }}>
            AI Design Process - Step by Step
          </h2>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Phase 1: Initial Conversation</h3>
            <div style={stepStyle}>
              <p><strong>What to expect:</strong> Our AI assistant greets you and asks about your project type.</p>
              <p><strong>What to say:</strong> Be specific about your space type (apartment, house, office, restaurant, etc.)</p>
              <p><strong>Example:</strong> "I need a 2-bedroom apartment for a young family" or "Planning a modern office space for 10 people"</p>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Phase 2: Requirements Gathering</h3>
            <div style={stepStyle}>
              <p><strong>AI will ask:</strong> Size, number of rooms, special features, style preferences, and budget considerations.</p>
              <p><strong>Pro tips:</strong></p>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li>Mention specific room counts (e.g., "3 bedrooms, 2 bathrooms")</li>
                <li>Specify size in square meters or feet</li>
                <li>Describe your style (modern, traditional, minimalist, industrial)</li>
                <li>Mention special features (balcony, home office, storage, etc.)</li>
              </ul>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Phase 3: Design Generation</h3>
            <div style={stepStyle}>
              <p><strong>What happens:</strong> After gathering requirements, AI creates your professional floor plan.</p>
              <p><strong>What you'll get:</strong></p>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li>Properly sized rooms with professional dimensions</li>
                <li>Guaranteed doors for every room (accessibility requirement)</li>
                <li>Appropriate furniture placement</li>
                <li>Professional wall and floor textures</li>
                <li>Strategic window and door placement</li>
              </ul>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Phase 4: Customization</h3>
            <div style={stepStyle}>
              <p><strong>Next steps:</strong> Click "Load Design in Editor" to open your design in the professional tool.</p>
              <p><strong>Customization options:</strong></p>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li>Add or remove walls</li>
                <li>Change furniture placement</li>
                <li>Modify textures and materials</li>
                <li>Add more details and accessories</li>
                <li>Adjust room sizes and layouts</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Manual Design Tool */}
        <section style={sectionStyle}>
          <h2 style={{ color: '#2d3748', textAlign: 'center', marginBottom: '40px', fontSize: '2.5rem' }}>
            Manual Design Tool - Complete Guide
          </h2>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Interface Overview</h3>
            <div style={stepStyle}>
              <p><strong>Toolbar:</strong> Located at the top, contains all your drawing and editing tools.</p>
              <p><strong>Catalog:</strong> Left sidebar with furniture, doors, windows, and materials.</p>
              <p><strong>Properties Panel:</strong> Right sidebar for editing selected items.</p>
              <p><strong>Canvas:</strong> Main drawing area with grid for precision.</p>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Drawing Walls - Step by Step</h3>
            <div style={stepStyle}>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Select the "Wall" tool from the toolbar</li>
                <li>Click on the canvas to start drawing</li>
                <li>Click again to create corners and turns</li>
                <li>Double-click or press Enter to finish the wall</li>
                <li>Use the Properties panel to adjust wall thickness and materials</li>
              </ol>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Adding Doors and Windows</h3>
            <div style={stepStyle}>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Select a wall by clicking on it</li>
                <li>Choose door or window from the catalog</li>
                <li>Drag and drop onto the wall</li>
                <li>Adjust position using the offset slider</li>
                <li>Customize size and type in Properties panel</li>
              </ol>
              <p><strong>Pro tip:</strong> Every room must have at least one door for proper accessibility.</p>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Adding Furniture and Items</h3>
            <div style={stepStyle}>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Browse the catalog by category (Furniture, Appliances, etc.)</li>
                <li>Drag items onto the canvas</li>
                <li>Position them precisely using the grid</li>
                <li>Rotate items by selecting and using the rotation handle</li>
                <li>Customize properties like size and materials</li>
              </ol>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Creating Areas/Rooms</h3>
            <div style={stepStyle}>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Draw walls to enclose spaces</li>
                <li>Select the "Area" tool</li>
                <li>Click the vertices in order to define the room boundary</li>
                <li>Name your room in the Properties panel</li>
                <li>Choose appropriate floor texture</li>
              </ol>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>3D Visualization</h3>
            <div style={stepStyle}>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Click the "3D View" button in the toolbar</li>
                <li>Use mouse to orbit, zoom, and pan around your design</li>
                <li>Walk through your space virtually</li>
                <li>Take screenshots for sharing or documentation</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Space Types & Templates */}
        <section style={sectionStyle}>
          <h2 style={{ color: '#2d3748', textAlign: 'center', marginBottom: '40px', fontSize: '2.5rem' }}>
            Space Types & Design Guidelines
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
            <div style={featureCardStyle}>
              <h3 style={{ color: '#4a5568', marginBottom: '15px' }}>Residential Spaces</h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>Apartments:</strong> 1-3 bedrooms, compact layouts</li>
                <li><strong>Houses:</strong> Multiple floors, gardens, garages</li>
                <li><strong>Studios:</strong> Open-plan living spaces</li>
                <li><strong>Lofts:</strong> Industrial style, high ceilings</li>
              </ul>
            </div>

            <div style={featureCardStyle}>
              <h3 style={{ color: '#4a5568', marginBottom: '15px' }}>Commercial Spaces</h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>Offices:</strong> Open workspaces, meeting rooms</li>
                <li><strong>Retail:</strong> Showrooms, storage, customer areas</li>
                <li><strong>Restaurants:</strong> Dining areas, kitchens, service spaces</li>
                <li><strong>Clinics:</strong> Waiting areas, consultation rooms</li>
              </ul>
            </div>

            <div style={featureCardStyle}>
              <h3 style={{ color: '#4a5568', marginBottom: '15px' }}>Educational Spaces</h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>Classrooms:</strong> Student desks, teaching areas</li>
                <li><strong>Libraries:</strong> Reading areas, book storage</li>
                <li><strong>Labs:</strong> Specialized equipment spaces</li>
                <li><strong>Auditoriums:</strong> Seating, stage areas</li>
              </ul>
            </div>

            <div style={featureCardStyle}>
              <h3 style={{ color: '#4a5568', marginBottom: '15px' }}>Specialized Spaces</h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>Gyms:</strong> Exercise areas, locker rooms</li>
                <li><strong>Warehouses:</strong> Storage, loading areas</li>
                <li><strong>Hotels:</strong> Guest rooms, lobbies, service areas</li>
                <li><strong>Custom:</strong> Any specialized requirements</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Best Practices */}
        <section style={sectionStyle}>
          <h2 style={{ color: '#2d3748', textAlign: 'center', marginBottom: '40px', fontSize: '2.5rem' }}>
            Best Practices & Pro Tips
          </h2>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Design Principles</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={stepStyle}>
                <h4 style={{ margin: '0 0 10px 0' }}>Structural Integrity</h4>
                <ul style={{ margin: 0, paddingLeft: '15px' }}>
                  <li>Ensure load-bearing walls are properly placed</li>
                  <li>Maintain proper ceiling heights (2.4m minimum)</li>
                  <li>Include structural columns where needed</li>
                </ul>
              </div>

              <div style={stepStyle}>
                <h4 style={{ margin: '0 0 10px 0' }}>Accessibility Standards</h4>
                <ul style={{ margin: 0, paddingLeft: '15px' }}>
                  <li>Every room must have at least one door</li>
                  <li>Main entrances should be clearly marked</li>
                  <li>Ensure proper door clearances (80cm minimum)</li>
                </ul>
              </div>

              <div style={stepStyle}>
                <h4 style={{ margin: '0 0 10px 0' }}>Lighting & Natural Light</h4>
                <ul style={{ margin: 0, paddingLeft: '15px' }}>
                  <li>Position windows for maximum natural light</li>
                  <li>Include adequate artificial lighting</li>
                  <li>Consider light reflection in your layout</li>
                </ul>
              </div>

              <div style={stepStyle}>
                <h4 style={{ margin: '0 0 10px 0' }}>Flow & Circulation</h4>
                <ul style={{ margin: 0, paddingLeft: '15px' }}>
                  <li>Design logical movement patterns</li>
                  <li>Avoid dead-end corridors</li>
                  <li>Ensure adequate circulation space</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Room-Specific Guidelines</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={stepStyle}>
                <h4 style={{ margin: '0 0 10px 0' }}>Bedrooms</h4>
                <ul style={{ margin: 0, paddingLeft: '15px' }}>
                  <li>Minimum 2.5m x 3m for single beds</li>
                  <li>Include windows for natural light</li>
                  <li>Provide adequate storage space</li>
                  <li>Ensure privacy from other rooms</li>
                </ul>
              </div>

              <div style={stepStyle}>
                <h4 style={{ margin: '0 0 10px 0' }}>Bathrooms</h4>
                <ul style={{ margin: 0, paddingLeft: '15px' }}>
                  <li>Minimum 1.5m x 2m for basic bathrooms</li>
                  <li>Include proper ventilation</li>
                  <li>Ensure water supply and drainage access</li>
                  <li>Consider accessibility requirements</li>
                </ul>
              </div>

              <div style={stepStyle}>
                <h4 style={{ margin: '0 0 10px 0' }}>Kitchens</h4>
                <ul style={{ margin: 0, paddingLeft: '15px' }}>
                  <li>Plan for work triangle efficiency</li>
                  <li>Include adequate counter space</li>
                  <li>Ensure proper appliance placement</li>
                  <li>Provide storage for utensils and food</li>
                </ul>
              </div>

              <div style={stepStyle}>
                <h4 style={{ margin: '0 0 10px 0' }}>Offices</h4>
                <ul style={{ margin: 0, paddingLeft: '15px' }}>
                  <li>Provide adequate desk space</li>
                  <li>Include storage for files and equipment</li>
                  <li>Ensure proper lighting for computer work</li>
                  <li>Consider ergonomic requirements</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section style={sectionStyle}>
          <h2 style={{ color: '#2d3748', textAlign: 'center', marginBottom: '40px', fontSize: '2.5rem' }}>
            Troubleshooting & FAQ
          </h2>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Common Issues</h3>

            <div style={stepStyle}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Design Won't Load</h4>
              <p><strong>Solution:</strong> Clear your browser cache and local storage. Try using an incognito window.</p>
            </div>

            <div style={stepStyle}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Missing Doors in Rooms</h4>
              <p><strong>Solution:</strong> Every room must have at least one door. Add doors by selecting walls and choosing door types from the catalog.</p>
            </div>

            <div style={stepStyle}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Items Not Snapping to Grid</h4>
              <p><strong>Solution:</strong> Enable grid snapping in the toolbar. Check that grid is visible and adjust grid size if needed.</p>
            </div>

            <div style={stepStyle}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Lost Work</h4>
              <p><strong>Solution:</strong> Designs auto-save locally. Check browser localStorage or sign in to access cloud storage.</p>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px', fontSize: '1.5rem' }}>Frequently Asked Questions</h3>

            <div style={stepStyle}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Can I import existing floor plans?</h4>
              <p>Currently, we support creating new designs. You can recreate existing layouts using our tools.</p>
            </div>

            <div style={stepStyle}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Are my designs saved automatically?</h4>
              <p>Yes! All designs auto-save to your browser's local storage. Sign in to access cloud storage and backup.</p>
            </div>

            <div style={stepStyle}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Can I export my designs?</h4>
              <p>You can take screenshots of both 2D and 3D views. PDF export and other formats coming soon.</p>
            </div>

            <div style={stepStyle}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Is there a learning curve?</h4>
              <p>Beginners can start with AI assistance. The manual tools are intuitive but offer professional-level control.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          background: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
          color: '#ffffff',
          padding: '60px 40px 30px',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
              <AILogo />
              <h3 style={{ fontSize: '1.8rem', margin: 0 }}>Ready to Start Designing?</h3>
            </div>
            <p style={{ fontSize: '1.1rem', marginBottom: '30px', opacity: 0.9 }}>
              Transform your space vision into reality with Archify's powerful AI and professional tools.
            </p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={onShowAI}
                style={{
                  padding: '15px 30px',
                  backgroundColor: '#ffffff',
                  color: '#4a5568',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Try AI Design
              </button>
              <button
                onClick={onStartFromScratch}
                style={{
                  padding: '15px 30px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  border: '2px solid rgba(255,255,255,0.5)',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              >
                Open Design Tool
              </button>
            </div>
            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                © 2024 Archify. Built for designers, architects, and dreamers.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Guide;
