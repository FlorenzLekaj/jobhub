import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import './Auth.css';

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onLogin();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-logo">⚡ EVJobs.ch</div>
        <p className="auth-subtitle">Die #1 Plattform für eMobility Jobs</p>

        <h2>{isLogin ? 'Willkommen zurück' : 'Konto erstellen'}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Lädt...' : isLogin ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? 'Noch kein Konto?' : 'Bereits ein Konto?'}
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Jetzt erstellen' : 'Anmelden'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Auth;