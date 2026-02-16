import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import './Auth.css';

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
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
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>JobHub.ch</h1>
        <h2>{isLogin ? 'Willkommen zurück' : 'Konto erstellen'}</h2>
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          {error && <p className="error">{error}</p>}
          
          <button type="submit" className="btn-primary">
            {isLogin ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>
        
        <p className="toggle-text">
          {isLogin ? 'Noch kein Konto? ' : 'Bereits registriert? '}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Jetzt erstellen' : 'Anmelden'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Auth;