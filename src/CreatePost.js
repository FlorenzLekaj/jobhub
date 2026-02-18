import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import './CreatePost.css';

function CreatePost({ onClose, onPostCreated }) {
  const [category, setCategory] = useState('frage');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const postData = {
        category,
        content,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        replies: 0,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'posts'), postData);
      
      onPostCreated(postData);
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
          <h2>Post erstellen</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Kategorie</label>
            <div className="type-selector">
              <button
                type="button"
                className={category === 'frage' ? 'active' : ''}
                onClick={() => setCategory('frage')}
              >
                ❓ Frage
              </button>
              <button
                type="button"
                className={category === 'suche' ? 'active' : ''}
                onClick={() => setCategory('suche')}
              >
                🔍 Suche Info
              </button>
              <button
                type="button"
                className={category === 'tipp' ? 'active' : ''}
                onClick={() => setCategory('tipp')}
              >
                💡 Tipp
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Dein Post (nur jobbezogen!)</label>
            <textarea
              placeholder="z.B. Hat jemand Erfahrung mit Bewerbungen bei Google Schweiz?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows="6"
              maxLength="500"
            />
            <span className="char-count">{content.length}/500</span>
          </div>

          <div className="info-box">
            ℹ️ Denk dran: Nur Posts über Jobs, Bewerbungen und Karriere sind erlaubt!
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Wird gepostet...' : 'Post erstellen'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreatePost;