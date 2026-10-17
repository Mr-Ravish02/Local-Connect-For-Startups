import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Bot,
  Key,
  RotateCcw,
  X,
  Send,
  HelpCircle,
} from 'lucide-react';
import { sendGroqChatMessage } from '../utils/groq';
import { getUserLocation } from '../utils/geolocation';
import './ChatWidget.css';

let msgSeq = 0;
const generateId = (prefix) => `${prefix}-${++msgSeq}`;
const getTimestamp = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const INITIAL_MESSAGE = {
  id: 'welcome',
  sender: 'assistant',
  text: "Hi! I'm **HiveBot**, your LocalHive shopping assistant.\n\nI can help you find nearby shops, check real-time product stock, compare prices, and get store directions. What are you looking for today?",
  timestamp: getTimestamp(),
};

const SUGGESTIONS = [
  'Which shops sell cycles nearby?',
  'Is any clothing in stock?',
  'Is a size M jacket available?',
  'Show me nearby shops',
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [customKey, setCustomKey] = useState(
    () => (typeof window !== 'undefined' ? localStorage.getItem('localhive_groq_api_key') || '' : '')
  );

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Try to acquire user's location once in the background
  useEffect(() => {
    getUserLocation()
      .then((loc) => setUserLocation(loc))
      .catch(() => {
        // Location denied or unavailable, not critical
      });
  }, []);

  // Auto-scroll to latest message
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, messages, scrollToBottom]);

  // Handle sending a message
  const handleSend = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    const userMsg = {
      id: generateId('user'),
      sender: 'user',
      text,
      timestamp: getTimestamp(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await sendGroqChatMessage({
        messages: newMessages,
        userLocation,
        customApiKey: customKey || undefined,
      });

      const assistantMsg = {
        id: generateId('bot'),
        sender: 'assistant',
        text: response.reply,
        timestamp: getTimestamp(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId('bot-err'),
          sender: 'assistant',
          text: 'An unexpected error occurred while processing your request. Please try again.',
          timestamp: getTimestamp(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResetChat = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  // Helper to parse basic markdown links, bold text, and code
  const renderMessageContent = (text) => {
    const lines = text.split('\n');

    return lines.map((line, lIdx) => {
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        const linkText = match[1];
        const linkUrl = match[2];

        parts.push(
          <a
            key={`link-${lIdx}-${match.index}`}
            href={linkUrl}
            onClick={(e) => {
              if (linkUrl.startsWith('/')) {
                e.preventDefault();
                navigate(linkUrl);
              }
            }}
            className="chat-link"
          >
            {linkText}
          </a>
        );
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      const formattedParts = parts.map((part, pIdx) => {
        if (typeof part !== 'string') return part;
        return renderBoldAndInline(part, `p-${lIdx}-${pIdx}`);
      });

      return (
        <p key={`line-${lIdx}`} className="chat-paragraph">
          {formattedParts.length > 0 ? formattedParts : <br />}
        </p>
      );
    });
  };

  const renderBoldAndInline = (str, keyPrefix) => {
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const tokens = [];
    let lastPos = 0;
    let bMatch;

    while ((bMatch = boldRegex.exec(str)) !== null) {
      if (bMatch.index > lastPos) {
        tokens.push(str.substring(lastPos, bMatch.index));
      }
      tokens.push(<strong key={`b-${keyPrefix}-${bMatch.index}`}>{bMatch[1]}</strong>);
      lastPos = boldRegex.lastIndex;
    }
    if (lastPos < str.length) {
      tokens.push(str.substring(lastPos));
    }
    return tokens.length > 0 ? tokens : str;
  };

  return (
    <div className="chat-widget-container">
      {/* Floating Toggle Button */}
      <button
        type="button"
        className={`chat-launcher-btn ${isOpen ? 'active' : ''}`}
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (next) setHasUnread(false);
            return next;
          });
        }}
        aria-label={isOpen ? 'Close chat' : 'Open AI shopping assistant'}
        title="Chat with HiveBot Assistant"
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
        {hasUnread && <span className="chat-unread-dot" />}
      </button>

      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">
                <Bot size={18} />
                <span className="chat-status-online" title="Online" />
              </div>
              <div className="chat-title-group">
                <h4 className="chat-title">HiveBot Assistant</h4>
                <p className="chat-subtitle">Local Shopping Assistant</p>
              </div>
            </div>

            <div className="chat-header-actions">
              <button
                type="button"
                className="chat-header-btn"
                onClick={() => setShowKeyModal((prev) => !prev)}
                title="Configure Groq API Key"
              >
                <Key size={15} />
              </button>
              <button
                type="button"
                className="chat-header-btn"
                onClick={handleResetChat}
                title="Restart conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                className="chat-header-btn"
                onClick={() => setIsOpen(false)}
                title="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick API Key Configuration Banner */}
          {showKeyModal && (
            <div style={{ padding: '12px 14px', background: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border)', fontSize: '0.82rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Key size={13} color="var(--color-primary)" />
                Groq API Key (Optional)
              </div>
              <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 8px', fontSize: '0.78rem' }}>
                Key is stored locally in your browser.
              </p>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="password"
                  placeholder="gsk_..."
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="form-input"
                  style={{ padding: '4px 8px', fontSize: '0.8rem', height: '30px' }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '4px 10px', fontSize: '0.78rem', height: '30px' }}
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      if (customKey.trim()) {
                        localStorage.setItem('localhive_groq_api_key', customKey.trim());
                      } else {
                        localStorage.removeItem('localhive_groq_api_key');
                      }
                    }
                    setShowKeyModal(false);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Messages Body */}
          <div className="chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-msg ${msg.sender === 'user' ? 'chat-msg-user' : 'chat-msg-assistant'}`}
              >
                <div className="chat-msg-avatar">
                  {msg.sender === 'user' ? 'U' : <Bot size={13} />}
                </div>
                <div className="chat-msg-content">
                  <div className="chat-msg-bubble">
                    {renderMessageContent(msg.text)}
                  </div>
                  <span className="chat-msg-time">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="chat-msg chat-msg-assistant">
                <div className="chat-msg-avatar">
                  <Bot size={13} />
                </div>
                <div className="chat-msg-content">
                  <div className="chat-typing">
                    <span className="chat-typing-dot" />
                    <span className="chat-typing-dot" />
                    <span className="chat-typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length === 1 && !isTyping && (
            <div className="chat-suggestions">
              {SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="chat-suggestion-chip"
                  onClick={() => handleSend(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div className="chat-input-area">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about shops, products, or stock…"
              className="chat-input"
              disabled={isTyping}
            />
            <button
              type="button"
              className="chat-send-btn"
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isTyping}
              title="Send message"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
