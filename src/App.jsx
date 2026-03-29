import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User as UserIcon, Shield, Info, ExternalLink, Sparkles, MessageSquare, Bell, Calendar, LogOut, Mail, Phone, Lock, Mic, MicOff, Languages, CheckSquare, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { queryChatbot } from './services/api';
import { fetchGovernmentNotifications } from './services/notifications';
import { LANGUAGES, LANG_NAME_MAP, SPEECH_LANG_MAP, checkEligibility, STATES } from './services/eligibility';
import schemesData from './data/schemes.json';
import './index.css';

const App = () => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([{
    id: 'welcome',
    text: "Namaste! I am SevaBot, your AI guide to Indian Government services and schemes. How can I assist you today?",
    sender: 'bot',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }]);
  const [searchQuery, setSearchQuery] = useState('');
  // — Bhasha Mode —
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  // — Voice Input —
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  // — Eligibility Checker —
  const [showEligibility, setShowEligibility] = useState(false);
  const [eligStep, setEligStep] = useState(0); // 0=wizard, 1=results
  const [eligForm, setEligForm] = useState({ age: '', income: '', gender: 'male', category: 'general', occupation: 'salaried', hasGirlChild: false, state: 'Delhi' });
  const [eligResults, setEligResults] = useState([]);
  const messagesEndRef = useRef(null);

  const suggestedQuestions = [
    "How to apply for PMAY?",
    "PM-JAY eligibility criteria?",
    "Atal Pension Yojana benefits?",
    "Interest rate SSY?",
    "Mudra loan limit?"
  ];


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // — Voice Recognition —
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Voice input not supported in this browser. Use Chrome.'); return; }
    const rec = new SpeechRecognition();
    rec.lang = SPEECH_LANG_MAP[selectedLang.code] || 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setIsListening(false); };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
  }, [selectedLang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const handleSend = async (text = input) => {
    if (!text.trim()) return;

    const userMsgText = text;
    const userMessage = { 
      id: Date.now(), 
      text: userMsgText, 
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await queryChatbot(userMsgText, LANG_NAME_MAP[selectedLang.code] || 'English');
      const botMessage = { 
        id: Date.now() + 1, 
        text: response.answer, 
        sender: 'bot',
        source: response.source,
        isError: !response.success,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = { 
        id: Date.now() + 1, 
        text: "I encountered an error while processing your request. Please try again later.", 
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="app-container">
      <div className="bg-mesh"></div>
      
      <nav className="navbar">
        <a href="/" className="logo">
          <div className="logo-icon"><Shield size={22} color="#fff" /></div>
          <span>SevaBot</span>
        </a>
        <div className="nav-links">
          <a href="#" className="nav-link active">Home</a>
          <button onClick={() => setShowExplorer(true)} className="nav-link-btn">Explore Schemes</button>
          <button onClick={() => setShowAbout(true)} className="nav-link-btn">About</button>
          <button onClick={() => setShowEligibility(true)} className="nav-link-btn" title="Check Eligibility" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#4ade80' }}>
            <CheckSquare size={17} /> Eligibility
          </button>
          {/* Bhasha Language Selector */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowLangMenu(p => !p)} className="nav-link-btn" title="Select Language" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Globe size={17} /> {selectedLang.flag} {selectedLang.label}
            </button>
            <AnimatePresence>
              {showLangMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  style={{ position: 'absolute', top: '140%', right: 0, background: 'rgba(15,23,42,0.98)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem', zIndex: 999, minWidth: '160px', backdropFilter: 'blur(20px)' }}
                >
                  {LANGUAGES.map(lang => (
                    <button key={lang.code} onClick={() => { setSelectedLang(lang); setShowLangMenu(false); }}
                      style={{ width: '100%', background: selectedLang.code === lang.code ? 'rgba(99,102,241,0.15)' : 'transparent', border: 'none', color: selectedLang.code === lang.code ? 'var(--accent)' : 'var(--text-main)', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}
                    >
                      {lang.flag} {lang.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setShowNotifications(true)} className="nav-link-btn" title="Notifications" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <Bell size={20} />
            <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: 'var(--secondary)', width: '8px', height: '8px', borderRadius: '50%', boxShadow: '0 0 5px var(--secondary)' }}></span>
          </button>
          <button onClick={() => setShowProfile(true)} className="nav-link-btn" title="Profile" style={{ display: 'flex', alignItems: 'center' }}>
            {isLoggedIn && user ? (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--secondary))', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                {user.name.charAt(0)}
              </div>
            ) : (
              <UserIcon size={20} />
            )}
          </button>
        </div>
      </nav>




      <main>
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="hero"
        >
          <span className="hero-tag"><Sparkles size={14} style={{ marginRight: '6px' }} /> Smart Governance Intelligence</span>
          <h1>Empowering Citizens through <br /><span style={{color: 'var(--accent)'}}>Digital Intelligence</span></h1>
          <p>Instant answers to your queries on Indian Government schemes. Simplified, accessible, and inclusive by design.</p>
        </motion.section>

        <section className="chat-section">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="chat-container"
          >
            <div className="chat-header">
              <div className="status-dot"></div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.5px' }}>Citizen Support AI</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>Available 24/7 for your assistance</span>
              </div>
            </div>

            <div className="messages-area">
              <AnimatePresence>
                {messages.map((m) => (
                  <motion.div 
                    key={m.id}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className={`message ${m.sender}`}
                    style={m.isError ? { border: '1px solid rgba(255, 87, 87, 0.3)', background: 'rgba(255, 87, 87, 0.05)' } : {}}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.6 }}>
                      {m.sender === 'bot' ? <Bot size={14} /> : <UserIcon size={14} />}
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                        {m.isError ? "SYSTEM ERROR" : m.sender.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 500, marginLeft: 'auto' }}>{m.timestamp}</span>
                    </div>
                    <div style={{ lineHeight: '1.6', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                      {m.text.split('**').map((part, i) => i % 2 === 1 ? <b key={i} style={{ color: 'var(--accent)' }}>{part}</b> : part)}
                    </div>
                    {m.source && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.75rem', opacity: 0.7, fontStyle: 'italic' }}>
                        Source: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{m.source}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="message bot"
                >
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="suggestion-container" style={{ padding: '0 2.5rem', display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem' }}>
              {suggestedQuestions.map((q, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleSend(q)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '100px',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = '#fff'; }}
                  onMouseOut={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = 'var(--text-muted)'; }}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="chat-input-area">
              <input 
                type="text" 
                className="chat-input" 
                placeholder={selectedLang.code === 'en' ? 'Ask your question here...' : `${selectedLang.label} में पूछें...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              {/* Microphone button */}
              <button 
                onClick={isListening ? stopListening : startListening} 
                title={isListening ? 'Stop listening' : 'Speak your question'}
                style={{ background: isListening ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)', border: isListening ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0 1rem', cursor: 'pointer', color: isListening ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'all 0.2s', flexShrink: 0 }}
              >
                {isListening ? <MicOff size={20} style={{ animation: 'pulse 1s infinite' }} /> : <Mic size={20} />}
              </button>
              <button className="send-btn" onClick={() => handleSend()}>
                <Send size={20} />
              </button>
            </div>
          </motion.div>
        </section>
      </main>

      <footer>
        <div style={{ maxWidth: 'var(--container-width)', margin: '0 auto' }}>
          <p style={{ fontWeight: 500 }}>&copy; 2026 SevaBot - Smart India Hackathon Initiative</p>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>Designed for accessibility and digital empowerment.</p>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
            <a href="#" className="nav-link"><Info size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Privacy</a>
            <a href="#" className="nav-link"><ExternalLink size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Portal</a>
            <a href="#" className="nav-link"><MessageSquare size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Contact</a>
          </div>
        </div>
      </footer>

      {/* ========== ELIGIBILITY CHECKER MODAL ========== */}
      <AnimatePresence>
        {showEligibility && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay" onClick={() => { setShowEligibility(false); setEligStep(0); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="modal-content" onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '540px' }}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckSquare size={22} color="#4ade80" />
                  <h2 style={{ margin: 0 }}>{eligStep === 0 ? 'Scheme Eligibility Checker' : 'Your Matching Schemes'}</h2>
                </div>
                <button className="close-btn" onClick={() => { setShowEligibility(false); setEligStep(0); }}>&times;</button>
              </div>

              {eligStep === 0 && (
                <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                    Answer a few quick questions and we'll show you which government schemes you qualify for.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Age (years)</label>
                      <input type="number" min="1" max="100" placeholder="e.g. 28"
                        value={eligForm.age} onChange={(e) => setEligForm(f => ({ ...f, age: e.target.value }))}
                        className="chat-input" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Annual Income (₹)</label>
                      <input type="number" min="0" placeholder="e.g. 300000"
                        value={eligForm.income} onChange={(e) => setEligForm(f => ({ ...f, income: e.target.value }))}
                        className="chat-input" style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gender</label>
                      <select value={eligForm.gender} onChange={(e) => setEligForm(f => ({ ...f, gender: e.target.value }))}
                        className="chat-input" style={{ width: '100%' }}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category</label>
                      <select value={eligForm.category} onChange={(e) => setEligForm(f => ({ ...f, category: e.target.value }))}
                        className="chat-input" style={{ width: '100%' }}>
                        <option value="general">General</option>
                        <option value="obc">OBC</option>
                        <option value="sc">SC</option>
                        <option value="st">ST</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Occupation</label>
                    <select value={eligForm.occupation} onChange={(e) => setEligForm(f => ({ ...f, occupation: e.target.value }))}
                      className="chat-input" style={{ width: '100%' }}>
                      <option value="salaried">Salaried Employee</option>
                      <option value="farmer">Farmer</option>
                      <option value="selfemployed">Self Employed</option>
                      <option value="business">Business Owner</option>
                      <option value="laborer">Daily Wage Laborer</option>
                      <option value="student">Student</option>
                      <option value="unemployed">Unemployed</option>
                    </select>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <input type="checkbox" checked={eligForm.hasGirlChild}
                      onChange={(e) => setEligForm(f => ({ ...f, hasGirlChild: e.target.checked }))}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }} />
                    I have a girl child (under 10 years)
                  </label>

                  <button
                    className="send-btn"
                    disabled={!eligForm.age || !eligForm.income}
                    style={{ width: '100%', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #4ade80, #22d3ee)', opacity: (!eligForm.age || !eligForm.income) ? 0.4 : 1 }}
                    onClick={() => {
                      const results = checkEligibility({
                        age: parseInt(eligForm.age),
                        income: parseInt(eligForm.income),
                        gender: eligForm.gender,
                        category: eligForm.category,
                        occupation: eligForm.occupation,
                        hasGirlChild: eligForm.hasGirlChild,
                      });
                      setEligResults(results);
                      setEligStep(1);
                    }}
                  >
                    <CheckSquare size={18} style={{ marginRight: '8px' }} /> Check My Eligibility
                  </button>
                </div>
              )}

              {eligStep === 1 && (
                <div style={{ padding: '2rem', overflowY: 'auto', maxHeight: '70vh' }}>
                  {eligResults.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      <Shield size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                      <p>No schemes matched your profile. Try adjusting income or occupation.</p>
                    </div>
                  ) : (
                    <>
                      <p style={{ color: '#4ade80', fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                        🎉 Found {eligResults.length} scheme{eligResults.length > 1 ? 's' : ''} you may qualify for!
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {eligResults.map((s) => (
                          <motion.div key={s.title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #4ade80' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{s.emoji} {s.title}</span>
                              <span style={{ background: s.score >= 90 ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)', color: s.score >= 90 ? '#4ade80' : '#fbbf24', padding: '2px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700 }}>
                                {s.score}% Match
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '100px', background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.2)' }}>{s.category}</span>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.7' }}>
                              {s.reasons.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                            <button onClick={() => { handleSend(`Tell me how to apply for ${s.title}`); setShowEligibility(false); setEligStep(0); }}
                              style={{ marginTop: '0.75rem', background: 'none', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--accent)', cursor: 'pointer', padding: '0.4rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Sparkles size={13} /> Ask SevaBot how to apply
                            </button>
                          </motion.div>
                        ))}
                      </div>
                      <button onClick={() => setEligStep(0)} style={{ marginTop: '1.5rem', background: 'none', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.6rem 1.5rem', width: '100%', fontSize: '0.85rem' }}>
                        ← Check Again
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schemes Explorer Modal */}

      <AnimatePresence>
        {showExplorer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowExplorer(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Browse Government Schemes</h2>
                <button className="close-btn" onClick={() => setShowExplorer(false)}>&times;</button>
              </div>
              
              <div className="modal-search" style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  placeholder="Search schemes (e.g. Mudra, Pension...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      handleSend(`Tell me details about ${searchQuery}`);
                      setShowExplorer(false);
                    }
                  }}
                  style={{ flex: 1 }}
                />
                {searchQuery && (
                  <button 
                    className="send-btn" 
                    onClick={() => {
                      handleSend(`Help me with information about ${searchQuery}`);
                      setShowExplorer(false);
                    }}
                    style={{ width: 'auto', padding: '0 1.5rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', gap: '8px', display: 'flex', alignItems: 'center' }}
                  >
                    <Sparkles size={16} /> Search AI
                  </button>
                )}
              </div>

              <div className="schemes-grid">
                {schemesData.data
                  .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .length > 0 ? (
                  schemesData.data
                    .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((scheme, idx) => (
                      <motion.div 
                        key={idx}
                        whileHover={{ scale: 1.02 }}
                        className="scheme-card"
                        onClick={() => {
                          handleSend(`Tell me about ${scheme.title}`);
                          setShowExplorer(false);
                        }}
                      >
                        <h3>{scheme.title}</h3>
                        <p>{scheme.paragraphs[0].context.substring(0, 100)}...</p>
                        <span className="learn-more">Ask AI &rarr;</span>
                      </motion.div>
                    ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', opacity: 0.8 }}>
                    <div style={{ marginBottom: '1.5rem', opacity: 0.5 }}><Shield size={48} style={{ margin: '0 auto' }} /></div>
                    <h3 style={{ marginBottom: '1rem', color: '#fff' }}>No local schemes match "{searchQuery}"</h3>
                    <p style={{ marginBottom: '2rem' }}>But don't worry! Our AI can find details for any governance service in India.</p>
                    <button 
                      className="send-btn" 
                      onClick={() => {
                        handleSend(`Search for official information about ${searchQuery}`);
                        setShowExplorer(false);
                      }}
                      style={{ margin: '0 auto', width: 'auto', padding: '0 2rem' }}
                    >
                      <Sparkles size={18} style={{ marginRight: '8px' }} /> Ask SevaBot Global Search
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {showAbout && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay" onClick={() => setShowAbout(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="modal-content" onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>About SevaBot</h2>
                <button className="close-btn" onClick={() => setShowAbout(false)}>&times;</button>
              </div>
              <div style={{ padding: '2.5rem', overflowY: 'auto' }}>
                <h3 style={{ color: 'var(--accent)', marginBottom: '1rem', fontSize: '1.25rem' }}>Project Overview</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.8', fontSize: '1rem' }}>
                  SevaBot is an intelligent, AI-powered conversational assistant designed to help Indian citizens navigate and understand various government schemes and services. Built for the Smart India Hackathon initiative, it aims to empower citizens through accessible digital intelligence and smart governance support.
                </p>
                
                <h3 style={{ color: 'var(--accent)', marginTop: '2.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                  <Calendar size={20} /> Upcoming Plans & Roadmap
                </h3>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                  <ul style={{ color: 'var(--text-main)', paddingLeft: '1.5rem', lineHeight: '2', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li><strong style={{ color: 'var(--accent)' }}>Multilingual Support:</strong> Adding automated translation for Hindi, Tamil, Telugu, and more for wider accessibility in rural areas.</li>
                    <li><strong style={{ color: '#10b981' }}>Voice Integration:</strong> Voice-to-text and text-to-voice features enabling illiterate citizens to interact naturally.</li>
                    <li><strong style={{ color: 'var(--gold)' }}>Document Analysis:</strong> Direct upload of documents to verify eligibility using OCR and computer vision.</li>
                    <li><strong style={{ color: 'var(--secondary)' }}>WhatsApp Integration:</strong> Extending SevaBot accessibility directly through popular messaging channels.</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay" onClick={() => setShowNotifications(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="modal-content" onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '560px' }}
              onAnimationStart={() => {
                setNotifLoading(true);
                setNotifError(null);
                setNotifications([]);
                fetchGovernmentNotifications()
                  .then(data => setNotifications(data))
                  .catch(() => setNotifError('Could not load live updates. Please check your connection.'))
                  .finally(() => setNotifLoading(false));
              }}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 style={{ margin: 0 }}>Live Government Updates</h2>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600, letterSpacing: '0.5px' }}>LIVE</span>
                </div>
                <button className="close-btn" onClick={() => { setShowNotifications(false); setNotifications([]); }}>&times;</button>
              </div>

              <div style={{ padding: '0.5rem 2rem 0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExternalLink size={12} />
                <span>Source: Times of India / NDTV India — Live national news (English)</span>
              </div>

              <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notifLoading && (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                    <div style={{ width: '32px', height: '32px', border: '3px solid var(--glass-border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
                    Fetching latest government updates...
                  </div>
                )}

                {notifError && (
                  <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.2)', color: '#ff5757', fontSize: '0.85rem', textAlign: 'center' }}>
                    {notifError}
                  </div>
                )}

                {!notifLoading && notifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${notif.color}`, cursor: notif.link ? 'pointer' : 'default', transition: 'background 0.2s' }}
                    onMouseOver={(e) => { if (notif.link) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onClick={() => notif.link && window.open(notif.link, '_blank', 'noopener')}
                  >
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '0.9rem', lineHeight: '1.4', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <Bell size={14} color={notif.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                      {notif.title}
                      {notif.link && <ExternalLink size={12} style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.4 }} />}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{notif.description}</p>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.6rem', display: 'block' }}>{notif.relativeTime}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile / Auth Modal */}
      <AnimatePresence>
        {showProfile && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay" onClick={() => setShowProfile(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="modal-content" onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '400px' }}
            >
              <div className="modal-header">
                <h2>{isLoggedIn ? 'User Profile' : (authMode === 'login' ? 'Citizen Login' : 'Create Account')}</h2>
                <button className="close-btn" onClick={() => setShowProfile(false)}>&times;</button>
              </div>
              <div style={{ padding: '2rem' }}>
                {isLoggedIn && user ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--secondary))', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '24px' }}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{user.name}</h3>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered Citizen</span>
                      </div>
                    </div>
                    
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
                        <Mail size={16} color="var(--accent)" /> <span>{user.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
                        <Phone size={16} color="var(--accent)" /> <span>{user.phone}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
                        <Shield size={16} color="#10b981" /> <span>Aadhaar Verified</span>
                      </div>
                    </div>

                    <button 
                      className="send-btn" 
                      onClick={() => {
                        setIsLoggedIn(false);
                        setUser(null);
                        setAuthMode('login');
                      }}
                      style={{ width: '100%', marginTop: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.5rem', background: 'rgba(255, 87, 87, 0.1)', border: '1px solid rgba(255, 87, 87, 0.2)', color: '#ff5757' }}
                    >
                      <LogOut size={18} /> Sign Out
                    </button>
                  </div>
                ) : (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    // Mock login/signup logic
                    setIsLoggedIn(true);
                    setUser({ name: 'Ravi Kumar', email: 'ravi.kumar@example.com', phone: '+91 98765 43210' });
                    setShowProfile(false);
                  }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    {authMode === 'signup' && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Full Name</label>
                        <div style={{ position: 'relative' }}>
                          <UserIcon size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input type="text" required placeholder="Enter your full name" className="chat-input" style={{ width: '100%', paddingLeft: '2.5rem' }} />
                        </div>
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email Address</label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="email" required placeholder="Enter your email" className="chat-input" style={{ width: '100%', paddingLeft: '2.5rem' }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Password</label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="password" required placeholder="Enter your password" className="chat-input" style={{ width: '100%', paddingLeft: '2.5rem' }} />
                      </div>
                    </div>

                    <button type="submit" className="send-btn" style={{ width: '100%', marginTop: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                      {authMode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                      <span 
                        onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                        style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {authMode === 'login' ? 'Sign up' : 'Sign in'}
                      </span>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

