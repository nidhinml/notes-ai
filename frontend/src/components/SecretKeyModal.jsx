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
  const [step, setStep]       = useState('input'); // 'input' | 'confirm_new' | 'logging_in' | 'success'
  const [key, setKey]         = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [suggested, setSuggested] = useState('');
  const [isNew, setIsNew]     = useState(false);

  const inputRef = useRef(null);
  const strength = getKeyStrength(key);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
    fetchSuggestion();
  }, []);

  const fetchSuggestion = async () => {
    try {
      const { data } = await axios.get('/api/auth/suggest-key');
      setSuggested(data.key);
    } catch (_) {}
  };

  /* ─── Step 1: Check key ─── */
  const handleCheck = async (e) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;
    if (trimmed.length < 6) { setError('Key must be at least 6 characters.'); return; }

    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post('/api/auth/check', { secretKey: trimmed });

      if (data.exists) {
        // Key belongs to a user → login directly, no questions asked
        setStep('logging_in');
        await handleValidate(trimmed);
      } else {
        // Brand new key → go to confirm-create step
        setIsNew(true);
        setStep('confirm_new');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not check key. Try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Step 2b: Validate (create or login) ─── */
  const handleValidate = async (keyToUse) => {
    const k = keyToUse || key.trim();
    setLoading(true);
    setError(null);
    try {
      await axios.post('/api/auth/validate', { secretKey: k });
      setStep('success');
      setTimeout(() => onSuccess(k), 750);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed. Please try again.');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setStep('input'); setError(null); };
  const useSuggested = () => { setKey(suggested); setShowKey(true); setError(null); fetchSuggestion(); };

  /* ─── Render ─── */
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
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
            <p style={{ color: 'var(--text-secondary)' }}>Authenticating your key</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
            </div>
          </div>
        )}

        {/* STEP 1 — ENTER KEY */}
        {step === 'input' && (
          <div className="modal-step">
            <div className="modal-icon icon-3d">🔑</div>
            <h2>Your Secret Key</h2>
            <p>Enter your key to access notes. Keys are unique — first use creates your account, returning users are logged in instantly.</p>

            <form onSubmit={handleCheck}>
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
                <span className="modal-input-icon" onClick={() => setShowKey(v => !v)} role="button" tabIndex={0}>
                  {showKey ? '🙈' : '👁'}
                </span>
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
                <strong>🔐 One key, one account.</strong> Each key maps to exactly one private account — no two users can share a key. If your key exists, you're instantly logged in.
              </div>

              {error && <div className="modal-error" role="alert">⚠ {error}</div>}

              <button type="submit" className="btn-primary btn-glow" id="btn-check-key"
                disabled={loading || key.trim().length < 6}
                style={{ width: '100%', padding: '13px', marginTop: '4px' }}>
                {loading ? <><span className="spinner" /> Checking…</> : <>Continue →</>}
              </button>
            </form>

            <button className="btn-secondary" onClick={onClose}
              style={{ width: '100%', marginTop: '10px' }} id="btn-cancel-modal">
              Cancel — Stay in Chat
            </button>
          </div>
        )}

        {/* STEP 2b — CONFIRM NEW ACCOUNT */}
        {step === 'confirm_new' && (
          <div className="modal-step">
            <div className="modal-icon icon-3d icon-new">🆕</div>
            <h2>Create New Account?</h2>
            <p>This key isn't registered yet. A new private account will be created for you.</p>

            <div className="modal-key-preview">
              <span className="modal-key-preview-label">Your new key:</span>
              <code className="modal-key-code">{key}</code>
            </div>

            <div className="modal-save-reminder">
              <div className="save-reminder-icon">💾</div>
              <div>
                <strong>Save this key now!</strong><br />
                <span>This is your only access credential — no recovery options exist. Screenshot or save it somewhere safe.</span>
              </div>
            </div>

            {error && <div className="modal-error" role="alert">⚠ {error}</div>}

            <div className="modal-action-row">
              <button className="btn-primary btn-glow" onClick={() => handleValidate()}
                disabled={loading} id="btn-create-account" style={{ flex: 1 }}>
                {loading ? <><span className="spinner" /> Creating…</> : <>🚀 Create Account</>}
              </button>
              <button className="btn-secondary" onClick={handleReset}
                id="btn-back-to-input" style={{ flex: 1 }}>← Go Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
