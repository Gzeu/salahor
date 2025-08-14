// Import necessary modules
import { Stream } from 'salahor';

// DOM Elements
const messageInput = document.getElementById('messageInput');
const chatMessages = document.getElementById('chatMessages');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const usernameDisplay = document.getElementById('usernameDisplay');
const userAvatar = document.getElementById('userAvatar');
const editUsernameBtn = document.getElementById('editUsernameBtn');
const usernameModal = document.getElementById('usernameModal');
const newUsernameInput = document.getElementById('newUsername');
const saveUsernameBtn = document.getElementById('saveUsernameBtn');
const cancelUsernameBtn = document.getElementById('cancelUsernameBtn');
const closeUsernameModal = document.getElementById('closeUsernameModal');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsModal = document.getElementById('closeSettingsModal');
const darkModeToggle = document.getElementById('darkModeToggle');
const themeToggle = document.getElementById('themeToggle');
const emojiBtn = document.getElementById('emojiBtn');
const emojiBtnInline = document.getElementById('emojiBtnInline');
const emojiPicker = document.getElementById('emojiPicker');
const emojiGrid = document.getElementById('emojiGrid');
const emojiSearch = document.getElementById('emojiSearch');
const emojiCategories = document.querySelectorAll('.emoji-category');
const typingIndicator = document.getElementById('typingIndicator');
const typingIndicatorBar = document.getElementById('typingIndicatorBar');
const usersList = document.getElementById('usersList');
const onlineCount = document.getElementById('onlineCount');
const connectionStatus = document.getElementById('connectionStatus');

// State
let username = localStorage.getItem('username') || `User${Math.floor(Math.random() * 10000)}`;
let userId = localStorage.getItem('userId') || generateUserId();
let userColor = localStorage.getItem('userColor') || getRandomColor();
let isTyping = false;
let typingTimeout;
let socket;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000; // 3 seconds

// Initialize the application
function init() {
  setupEventListeners();
  loadUserPreferences();
  updateUI();
  connectWebSocket();
  setupEmojiPicker();
}

// Set up event listeners
function setupEventListeners() {
  // Message input events
  messageInput.addEventListener('input', handleTyping);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Send message button
  sendMessageBtn.addEventListener('click', sendMessage);
  
  // Username management
  editUsernameBtn.addEventListener('click', openUsernameModal);
  saveUsernameBtn.addEventListener('click', saveUsername);
  cancelUsernameBtn.addEventListener('click', closeUsernameModal);
  closeUsernameModal.addEventListener('click', closeUsernameModal);
  newUsernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveUsername();
    if (e.key === 'Escape') closeUsernameModal();
  });
  
  // Settings modal
  settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
  closeSettingsModal.addEventListener('click', () => settingsModal.classList.remove('active'));
  
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);
  darkModeToggle.addEventListener('change', (e) => {
    document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
    localStorage.setItem('darkMode', e.target.checked ? 'enabled' : 'disabled');
  });
  
  // Emoji picker
  emojiBtn.addEventListener('click', toggleEmojiPicker);
  emojiBtnInline.addEventListener('click', toggleEmojiPicker);
  emojiSearch.addEventListener('input', filterEmojis);
  
  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === usernameModal) closeUsernameModal();
    if (e.target === settingsModal) settingsModal.classList.remove('active');
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn && e.target !== emojiBtnInline) {
      emojiPicker.classList.remove('visible');
    }
  });
  
  // Handle window resize
  window.addEventListener('resize', handleWindowResize);
}

// WebSocket connection
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  socket = new WebSocket(wsUrl);
  
  // Connection opened
  socket.addEventListener('open', () => {
    console.log('WebSocket connection established');
    connectionStatus.textContent = 'Connected';
    connectionStatus.style.color = '';
    reconnectAttempts = 0;
    
    // Send user info to server
    sendToServer('user_join', {
      id: userId,
      username,
      color: userColor
    });
  });
  
  // Listen for messages
  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  // Connection closed
  socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed:', event.code, event.reason);
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.style.color = 'var(--error-color)';
    
    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000);
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
      
      connectionStatus.textContent = `Reconnecting in ${delay/1000}s...`;
      
      setTimeout(() => {
        connectWebSocket();
      }, delay);
    } else if (reconnectAttempts >= maxReconnectAttempts) {
      connectionStatus.textContent = 'Connection failed. Please refresh the page.';
    }
  });
  
  // Handle errors
  socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
    connectionStatus.textContent = 'Connection error';
    connectionStatus.style.color = 'var(--error-color)';
  });
}

// Handle server messages
function handleServerMessage(data) {
  console.log('Received message from server:', data);
  
  switch (data.type) {
    case 'message':
      addMessage(data);
      playSound('message');
      break;
      
    case 'user_joined':
      addSystemMessage(`${data.username} joined the chat`, 'info');
      updateUserList(data.users);
      if (data.userId !== userId) {
        playSound('notification');
      }
      break;
      
    case 'user_left':
      addSystemMessage(`${data.username} left the chat`, 'info');
      updateUserList(data.users);
      break;
      
    case 'user_typing':
      handleUserTyping(data);
      break;
      
    case 'user_stopped_typing':
      handleUserStoppedTyping(data.userId);
      break;
      
    case 'username_updated':
      if (data.userId === userId) {
        username = data.newUsername;
        usernameDisplay.textContent = username;
        userAvatar.textContent = getInitials(username);
        localStorage.setItem('username', username);
      }
      addSystemMessage(`${data.oldUsername} is now known as ${data.newUsername}`, 'info');
      updateUserList(data.users);
      break;
      
    case 'error':
      showToast(data.message, 'error');
      console.error('Server error:', data.message);
      break;
      
    default:
      console.warn('Unknown message type:', data.type);
  }
}

// Send message to server
function sendToServer(type, data = {}) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const message = { type, ...data };
    socket.send(JSON.stringify(message));
    return true;
  } else {
    console.error('WebSocket is not connected');
    showToast('Connection lost. Attempting to reconnect...', 'error');
    return false;
  }
}

// Handle typing indicator
function handleTyping() {
  if (!isTyping) {
    isTyping = true;
    sendToServer('typing_start');
  }
  
  // Reset the typing timeout
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isTyping = false;
    sendToServer('typing_stop');
  }, 2000);
}

// Handle user typing indicator from other users
function handleUserTyping(data) {
  if (data.userId === userId) return;
  
  const user = document.querySelector(`[data-user-id="${data.userId}"]`);
  if (user) {
    user.classList.add('typing');
    
    // Update typing indicator
    const typingUsers = Array.from(document.querySelectorAll('.typing:not([data-user-id="' + userId + '"])'));
    if (typingUsers.length > 0) {
      const names = typingUsers.map(el => el.textContent).join(', ');
      typingIndicator.textContent = `${names} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`;
    }
    
    // Clear previous timeout if exists
    if (user.typingTimeout) clearTimeout(user.typingTimeout);
    
    // Set timeout to remove typing indicator
    user.typingTimeout = setTimeout(() => {
      handleUserStoppedTyping(data.userId);
    }, 3000);
  }
}

// Handle user stopped typing
function handleUserStoppedTyping(userId) {
  const user = document.querySelector(`[data-user-id="${userId}"]`);
  if (user) {
    user.classList.remove('typing');
    
    // Update typing indicator
    const typingUsers = document.querySelectorAll('.typing:not([data-user-id="' + userId + '"])');
    if (typingUsers.length > 0) {
      const names = Array.from(typingUsers).map(el => el.textContent).join(', ');
      typingIndicator.textContent = `${names} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`;
    } else {
      typingIndicator.textContent = '';
    }
  }
}

// Send a chat message
function sendMessage() {
  const content = messageInput.textContent.trim();
  if (!content) return;
  
  // Create message object
  const message = {
    id: Date.now().toString(),
    userId,
    username,
    content,
    timestamp: new Date().toISOString(),
    color: userColor
  };
  
  // Add to UI immediately for better UX
  addMessage({ ...message, isLocal: true });
  
  // Clear input
  messageInput.textContent = '';
  messageInput.focus();
  
  // Send to server
  const sent = sendToServer('message', { content });
  
  if (!sent) {
    // If message failed to send, show error and keep message in input
    messageInput.textContent = content;
    showToast('Failed to send message. Please try again.', 'error');
  }
  
  // Reset typing state
  clearTimeout(typingTimeout);
  isTyping = false;
  sendToServer('typing_stop');
}

// Add a message to the chat
function addMessage(data) {
  const { id, userId: senderId, username: senderName, content, timestamp, color, isLocal = false } = data;
  const isCurrentUser = senderId === userId;
  const messageTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
  messageEl.dataset.messageId = id;
  
  // Set message content
  messageEl.innerHTML = `
    <div class="message-bubble">
      ${!isCurrentUser ? `<div class="message-username" style="color: ${color}">${senderName}</div>` : ''}
      <div class="message-content">${formatMessageContent(content)}</div>
      <div class="message-time">
        ${messageTime}
        ${isCurrentUser ? '<span class="message-status delivered">✓✓</span>' : ''}
      </div>
    </div>
  `;
  
  // Add to chat
  chatMessages.appendChild(messageEl);
  
  // Scroll to bottom
  scrollToBottom();
  
  // If this is a local message, we'll update the status when we get confirmation from server
  if (isLocal) {
    messageEl.dataset.local = 'true';
  }
}

// Format message content (URLs, emojis, etc.)
function formatMessageContent(content) {
  // Replace URLs with clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.replace(urlRegex, url => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

// Add a system message
function addSystemMessage(content, type = 'info') {
  const messageEl = document.createElement('div');
  messageEl.className = 'message system';
  messageEl.innerHTML = `
    <div class="message-bubble">
      <div class="message-content">${content}</div>
    </div>
  `;
  
  chatMessages.appendChild(messageEl);
  scrollToBottom();
}

// Update user list
function updateUserList(users) {
  if (!users || !Array.isArray(users)) return;
  
  usersList.innerHTML = '';
  onlineCount.textContent = users.length;
  
  users.forEach(user => {
    const userEl = document.createElement('div');
    userEl.className = 'user-item';
    userEl.dataset.userId = user.id;
    
    userEl.innerHTML = `
      <div class="user-item-avatar" style="background-color: ${user.color}">
        ${getInitials(user.username)}
      </div>
      <div class="user-item-details">
        <div class="user-item-name">${user.username}</div>
        <div class="user-item-status">
          <span class="status-indicator online"></span>
          <span>Online</span>
        </div>
      </div>
    `;
    
    usersList.appendChild(userEl);
  });
}

// Username management
function openUsernameModal() {
  newUsernameInput.value = username;
  usernameModal.classList.add('active');
  newUsernameInput.focus();
  newUsernameInput.select();
}

function closeUsernameModal() {
  usernameModal.classList.remove('active');
}

function saveUsername() {
  const newUsername = newUsernameInput.value.trim();
  
  if (!newUsername) {
    showToast('Username cannot be empty', 'error');
    return;
  }
  
  if (newUsername === username) {
    closeUsernameModal();
    return;
  }
  
  const oldUsername = username;
  username = newUsername;
  
  // Update UI
  usernameDisplay.textContent = username;
  userAvatar.textContent = getInitials(username);
  
  // Save to localStorage
  localStorage.setItem('username', username);
  
  // Send to server
  sendToServer('update_username', { newUsername, oldUsername });
  
  closeUsernameModal();
}

// Theme management
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('darkMode', isDark ? 'disabled' : 'enabled');
  darkModeToggle.checked = !isDark;
  
  // Update theme toggle icon
  const icon = themeToggle.querySelector('i');
  if (icon) {
    icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
  }
}

// Load user preferences from localStorage
function loadUserPreferences() {
  // Load theme preference
  const darkMode = localStorage.getItem('darkMode') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'enabled' : 'disabled');
  
  if (darkMode === 'enabled') {
    document.documentElement.setAttribute('data-theme', 'dark');
    darkModeToggle.checked = true;
    themeToggle.querySelector('i').className = 'fas fa-sun';
  }
  
  // Load user color if not set
  if (!localStorage.getItem('userColor')) {
    localStorage.setItem('userColor', userColor);
  } else {
    userColor = localStorage.getItem('userColor');
  }
}

// Update UI based on current state
function updateUI() {
  usernameDisplay.textContent = username;
  userAvatar.textContent = getInitials(username);
  userAvatar.style.backgroundColor = userColor;
}

// Emoji picker
function setupEmojiPicker() {
  // Basic emoji categories and emojis
  const emojiCategories = [
    {
      name: 'smileys',
      emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇']
    },
    {
      name: 'gestures',
      emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👊', '✊', '🤛']
    },
    {
      name: 'animals',
      emojis: ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁']
    },
    {
      name: 'food',
      emojis: ['🍎', '🍕', '🍔', '🍟', '🌭', '🍿', '🍫', '🍩', '🍪', '🍦']
    },
    {
      name: 'travel',
      emojis: ['🚗', '✈️', '🚆', '🚢', '🚀', '🏠', '🏖️', '🗼', '🗽', '🏰']
    },
    {
      name: 'objects',
      emojis: ['📱', '💻', '⌚', '📷', '🎮', '📚', '✏️', '📝', '🔑', '🎁']
    },
    {
      name: 'symbols',
      emojis: ['❤️', '✨', '🌟', '🎉', '💯', '🔥', '💡', '🔔', '🎈', '🎊']
    },
    {
      name: 'flags',
      emojis: ['🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺', '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳', '🇧🇷', '🇿🇦']
    }
  ];
  
  // Populate emoji grid
  emojiCategories.forEach(category => {
    const categorySection = document.createElement('div');
    categorySection.className = 'emoji-category-section';
    categorySection.dataset.category = category.name;
    
    const categoryTitle = document.createElement('h4');
    categoryTitle.textContent = category.name.charAt(0).toUpperCase() + category.name.slice(1);
    categorySection.appendChild(categoryTitle);
    
    const emojiContainer = document.createElement('div');
    emojiContainer.className = 'emoji-container';
    
    category.emojis.forEach(emoji => {
      const emojiBtn = document.createElement('button');
      emojiBtn.className = 'emoji-item';
      emojiBtn.textContent = emoji;
      emojiBtn.title = `Emoji: ${emoji}`;
      emojiBtn.addEventListener('click', () => insertEmoji(emoji));
      emojiContainer.appendChild(emojiBtn);
    });
    
    categorySection.appendChild(emojiContainer);
    emojiGrid.appendChild(categorySection);
  });
  
  // Set up category navigation
  const categoryButtons = document.querySelectorAll('.emoji-category');
  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      const category = button.dataset.category;
      const section = document.querySelector(`.emoji-category-section[data-category="${category}"]`);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// Toggle emoji picker visibility
function toggleEmojiPicker() {
  emojiPicker.classList.toggle('visible');
  if (emojiPicker.classList.contains('visible')) {
    emojiSearch.focus();
  }
}

// Filter emojis based on search input
function filterEmojis() {
  const searchTerm = emojiSearch.value.toLowerCase();
  const emojiItems = document.querySelectorAll('.emoji-item');
  
  emojiItems.forEach(item => {
    const emoji = item.textContent;
    const isVisible = emoji.includes(searchTerm) || 
                     (item.title && item.title.toLowerCase().includes(searchTerm));
    item.style.display = isVisible ? 'block' : 'none';
  });
  
  // Show/hide category sections based on visibility of their emojis
  document.querySelectorAll('.emoji-category-section').forEach(section => {
    const hasVisibleEmojis = Array.from(section.querySelectorAll('.emoji-item'))
      .some(item => item.style.display !== 'none');
    section.style.display = hasVisibleEmojis ? 'block' : 'none';
  });
}

// Insert emoji into message input
function insertEmoji(emoji) {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const textNode = document.createTextNode(emoji);
  
  // Insert at cursor position
  range.deleteContents();
  range.insertNode(textNode);
  
  // Move cursor after the inserted emoji
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Focus back on input
  messageInput.focus();
  
  // Trigger input event for typing detection
  const event = new Event('input', { bubbles: true });
  messageInput.dispatchEvent(event);
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  
  // Set icon based on type
  switch (type) {
    case 'success':
      icon.textContent = '✓';
      break;
    case 'error':
      icon.textContent = '✕';
      break;
    case 'warning':
      icon.textContent = '⚠️';
      break;
    default:
      icon.textContent = 'ℹ️';
  }
  
  const messageEl = document.createElement('span');
  messageEl.className = 'toast-message';
  messageEl.textContent = message;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });
  
  toast.appendChild(icon);
  toast.appendChild(messageEl);
  toast.appendChild(closeBtn);
  
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => {
    toast.classList.add('visible');
  }, 10);
  
  // Auto-remove after delay
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 5000);
}

// Play sound
function playSound(type) {
  if (type === 'message') {
    messageSound.currentTime = 0;
    messageSound.play().catch(e => console.error('Error playing sound:', e));
  } else if (type === 'notification') {
    notificationSound.currentTime = 0;
    notificationSound.play().catch(e => console.error('Error playing sound:', e));
  }
}

// Scroll chat to bottom
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle window resize
function handleWindowResize() {
  // Close emoji picker on mobile when keyboard appears
  if (window.innerWidth <= 768) {
    emojiPicker.classList.remove('visible');
  }
}

// Helper function to get user initials
function getInitials(name) {
  return name.split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
}

// Generate a random user ID
function generateUserId() {
  const id = 'user_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('userId', id);
  return id;
}

// Generate a random color for the user
function getRandomColor() {
  const colors = [
    '#4361ee', '#3f37c9', '#4cc9f0', '#4895ef', '#480ca8', // Blues and purples
    '#560bad', '#7209b7', '#b5179e', '#f72585', '#4cc9f0', // Purples and pinks
    '#2b2d42', '#8d99ae', '#ef233c', '#d90429', '#ff9e00', // Reds and oranges
    '#2ec4b6', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'  // Greens and oranges
  ];
  
  const color = colors[Math.floor(Math.random() * colors.length)];
  localStorage.setItem('userColor', color);
  return color;
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
