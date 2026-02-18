import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser
} from 'firebase/auth';
import './Profile.css';

function Profile({ onClose }) {
  const [activeSection, setActiveSection] = useState('profile');

  // Profil
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [company, setCompany] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // Passwort
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Account löschen
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setName(data.name || '');
        setBio(data.bio || '');
        setCompany(data.company || '');
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    }
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Profil speichern ──
  const handleSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        name,
        bio,
        company,
        email: auth.currentUser.email,
        updatedAt: new Date().toISOString()
      });
      await updateProfile(auth.currentUser, { displayName: name });
      showSuccess('Profil gespeichert!');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    }
    setProfileLoading(false);
  };

  // ── Passwort ändern ──
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwörter stimmen nicht überein');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Neues Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setPasswordLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Passwort erfolgreich geändert!');
      setActiveSection('profile');
    } catch (error) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setPasswordError('Aktuelles Passwort ist falsch');
      } else {
        setPasswordError('Fehler: ' + error.message);
      }
    }
    setPasswordLoading(false);
  };

  // ── Account löschen ──
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, deletePassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await deleteDoc(doc(db, 'users', auth.currentUser.uid));
      await deleteUser(auth.currentUser);
      onClose();
    } catch (error) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setDeleteError('Falsches Passwort');
      } else {
        setDeleteError('Fehler: ' + error.message);
      }
    }
    setDeleteLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h2>👤 Mein Profil</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {success && <div className="success-message">✓ {success}</div>}

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={activeSection === 'profile' ? 'active' : ''}
            onClick={() => setActiveSection('profile')}
          >
            Profil
          </button>
          <button
            className={activeSection === 'password' ? 'active' : ''}
            onClick={() => { setActiveSection('password'); setPasswordError(''); }}
          >
            Passwort
          </button>
          <button
            className={`danger-tab ${activeSection === 'delete' ? 'active' : ''}`}
            onClick={() => { setActiveSection('delete'); setDeleteError(''); setShowDeleteConfirm(false); }}
          >
            🗑️ Löschen
          </button>
        </div>

        {/* ── Profil bearbeiten ── */}
        {activeSection === 'profile' && (
          <form onSubmit={handleSave} className="profile-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dein Name"
                required
              />
            </div>
            <div className="form-group">
              <label>Firma (optional)</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Deine Firma"
              />
            </div>
            <div className="form-group">
              <label>Bio (optional)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Erzähle etwas über dich..."
                rows="4"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={auth.currentUser.email}
                disabled
                className="input-disabled"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={profileLoading}>
              {profileLoading ? 'Speichert...' : '💾 Profil speichern'}
            </button>
          </form>
        )}

        {/* ── Passwort ändern ── */}
        {activeSection === 'password' && (
          <form onSubmit={handlePasswordChange} className="profile-form">
            <p className="section-hint">Gib dein aktuelles Passwort ein, um ein neues zu setzen.</p>
            {passwordError && <div className="profile-error">{passwordError}</div>}
            <div className="form-group">
              <label>Aktuelles Passwort</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Aktuelles Passwort"
                required
              />
            </div>
            <div className="form-group">
              <label>Neues Passwort</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Neues Passwort (min. 6 Zeichen)"
                required
              />
            </div>
            <div className="form-group">
              <label>Neues Passwort bestätigen</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort wiederholen"
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={passwordLoading}>
              {passwordLoading ? 'Ändert...' : '🔒 Passwort ändern'}
            </button>
          </form>
        )}

        {/* ── Account löschen ── */}
        {activeSection === 'delete' && (
          <div className="profile-form">
            <div className="delete-warning">
              <h3>⚠️ Achtung</h3>
              <p>
                Diese Aktion ist <strong>nicht rückgängig zu machen</strong>. Dein Account und alle gespeicherten Profildaten werden dauerhaft gelöscht.
              </p>
            </div>

            {!showDeleteConfirm ? (
              <button className="btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                🗑️ Account löschen
              </button>
            ) : (
              <form onSubmit={handleDeleteAccount}>
                {deleteError && <div className="profile-error">{deleteError}</div>}
                <div className="form-group">
                  <label>Passwort zur Bestätigung eingeben</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Dein Passwort"
                    required
                    autoFocus
                  />
                </div>
                <div className="delete-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                  >
                    Abbrechen
                  </button>
                  <button type="submit" className="btn-danger" disabled={deleteLoading}>
                    {deleteLoading ? 'Löscht...' : '🗑️ Endgültig löschen'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default Profile;
