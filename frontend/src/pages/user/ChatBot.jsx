import { useState, useRef, useEffect } from "react";
import { X, Send, User, Trash2, Dumbbell, MapPin, Utensils, Zap } from "lucide-react";
import { api } from "../../utils/apiClient";
import { useTheme } from "./ThemeContext";
import "./ChatBot.css";

const QUICK_PROMPTS = [
  { icon: MapPin,   text: "Find a gym near me" },
  { icon: Dumbbell, text: "Build me a workout plan" },
  { icon: Utensils, text: "Suggest a Filipino meal plan" },
  { icon: Zap,      text: "I'm a complete beginner" },
];

export default function Chatbot() {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
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
  }, [isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!isOpen) return;
      if (chatRef.current && !chatRef.current.contains(e.target)) {
        const toggle = document.getElementById("exerbot-toggle");
        if (toggle && toggle.contains(e.target)) return;
        const widget = document.querySelector(".stw-widget");
        if (widget && widget.contains(e.target)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  const loadUserProfile = () => {
    const user = localStorage.getItem("user_data");
    if (user) {
      try { setUserProfile(JSON.parse(user)); }
      catch { setUserProfile(null); }
    }
  };

  const loadChatHistory = () => {
    const stored = localStorage.getItem("exerbot_history");
    if (stored) {
      try {
        const history = JSON.parse(stored);
        if (Array.isArray(history) && history.length > 0) {
          setMessages(history);
          return;
        }
      } catch (e) {
        console.error("Error loading history:", e);
      }
    }
    setMessages([{
      role: "assistant",
      content: "Hi! I'm ExerBot, your AI fitness assistant. I can help you find gyms, create workout plans, and plan your meals. What would you like to know?",
      timestamp: new Date().toISOString(),
    }]);
  };

  const clearConversation = async () => {
    if (!window.confirm("Clear all chat history? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      if (token) await api.delete("/api/v1/chat/clear");
      const freshMessages = [{
        role: "assistant",
        content: "Chat cleared! Ready to start fresh. What can I help you with?",
        timestamp: new Date().toISOString(),
      }];
      localStorage.removeItem("exerbot_history");
      setMessages(freshMessages);
      localStorage.setItem("exerbot_history", JSON.stringify(freshMessages));
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  const sendMessage = async (text) => {
    const userMessage = (text || input).trim();
    if (!userMessage || isLoading) return;
    setInput("");

    const newMessage = { role: "user", content: userMessage, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const conversation = updatedMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const { data } = await api.post("/api/v1/chat", { message: userMessage, conversation });

      if (data?.success && data?.message) {
        const aiMessage = { role: "assistant", content: data.message, timestamp: new Date().toISOString() };
        const finalMessages = [...updatedMessages, aiMessage];
        setMessages(finalMessages);
        localStorage.setItem("exerbot_history", JSON.stringify(finalMessages));
        if (!isOpen) setHasUnread(true);
      } else {
        throw new Error("Invalid response");
      }
    } catch (error) {
      console.error("Chat error:", error);
      const finalMessages = [...updatedMessages, {
        role: "assistant",
        content: "Sorry, I'm having trouble responding right now. Please try again.",
        timestamp: new Date().toISOString(),
      }];
      setMessages(finalMessages);
      localStorage.setItem("exerbot_history", JSON.stringify(finalMessages));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const messageCount = messages.filter((m) => m.role === "user").length;

  return (
    <div className="eb-root" data-theme={isDark ? "dark" : "light"}>

      {/* ── Circle toggle ── */}
      <button
        id="exerbot-toggle"
        className={`eb-toggle ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Toggle ExerBot"
        type="button"
      >
        <span className="eb-toggle-icon">
          {isOpen
            ? <X size={20} strokeWidth={2.5} />
            : <img src="/letterlogo.png" alt="ExerBot" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
          }
        </span>
        {!isOpen && hasUnread && <span className="eb-badge">!</span>}
        {!isOpen && messageCount > 0 && !hasUnread && <span className="eb-badge">{messageCount}</span>}
      </button>

      {/* ── Panel ── */}
      {isOpen && (
        <div className="eb-panel" ref={chatRef} role="dialog" aria-label="ExerBot Chat">

          {/* Header */}
          <div className="eb-header">
            <div className="eb-header-left">
              <div className="eb-avatar">
                <img src="/letterlogo.png" alt="ExerBot" style={{ width: "22px", height: "22px", objectFit: "contain" }} />
                <div className={`eb-avatar-dot ${isLoading ? "loading" : ""}`} />
              </div>
              <div className="eb-header-info">
                <div className="eb-name">ExerBot</div>
                <div className={`eb-status ${isLoading ? "typing" : ""}`}>
                  <span className="eb-status-dot" />
                  {isLoading ? "Thinking..." : "AI Fitness Assistant"}
                </div>
              </div>
            </div>
            <div className="eb-header-actions">
              <button className="eb-icon-btn danger" onClick={clearConversation} title="Clear history" type="button">
                <Trash2 size={13} strokeWidth={2} />
              </button>
              <button className="eb-icon-btn" onClick={() => setIsOpen(false)} title="Close" type="button">
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="eb-messages">
            {messages.length === 0 ? (
              <div className="eb-empty">
                <div className="eb-empty-avatar">
                  <img src="/letterlogo.png" alt="ExerBot" style={{ width: "30px", height: "30px", objectFit: "contain" }} />
                </div>
                <h4>Hey there! 👋</h4>
                <p>Ask me about gyms, workout plans, meal ideas, or anything fitness.</p>
                <div className="eb-prompts">
                  {QUICK_PROMPTS.map((p, i) => (
                    <button key={i} className="eb-prompt-btn" onClick={() => sendMessage(p.text)} type="button">
                      <p.icon size={12} className="eb-prompt-icon" strokeWidth={2} />
                      {p.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="eb-divider">Today</div>
                {messages.map((msg, i) => (
                  <div key={i} className={`eb-msg ${msg.role}`}>
                    <div className="eb-msg-avatar">
                      {msg.role === "user"
                        ? userProfile?.profile_picture
                          ? <img src={userProfile.profile_picture} alt="You" />
                          : <User size={11} strokeWidth={2.5} />
                        : <img src="/letterlogo.png" alt="ExerBot" style={{ width: "13px", height: "13px", objectFit: "contain" }} />
                      }
                    </div>
                    <div className="eb-bubble">{msg.content}</div>
                  </div>
                ))}
                {isLoading && (
                  <div className="eb-msg assistant">
                    <div className="eb-msg-avatar">
                      <img src="/letterlogo.png" alt="ExerBot" style={{ width: "13px", height: "13px", objectFit: "contain" }} />
                    </div>
                    <div className="eb-bubble">
                      <div className="eb-typing"><span /><span /><span /></div>
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
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                aria-label="Send"
                type="button"
              >
                <Send size={15} strokeWidth={2.5} />
              </button>
            </div>
            <div className="eb-hint">Powered by OpenRouter · Enter to send</div>
          </div>

        </div>
      )}
    </div>
  );
}