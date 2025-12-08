import React from 'react';

const API_BASE_URL = 'https://archify.mirdemy.com/api/auth';

// Google Client ID (from Google Cloud Console)
// Make sure this matches the "Client ID" under your Web application OAuth client.
const GOOGLE_CLIENT_ID = '836571438073-g4foa0u929gskfrqhbi7q7omrl7pif2t.apps.googleusercontent.com';

// Load Google Sign-In script
var googleScriptLoaded = false;
function loadGoogleScript() {
  if (googleScriptLoaded) return Promise.resolve();
  
  return new Promise(function(resolve, reject) {
    var script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = function() {
      googleScriptLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Auth Context for managing user state
export const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  var _state1 = React.useState(null);
  var user = _state1[0];
  var setUser = _state1[1];
  
  var _state2 = React.useState(true);
  var loading = _state2[0];
  var setLoading = _state2[1];
  
  var _state3 = React.useState(false);
  var showLoginModal = _state3[0];
  var setShowLoginModal = _state3[1];
  
  var _state4 = React.useState(false);
  var showSignupModal = _state4[0];
  var setShowSignupModal = _state4[1];
  
  var _state5 = React.useState(false);
  var showVerificationModal = _state5[0];
  var setShowVerificationModal = _state5[1];
  
  var _state6 = React.useState(false);
  var showForgotPasswordModal = _state6[0];
  var setShowForgotPasswordModal = _state6[1];
  
  var _state7 = React.useState(false);
  var showResetPasswordModal = _state7[0];
  var setShowResetPasswordModal = _state7[1];

  var _state8 = React.useState(false);
  var showErrorModal = _state8[0];
  var setShowErrorModal = _state8[1];

  var _state9 = React.useState('');
  var errorMessage = _state9[0];
  var setErrorMessage = _state9[1];
  
  var _state8 = React.useState('');
  var pendingEmail = _state8[0];
  var setPendingEmail = _state8[1];

  // Check for existing token on mount (skip if OAuth parameters present)
  React.useEffect(function() {
    // Check if we're coming from OAuth redirect
    var urlParams = new URLSearchParams(window.location.search);
    var hasOAuthParams = urlParams.get('token') || urlParams.get('user_id');

    if (!hasOAuthParams) {
      var token = localStorage.getItem('authToken');
      if (token) {
        fetchCurrentUser(token);
      } else {
        setLoading(false);
      }
    } else {
      // OAuth redirect detected, let the landing page handle it
      setLoading(false);
    }
  }, []);

  function fetchCurrentUser(token) {
    fetch(API_BASE_URL + '/me', {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      if (data.success) {
        setUser(data.user);
      } else {
        localStorage.removeItem('authToken');
      }
      setLoading(false);
    })
    .catch(function() {
      localStorage.removeItem('authToken');
      setLoading(false);
    });
  }

  function login(email, password) {
    return fetch(API_BASE_URL + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      if (data.success) {
        localStorage.setItem('authToken', data.token);
        setUser(data.user);
        setShowLoginModal(false);
      } else if (data.requires_verification) {
        setPendingEmail(data.email);
        setShowLoginModal(false);
        setShowVerificationModal(true);
      }
      return data;
    });
  }

  function signup(name, email, password) {
    return fetch(API_BASE_URL + '/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, password: password })
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      if (data.success && data.requires_verification) {
        setPendingEmail(data.email);
        setShowSignupModal(false);
        setShowVerificationModal(true);
      } else if (data.success) {
        localStorage.setItem('authToken', data.token);
        setUser(data.user);
        setShowSignupModal(false);
      }
      return data;
    });
  }

  function verifyEmail(email, code) {
    return fetch(API_BASE_URL + '/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, code: code })
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      if (data.success) {
        localStorage.setItem('authToken', data.token);
        setUser(data.user);
        setShowVerificationModal(false);
        setPendingEmail('');
      }
      return data;
    });
  }

  function resendVerification(email) {
    return fetch(API_BASE_URL + '/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    })
    .then(function(response) { return response.json(); });
  }

  function forgotPassword(email) {
    return fetch(API_BASE_URL + '/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      if (data.success) {
        setPendingEmail(email);
        setShowForgotPasswordModal(false);
        setShowResetPasswordModal(true);
      }
      return data;
    });
  }

  function resetPassword(email, code, newPassword) {
    return fetch(API_BASE_URL + '/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, code: code, new_password: newPassword })
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      if (data.success) {
        localStorage.setItem('authToken', data.token);
        setUser(data.user);
        setShowResetPasswordModal(false);
        setPendingEmail('');
      }
      return data;
    });
  }

  function googleLogin(credential) {
    return fetch(API_BASE_URL + '/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: credential })
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      if (data.success) {
        localStorage.setItem('authToken', data.token);
        setUser(data.user);
        setShowLoginModal(false);
        setShowSignupModal(false);
      }
      return data;
    });
  }

  function logout() {
    localStorage.removeItem('authToken');
    setUser(null);
  }

  function showError(message) {
    setErrorMessage(message);
    setShowErrorModal(true);
  }

  // Global error handler for React Planner components
  React.useEffect(() => {
    function handlePlannerError(event) {
      showError(event.detail.message);
    }

    window.addEventListener('react-planner-error', handlePlannerError);
    return () => window.removeEventListener('react-planner-error', handlePlannerError);
  }, []);

  var value = {
    user: user,
    loading: loading,
    login: login,
    signup: signup,
    verifyEmail: verifyEmail,
    resendVerification: resendVerification,
    forgotPassword: forgotPassword,
    resetPassword: resetPassword,
    googleLogin: googleLogin,
    logout: logout,
    showLoginModal: showLoginModal,
    setShowLoginModal: setShowLoginModal,
    showSignupModal: showSignupModal,
    setShowSignupModal: setShowSignupModal,
    showVerificationModal: showVerificationModal,
    setShowVerificationModal: setShowVerificationModal,
    showForgotPasswordModal: showForgotPasswordModal,
    setShowForgotPasswordModal: setShowForgotPasswordModal,
    showResetPasswordModal: showResetPasswordModal,
    setShowResetPasswordModal: setShowResetPasswordModal,
    showErrorModal: showErrorModal,
    setShowErrorModal: setShowErrorModal,
    errorMessage: errorMessage,
    showError: showError,
    pendingEmail: pendingEmail,
    setPendingEmail: setPendingEmail
  };

  return React.createElement(AuthContext.Provider, { value: value }, children);
}

export function useAuth() {
  var context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Modal Overlay Component
function ModalOverlay({ children, onClose }) {
  // Prevent body scroll when modal is open
  React.useEffect(function() {
    var originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function() {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return React.createElement('div', {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(8px)',
      overflowY: 'auto',
      padding: '20px'
    },
    onClick: function(e) {
      if (e.target === e.currentTarget) onClose();
    }
  }, children);
}

// Shared styles
var modalStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '32px 24px',
  width: '450px',
  maxWidth: '450px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
  border: '1px solid rgba(0, 0, 0, 0.05)',
  position: 'relative',
  margin: 'auto'
};

var inputStyle = {
  width: '100%',
  padding: '12px 16px',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  color: '#1e293b',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box'
};

inputStyle[':focus'] = {
  borderColor: '#4a5568',
  boxShadow: '0 0 0 3px rgba(74, 85, 104, 0.1)'
};

var buttonStyle = {
  width: '100%',
  padding: '12px 16px',
  backgroundColor: '#4a5568',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s',
  boxShadow: '0 2px 4px rgba(74, 85, 104, 0.2)'
};

var googleButtonStyle = {
  width: '100%',
  padding: '12px 16px',
  backgroundColor: '#fff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  transition: 'all 0.2s',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
};

var closeButtonStyle = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  background: 'none',
  border: 'none',
  color: '#6b7280',
  fontSize: '24px',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '6px',
  transition: 'all 0.2s'
};

// Login Modal Component
export function LoginModal() {
  var auth = useAuth();
  var _state = React.useState('');
  var email = _state[0];
  var setEmail = _state[1];
  var _state2 = React.useState('');
  var password = _state2[0];
  var setPassword = _state2[1];
  var _state3 = React.useState('');
  var error = _state3[0];
  var setError = _state3[1];
  var _state4 = React.useState(false);
  var loading = _state4[0];
  var setLoading = _state4[1];

  if (!auth.showLoginModal) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    auth.login(email, password)
      .then(function(data) {
        if (!data.success && !data.requires_verification) {
          setError(data.error || 'Login failed');
        }
        setLoading(false);
      })
      .catch(function() {
        setError('Connection error. Please try again.');
        setLoading(false);
      });
  }

  function switchToSignup() {
    auth.setShowLoginModal(false);
    auth.setShowSignupModal(true);
  }

  function openForgotPassword() {
    auth.setShowLoginModal(false);
    auth.setShowForgotPasswordModal(true);
  }

  function handleGoogleLogin() {
    setError('');
    setLoading(true);

    // Redirect to server-side OAuth flow
    window.location.href = API_BASE_URL + '/google-login';
  }

  return React.createElement(ModalOverlay, { onClose: function() { auth.setShowLoginModal(false); } },
    React.createElement('div', { style: modalStyle },
      React.createElement('button', {
        onClick: function() { auth.setShowLoginModal(false); },
        style: closeButtonStyle
      }, '×'),

      React.createElement('div', { style: { textAlign: 'center', marginBottom: '24px' } },
        React.createElement('h2', {
          style: {
            color: '#1e293b',
            fontSize: '24px',
            fontWeight: '700',
            marginBottom: '8px'
          }
        }, 'Welcome Back'),
        React.createElement('p', { style: { color: '#64748b', fontSize: '14px', margin: 0 } }, 'Sign in to continue to Archify')
      ),

      error && React.createElement('div', {
        style: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '8px 12px',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '12px'
        }
      }, error),

      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { style: { marginBottom: '12px' } },
          React.createElement('label', {
            style: { display: 'block', color: '#374151', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }
          }, 'Email'),
          React.createElement('input', {
            type: 'email',
            value: email,
            onChange: function(e) { setEmail(e.target.value); },
            placeholder: 'Enter your email',
            required: true,
            style: inputStyle
          })
        ),

        React.createElement('div', { style: { marginBottom: '8px' } },
          React.createElement('label', {
            style: { display: 'block', color: '#374151', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }
          }, 'Password'),
          React.createElement('input', {
            type: 'password',
            value: password,
            onChange: function(e) { setPassword(e.target.value); },
            placeholder: 'Enter your password',
            required: true,
            style: inputStyle
          })
        ),

        React.createElement('div', { style: { textAlign: 'right', marginBottom: '16px' } },
          React.createElement('button', {
            type: 'button',
            onClick: openForgotPassword,
            style: {
              background: 'none',
              border: 'none',
              color: '#4a5568',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              textDecoration: 'underline'
            }
          }, 'Forgot password?')
        ),

        React.createElement('button', {
          type: 'submit',
          disabled: loading,
          style: Object.assign({}, buttonStyle, { opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }),
          onMouseEnter: function(e) {
            if (!loading) {
              e.target.style.backgroundColor = '#374151';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 8px rgba(74, 85, 104, 0.3)';
            }
          },
          onMouseLeave: function(e) {
            if (!loading) {
              e.target.style.backgroundColor = '#4a5568';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(74, 85, 104, 0.2)';
            }
          }
        }, loading ? 'Signing in...' : 'Sign In')
      ),

      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          margin: '20px 0',
          gap: '16px'
        }
      },
        React.createElement('div', { style: { flex: 1, height: '1px', backgroundColor: '#e5e7eb' } }),
        React.createElement('span', { style: { color: '#6b7280', fontSize: '14px', fontWeight: '500' } }, 'or'),
        React.createElement('div', { style: { flex: 1, height: '1px', backgroundColor: '#e5e7eb' } })
      ),

      React.createElement('div', { id: 'google-signin-btn-login', style: { display: 'none' } }),
      React.createElement('button', {
        type: 'button',
        onClick: handleGoogleLogin,
        disabled: loading,
        style: Object.assign({}, googleButtonStyle, { opacity: loading ? 0.7 : 1 }),
        onMouseEnter: function(e) {
          if (!loading) {
            e.target.style.backgroundColor = '#f3f4f6';
            e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          }
        },
        onMouseLeave: function(e) {
          if (!loading) {
            e.target.style.backgroundColor = '#fff';
            e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }
        }
      },
        React.createElement('svg', { width: '16', height: '16', viewBox: '0 0 24 24' },
          React.createElement('path', { fill: '#4285F4', d: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' }),
          React.createElement('path', { fill: '#34A853', d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' }),
          React.createElement('path', { fill: '#FBBC05', d: 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' }),
          React.createElement('path', { fill: '#EA4335', d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' })
        ),
        loading ? 'Connecting...' : 'Continue with Google'
      ),

      React.createElement('p', {
        style: { textAlign: 'center', marginTop: '20px', color: '#6b7280', fontSize: '14px', marginBottom: 0 }
      },
        "Don't have an account? ",
        React.createElement('button', {
          type: 'button',
          onClick: switchToSignup,
          style: {
            background: 'none',
            border: 'none',
            color: '#4a5568',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            textDecoration: 'underline'
          }
        }, 'Sign up')
      )
    )
  );
}

// Signup Modal Component
export function SignupModal() {
  var auth = useAuth();
  var _state = React.useState('');
  var name = _state[0];
  var setName = _state[1];
  var _state2 = React.useState('');
  var email = _state2[0];
  var setEmail = _state2[1];
  var _state3 = React.useState('');
  var password = _state3[0];
  var setPassword = _state3[1];
  var _state4 = React.useState('');
  var confirmPassword = _state4[0];
  var setConfirmPassword = _state4[1];
  var _state5 = React.useState('');
  var error = _state5[0];
  var setError = _state5[1];
  var _state6 = React.useState(false);
  var loading = _state6[0];
  var setLoading = _state6[1];

  if (!auth.showSignupModal) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    auth.signup(name, email, password)
      .then(function(data) {
        if (!data.success && !data.requires_verification) {
          setError(data.error || 'Signup failed');
        }
        setLoading(false);
      })
      .catch(function() {
        setError('Connection error. Please try again.');
        setLoading(false);
      });
  }

  function switchToLogin() {
    auth.setShowSignupModal(false);
    auth.setShowLoginModal(true);
  }

  function handleGoogleSignup() {
    setError('');
    setLoading(true);

    // Redirect to server-side OAuth flow
    window.location.href = API_BASE_URL + '/google-login';
  }

  return React.createElement(ModalOverlay, { onClose: function() { auth.setShowSignupModal(false); } },
    React.createElement('div', { style: modalStyle },
      React.createElement('button', {
        onClick: function() { auth.setShowSignupModal(false); },
        style: closeButtonStyle
      }, '×'),

      React.createElement('div', { style: { textAlign: 'center', marginBottom: '20px' } },
        React.createElement('h2', {
          style: {
            color: '#1e293b',
            fontSize: '24px',
            fontWeight: '700',
            marginBottom: '8px'
          }
        }, 'Create Account'),
        React.createElement('p', { style: { color: '#64748b', fontSize: '14px', margin: 0 } }, 'Join Archify to start designing')
      ),

      error && React.createElement('div', {
        style: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '8px 12px',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '12px'
        }
      }, error),

      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { style: { marginBottom: '12px' } },
          React.createElement('label', {
            style: { display: 'block', color: '#374151', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }
          }, 'Full Name'),
          React.createElement('input', {
            type: 'text',
            value: name,
            onChange: function(e) { setName(e.target.value); },
            placeholder: 'Enter your name',
            required: true,
            style: inputStyle
          })
        ),

        React.createElement('div', { style: { marginBottom: '12px' } },
          React.createElement('label', {
            style: { display: 'block', color: '#374151', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }
          }, 'Email'),
          React.createElement('input', {
            type: 'email',
            value: email,
            onChange: function(e) { setEmail(e.target.value); },
            placeholder: 'Enter your email',
            required: true,
            style: inputStyle
          })
        ),

        React.createElement('div', { style: { marginBottom: '12px' } },
          React.createElement('label', {
            style: { display: 'block', color: '#374151', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }
          }, 'Password'),
          React.createElement('input', {
            type: 'password',
            value: password,
            onChange: function(e) { setPassword(e.target.value); },
            placeholder: 'Min 6 characters',
            required: true,
            style: inputStyle
          })
        ),

        React.createElement('div', { style: { marginBottom: '20px' } },
          React.createElement('label', {
            style: { display: 'block', color: '#374151', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }
          }, 'Confirm Password'),
          React.createElement('input', {
            type: 'password',
            value: confirmPassword,
            onChange: function(e) { setConfirmPassword(e.target.value); },
            placeholder: 'Confirm password',
            required: true,
            style: inputStyle
          })
        ),

        React.createElement('button', {
          type: 'submit',
          disabled: loading,
          style: Object.assign({}, buttonStyle, { opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }),
          onMouseEnter: function(e) {
            if (!loading) {
              e.target.style.backgroundColor = '#374151';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 8px rgba(74, 85, 104, 0.3)';
            }
          },
          onMouseLeave: function(e) {
            if (!loading) {
              e.target.style.backgroundColor = '#4a5568';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(74, 85, 104, 0.2)';
            }
          }
        }, loading ? 'Creating...' : 'Create Account')
      ),

      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          margin: '20px 0',
          gap: '16px'
        }
      },
        React.createElement('div', { style: { flex: 1, height: '1px', backgroundColor: '#e5e7eb' } }),
        React.createElement('span', { style: { color: '#6b7280', fontSize: '14px', fontWeight: '500' } }, 'or'),
        React.createElement('div', { style: { flex: 1, height: '1px', backgroundColor: '#e5e7eb' } })
      ),

      React.createElement('div', { id: 'google-signin-btn-signup', style: { display: 'none' } }),
      React.createElement('button', {
        type: 'button',
        onClick: handleGoogleSignup,
        disabled: loading,
        style: Object.assign({}, googleButtonStyle, { opacity: loading ? 0.7 : 1 }),
        onMouseEnter: function(e) {
          if (!loading) {
            e.target.style.backgroundColor = '#f3f4f6';
            e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          }
        },
        onMouseLeave: function(e) {
          if (!loading) {
            e.target.style.backgroundColor = '#fff';
            e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }
        }
      },
        React.createElement('svg', { width: '16', height: '16', viewBox: '0 0 24 24' },
          React.createElement('path', { fill: '#4285F4', d: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' }),
          React.createElement('path', { fill: '#34A853', d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' }),
          React.createElement('path', { fill: '#FBBC05', d: 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' }),
          React.createElement('path', { fill: '#EA4335', d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' })
        ),
        loading ? 'Connecting...' : 'Continue with Google'
      ),

      React.createElement('p', {
        style: { textAlign: 'center', marginTop: '20px', color: '#6b7280', fontSize: '14px', marginBottom: 0 }
      },
        'Already have an account? ',
        React.createElement('button', {
          type: 'button',
          onClick: switchToLogin,
          style: {
            background: 'none',
            border: 'none',
            color: '#4a5568',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            textDecoration: 'underline'
          }
        }, 'Sign in')
      )
    )
  );
}

// Email Verification Modal
export function VerificationModal() {
  var auth = useAuth();
  var _state = React.useState('');
  var code = _state[0];
  var setCode = _state[1];
  var _state2 = React.useState('');
  var error = _state2[0];
  var setError = _state2[1];
  var _state3 = React.useState('');
  var success = _state3[0];
  var setSuccess = _state3[1];
  var _state4 = React.useState(false);
  var loading = _state4[0];
  var setLoading = _state4[1];
  var _state5 = React.useState(false);
  var resending = _state5[0];
  var setResending = _state5[1];

  if (!auth.showVerificationModal) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    auth.verifyEmail(auth.pendingEmail, code)
      .then(function(data) {
        if (!data.success) {
          setError(data.error || 'Verification failed');
        }
        setLoading(false);
      })
      .catch(function() {
        setError('Connection error. Please try again.');
        setLoading(false);
      });
  }

  function handleResend() {
    setError('');
    setSuccess('');
    setResending(true);

    auth.resendVerification(auth.pendingEmail)
      .then(function(data) {
        if (data.success) {
          setSuccess('Verification code sent!');
        } else {
          setError(data.error || 'Failed to resend');
        }
        setResending(false);
      })
      .catch(function() {
        setError('Connection error. Please try again.');
        setResending(false);
      });
  }

  function handleClose() {
    auth.setShowVerificationModal(false);
    auth.setPendingEmail('');
  }

  return React.createElement(ModalOverlay, { onClose: handleClose },
    React.createElement('div', { style: modalStyle },
      React.createElement('button', { onClick: handleClose, style: closeButtonStyle }, '×'),

      React.createElement('div', { style: { textAlign: 'center', marginBottom: '20px' } },
        React.createElement('div', { style: { fontSize: '40px', marginBottom: '12px' } }, '📧'),
        React.createElement('h2', { 
          style: { 
            color: '#fff', 
            fontSize: '20px', 
            fontWeight: '700',
            marginBottom: '8px'
          } 
        }, 'Verify Your Email'),
        React.createElement('p', { style: { color: '#888', fontSize: '13px', margin: 0 } }, 
          'We sent a 6-digit code to'),
        React.createElement('p', { style: { color: '#4a5568', fontSize: '13px', margin: '4px 0 0 0', fontWeight: '600' } }, 
          auth.pendingEmail)
      ),

      error && React.createElement('div', {
        style: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '8px 12px',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '12px'
        }
      }, error),

      success && React.createElement('div', {
        style: {
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#22c55e',
          padding: '8px 12px',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '12px'
        }
      }, success),

      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { style: { marginBottom: '16px' } },
          React.createElement('input', {
            type: 'text',
            value: code,
            onChange: function(e) { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); },
            placeholder: 'Enter 6-digit code',
            required: true,
            maxLength: 6,
            style: Object.assign({}, inputStyle, { 
              textAlign: 'center', 
              fontSize: '20px', 
              letterSpacing: '8px',
              padding: '14px'
            })
          })
        ),

        React.createElement('button', {
          type: 'submit',
          disabled: loading || code.length !== 6,
          style: Object.assign({}, buttonStyle, { 
            opacity: (loading || code.length !== 6) ? 0.7 : 1, 
            cursor: (loading || code.length !== 6) ? 'not-allowed' : 'pointer' 
          })
        }, loading ? 'Verifying...' : 'Verify Email')
      ),

      React.createElement('p', {
        style: { textAlign: 'center', marginTop: '16px', color: '#888', fontSize: '12px', marginBottom: 0 }
      },
        "Didn't receive the code? ",
        React.createElement('button', {
          type: 'button',
          onClick: handleResend,
          disabled: resending,
          style: {
            background: 'none',
            border: 'none',
            color: '#4a5568',
            cursor: resending ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            opacity: resending ? 0.7 : 1
          }
        }, resending ? 'Sending...' : 'Resend')
      )
    )
  );
}

// Forgot Password Modal
export function ForgotPasswordModal() {
  var auth = useAuth();
  var _state = React.useState('');
  var email = _state[0];
  var setEmail = _state[1];
  var _state2 = React.useState('');
  var error = _state2[0];
  var setError = _state2[1];
  var _state3 = React.useState(false);
  var loading = _state3[0];
  var setLoading = _state3[1];

  if (!auth.showForgotPasswordModal) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    auth.forgotPassword(email)
      .then(function(data) {
        if (!data.success) {
          setError(data.error || 'Failed to send reset email');
        }
        setLoading(false);
      })
      .catch(function() {
        setError('Connection error. Please try again.');
        setLoading(false);
      });
  }

  function backToLogin() {
    auth.setShowForgotPasswordModal(false);
    auth.setShowLoginModal(true);
  }

  return React.createElement(ModalOverlay, { onClose: function() { auth.setShowForgotPasswordModal(false); } },
    React.createElement('div', { style: modalStyle },
      React.createElement('button', { 
        onClick: function() { auth.setShowForgotPasswordModal(false); }, 
        style: closeButtonStyle 
      }, '×'),

      React.createElement('div', { style: { textAlign: 'center', marginBottom: '20px' } },
        React.createElement('div', { style: { fontSize: '40px', marginBottom: '12px' } }, '🔐'),
        React.createElement('h2', { 
          style: { 
            color: '#fff', 
            fontSize: '20px', 
            fontWeight: '700',
            marginBottom: '8px'
          } 
        }, 'Forgot Password?'),
        React.createElement('p', { style: { color: '#888', fontSize: '13px', margin: 0 } }, 
          "Enter your email and we'll send you a reset code")
      ),

      error && React.createElement('div', {
        style: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '8px 12px',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '12px'
        }
      }, error),

      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { style: { marginBottom: '16px' } },
          React.createElement('label', { 
            style: { display: 'block', color: '#aaa', fontSize: '12px', marginBottom: '4px' } 
          }, 'Email'),
          React.createElement('input', {
            type: 'email',
            value: email,
            onChange: function(e) { setEmail(e.target.value); },
            placeholder: 'Enter your email',
            required: true,
            style: inputStyle
          })
        ),

        React.createElement('button', {
          type: 'submit',
          disabled: loading,
          style: Object.assign({}, buttonStyle, { 
            opacity: loading ? 0.7 : 1, 
            cursor: loading ? 'not-allowed' : 'pointer' 
          })
        }, loading ? 'Sending...' : 'Send Reset Code')
      ),

      React.createElement('p', {
        style: { textAlign: 'center', marginTop: '16px', color: '#888', fontSize: '12px', marginBottom: 0 }
      },
        'Remember your password? ',
        React.createElement('button', {
          type: 'button',
          onClick: backToLogin,
          style: {
            background: 'none',
            border: 'none',
            color: '#4a5568',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }
        }, 'Sign in')
      )
    )
  );
}

// Reset Password Modal
export function ResetPasswordModal() {
  var auth = useAuth();
  var _state = React.useState('');
  var code = _state[0];
  var setCode = _state[1];
  var _state2 = React.useState('');
  var newPassword = _state2[0];
  var setNewPassword = _state2[1];
  var _state3 = React.useState('');
  var confirmPassword = _state3[0];
  var setConfirmPassword = _state3[1];
  var _state4 = React.useState('');
  var error = _state4[0];
  var setError = _state4[1];
  var _state5 = React.useState(false);
  var loading = _state5[0];
  var setLoading = _state5[1];

  if (!auth.showResetPasswordModal) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    auth.resetPassword(auth.pendingEmail, code, newPassword)
      .then(function(data) {
        if (!data.success) {
          setError(data.error || 'Password reset failed');
        }
        setLoading(false);
      })
      .catch(function() {
        setError('Connection error. Please try again.');
        setLoading(false);
      });
  }

  function handleClose() {
    auth.setShowResetPasswordModal(false);
    auth.setPendingEmail('');
  }

  return React.createElement(ModalOverlay, { onClose: handleClose },
    React.createElement('div', { style: modalStyle },
      React.createElement('button', { onClick: handleClose, style: closeButtonStyle }, '×'),

      React.createElement('div', { style: { textAlign: 'center', marginBottom: '20px' } },
        React.createElement('div', { style: { fontSize: '40px', marginBottom: '12px' } }, '🔑'),
        React.createElement('h2', { 
          style: { 
            color: '#fff', 
            fontSize: '20px', 
            fontWeight: '700',
            marginBottom: '8px'
          } 
        }, 'Reset Password'),
        React.createElement('p', { style: { color: '#888', fontSize: '13px', margin: 0 } }, 
          'Enter the code sent to'),
        React.createElement('p', { style: { color: '#4a5568', fontSize: '13px', margin: '4px 0 0 0', fontWeight: '600' } }, 
          auth.pendingEmail)
      ),

      error && React.createElement('div', {
        style: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '8px 12px',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '12px'
        }
      }, error),

      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { style: { marginBottom: '12px' } },
          React.createElement('label', { 
            style: { display: 'block', color: '#aaa', fontSize: '12px', marginBottom: '4px' } 
          }, 'Reset Code'),
          React.createElement('input', {
            type: 'text',
            value: code,
            onChange: function(e) { setCode(e.target.value.toUpperCase().slice(0, 6)); },
            placeholder: 'Enter 6-character code',
            required: true,
            maxLength: 6,
            style: Object.assign({}, inputStyle, { 
              textAlign: 'center', 
              fontSize: '18px', 
              letterSpacing: '6px'
            })
          })
        ),

        React.createElement('div', { style: { marginBottom: '10px' } },
          React.createElement('label', { 
            style: { display: 'block', color: '#aaa', fontSize: '12px', marginBottom: '4px' } 
          }, 'New Password'),
          React.createElement('input', {
            type: 'password',
            value: newPassword,
            onChange: function(e) { setNewPassword(e.target.value); },
            placeholder: 'Min 6 characters',
            required: true,
            style: inputStyle
          })
        ),

        React.createElement('div', { style: { marginBottom: '16px' } },
          React.createElement('label', { 
            style: { display: 'block', color: '#aaa', fontSize: '12px', marginBottom: '4px' } 
          }, 'Confirm Password'),
          React.createElement('input', {
            type: 'password',
            value: confirmPassword,
            onChange: function(e) { setConfirmPassword(e.target.value); },
            placeholder: 'Confirm password',
            required: true,
            style: inputStyle
          })
        ),

        React.createElement('button', {
          type: 'submit',
          disabled: loading || code.length !== 6,
          style: Object.assign({}, buttonStyle, { 
            opacity: (loading || code.length !== 6) ? 0.7 : 1, 
            cursor: (loading || code.length !== 6) ? 'not-allowed' : 'pointer' 
          })
        }, loading ? 'Resetting...' : 'Reset Password')
      )
    )
  );
}

// User Menu Component (for header)
export function UserMenu() {
  var auth = useAuth();
  var _state = React.useState(false);
  var showDropdown = _state[0];
  var setShowDropdown = _state[1];

  if (!auth.user) {
    return React.createElement('div', { style: { display: 'flex', gap: '12px' } },
      React.createElement('button', {
        onClick: function() { auth.setShowLoginModal(true); },
        style: {
          padding: '10px 20px',
          backgroundColor: 'transparent',
          color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }
      }, 'Sign In'),
      React.createElement('button', {
        onClick: function() { auth.setShowSignupModal(true); },
        style: {
          padding: '10px 20px',
          backgroundColor: '#4a5568',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }
      }, 'Sign Up')
    );
  }

  return React.createElement('div', { style: { position: 'relative' } },
    React.createElement('button', {
      onClick: function() { setShowDropdown(!showDropdown); },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 16px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '30px',
        cursor: 'pointer',
        color: '#fff'
      }
    },
      auth.user.avatar 
        ? React.createElement('img', {
            src: auth.user.avatar,
            alt: auth.user.name,
            style: {
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              objectFit: 'cover'
            }
          })
        : React.createElement('div', {
            style: {
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#4a5568',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600',
              color: '#fff'
            }
          }, auth.user.name.charAt(0).toUpperCase()),
      React.createElement('span', { style: { fontSize: '14px', fontWeight: '500' } }, auth.user.name),
      React.createElement('svg', { width: '12', height: '12', viewBox: '0 0 12 12', fill: 'currentColor' },
        React.createElement('path', { d: 'M6 8L2 4h8L6 8z' })
      )
    ),

    showDropdown && React.createElement('div', {
      style: {
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: '8px',
        backgroundColor: '#1a1a2e',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '8px',
        minWidth: '180px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        zIndex: 1000
      }
    },
      React.createElement('div', {
        style: {
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '8px'
        }
      },
        React.createElement('p', { style: { color: '#fff', fontSize: '14px', fontWeight: '600', margin: 0 } }, auth.user.name),
        React.createElement('p', { style: { color: '#888', fontSize: '12px', margin: '4px 0 0 0' } }, auth.user.email),
        auth.user.email_verified && React.createElement('span', { 
          style: { 
            display: 'inline-block',
            marginTop: '4px',
            padding: '2px 6px',
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            color: '#22c55e',
            fontSize: '10px',
            borderRadius: '4px'
          } 
        }, '✓ Verified')
      ),
      React.createElement('button', {
        onClick: function() {
          auth.logout();
          setShowDropdown(false);
        },
        style: {
          width: '100%',
          padding: '10px 16px',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '14px',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        },
        onMouseEnter: function(e) { e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; },
        onMouseLeave: function(e) { e.target.style.backgroundColor = 'transparent'; }
      }, 'Sign Out')
    )
  );
}

// Auth Success Component for handling OAuth redirects
export function AuthSuccess() {
  React.useEffect(() => {
    // Get token and user_id from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userId = urlParams.get('user_id');

    if (token) {
      // Store the token
      localStorage.setItem('authToken', token);

      // Fetch user data
      fetch(API_BASE_URL + '/me', {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Update auth context if available
          const auth = useAuth();
          if (auth && auth.setUser) {
            auth.setUser(data.user);
          }

          // Clean up URL and redirect to main app
          window.history.replaceState({}, document.title, '/');
          // You might want to redirect to a specific page or show a success message
        }
      })
      .catch(error => {
        console.error('Error fetching user data:', error);
      });
    }
  }, []);

  return React.createElement('div', {
    style: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px'
    }
  }, 'Completing authentication...');
}

export function ErrorModal() {
  var auth = useAuth();

  if (!auth.showErrorModal) return null;

  function closeModal() {
    auth.setShowErrorModal(false);
    auth.setErrorMessage('');
  }

  return React.createElement('div', {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    },
    onClick: closeModal
  }, React.createElement('div', {
    style: {
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '400px',
      width: '90%',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      position: 'relative'
    },
    onClick: function(e) { e.stopPropagation(); }
  }, [
    React.createElement('div', {
      key: 'header',
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }
    }, [
      React.createElement('h3', {
        key: 'title',
        style: {
          margin: 0,
          color: '#e53e3e',
          fontSize: '18px',
          fontWeight: '600'
        }
      }, 'Error'),
      React.createElement('button', {
        key: 'close',
        onClick: closeModal,
        style: {
          background: 'none',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          color: '#666',
          padding: '0',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }, '×')
    ]),
    React.createElement('p', {
      key: 'message',
      style: {
        margin: '0 0 20px 0',
        color: '#4a5568',
        lineHeight: '1.5'
      }
    }, auth.errorMessage),
    React.createElement('div', {
      key: 'footer',
      style: {
        display: 'flex',
        justifyContent: 'flex-end'
      }
    }, React.createElement('button', {
      onClick: closeModal,
      style: {
        background: '#e53e3e',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        padding: '8px 16px',
        cursor: 'pointer',
        fontWeight: '500'
      }
    }, 'OK'))
  ]));
}

export default { AuthProvider, useAuth, LoginModal, SignupModal, VerificationModal, ForgotPasswordModal, ResetPasswordModal, UserMenu, AuthSuccess, ErrorModal };
