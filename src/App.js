import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import Auth from './Auth';
import CreateJob from './CreateJob';
import CreatePost from './CreatePost';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        loadJobs();
        loadPosts();
      }
    });
    return unsubscribe;
  }, []);

  const loadJobs = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'jobs'));
      const jobsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobsData);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    }
  };

  const loadPosts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'posts'));
      const postsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    }
  };

  const handleJobCreated = (newJob) => {
    setJobs([{ ...newJob, id: Date.now() }, ...jobs]);
  };

  const handlePostCreated = (newPost) => {
    setPosts([{ ...newPost, id: Date.now() }, ...posts]);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return <div className="loading">Lädt...</div>;
  }

  if (!user) {
    return <Auth onLogin={() => setUser(auth.currentUser)} />;
  }

  return (
    <div className="App">
      <header className="header">
        <div className="container">
          <h1 className="logo">⚡ EVJobs.ch</h1>
          <nav>
            <button onClick={() => setCurrentPage('home')} className={currentPage === 'home' ? 'active' : ''}>
              Home
            </button>
            <button onClick={() => setCurrentPage('jobs')} className={currentPage === 'jobs' ? 'active' : ''}>
              Jobs
            </button>
            <button onClick={() => setCurrentPage('community')} className={currentPage === 'community' ? 'active' : ''}>
              Community
            </button>
            <button onClick={handleLogout} className="btn-primary">Logout</button>
          </nav>
        </div>
      </header>

      <main className="main">
        {currentPage === 'home' && <HomePage onCreateJob={() => setShowCreateJob(true)} />}
        {currentPage === 'jobs' && <JobsPage jobs={jobs} onCreateJob={() => setShowCreateJob(true)} />}
        {currentPage === 'community' && <CommunityPage posts={posts} onCreatePost={() => setShowCreatePost(true)} />}
      </main>

      {showCreateJob && (
        <CreateJob
          onClose={() => setShowCreateJob(false)}
          onJobCreated={handleJobCreated}
        />
      )}

      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
}

function HomePage({ onCreateJob }) {
  return (
    <div className="container home">
      <div className="hero">
        <h2>Die #1 Plattform für<br/><span>eMobility Jobs.</span></h2>
        <p>Finde Jobs in der eMobility Branche oder lass dich finden.</p>
        <div className="hero-buttons">
          <button className="btn-primary btn-large">Job suchen</button>
          <button className="btn-secondary btn-large" onClick={onCreateJob}>Job posten</button>
        </div>
      </div>

      <div className="features">
        <div className="feature-card">
          <h3>⚡ EV Jobs finden</h3>
          <p>Alle eMobility Jobs der Schweiz an einem Ort</p>
        </div>
        <div className="feature-card">
          <h3>🔋 Community</h3>
          <p>Vernetze dich mit eMobility Profis</p>
        </div>
        <div className="feature-card">
          <h3>🚗 Nur eMobility</h3>
          <p>Keine irrelevanten Jobs - nur deine Branche</p>
        </div>
      </div>
    </div>
  );
}

function JobsPage({ jobs, onCreateJob }) {
  const [filter, setFilter] = useState('all');

  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true;
    return job.type === filter;
  });

  return (
    <div className="container">
      <div className="page-header">
        <h2>Aktuelle Jobs</h2>
        <button className="btn-primary" onClick={onCreateJob}>+ Job erstellen</button>
      </div>

      <div className="filters">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          Alle
        </button>
        <button className={`filter-btn ${filter === 'biete' ? 'active' : ''}`} onClick={() => setFilter('biete')}>
          Biete Job
        </button>
        <button className={`filter-btn ${filter === 'suche' ? 'active' : ''}`} onClick={() => setFilter('suche')}>
          Suche Job
        </button>
      </div>

      <div className="jobs-grid">
        {filteredJobs.length === 0 ? (
          <p className="empty-state">Noch keine Jobs vorhanden. Erstelle den ersten!</p>
        ) : (
          filteredJobs.map(job => (
            <div key={job.id} className="job-card">
              <div className="job-header">
                <span className={`job-type ${job.type}`}>
                  {job.type === 'biete' ? '📢 Biete' : '🔍 Suche'}
                </span>
                <span className="job-location">📍 {job.location}</span>
              </div>
              <h3>{job.title}</h3>
              <p className="job-company">{job.company}</p>
              <p className="job-description">{job.description}</p>
              <button className="btn-secondary">Details ansehen</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CommunityPage({ posts, onCreatePost }) {
  const getCategoryIcon = (category) => {
    if (category === 'frage') return '❓';
    if (category === 'suche') return '🔍';
    return '💡';
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const posted = new Date(dateString);
    const diffMs = now - posted;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `vor ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h2>Community</h2>
          <p className="subtitle">Nur für eMobility Profis!</p>
        </div>
        <button className="btn-primary" onClick={onCreatePost}>+ Post erstellen</button>
      </div>

      <div className="community-posts">
        {posts.length === 0 ? (
          <p className="empty-state">Noch keine Posts. Sei der Erste!</p>
        ) : (
          posts.map(post => (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <div>
                  <strong>{post.userName}</strong>
                  <span className="post-category">{getCategoryIcon(post.category)} {post.category}</span>
                </div>
                <span>{getTimeAgo(post.createdAt)}</span>
              </div>
              <p>{post.content}</p>
              <div className="post-footer">
                <button>💬 {post.replies || 0} Antworten</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;