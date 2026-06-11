import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

/** Password strength scorer: 0-4 */
function getKeyStrength(key) {
  if (!key) return 0;
  let score = 0;
  if (key.length >= 8)  score++;
  if (key.length >= 14) score++;
  if (/[0-9]/.test(key)) score++;
  if (/[-_!@#$%^&*]/.test(key)) score++;
  return score;
}

const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
const STRENGTH_COLORS = ['#f43f5e', '#f97316', '#f59e0b', '#22c55e', '#06b6d4'];

/**
 * SecretKeyModal — Simplified unique-key flow:
 *
 * Step 1 (input):   User types their key → press Continue
 * Step 2a (login):  Key exists in DB → login directly, NO confirmation needed
 * Step 2b (new):    Key is brand new → show "Create account" confirm + save-key reminder
 *
 * KEY UNIQUENESS: Each key belongs to exactly ONE user.
 *   - Returning user types their key → instant login
 *   - New user types a taken key → told "key taken, choose another"
 *   - New user types unique key → confirmation step
 */
export default function SecretKeyModal({ onSuccess, onClose }) {
  const [step, setStep]       = useState('input'); // 'input' | 'confirm_new' | 'logging_in' | 'success' | 'forgot_request' | 'forgot_verify' | 'forgot_result'
  const [mobile, setMobile]   = useState(() => localStorage.getItem('notes_ai_mobile_number') || '');
  const [key, setKey]         = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [suggested, setSuggested] = useState('');
  const [isNew, setIsNew]     = useState(false);

  // Email state for registration
  const [email, setEmail]     = useState('');

  // Forgot password/key recovery states
  const [forgotMobile, setForgotMobile] = useState('');
  const [otpCode, setOtpCode]           = useState('');
  const [mockOtpHint, setMockOtpHint]   = useState('');
  const [recoveredKey, setRecoveredKey] = useState('');
  const [maskedEmail, setMaskedEmail]   = useState('');
  const [emailSent, setEmailSent]       = useState(false);

  const mobileRef = useRef(null);
  const keyRef = useRef(null);
  const strength = getKeyStrength(key);

  useEffect(() => {
    setTimeout(() => {
      if (!mobile) {
        mobileRef.current?.focus();
      } else {
        keyRef.current?.focus();
      }
    }, 150);
    fetchSuggestion();
  }, []);

  const fetchSuggestion = async () => {
    try {
      const { data } = await axios.get('/api/auth/suggest-key');
      setSuggested(data.key);
    } catch (_) {}
  };

  /* ─── Step 1: Check credentials ─── */
  const handleCheck = async (e) => {
    e.preventDefault();
    const trimmedMobile = mobile.trim();
    const trimmedKey = key.trim();

    if (!trimmedMobile) { setError('Mobile number is required.'); return; }
    if (!trimmedKey) { setError('Secret key is required.'); return; }
    if (trimmedKey.length < 6) { setError('Key must be at least 6 characters.'); return; }

    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post('/api/auth/check', { 
        mobileNumber: trimmedMobile, 
        secretKey: trimmedKey 
      });

      if (data.exists) {
        // Mobile registered and key matches → login directly
        setStep('logging_in');
        await handleValidate(trimmedMobile, trimmedKey);
      } else {
        // Brand new account → go to confirm-create step
        setIsNew(true);
        setStep('confirm_new');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not verify credentials. Try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Step 2b: Validate (create or login) ─── */
  const handleValidate = async (mobileToUse, keyToUse) => {
    const m = mobileToUse || mobile.trim();
    const k = keyToUse || key.trim();
    const e = email.trim();
    setLoading(true);
    setError(null);
    try {
      await axios.post('/api/auth/validate', { mobileNumber: m, secretKey: k, email: e });
      setStep('success');
      setTimeout(() => onSuccess(m, k, e), 750);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed. Please try again.');
      if (isNew) {
        setStep('confirm_new');
      } else {
        setStep('input');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ─── Forgot Key: Request OTP ─── */
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    const trimmed = forgotMobile.trim();
    if (!trimmed) { setError('Mobile number is required.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post('/api/auth/recover-request', { mobileNumber: trimmed });
      setMaskedEmail(data.maskedEmail);
      setEmailSent(data.emailSent);
      setMockOtpHint(data.otp || '');
      setStep('forgot_verify');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request recovery. Is the mobile number correct?');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Forgot Key: Verify OTP ─── */
  const handleForgotVerify = async (e) => {
    e.preventDefault();
    const trimmedMobile = forgotMobile.trim();
    const trimmedOtp = otpCode.trim();
    if (!trimmedOtp) { setError('OTP code is required.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post('/api/auth/recover-verify', { mobileNumber: trimmedMobile, otp: trimmedOtp });
      setRecoveredKey(data.secretKey);
      setStep('forgot_result');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setStep('input'); setError(null); };
  const useSuggested = () => { setKey(suggested); setShowKey(true); setError(null); fetchSuggestion(); };

  /* ─── Render ─── */
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className="modal-card modal-3d" role="dialog" aria-modal="true">
        <div className="modal-orb modal-orb-1" />
        <div className="modal-orb modal-orb-2" />

        {/* SUCCESS */}
        {step === 'success' && (
          <div className="modal-step modal-step-success">
            <div className="success-checkmark">✓</div>
            <h2>Welcome{isNew ? '!' : ' back!'}</h2>
            <p>{isNew ? 'Your new account is ready.' : 'Loading your notes…'}</p>
          </div>
        )}

        {/* LOGGING IN (auto-login transition) */}
        {step === 'logging_in' && (
          <div className="modal-step modal-step-success">
            <div className="modal-icon icon-3d" style={{ margin: '0 auto 20px' }}>🔓</div>
            <h2>Logging you in…</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Authenticating your details</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
            </div>
          </div>
        )}

        {/* STEP 1 — ENTER DETAILS */}
        {step === 'input' && (
          <div className="modal-step">
            <div className="modal-icon icon-3d">🔑</div>
            <h2>Access Notes AI</h2>
            <p>Please enter your mobile number and secret key. First use registers your account, returning users log in securely.</p>

            <form onSubmit={handleCheck}>
              <div style={{ marginBottom: 16, textAlign: 'left' }}>
                <label htmlFor="mobile-input" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                  📱 Mobile Number
                </label>
                <input
                  ref={mobileRef}
                  id="mobile-input"
                  type="tel"
                  className="modal-input"
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', outline: 'none' }}
                  placeholder="e.g. +91 9876543210"
                  value={mobile}
                  onChange={(e) => { setMobile(e.target.value); setError(null); }}
                  disabled={loading}
                  autoComplete="tel"
                />
              </div>

              <div style={{ marginBottom: 16, textAlign: 'left' }}>
                <label htmlFor="email-input" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                  📧 Gmail Address (Required for New Users)
                </label>
                <input
                  id="email-input"
                  type="email"
                  className="modal-input"
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', outline: 'none' }}
                  placeholder="e.g. nidhin@gmail.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div style={{ marginBottom: 16, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label htmlFor="secret-key-input" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    🔑 Secret Key
                  </label>
                  <span 
                    onClick={() => { setStep('forgot_request'); setError(null); }}
                    style={{ fontSize: '12px', color: 'var(--accent-light)', cursor: 'pointer', textDecoration: 'underline' }}
                    role="button"
                  >
                    Forgot Key?
                  </span>
                </div>
                <div className="modal-input-group">
                  <input
                    ref={keyRef}
                    id="secret-key-input"
                    type={showKey ? 'text' : 'password'}
                    className="modal-input"
                    placeholder="e.g. falcon-river-2847"
                    value={key}
                    onChange={(e) => { setKey(e.target.value); setError(null); }}
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <span className="modal-input-icon" onClick={() => setShowKey(v => !v)} role="button" tabIndex={0}>
                    {showKey ? '🙈' : '👁'}
                  </span>
                </div>
              </div>

              {/* Strength meter */}
              {key.length > 0 && (
                <div className="key-strength-bar-wrap">
                  <div className="key-strength-track">
                    {[0,1,2,3].map(i => (
                      <div key={i} className="key-strength-segment"
                        style={{ background: i < strength ? STRENGTH_COLORS[strength] : 'rgba(255,255,255,0.08)' }} />
                    ))}
                  </div>
                  <span className="key-strength-label" style={{ color: STRENGTH_COLORS[strength] }}>
                    {STRENGTH_LABELS[strength]}
                  </span>
                </div>
              )}

              {/* Suggest key */}
              {suggested && (
                <div className="modal-suggest">
                  <span>💡 Try:</span>
                  <button type="button" className="modal-suggest-key" onClick={useSuggested}>{suggested}</button>
                  <button type="button" className="modal-suggest-refresh" onClick={fetchSuggestion} title="New suggestion">↻</button>
                </div>
              )}

              <div className="modal-info">
                <strong>🔐 Mobile + Key Pair.</strong> To prevent others from accessing your notes, access requires both your registered mobile number and secret key.
              </div>

              {error && <div className="modal-error" role="alert">⚠ {error}</div>}

              <button type="submit" className="btn-primary btn-glow" id="btn-check-key"
                disabled={loading || key.trim().length < 6 || !mobile.trim()}
                style={{ width: '100%', padding: '13px', marginTop: '4px' }}>
                {loading ? <><span className="spinner" /> Verifying…</> : <>Continue →</>}
              </button>
            </form>

            {onClose && (
              <button className="btn-secondary" onClick={onClose}
                style={{ width: '100%', marginTop: '10px' }} id="btn-cancel-modal">
                Cancel — Stay in Chat
              </button>
            )}
          </div>
        )}

        {/* STEP 2b — CONFIRM NEW ACCOUNT */}
        {step === 'confirm_new' && (
          <div className="modal-step">
            <div className="modal-icon icon-3d icon-new">🆕</div>
            <h2>Create New Account?</h2>
            <p>This mobile number isn't registered yet. A new private account will be created with this key.</p>

            <div className="modal-key-preview" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="modal-key-preview-label" style={{ opacity: 0.6, fontSize: '13px' }}>Mobile:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{mobile}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="modal-key-preview-label" style={{ opacity: 0.6, fontSize: '13px' }}>Key:</span>
                <code className="modal-key-code" style={{ background: 'transparent', padding: 0, fontSize: '14px' }}>{key}</code>
              </div>
            </div>

            <div style={{ marginBottom: 16, textAlign: 'left' }}>
              <label htmlFor="confirm-email-input" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                📧 Your Gmail Address (For Key Recovery)
              </label>
              <input
                id="confirm-email-input"
                type="email"
                className="modal-input"
                style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', outline: 'none' }}
                placeholder="e.g. nidhin@gmail.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>

            <div className="modal-save-reminder">
              <div className="save-reminder-icon">💾</div>
              <div>
                <strong>Save this key now!</strong><br />
                <span>This is your unique encryption credential — no recovery options exist. Screenshot or save it somewhere safe.</span>
              </div>
            </div>

            {error && <div className="modal-error" role="alert">⚠ {error}</div>}

            <div className="modal-action-row">
              <button className="btn-primary btn-glow" onClick={() => handleValidate()}
                disabled={loading || !email.trim()} id="btn-create-account" style={{ flex: 1 }}>
                {loading ? <><span className="spinner" /> Creating…</> : <>🚀 Create Account</>}
              </button>
              <button className="btn-secondary" onClick={handleReset}
                id="btn-back-to-input" style={{ flex: 1 }}>← Go Back</button>
            </div>
          </div>
        )}

        {/* STEP 3a — FORGOT KEY: REQUEST OTP */}
        {step === 'forgot_request' && (
          <div className="modal-step">
            <div className="modal-icon icon-3d">🔍</div>
            <h2>Recover Secret Key</h2>
            <p>Enter your registered mobile number below. We will send a verification OTP code to your number.</p>

            <form onSubmit={handleForgotRequest}>
              <div style={{ marginBottom: 16, textAlign: 'left' }}>
                <label htmlFor="forgot-mobile-input" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                  📱 Registered Mobile Number
                </label>
                <input
                  id="forgot-mobile-input"
                  type="tel"
                  className="modal-input"
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', outline: 'none' }}
                  placeholder="e.g. +91 9876543210"
                  value={forgotMobile}
                  onChange={(e) => { setForgotMobile(e.target.value); setError(null); }}
                  disabled={loading}
                  autoComplete="tel"
                  required
                />
              </div>

              {error && <div className="modal-error" role="alert">⚠ {error}</div>}

              <div className="modal-action-row" style={{ marginTop: 20 }}>
                <button type="submit" className="btn-primary btn-glow" disabled={loading || !forgotMobile.trim()} style={{ flex: 1 }}>
                  {loading ? <><span className="spinner" /> Sending…</> : 'Send OTP →'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setStep('input'); setError(null); }} style={{ flex: 1 }}>
                  Back
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3b — FORGOT KEY: VERIFY OTP */}
        {step === 'forgot_verify' && (
          <div className="modal-step">
            <div className="modal-icon icon-3d">✉️</div>
            <h2>Enter Verification Code</h2>
            <p style={{ marginBottom: 16 }}>
              {emailSent 
                ? `We have emailed a 6-digit OTP verification code to your registered Gmail: ${maskedEmail}. Check your inbox.`
                : "We've simulated sending a code to your registered number. Enter the 6-digit OTP code below."
              }
            </p>

            {/* Mock SMS Banner (Fallback when SMTP is not configured) */}
            {!emailSent && mockOtpHint && (
              <div style={{ padding: '10px 14px', background: 'rgba(34, 197, 94, 0.08)', border: '1px dashed var(--success)', borderRadius: 'var(--r-sm)', color: 'var(--success)', fontSize: '13px', marginBottom: 16, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📱</span>
                <div>
                  <strong>[Mock SMS]:</strong> Your verification code is <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{mockOtpHint}</strong>
                </div>
              </div>
            )}

            <form onSubmit={handleForgotVerify}>
              <div style={{ marginBottom: 16, textAlign: 'left' }}>
                <label htmlFor="otp-input" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                  💬 6-Digit OTP Code
                </label>
                <input
                  id="otp-input"
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  className="modal-input"
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', outline: 'none', textAlign: 'center', letterSpacing: '8px', fontSize: '18px', fontWeight: 'bold' }}
                  placeholder="------"
                  value={otpCode}
                  onChange={(e) => { setOtpCode(e.target.value.replace(/[^0-9]/g, '')); setError(null); }}
                  disabled={loading}
                  required
                />
              </div>

              {error && <div className="modal-error" role="alert">⚠ {error}</div>}

              <div className="modal-action-row" style={{ marginTop: 20 }}>
                <button type="submit" className="btn-primary btn-glow" disabled={loading || otpCode.length < 6} style={{ flex: 1 }}>
                  {loading ? <><span className="spinner" /> Verifying…</> : 'Verify & Recover ✓'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setStep('forgot_request'); setError(null); setOtpCode(''); }} style={{ flex: 1 }}>
                  Back
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3c — FORGOT KEY: RESULT */}
        {step === 'forgot_result' && (
          <div className="modal-step">
            <div className="modal-icon icon-3d">🔓</div>
            <h2>Key Recovered!</h2>
            <p>Your secret key has been recovered successfully. Please save it securely.</p>

            <div className="modal-key-preview" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', marginBottom: '20px' }}>
              <span className="modal-key-preview-label" style={{ opacity: 0.6, fontSize: '13px', textAlign: 'center' }}>Your Secret Key:</span>
              <code className="modal-key-code" style={{ background: 'rgba(124, 92, 252, 0.08)', padding: '10px 14px', fontSize: '16px', color: 'var(--accent-light)', border: '1px solid rgba(124, 92, 252, 0.2)', borderRadius: 'var(--r-sm)', textAlign: 'center', wordBreak: 'break-all', fontWeight: 'bold' }}>
                {recoveredKey}
              </code>
            </div>

            <div className="modal-action-row">
              <button 
                type="button" 
                className="btn-primary btn-glow" 
                onClick={() => {
                  setMobile(forgotMobile);
                  setKey(recoveredKey);
                  setStep('input');
                  setError(null);
                }} 
                style={{ flex: 1 }}
              >
                📋 Copy to Input & Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
