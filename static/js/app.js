/* ═══════════════════════════════════════════════════════════════
   AI Assistant — Frontend Logic
   ═══════════════════════════════════════════════════════════════ */

// ─── State ──────────────────────────────────────────────────────
let messageCount = 0;
let isLoading    = false;
let currentChatId = generateId();
let currentChatMessages = [];
let savedChats = JSON.parse(localStorage.getItem('ai_saved_chats') || '{}');

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ─── DOM References ─────────────────────────────────────────────
const messagesArea    = document.getElementById('messagesArea');
const userInput       = document.getElementById('userInput');
const sendBtn         = document.getElementById('sendBtn');
const clearBtn        = document.getElementById('clearBtn');
const typingIndicator = document.getElementById('typingIndicator');
const faqList         = document.getElementById('faqList');
const welcomeScreen   = document.getElementById('welcomeScreen');
const welcomeChips    = document.getElementById('welcomeChips');
const messageCountEl  = document.getElementById('messageCount');
const charCounter     = document.getElementById('charCounter');
const apiStatus       = document.getElementById('apiStatus');
const apiBadge        = document.getElementById('apiBadge');
const apiBadgeText    = document.getElementById('apiBadgeText');
const toast           = document.getElementById('toast');
const mobileMenuBtn   = document.getElementById('mobileMenuBtn');
const sidebar         = document.getElementById('sidebar');

// New History References
const newChatBtn      = document.getElementById('newChatBtn');
const historyToggleBtn= document.getElementById('historyToggleBtn');
const historyOverlay  = document.getElementById('historyOverlay');
const historyPanel    = document.getElementById('historyPanel');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyListEl   = document.getElementById('historyList');

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkApiStatus();
  loadFaqSuggestions();
  setupEventListeners();
  userInput.focus();
});

// ─── Event Listeners ────────────────────────────────────────────
function setupEventListeners() {

  // Send on Enter (Shift+Enter for newline)
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Character counter & auto-resize
  userInput.addEventListener('input', () => {
    const len = userInput.value.length;
    charCounter.textContent = `${len} / 2000`;
    charCounter.classList.toggle('warn',  len > 1600);
    charCounter.classList.toggle('error', len > 1900);
    autoResize();
  });

  // Send button
  sendBtn.addEventListener('click', sendMessage);

  // Clear conversation
  clearBtn.addEventListener('click', clearConversation);

  // History / New Chat
  if (historyToggleBtn) historyToggleBtn.addEventListener('click', toggleHistoryPanel);
  if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', toggleHistoryPanel);
  if (historyOverlay) historyOverlay.addEventListener('click', toggleHistoryPanel);
  if (newChatBtn) newChatBtn.addEventListener('click', startNewChat);

  // Mobile sidebar toggle
  mobileMenuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 768
        && !sidebar.contains(e.target)
        && !mobileMenuBtn.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

// ─── API: Check Status ───────────────────────────────────────────
async function checkApiStatus() {
  try {
    const res  = await fetch('/api/status');
    const data = await res.json();

    if (data.api_configured) {
      apiBadge.classList.add('online');
      apiBadgeText.textContent = 'Gemini Connected';
      apiBadge.style.color     = '#4ade80';
      apiStatus.innerHTML = `<span class="status-dot online"></span> Connected`;
    } else {
      apiBadge.classList.add('offline');
      apiBadgeText.textContent = 'API Key Missing';
      apiBadge.style.color     = '#f87171';
      apiStatus.innerHTML = `<span class="status-dot offline"></span> No API Key`;
    }
  } catch {
    apiBadgeText.textContent = 'Server Error';
    apiStatus.innerHTML = `<span class="status-dot offline"></span> Error`;
  }
}

// ─── API: Load FAQ Suggestions ───────────────────────────────────
async function loadFaqSuggestions() {
  try {
    const res  = await fetch('/api/faq-suggestions');
    const data = await res.json();
    const suggestions = data.suggestions || [];

    // Sidebar FAQ list
    faqList.innerHTML = '';
    suggestions.forEach(q => {
      const item = document.createElement('button');
      item.className   = 'faq-item';
      item.textContent = q;
      item.addEventListener('click', () => {
        userInput.value = q;
        autoResize();
        if (window.innerWidth < 768) sidebar.classList.remove('open');
        sendMessage();
      });
      faqList.appendChild(item);
    });

    // Welcome chips (first 6)
    welcomeChips.innerHTML = '';
    suggestions.slice(0, 6).forEach(q => {
      const chip = document.createElement('button');
      chip.className   = 'welcome-chip';
      chip.textContent = q;
      chip.addEventListener('click', () => sendMessageText(q));
      welcomeChips.appendChild(chip);
    });

  } catch (err) {
    faqList.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:8px">Could not load suggestions</p>';
  }
}

// ─── Send Message ────────────────────────────────────────────────
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;
  sendMessageText(text);
}

async function sendMessageText(text) {
  if (!text || isLoading) return;

  // Clear input
  userInput.value = '';
  charCounter.textContent = '0 / 2000';
  charCounter.classList.remove('warn', 'error');
  autoResize();

  // Hide welcome screen on first message
  if (welcomeScreen && welcomeScreen.parentNode) {
    welcomeScreen.style.animation = 'fadeIn 0.2s ease reverse forwards';
    setTimeout(() => welcomeScreen.remove(), 200);
  }

  // Append user message
  appendMessage('user', text);
  messageCount++;
  updateMessageCount();
  
  currentChatMessages.push({ role: 'user', content: text });
  saveCurrentChat();

  // Show typing
  setLoading(true);

  try {
    const res  = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: text, chat_id: currentChatId }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Server error');
    }

    appendMessage('ai', data.response);
    currentChatMessages.push({ role: 'ai', content: data.response });
    saveCurrentChat();
    
    messageCount = data.message_count || messageCount + 1;
    updateMessageCount();

  } catch (err) {
    appendMessage('ai', `❌ **Error**: ${err.message}\n\nPlease check that the Flask server is running.`);
  } finally {
    setLoading(false);
    userInput.focus();
  }
}

// ─── Append Message ──────────────────────────────────────────────
function appendMessage(role, content) {
  const isAI = role === 'ai';

  const wrapper = document.createElement('div');
  wrapper.className = `message ${isAI ? 'ai-msg' : 'user-msg'}`;

  const avatar = document.createElement('div');
  avatar.className = isAI ? 'ai-avatar' : 'user-avatar';
  avatar.textContent = isAI ? '✦' : '👤';

  const body = document.createElement('div');
  body.className = 'message-body';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = isAI ? parseMarkdown(content) : escapeHtml(content);

  const meta = document.createElement('div');
  meta.className = 'message-meta';

  const time = document.createElement('span');
  time.className   = 'message-time';
  time.textContent = formatTime();

  meta.appendChild(time);

  // Copy button for AI messages
  if (isAI) {
    const copyBtn = document.createElement('button');
    copyBtn.className   = 'copy-btn';
    copyBtn.textContent = '📋 Copy';
    copyBtn.title       = 'Copy response';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        copyBtn.textContent = '✅ Copied!';
        showToast('Copied to clipboard!', 'success');
        setTimeout(() => copyBtn.textContent = '📋 Copy', 2000);
      });
    });
    meta.appendChild(copyBtn);
  }

  body.appendChild(bubble);
  body.appendChild(meta);
  wrapper.appendChild(avatar);
  wrapper.appendChild(body);
  messagesArea.appendChild(wrapper);

  scrollToBottom();
}

// ─── Loading State ───────────────────────────────────────────────
function setLoading(state) {
  isLoading = state;
  sendBtn.disabled = state;
  typingIndicator.classList.toggle('hidden', !state);
  if (state) scrollToBottom();
}

// ─── Clear Conversation ──────────────────────────────────────────
async function clearConversation() {
  try {
    await fetch('/api/clear', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: currentChatId })
    });
    
    if (savedChats[currentChatId]) {
      delete savedChats[currentChatId];
      localStorage.setItem('ai_saved_chats', JSON.stringify(savedChats));
      renderHistoryList();
    }
    
    startNewChat();
    showToast('Conversation cleared', 'success');
  } catch {
    showToast('Failed to clear conversation', 'error');
  }
}

// ─── History Management ──────────────────────────────────────────
function saveCurrentChat() {
  if (currentChatMessages.length === 0) return;
  
  const title = currentChatMessages[0].content.substring(0, 40) + (currentChatMessages[0].content.length > 40 ? '...' : '');
  
  savedChats[currentChatId] = {
    id: currentChatId,
    title: title,
    date: new Date().toISOString(),
    messages: currentChatMessages
  };
  
  localStorage.setItem('ai_saved_chats', JSON.stringify(savedChats));
  renderHistoryList();
}

function startNewChat() {
  currentChatId = generateId();
  currentChatMessages = [];
  messagesArea.innerHTML = '';
  messageCount = 0;
  updateMessageCount();
  
  // Restore welcome screen if needed
  if (!document.getElementById('welcomeScreen')) {
    const welcome = document.createElement('div');
    welcome.className = 'welcome-screen';
    welcome.id = 'welcomeScreen';
    welcome.innerHTML = `
      <div class="welcome-icon">🤖</div>
      <h2>Hello! I'm your AI Assistant</h2>
      <p>Ask me anything — from tech questions to general knowledge. I'm powered by Google's Gemini AI and ready to help!</p>
      <div class="welcome-chips" id="welcomeChips"></div>
    `;
    messagesArea.appendChild(welcome);
    loadFaqSuggestions();
  }
  
  if (window.innerWidth < 768) sidebar.classList.remove('open');
}

function toggleHistoryPanel() {
  const isOpen = historyPanel.classList.contains('open');
  if (isOpen) {
    historyPanel.classList.remove('open');
    historyOverlay.classList.remove('show');
  } else {
    renderHistoryList();
    historyPanel.classList.add('open');
    historyOverlay.classList.add('show');
    if (window.innerWidth < 768) sidebar.classList.remove('open');
  }
}

function renderHistoryList() {
  if (!historyListEl) return;
  historyListEl.innerHTML = '';
  
  const chats = Object.values(savedChats).sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (chats.length === 0) {
    historyListEl.innerHTML = '<p class="no-history-msg">No saved chats yet.</p>';
    return;
  }
  
  chats.forEach(chat => {
    const item = document.createElement('div');
    item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
    
    const title = document.createElement('div');
    title.className = 'history-item-title';
    title.textContent = chat.title;
    
    const date = document.createElement('div');
    date.className = 'history-item-date';
    date.textContent = new Date(chat.date).toLocaleString();
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'history-item-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      delete savedChats[chat.id];
      localStorage.setItem('ai_saved_chats', JSON.stringify(savedChats));
      if (chat.id === currentChatId) startNewChat();
      renderHistoryList();
    });
    
    item.addEventListener('click', () => loadChat(chat.id));
    
    item.appendChild(title);
    item.appendChild(date);
    item.appendChild(deleteBtn);
    historyListEl.appendChild(item);
  });
}

function loadChat(chatId) {
  const chat = savedChats[chatId];
  if (!chat) return;
  
  currentChatId = chatId;
  currentChatMessages = chat.messages || [];
  
  messagesArea.innerHTML = '';
  messageCount = 0;
  
  currentChatMessages.forEach(msg => {
    appendMessage(msg.role, msg.content);
    if (msg.role === 'user') messageCount++;
  });
  
  updateMessageCount();
  toggleHistoryPanel();
}

// ─── Markdown Parser (lightweight) ──────────────────────────────
function parseMarkdown(text) {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
    // Unordered lists
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm,  '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Line breaks
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

// ─── Helpers ─────────────────────────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function formatTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesArea.scrollTop = messagesArea.scrollHeight;
  });
}

function updateMessageCount() {
  if (messageCountEl) messageCountEl.textContent = messageCount;
}

function autoResize() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
}

function showToast(message, type = '') {
  toast.textContent = message;
  toast.className   = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 2500);
}
