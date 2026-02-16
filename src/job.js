import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import './CreateJob.css';

function CreateJob({ onClose, onJobCreated }) {
  const [type, setType] = useState('biete');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const jobData = {
        type,
        title,
        company,
        location,
        description,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'jobs'), jobData);
      
      onJobCreated(jobData);
      onClose();
    } catch (error) {
      alert('Fehler beim Erstellen: ' + error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Job erstellen</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Art des Posts</label>
            <div className="type-selector">
              <button
                type="button"
                className={type === 'biete' ? 'active' : ''}
                onClick={() => setType('biete')}
              >
                📢 Biete Job
              </button>
              <button
                type="button"
                className={type === 'suche' ? 'active' : ''}
                onClick={() => setType('suche')}
              >
                🔍 Suche Job
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Titel</label>
            <input
              type="text"
              placeholder="z.B. Frontend Developer gesucht"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>{type === 'biete' ? 'Firma' : 'Dein Name'}</label>
            <input
              type="text"
              placeholder={type === 'biete' ? 'Firmenname' : 'Dein Name'}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Standort</label>
            <input
              type="text"
              placeholder="z.B. Zürich"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Beschreibung</label>
            <textarea
              placeholder="Beschreibe den Job oder deine Suche..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows="5"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Wird erstellt...' : 'Job erstellen'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateJob;