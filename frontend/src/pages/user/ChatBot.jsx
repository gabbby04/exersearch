import { useState, useRef, useEffect } from 'react';
import { X, Send, User, Trash2 } from 'lucide-react';
import './Chatbot.css';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (messages.length === 0) {
        loadUserProfile();
        loadChatHistory();
      }
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!isOpen) return;
      if (chatRef.current && !chatRef.current.contains(e.target)) {
        const toggle = document.getElementById('exerbot-toggle');
        if (toggle && toggle.contains(e.target)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const loadUserProfile = () => {
    const user = localStorage.getItem('user_data');
    if (user) {
      try { setUserProfile(JSON.parse(user)); }
      catch (e) { setUserProfile(null); }
    }
  };

  const loadChatHistory = () => {
    const stored = localStorage.getItem('exerbot_history');
    if (stored) {
      try {
        const history = JSON.parse(stored);
        if (history.length > 0) { setMessages(history); return; }
      } catch (e) { console.error('Error loading history:', e); }
    }
    setMessages([{
      role: 'assistant',
      content: "Hi! I'm ExerBot, your AI fitness assistant. I can help you find gyms, create workout plans, and plan your meals. What would you like to know?",
      timestamp: new Date().toISOString(),
    }]);
  };

  const clearConversation = async () => {
    if (!confirm('Clear all chat history? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch('https://exersearch.test/api/v1/chat/clear', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }
      localStorage.removeItem('exerbot_history');
      setMessages([{
        role: 'assistant',
        content: "Chat cleared! Ready to start fresh. What can I help you with?",
        timestamp: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');

    const newMessage = { role: 'user', content: userMessage, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const conversation = messages.map((msg) => ({ role: msg.role, content: msg.content }));

      const response = await fetch('https://exersearch.test/api/v1/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userMessage, conversation }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.success && data.message) {
        const aiMessage = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
        };
        const finalMessages = [...updatedMessages, aiMessage];
        setMessages(finalMessages);
        localStorage.setItem('exerbot_history', JSON.stringify(finalMessages));
        if (!isOpen) setHasUnread(true);
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...updatedMessages, {
        role: 'assistant',
        content: "Sorry, I'm having trouble responding right now. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const messageCount = messages.filter((m) => m.role === 'user').length;

  return (
    <div className="eb-root">

      {/* ── Toggle ── */}
      <button
        id="exerbot-toggle"
        className={`eb-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Toggle ExerBot"
        type="button"
      >
        <span className="eb-toggle-icon">
          {isOpen
            ? <X size={22} strokeWidth={2.5} />
            : <img src="/gymlogo.png" alt="ExerBot" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
          }
        </span>
        {!isOpen && hasUnread && <span className="eb-badge">!</span>}
        {!isOpen && messageCount > 0 && !hasUnread && (
          <span className="eb-badge">{messageCount}</span>
        )}
      </button>

      {/* ── Panel ── */}
      {isOpen && (
        <div className="eb-panel" ref={chatRef} role="dialog" aria-label="ExerBot Chat">

          {/* Header */}
          <div className="eb-header">
            <div className="eb-header-left">
              <div className="eb-avatar">
                <img src="/gymlogo.png" alt="ExerBot" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                <div className={`eb-avatar-dot ${isLoading ? 'loading' : ''}`} />
              </div>
              <div>
                <div className="eb-name">ExerBot</div>
                <div className={`eb-status ${isLoading ? 'typing' : ''}`}>
                  {isLoading ? 'Thinking...' : 'AI Fitness Assistant'}
                </div>
              </div>
            </div>
            <div className="eb-header-actions">
              <button
                className="eb-icon-btn danger"
                onClick={clearConversation}
                title="Clear history"
                type="button"
              >
                <Trash2 size={15} strokeWidth={2} />
              </button>
              <button
                className="eb-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close"
                type="button"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="eb-messages">
            {messages.length === 0 ? (
              <div className="eb-empty">
                <div className="eb-empty-icon">
                  <img src="/gymlogo.png" alt="ExerBot" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                </div>
                <h4>Hey there! 👋</h4>
                <p>Ask me about gyms near you, workout plans, meal ideas, or anything fitness-related.</p>
              </div>
            ) : (
              <>
                <div className="eb-divider">Today</div>

                {messages.map((msg, i) => (
                  <div key={i} className={`eb-msg ${msg.role}`}>
                    <div className="eb-msg-avatar">
                      {msg.role === 'user' ? (
                        userProfile?.profile_picture
                          ? <img src={userProfile.profile_picture} alt="You" />
                          : <User size={13} strokeWidth={2.5} />
                      ) : (
                        <img src="/gymlogo.png" alt="ExerBot" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                      )}
                    </div>
                    <div className="eb-bubble">{msg.content}</div>
                  </div>
                ))}

                {isLoading && (
                  <div className="eb-msg assistant">
                    <div className="eb-msg-avatar">
                      <img src="/gymlogo.png" alt="ExerBot" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                    </div>
                    <div className="eb-bubble">
                      <div className="eb-typing">
                        <span /><span /><span />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="eb-input-area">
            <div className="eb-input-row">
              <input
                ref={inputRef}
                type="text"
                className="eb-field"
                placeholder="Ask about gyms, workouts, meals..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                autoComplete="off"
              />
              <button
                className="eb-send"
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                aria-label="Send"
                type="button"
              >
                <Send size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="eb-hint">Powered by ExerSearch AI · Press Enter to send</div>
          </div>

        </div>
      )}
    </div>
  );
}