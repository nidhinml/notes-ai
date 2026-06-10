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
 * SecretKeyModal — 2-step flow:
 *  Step 1: Enter key → check if it already exists
 *  Step 2a (key EXISTS): Warn user → "Not your account? Choose a different key" or "Yes, log me in"
 *  Step 2b (key NEW):    Confirm new account creation → show the key to save
 */
export default function SecretKeyModal({ onSuccess, onClose }) {
  const [step, setStep] = useState('input'); // 'input' | 'confirm_existing' | 'confirm_new' | 'success'
  const [key, setKey]     = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [suggested, setSuggested] = useState('');
  const [isFetchingSuggest, setIsFetchingSuggest] = useState(false);

  const inputRef = useRef(null);
  const strength = getKeyStrength(key);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
    fetchSuggestion();
  }, []);

  const fetchSuggestion = async () => {
    setIsFetchingSuggest(true);
    try {
      const { data } = await axios.get('/api/auth/suggest-key');
      setSuggested(data.key);
    } catch (_) {}
    finally { setIsFetchingSuggest(false); }
  };

  /* ---- Step 1: Check key ---- */
  const handleCheck = async (e) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;
    if (trimmed.length < 6) {
      setError('Key must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post('/api/auth/check', { secretKey: trimmed });
      if (data.exists) {
        setStep('confirm_existing');
      } else {
        setStep('confirm_new');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not check key. Try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ---- Step 2: Confirm & validate ---- */
  const handleValidate = async () => {
    setLoading(true);
    setError(null);
    try {
      await axios.post('/api/auth/validate', { secretKey: key.trim() });
      setStep('success');
      setTimeout(() => onSuccess(key.trim()), 900);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setKey('');
    setError(null);
  };

  const useSuggested = () => {
    setKey(suggested);
    setShowKey(true);
    setError(null);
  };

  /* ======================== RENDER ======================== */

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card modal-3d" role="dialog" aria-modal="true" aria-labelledby="modal-title">

        {/* Floating orbs inside modal */}
        <div className="modal-orb modal-orb-1" />
        <div className="modal-orb modal-orb-2" />

        {/* ---- SUCCESS ---- */}
        {step === 'success' && (
          <div className="modal-step modal-step-success">
            <div className="success-checkmark">✓</div>
            <h2>You're in!</h2>
            <p>Loading your notes…</p>
          </div>
        )}

        {/* ---- INPUT STEP ---- */}
        {step === 'input' && (
          <div className="modal-step">
            <div className="modal-icon icon-3d">🔑</div>
            <h2 id="modal-title">Your Secret Key</h2>
            <p>Enter your personal key to access your private notes. Keys are unique — first use creates your account.</p>

            <form onSubmit={handleCheck}>
              {/* Key Input */}
              <div className="modal-input-group">
                <input
                  ref={inputRef}
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
                <span
                  className="modal-input-icon"
                  onClick={() => setShowKey(v => !v)}
                  role="button"
                  tabIndex={0}
                  title={showKey ? 'Hide' : 'Show'}
                  onKeyDown={(e) => e.key === 'Enter' && setShowKey(v => !v)}
                >
                  {showKey ? '🙈' : '👁'}
                </span>
              </div>

              {/* Strength meter */}
              {key.length > 0 && (
                <div className="key-strength-bar-wrap">
                  <div className="key-strength-track">
                    {[0,1,2,3].map(i => (
                      <div
                        key={i}
                        className="key-strength-segment"
                        style={{ background: i < strength ? STRENGTH_COLORS[strength] : 'rgba(255,255,255,0.08)' }}
                      />
                    ))}
                  </div>
                  <span className="key-strength-label" style={{ color: STRENGTH_COLORS[strength] }}>
                    {STRENGTH_LABELS[strength]}
                  </span>
                </div>
              )}

              {/* Suggest a key */}
              {suggested && (
                <div className="modal-suggest">
                  <span>💡 Try:</span>
                  <button type="button" className="modal-suggest-key" onClick={useSuggested} disabled={isFetchingSuggest}>
                    {suggested}
                  </button>
                  <button type="button" className="modal-suggest-refresh" onClick={fetchSuggestion} title="Generate new">↻</button>
                </div>
              )}

              <div className="modal-info">
                <strong>🔐 How it works:</strong> Your key is the <em>only</em> way to access your notes. Each key maps to exactly <strong>one private account</strong>. Save it somewhere safe — no recovery if lost!
              </div>

              {error && <div className="modal-error" role="alert">⚠ {error}</div>}

              <button
                type="submit"
                className="btn-primary btn-glow"
                id="btn-check-key"
                disabled={loading || key.trim().length < 6}
                style={{ width: '100%', padding: '13px', marginTop: '4px' }}
              >
                {loading ? <><span className="spinner" /> Checking…</> : <>Continue →</>}
              </button>
            </form>

            <button className="btn-secondary" onClick={onClose} style={{ width: '100%', marginTop: '10px' }} id="btn-cancel-modal">
              Cancel — Stay in Chat
            </button>
          </div>
        )}

        {/* ---- KEY EXISTS → WARN ---- */}
        {step === 'confirm_existing' && (
          <div className="modal-step">
            <div className="modal-icon icon-3d icon-warn">⚠️</div>
            <h2 id="modal-title">Key Already Registered</h2>
            <p>This key is linked to an existing account. If <strong>you</strong> created this account, click <em>Log In</em> to continue. If this isn't your key, please choose a different one.</p>

            <div className="modal-key-preview">
              <span className="modal-key-preview-label">Key entered:</span>
              <code className="modal-key-code">{key.length > 20 ? key.substring(0,20) + '…' : key}</code>
            </div>

            <div className="modal-warn-box">
              🚨 <strong>Security Notice:</strong> If someone else is using your key, your notes may be at risk. Consider choosing a more unique key.
            </div>

            {error && <div className="modal-error" role="alert">⚠ {error}</div>}

            <div className="modal-action-row">
              <button
                className="btn-primary btn-glow"
                onClick={handleValidate}
                disabled={loading}
                id="btn-login-existing"
                style={{ flex: 1 }}
              >
                {loading ? <><span className="spinner" /> Logging in…</> : <>✓ It's My Account</>}
              </button>
              <button
                className="btn-secondary"
                onClick={handleReset}
                id="btn-choose-different"
                style={{ flex: 1 }}
              >
                Use Different Key
              </button>
            </div>
          </div>
        )}

        {/* ---- KEY IS NEW → CONFIRM CREATE ---- */}
        {step === 'confirm_new' && (
          <div className="modal-step">
            <div className="modal-icon icon-3d icon-new">🆕</div>
            <h2 id="modal-title">Create New Account?</h2>
            <p>No account found for this key. A new private account will be created just for you.</p>

            <div className="modal-key-preview">
              <span className="modal-key-preview-label">Your new key:</span>
              <code className="modal-key-code">{key}</code>
            </div>

            <div className="modal-save-reminder">
              <div className="save-reminder-icon">💾</div>
              <div>
                <strong>Save this key now!</strong><br/>
                <span>There's no password reset or recovery. If you lose this key, you lose access to your notes forever.</span>
              </div>
            </div>

            {error && <div className="modal-error" role="alert">⚠ {error}</div>}

            <div className="modal-action-row">
              <button
                className="btn-primary btn-glow"
                onClick={handleValidate}
                disabled={loading}
                id="btn-create-account"
                style={{ flex: 1 }}
              >
                {loading ? <><span className="spinner" /> Creating…</> : <>🚀 Create Account</>}
              </button>
              <button
                className="btn-secondary"
                onClick={handleReset}
                id="btn-back-to-input"
                style={{ flex: 1 }}
              >
                ← Go Back
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
