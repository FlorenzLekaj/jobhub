import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, onSnapshot, orderBy, query,
  updateDoc, arrayUnion, arrayRemove, doc,
  addDoc, increment, deleteDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import Auth from './Auth';
import CreateJob from './CreateJob';
import CreatePost from './CreatePost';
import AnimatedContent from './AnimatedContent';
import Profile from './Profile';
import './App.css';

// ─── Hilfsfunktion Zeit ───────────────────────────────────────────────────────
function getTimeAgo(dateString) {
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
}

// ─── Avatar Component ─────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#ff6b6b', '#ffa94d', '#ffd43b', '#a9e34b',
  '#40c057', '#0ca678', '#00ff80', '#15aabf', '#748ffc', '#cc5de8'
];

function Avatar({ name, size = 34 }) {
  const label = name || '?';
  const hash = label.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const initials = label.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: `${color}22`,
        border: `1.5px solid ${color}50`,
        color: color,
        fontSize: Math.round(size * 0.38)
      }}
    >
      {initials}
    </div>
  );
}

// ─── Notification Bell ────────────────────────────────────────────────────────
function NotificationBell({ notifications, onOpen, onMarkRead, isOpen }) {
  const unreadCount = notifications.filter(n => !n.read).length;
  const getIcon = (type) => {
    if (type === 'like_post' || type === 'like_job') return '❤️';
    if (type === 'reply') return '💬';
    if (type === 'application') return '📋';
    return '🔔';
  };

  return (
    <div className="notif-wrapper" onClick={e => e.stopPropagation()}>
      <button className="notif-bell" onClick={onOpen} aria-label="Benachrichtigungen">
        🔔
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Benachrichtigungen</span>
            {unreadCount > 0 && (
              <button className="notif-mark-read" onClick={onMarkRead}>Alle gelesen</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <span>🔕</span>
              <p>Keine Benachrichtigungen</p>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.slice(0, 15).map(n => (
                <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                  <span className="notif-icon">{getIcon(n.type)}</span>
                  <div className="notif-content">
                    <span className="notif-message">{n.message}</span>
                    <span className="notif-time">{getTimeAgo(n.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PostCard mit Replies, Likes, Edit & Delete ───────────────────────────────
function PostCard({ post, currentUser, onLike, onDelete, onEdit }) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');

  const isOwner = post.userId === currentUser.uid;
  const isLiked = post.likes && post.likes.includes(currentUser.uid);
  const likeCount = post.likes ? post.likes.length : 0;
  const replyCount = post.replies || 0;

  useEffect(() => {
    if (!showReplies) return;
    const q = query(collection(db, 'posts', post.id, 'replies'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setReplies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [showReplies, post.id]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      const userName = currentUser.displayName || currentUser.email.split('@')[0];
      await addDoc(collection(db, 'posts', post.id, 'replies'), {
        content: replyText,
        userId: currentUser.uid,
        userName,
        createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'posts', post.id), { replies: increment(1) });
      // Benachrichtigung für Post-Besitzer
      if (post.userId && post.userId !== currentUser.uid) {
        await addDoc(collection(db, 'users', post.userId, 'notifications'), {
          type: 'reply',
          message: `${userName} hat auf deinen Post geantwortet`,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
      setReplyText('');
    } catch (err) { console.error(err); }
    setReplyLoading(false);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    await onEdit(post.id, editContent);
    setIsEditing(false);
  };

  const getCategoryIcon = (cat) =>
    cat === 'frage' ? '❓' : cat === 'suche' ? '🔍' : '💡';

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-author">
          <Avatar name={post.userName} size={36} />
          <div className="post-author-info">
            <strong>{post.userName}</strong>
            <span className="post-category">
              {getCategoryIcon(post.category)} {post.category}
            </span>
          </div>
        </div>
        <div className="post-meta-right">
          <span className="post-time">{getTimeAgo(post.createdAt)}</span>
          {post.editedAt && <span className="post-edited">bearbeitet</span>}
          {isOwner && !isEditing && (
            <div className="owner-actions">
              <button
                className="action-btn edit-btn"
                title="Bearbeiten"
                onClick={() => { setIsEditing(true); setEditContent(post.content); }}
              >✏️</button>
              <button
                className="action-btn delete-btn"
                title="Löschen"
                onClick={() => onDelete(post.id)}
              >🗑️</button>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="edit-area">
          <textarea
            className="edit-textarea"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div className="edit-actions">
            <button className="btn-cancel-sm" onClick={() => setIsEditing(false)}>Abbrechen</button>
            <button
              className="btn-save-sm"
              onClick={handleSaveEdit}
              disabled={!editContent.trim()}
            >Speichern</button>
          </div>
        </div>
      ) : (
        <p className="post-content">{post.content}</p>
      )}

      <div className="post-footer">
        <button
          className={`reply-btn ${showReplies ? 'active' : ''}`}
          onClick={() => setShowReplies(!showReplies)}
        >
          💬 {replyCount} {replyCount === 1 ? 'Antwort' : 'Antworten'}
        </button>
        <button
          className={`like-btn ${isLiked ? 'liked' : ''}`}
          onClick={() => onLike(post.id, isLiked, post.userId)}
        >
          {isLiked ? '❤️' : '🤍'} {likeCount > 0 ? likeCount : ''}
        </button>
      </div>

      {showReplies && (
        <div className="replies-section">
          {replies.length > 0 && (
            <div className="replies-list">
              {replies.map(r => (
                <div key={r.id} className="reply-item">
                  <div className="reply-header">
                    <div className="reply-author">
                      <Avatar name={r.userName} size={26} />
                      <strong>{r.userName}</strong>
                    </div>
                    <span>{getTimeAgo(r.createdAt)}</span>
                  </div>
                  <p>{r.content}</p>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleReply} className="reply-form">
            <Avatar
              name={currentUser.displayName || currentUser.email.split('@')[0]}
              size={28}
            />
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Antwort schreiben..."
              maxLength={300}
            />
            <button type="submit" disabled={replyLoading || !replyText.trim()}>
              {replyLoading ? '...' : '↑'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) =>
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  // ── Benachrichtigung erstellen ──
  const createNotification = async (targetUserId, type, message) => {
    if (!targetUserId || targetUserId === user.uid) return;
    try {
      await addDoc(collection(db, 'users', targetUserId, 'notifications'), {
        type, message, read: false, createdAt: new Date().toISOString()
      });
    } catch (e) { console.error('Notif error:', e); }
  };

  // ── Like Handlers ──
  const handleLikePost = async (postId, isLiked, postUserId) => {
    await updateDoc(doc(db, 'posts', postId), {
      likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
    if (!isLiked) {
      const name = user.displayName || user.email.split('@')[0];
      createNotification(postUserId, 'like_post', `${name} hat deinen Post geliket`);
    }
  };

  const handleLikeJob = async (jobId, isLiked, jobUserId) => {
    await updateDoc(doc(db, 'jobs', jobId), {
      likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
    if (!isLiked) {
      const name = user.displayName || user.email.split('@')[0];
      createNotification(jobUserId, 'like_job', `${name} hat dein Inserat geliket`);
    }
  };

  // ── Delete Handlers ──
  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Inserat wirklich löschen?')) return;
    await deleteDoc(doc(db, 'jobs', jobId));
    if (selectedJob?.id === jobId) setSelectedJob(null);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Post wirklich löschen?')) return;
    await deleteDoc(doc(db, 'posts', postId));
  };

  // ── Edit Post ──
  const handleEditPost = async (postId, content) => {
    await updateDoc(doc(db, 'posts', postId), {
      content,
      editedAt: new Date().toISOString()
    });
  };

  // ── Bewerben ──
  const handleApply = async (jobId, jobUserId, data) => {
    await addDoc(collection(db, 'jobs', jobId, 'applications'), {
      ...data,
      applicantId: user.uid,
      createdAt: new Date().toISOString()
    });
    createNotification(
      jobUserId, 'application',
      `${data.name} hat sich auf dein Inserat beworben`
    );
  };

  // ── Notifications: alle als gelesen markieren ──
  const handleMarkNotificationsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(
      unread.map(n =>
        updateDoc(doc(db, 'users', user.uid, 'notifications', n.id), { read: true })
      )
    );
  };

  const handleOpenNotifications = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) {
      setTimeout(() => handleMarkNotificationsRead(), 2000);
    }
  };

  const handleHeroSearch = (q) => {
    setSearchQuery(q);
    setCurrentPage('jobs');
    setMobileMenuOpen(false);
  };

  const navigate = (page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    setShowNotifications(false);
  };

  const userName = user?.displayName || user?.email?.split('@')[0] || '';

  if (loading) return <div className="loading"><span>⚡</span> EVJobs.ch lädt...</div>;
  if (!user) return <Auth onLogin={() => setUser(auth.currentUser)} />;

  return (
    <div className="App" onClick={() => setShowNotifications(false)}>
      <header className="header">
        <div className="container">
          <h1 className="logo" onClick={() => navigate('home')}>⚡ EVJobs.ch</h1>

          {/* Desktop Nav */}
          <nav className="nav-desktop">
            <button onClick={() => navigate('home')} className={currentPage === 'home' ? 'active' : ''}>Home</button>
            <button onClick={() => navigate('jobs')} className={currentPage === 'jobs' ? 'active' : ''}>Jobs</button>
            <button onClick={() => navigate('community')} className={currentPage === 'community' ? 'active' : ''}>Community</button>
          </nav>

          {/* Header rechts: Bell + Avatar + Logout */}
          <div className="header-right" onClick={e => e.stopPropagation()}>
            <NotificationBell
              notifications={notifications}
              onOpen={handleOpenNotifications}
              onMarkRead={handleMarkNotificationsRead}
              isOpen={showNotifications}
            />
            <button
              className="avatar-btn"
              onClick={() => setShowProfile(true)}
              title={`Profil: ${userName}`}
            >
              <Avatar name={userName} size={34} />
            </button>
            <button onClick={() => signOut(auth)} className="btn-logout">Logout</button>
          </div>

          {/* Hamburger */}
          <button
            className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menü"
          >
            <span /><span /><span />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <button onClick={() => navigate('home')} className={currentPage === 'home' ? 'active' : ''}>🏠 Home</button>
            <button onClick={() => navigate('jobs')} className={currentPage === 'jobs' ? 'active' : ''}>💼 Jobs</button>
            <button onClick={() => navigate('community')} className={currentPage === 'community' ? 'active' : ''}>🔋 Community</button>
            <button onClick={() => { setShowProfile(true); setMobileMenuOpen(false); }}>👤 Profil ({userName})</button>
            <button onClick={() => signOut(auth)} className="mobile-logout">Logout</button>
          </div>
        )}
      </header>

      <main className="main">
        {currentPage === 'home' && (
          <HomePage
            onCreateJob={() => setShowCreateJob(true)}
            onGoToJobs={() => navigate('jobs')}
            onSearch={handleHeroSearch}
            jobCount={jobs.length}
            postCount={posts.length}
          />
        )}
        {currentPage === 'jobs' && (
          <JobsPage
            jobs={jobs}
            currentUser={user}
            onCreateJob={() => setShowCreateJob(true)}
            onSelectJob={setSelectedJob}
            onLikeJob={handleLikeJob}
            onDeleteJob={handleDeleteJob}
            onEditJob={(job) => setEditingJob(job)}
            initialSearch={searchQuery}
            onClearSearch={() => setSearchQuery('')}
          />
        )}
        {currentPage === 'community' && (
          <CommunityPage
            posts={posts}
            currentUser={user}
            onCreatePost={() => setShowCreatePost(true)}
            onLikePost={handleLikePost}
            onDeletePost={handleDeletePost}
            onEditPost={handleEditPost}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <span className="footer-logo">⚡ EVJobs.ch</span>
          <span className="footer-tagline">Die #1 Plattform für eMobility Jobs in der Schweiz</span>
        </div>
      </footer>

      {/* Modals */}
      {showCreateJob && (
        <CreateJob
          onClose={() => setShowCreateJob(false)}
          onJobCreated={() => setShowCreateJob(false)}
        />
      )}
      {editingJob && (
        <CreateJob
          onClose={() => setEditingJob(null)}
          onJobCreated={() => setEditingJob(null)}
          editJob={editingJob}
        />
      )}
      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onPostCreated={() => setShowCreatePost(false)}
        />
      )}
      {showProfile && <Profile onClose={() => setShowProfile(false)} />}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          currentUser={user}
          onClose={() => setSelectedJob(null)}
          onApply={handleApply}
          onEdit={() => { setEditingJob(selectedJob); setSelectedJob(null); }}
          onDelete={() => handleDeleteJob(selectedJob.id)}
        />
      )}
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({ onCreateJob, onGoToJobs, onSearch, jobCount, postCount }) {
  const [heroSearch, setHeroSearch] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(heroSearch);
  };

  return (
    <div className="container home">
      <div className="hero">
        <AnimatedContent distance={50} duration={1} delay={0}>
          <h2>Die #1 Plattform für<br /><span>eMobility Jobs.</span></h2>
        </AnimatedContent>
        <AnimatedContent distance={50} duration={1} delay={0.15}>
          <p>Finde deinen nächsten Job in der Elektromobilitäts-Branche der Schweiz.</p>
        </AnimatedContent>

        <AnimatedContent distance={30} duration={0.9} delay={0.25}>
          <form className="hero-search" onSubmit={handleSearchSubmit}>
            <div className="hero-search-inner">
              <span className="hero-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Job, Firma oder Kanton suchen..."
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
              />
              <button type="submit" className="hero-search-btn">Suchen</button>
            </div>
          </form>
        </AnimatedContent>

        <AnimatedContent distance={20} duration={0.8} delay={0.35}>
          <div className="hero-stats">
            <span>⚡ <strong>{jobCount}</strong> aktuelle Jobs</span>
            <span className="stats-divider">·</span>
            <span>🔋 <strong>{postCount}</strong> Community Posts</span>
            <span className="stats-divider">·</span>
            <span>🇨🇭 Schweiz</span>
          </div>
        </AnimatedContent>

        <AnimatedContent distance={30} duration={0.8} delay={0.45}>
          <div className="hero-buttons">
            <button className="btn-primary btn-large hero-btn" onClick={onGoToJobs}>Alle Jobs ansehen</button>
            <button className="btn-secondary btn-large hero-btn" onClick={onCreateJob}>Job inserieren</button>
          </div>
        </AnimatedContent>
      </div>

      <div className="features">
        <AnimatedContent distance={50} duration={0.8} delay={0}>
          <div className="feature-card" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`); }}>
            <div className="feature-icon">⚡</div>
            <h3>EV Jobs finden</h3>
            <p>Alle eMobility Jobs der Schweiz an einem Ort – gefiltert und aktuell.</p>
          </div>
        </AnimatedContent>
        <AnimatedContent distance={50} duration={0.8} delay={0.15}>
          <div className="feature-card" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`); }}>
            <div className="feature-icon">🔋</div>
            <h3>Community</h3>
            <p>Vernetze dich mit eMobility-Profis, stelle Fragen, teile Wissen.</p>
          </div>
        </AnimatedContent>
        <AnimatedContent distance={50} duration={0.8} delay={0.3}>
          <div className="feature-card" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`); }}>
            <div className="feature-icon">🚗</div>
            <h3>Nur eMobility</h3>
            <p>Keine irrelevanten Inserate – nur deine Branche, nur relevante Stellen.</p>
          </div>
        </AnimatedContent>
      </div>
    </div>
  );
}

// ─── Jobs Page ────────────────────────────────────────────────────────────────
const STELLENART_OPTIONS = ['Alle', 'Vollzeit', 'Teilzeit', 'Hybrid', 'Remote', 'Praktikum', 'Lehrstelle'];
const PENSUM_OPTIONS = ['Alle', '100%', '80–100%', '60–80%', '40–60%', '< 40%'];

function JobsPage({ jobs, currentUser, onCreateJob, onSelectJob, onLikeJob, onDeleteJob, onEditJob, initialSearch, onClearSearch }) {
  const [type, setType] = useState('all');
  const [search, setSearch] = useState(initialSearch || '');
  const [stellenart, setStellenart] = useState('Alle');
  const [pensum, setPensum] = useState('Alle');

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  const filtered = jobs.filter(job => {
    if (type !== 'all' && job.type !== type) return false;
    if (stellenart !== 'Alle' && job.stellenart !== stellenart) return false;
    if (pensum !== 'Alle' && job.pensum !== pensum) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        job.title?.toLowerCase().includes(s) ||
        job.company?.toLowerCase().includes(s) ||
        job.location?.toLowerCase().includes(s) ||
        job.description?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const clearAll = () => {
    setSearch('');
    setType('all');
    setStellenart('Alle');
    setPensum('Alle');
    onClearSearch();
  };

  const hasFilters = search || type !== 'all' || stellenart !== 'Alle' || pensum !== 'Alle';

  return (
    <div className="container">
      <div className="page-header">
        <h2>Aktuelle Jobs</h2>
        <button className="btn-primary" onClick={onCreateJob}>+ Inserat erstellen</button>
      </div>

      {/* Suchleiste */}
      <div className="jobs-search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Job, Firma oder Kanton suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && <button className="search-clear" onClick={() => { setSearch(''); onClearSearch(); }}>✕</button>}
      </div>

      {/* Filter-Leiste */}
      <div className="filters-bar">
        <div className="filter-group">
          <span className="filter-label">Art:</span>
          {[['all', 'Alle'], ['biete', '📢 Biete'], ['suche', '🔍 Suche']].map(([val, label]) => (
            <button key={val} className={`filter-chip ${type === val ? 'active' : ''}`} onClick={() => setType(val)}>{label}</button>
          ))}
        </div>
        <div className="filter-group">
          <span className="filter-label">Stellenart:</span>
          {STELLENART_OPTIONS.map(o => (
            <button key={o} className={`filter-chip ${stellenart === o ? 'active' : ''}`} onClick={() => setStellenart(o)}>{o}</button>
          ))}
        </div>
        <div className="filter-group">
          <span className="filter-label">Pensum:</span>
          {PENSUM_OPTIONS.map(o => (
            <button key={o} className={`filter-chip ${pensum === o ? 'active' : ''}`} onClick={() => setPensum(o)}>{o}</button>
          ))}
        </div>
      </div>

      {/* Ergebnis-Info */}
      <div className="results-bar">
        <span className="results-count">{filtered.length} {filtered.length === 1 ? 'Inserat' : 'Inserate'}</span>
        {hasFilters && <button className="clear-filters" onClick={clearAll}>Filter zurücksetzen</button>}
      </div>

      <div className="jobs-grid">
        {filtered.length === 0 ? (
          <div className="empty-state-box">
            <p>🔍</p>
            <p>Keine Inserate gefunden.</p>
            <button className="btn-secondary" onClick={clearAll}>Filter zurücksetzen</button>
          </div>
        ) : (
          filtered.map(job => {
            const isOwner = job.userId === currentUser.uid;
            const isLiked = job.likes && job.likes.includes(currentUser.uid);
            const likeCount = job.likes ? job.likes.length : 0;
            return (
              <div key={job.id} className="job-card" onClick={() => onSelectJob(job)}>
                <div className="job-header">
                  <span className={`job-type ${job.type}`}>
                    {job.type === 'biete' ? '📢 Biete' : '🔍 Suche'}
                  </span>
                  <span className="job-location">📍 {job.location}</span>
                </div>
                <h3>{job.title}</h3>
                <p className="job-company">{job.company}</p>

                <div className="job-badges">
                  {job.stellenart && <span className="job-badge">{job.stellenart}</span>}
                  {job.pensum && <span className="job-badge pensum">{job.pensum}</span>}
                  {job.createdAt && <span className="job-badge time">{getTimeAgo(job.createdAt)}</span>}
                </div>

                <p className="job-description">{job.description}</p>

                <div className="job-card-footer">
                  <button
                    className="btn-secondary btn-details"
                    onClick={(e) => { e.stopPropagation(); onSelectJob(job); }}
                  >Details ansehen</button>

                  <div className="job-card-actions">
                    {isOwner && (
                      <>
                        <button
                          className="action-btn edit-btn"
                          title="Bearbeiten"
                          onClick={(e) => { e.stopPropagation(); onEditJob(job); }}
                        >✏️</button>
                        <button
                          className="action-btn delete-btn"
                          title="Löschen"
                          onClick={(e) => { e.stopPropagation(); onDeleteJob(job.id); }}
                        >🗑️</button>
                      </>
                    )}
                    <button
                      className={`like-btn-job ${isLiked ? 'liked' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onLikeJob(job.id, isLiked, job.userId); }}
                    >
                      {isLiked ? '❤️' : '🤍'} {likeCount > 0 ? likeCount : ''}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Community Page ───────────────────────────────────────────────────────────
const COMMUNITY_CATEGORIES = [
  ['alle', '📋 Alle'],
  ['frage', '❓ Fragen'],
  ['suche', '🔍 Suche'],
  ['tipp', '💡 Tipps']
];

function CommunityPage({ posts, currentUser, onCreatePost, onLikePost, onDeletePost, onEditPost }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('alle');

  const filtered = posts.filter(post => {
    if (category !== 'alle' && post.category !== category) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        post.content?.toLowerCase().includes(s) ||
        post.userName?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h2>Community</h2>
          <p className="subtitle">Nur für eMobility Profis!</p>
        </div>
        <button className="btn-primary" onClick={onCreatePost}>+ Post erstellen</button>
      </div>

      {/* Community Suche & Filter */}
      <div className="community-search-section">
        <div className="jobs-search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Posts durchsuchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <div className="community-filter-row">
          {COMMUNITY_CATEGORIES.map(([val, label]) => (
            <button
              key={val}
              className={`filter-chip ${category === val ? 'active' : ''}`}
              onClick={() => setCategory(val)}
            >{label}</button>
          ))}
          {(search || category !== 'alle') && (
            <span className="results-count" style={{ marginLeft: 'auto' }}>
              {filtered.length} {filtered.length === 1 ? 'Post' : 'Posts'}
            </span>
          )}
        </div>
      </div>

      <div className="community-posts">
        {filtered.length === 0 ? (
          <div className="empty-state-box" style={{ gridColumn: 'unset' }}>
            <p>💬</p>
            <p>Keine Posts gefunden.</p>
          </div>
        ) : (
          filtered.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onLike={onLikePost}
              onDelete={onDeletePost}
              onEdit={onEditPost}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Job Detail Modal ─────────────────────────────────────────────────────────
function JobDetailModal({ job, currentUser, onClose, onApply, onEdit, onDelete }) {
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyName, setApplyName] = useState(currentUser.displayName || '');
  const [applyEmail, setApplyEmail] = useState(currentUser.email || '');
  const [applyMessage, setApplyMessage] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const isOwner = job.userId === currentUser.uid;

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyLoading(true);
    try {
      await onApply(job.id, job.userId, {
        name: applyName,
        email: applyEmail,
        message: applyMessage
      });
      setApplySuccess(true);
    } catch (err) { console.error(err); }
    setApplyLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content job-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className={`job-type ${job.type}`} style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>
            {job.type === 'biete' ? '📢 Biete Job' : '🔍 Suche Job'}
          </span>
          <div className="modal-header-actions">
            {isOwner && (
              <>
                <button className="action-btn edit-btn" title="Bearbeiten" onClick={onEdit}>✏️ Bearbeiten</button>
                <button className="action-btn delete-btn" title="Löschen" onClick={onDelete}>🗑️</button>
              </>
            )}
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="job-detail-body">
          <h2 className="job-detail-title">{job.title}</h2>
          <div className="job-detail-meta">
            <span className="job-detail-company">🏢 {job.company}</span>
            <span>📍 {job.location}</span>
            {job.stellenart && <span>💼 {job.stellenart}</span>}
            {job.pensum && <span>⏱ {job.pensum}</span>}
            {job.createdAt && <span>🕐 {getTimeAgo(job.createdAt)}</span>}
          </div>
          <div className="job-detail-divider" />
          <div className="job-detail-description">
            <h4>Beschreibung</h4>
            <p>{job.description}</p>
          </div>
          <div className="job-detail-contact">
            <p>📧 Kontakt: <span>{job.userEmail}</span></p>
          </div>

          {/* Bewerben-Bereich */}
          {job.type === 'biete' && !isOwner && (
            <div className="apply-section">
              {applySuccess ? (
                <div className="apply-success">
                  ✅ Bewerbung erfolgreich gesendet! Der Inserent wird informiert.
                </div>
              ) : !showApplyForm ? (
                <button className="btn-apply" onClick={() => setShowApplyForm(true)}>
                  📋 Jetzt bewerben
                </button>
              ) : (
                <form className="apply-form" onSubmit={handleApplySubmit}>
                  <h4 className="apply-form-title">Bewerbung einreichen</h4>
                  <div className="apply-form-grid">
                    <div className="apply-field">
                      <label>Name</label>
                      <input
                        type="text"
                        value={applyName}
                        onChange={(e) => setApplyName(e.target.value)}
                        placeholder="Dein vollständiger Name"
                        required
                      />
                    </div>
                    <div className="apply-field">
                      <label>Email</label>
                      <input
                        type="email"
                        value={applyEmail}
                        onChange={(e) => setApplyEmail(e.target.value)}
                        placeholder="deine@email.ch"
                        required
                      />
                    </div>
                  </div>
                  <div className="apply-field">
                    <label>Motivationsschreiben</label>
                    <textarea
                      value={applyMessage}
                      onChange={(e) => setApplyMessage(e.target.value)}
                      placeholder="Warum bist du der richtige Kandidat? Was bringst du mit?"
                      rows={4}
                      required
                    />
                  </div>
                  <div className="apply-form-actions">
                    <button
                      type="button"
                      className="btn-cancel-sm"
                      onClick={() => setShowApplyForm(false)}
                    >Abbrechen</button>
                    <button type="submit" className="btn-apply-submit" disabled={applyLoading}>
                      {applyLoading ? 'Wird gesendet...' : '✓ Bewerbung senden'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
