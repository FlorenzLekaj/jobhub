import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import './CreateJob.css';

const SWISS_CANTONS = [
  'Aargau', 'Appenzell Ausserrhoden', 'Appenzell Innerrhoden', 'Basel-Landschaft',
  'Basel-Stadt', 'Bern', 'Fribourg', 'Genf', 'Glarus', 'Graubünden', 'Jura',
  'Luzern', 'Neuenburg', 'Nidwalden', 'Obwalden', 'Schaffhausen', 'Schwyz',
  'Solothurn', 'St. Gallen', 'Tessin', 'Thurgau', 'Uri', 'Waadt', 'Wallis',
  'Zug', 'Zürich', 'Remote / Homeoffice'
];

function CreateJob({ onClose, onJobCreated, editJob }) {
  const isEditing = !!editJob;

  const [type, setType]           = useState(editJob?.type       || 'biete');
  const [title, setTitle]         = useState(editJob?.title      || '');
  const [company, setCompany]     = useState(editJob?.company    || '');
  const [location, setLocation]   = useState(editJob?.location   || '');
  const [stellenart, setStellenart] = useState(editJob?.stellenart || 'Vollzeit');
  const [pensum, setPensum]       = useState(editJob?.pensum     || '100%');
  const [description, setDescription] = useState(editJob?.description || '');
  const [loading, setLoading]     = useState(false);

  // Falls editJob sich ändert, Felder neu befüllen
  useEffect(() => {
    if (editJob) {
      setType(editJob.type || 'biete');
      setTitle(editJob.title || '');
      setCompany(editJob.company || '');
      setLocation(editJob.location || '');
      setStellenart(editJob.stellenart || 'Vollzeit');
      setPensum(editJob.pensum || '100%');
      setDescription(editJob.description || '');
    }
  }, [editJob]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const jobData = {
        type, title, company, location, stellenart, pensum, description,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
      };

      if (isEditing) {
        await updateDoc(doc(db, 'jobs', editJob.id), {
          ...jobData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'jobs'), {
          ...jobData,
          createdAt: new Date().toISOString()
        });
      }
      onJobCreated();
      onClose();
    } catch (error) {
      alert('Fehler: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? '✏️ Inserat bearbeiten' : `Job ${type === 'biete' ? 'ausschreiben' : 'suchen'}`}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Art des Inserats</label>
            <div className="type-selector">
              <button type="button" className={type === 'biete' ? 'active' : ''} onClick={() => setType('biete')}>📢 Biete Job</button>
              <button type="button" className={type === 'suche' ? 'active' : ''} onClick={() => setType('suche')}>🔍 Suche Job</button>
            </div>
          </div>

          <div className="form-group">
            <label>Jobtitel</label>
            <input type="text" placeholder="z.B. EV Techniker / Battery Engineer" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>{type === 'biete' ? 'Firma / Unternehmen' : 'Dein Name'}</label>
            <input type="text" placeholder={type === 'biete' ? 'Firmenname' : 'Dein Name'} value={company} onChange={(e) => setCompany(e.target.value)} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Standort / Kanton</label>
              <select value={location} onChange={(e) => setLocation(e.target.value)} required>
                <option value="">Kanton wählen...</option>
                {SWISS_CANTONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Stellenart</label>
              <select value={stellenart} onChange={(e) => setStellenart(e.target.value)}>
                {['Vollzeit', 'Teilzeit', 'Hybrid', 'Remote', 'Praktikum', 'Lehrstelle'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Pensum</label>
            <div className="pensum-selector">
              {['< 40%', '40–60%', '60–80%', '80–100%', '100%'].map(p => (
                <button key={p} type="button" className={pensum === p ? 'active' : ''} onClick={() => setPensum(p)}>{p}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Beschreibung</label>
            <textarea placeholder="Beschreibe den Job, die Anforderungen, was du mitbringst..." value={description} onChange={(e) => setDescription(e.target.value)} required rows="5" />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Speichert...' : isEditing ? '✓ Änderungen speichern' : '✓ Inserat erstellen'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateJob;
