// Socket.IO connection
let socket = null;
let currentUser = null;
let currentChat = 'general';
let currentChatPartner = null;
let typingTimeout = null;
let pendingImageData = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const errorMessage = document.getElementById('errorMessage');
const messagesContainer = document.getElementById('messagesContainer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const usersList = document.getElementById('usersList');
const userCount = document.getElementById('userCount');
const logoutBtn = document.getElementById('logoutBtn');
const chatTitle = document.getElementById('chatTitle');
const typingIndicator = document.getElementById('typingIndicator');
const generalChatBtn = document.getElementById('generalChatBtn');
const clearChatForMeBtn = document.getElementById('clearChatForMeBtn');
const adminPanelBtn = document.getElementById('adminPanelBtn');
const sleepModeBtn = document.getElementById('sleepModeBtn');
const imageInput = document.getElementById('imageInput');

// Debug: Check if elements exist
console.log('Elements check:', {
    generalChatBtn: !!generalChatBtn,
    clearChatForMeBtn: !!clearChatForMeBtn,
    adminPanelBtn: !!adminPanelBtn,
    sleepModeBtn: !!sleepModeBtn,
    imageInput: !!imageInput
});
const imageBtn = document.getElementById('imageBtn');
const imagePreviewModal = document.getElementById('imagePreviewModal');
const previewImage = document.getElementById('previewImage');
const imageCaption = document.getElementById('imageCaption');
const sendImageBtn = document.getElementById('sendImageBtn');
const cancelImageBtn = document.getElementById('cancelImageBtn');
const closePreviewModal = document.getElementById('closePreviewModal');
const imageViewerModal = document.getElementById('imageViewerModal');
const viewerImage = document.getElementById('viewerImage');
const closeViewerModal = document.getElementById('closeViewerModal');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileOverlay = document.getElementById('mobileOverlay');
const sidebar = document.getElementById('sidebar');

// Admin Panel elements
const adminPanelModal = document.getElementById('adminPanelModal');
const closeAdminModal = document.getElementById('closeAdminModal');
const clearAllChatBtn = document.getElementById('clearAllChatBtn');
const usersListAdmin = document.getElementById('usersListAdmin');
const changePasswordModal = document.getElementById('changePasswordModal');
const closePasswordModal = document.getElementById('closePasswordModal');
const newPasswordInput = document.getElementById('newPasswordInput');
const savePasswordBtn = document.getElementById('savePasswordBtn');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
const passwordUserInfo = document.getElementById('passwordUserInfo');

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    checkSession();
    setupEventListeners();
    
    // Add global helper function for debugging
    window.clearChatTimestamps = function() {
        localStorage.removeItem('chatClearTimestamps');
        console.log('✅ Cleared chat timestamps! Please refresh the page.');
        alert('ล้าง chat timestamps สำเร็จ! กรุณารีเฟรชหน้าเว็บ (F5)');
    };
    
    // Add function to check localStorage
    window.checkChatTimestamps = function() {
        const data = localStorage.getItem('chatClearTimestamps');
        console.log('📊 Current localStorage:', data);
        return data ? JSON.parse(data) : {};
    };
    
    console.log('💡 Debug: Type clearChatTimestamps() or checkChatTimestamps() in console');
});

// Check if user is already logged in
async function checkSession() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (data.loggedIn) {
            currentUser = {
                userId: data.userId,
                username: data.username,
                displayName: data.displayName,
                role: data.role
            };
            showChatScreen();
            
            // Update user display name in sidebar
            const userDisplayName = document.getElementById('userDisplayName');
            if (userDisplayName) {
                userDisplayName.textContent = `💬 ${data.displayName}`;
            }
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Login form
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    
    // Logout
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Message form
    if (messageForm) messageForm.addEventListener('submit', handleSendMessage);
    
    // Message input typing
    if (messageInput) messageInput.addEventListener('input', handleTyping);
    
    // General chat button
    if (generalChatBtn) generalChatBtn.addEventListener('click', () => switchToGeneralChat());
    
    // Clear chat for me button
    if (clearChatForMeBtn) {
        console.log('Clear chat button found, adding listener');
        clearChatForMeBtn.addEventListener('click', handleClearChatForMe);
    } else {
        console.error('Clear chat button not found!');
    }
    
    // Image upload
    if (imageBtn) imageBtn.addEventListener('click', () => imageInput.click());
    if (imageInput) imageInput.addEventListener('change', handleImageSelect);
    if (sendImageBtn) sendImageBtn.addEventListener('click', handleSendImage);
    if (cancelImageBtn) cancelImageBtn.addEventListener('click', closeImagePreview);
    if (closePreviewModal) closePreviewModal.addEventListener('click', closeImagePreview);
    
    // Image viewer
    if (closeViewerModal) closeViewerModal.addEventListener('click', closeImageViewer);
    if (imageViewerModal) imageViewerModal.addEventListener('click', (e) => {
        if (e.target === imageViewerModal) closeImageViewer();
    });
    
    // Mobile menu
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    if (mobileOverlay) mobileOverlay.addEventListener('click', toggleMobileMenu);
    
    // Admin Panel
    if (adminPanelBtn) adminPanelBtn.addEventListener('click', openAdminPanel);
    if (closeAdminModal) closeAdminModal.addEventListener('click', closeAdminPanel);
    if (clearAllChatBtn) clearAllChatBtn.addEventListener('click', handleClearAllChat);
    
    // Change Password
    if (closePasswordModal) closePasswordModal.addEventListener('click', closeChangePassword);
    if (cancelPasswordBtn) cancelPasswordBtn.addEventListener('click', closeChangePassword);
    if (savePasswordBtn) savePasswordBtn.addEventListener('click', handleSavePassword);
    
    // Sleep Mode - DISABLED
    if (sleepModeBtn) {
        sleepModeBtn.style.display = 'none';
        console.log('Sleep mode button hidden');
    }
    
    console.log('Event listeners setup complete');
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    console.log('handleLogin called');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    console.log('Login attempt:', { username, password: password ? '***' : 'empty' });
    
    if (!username || !password) {
        showError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = {
                userId: data.userId,
                username: data.username,
                displayName: data.displayName,
                role: data.role
            };
            showChatScreen();
            
            // Update user display name in sidebar
            const userDisplayName = document.getElementById('userDisplayName');
            if (userDisplayName) {
                userDisplayName.textContent = `💬 ${data.displayName}`;
            }
            
            // Show admin panel button if user is admin
            if (data.role === 'admin') {
                adminPanelBtn.style.display = 'flex';
            }
        } else {
            showError(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    }
}

// Handle logout
async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        
        currentUser = null;
        currentChat = 'general';
        currentChatPartner = null;
        
        // Reset user display name to Vega
        const userDisplayName = document.getElementById('userDisplayName');
        if (userDisplayName) {
            userDisplayName.textContent = '💬 Vega';
        }
        
        loginScreen.classList.add('active');
        chatScreen.classList.remove('active');
        
        usernameInput.value = '';
        passwordInput.value = '';
        messagesContainer.innerHTML = '<div class="welcome-message"><h3>🎉 ยินดีต้อนรับสู่ห้องแชท!</h3><p>เริ่มสนทนากับเพื่อนๆ ของคุณได้เลย</p></div>';
        
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Show chat screen
function showChatScreen() {
    console.log('showChatScreen called');
    loginScreen.classList.remove('active');
    chatScreen.classList.add('active');
    
    // Initialize Socket.IO
    initializeSocket();
    
    // Enable input fields
    messageInput.disabled = false;
    imageBtn.disabled = false;
    document.querySelector('.btn-send').disabled = false;
}

// Initialize Socket.IO
function initializeSocket() {
    console.log('initializeSocket called');
    socket = io({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity
    });
    
    // Connection events
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('user joined', {
            userId: currentUser.userId,
            username: currentUser.username,
            displayName: currentUser.displayName
        });
        
        // Sleep mode disabled
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
    
    // User list
    socket.on('user list', (users) => {
        updateUsersList(users);
    });
    
    // Messages
    socket.on('load messages', (messages) => {
        messagesContainer.innerHTML = '';
        console.log('Loading general messages:', messages);
        const chatKey = 'general';
        messages.forEach(msg => {
            if (shouldDisplayMessage(msg.created_at, chatKey)) {
                displayMessage(msg);
            }
        });
        scrollToBottom();
    });
    
    socket.on('chat message', (message) => {
        console.log('🔔 Received general message:', message);
        console.log('📍 Current chat:', currentChat);
        
        if (currentChat === 'general') {
            const chatKey = 'general';
            const shouldShow = shouldDisplayMessage(message.created_at, chatKey);
            console.log('🔍 Should display?', shouldShow);
            
            if (shouldShow) {
                console.log('✅ Displaying general message:', message);
                displayMessage(message);
                scrollToBottom();
            } else {
                console.log('❌ General message filtered out by timestamp');
                console.log('💡 Hint: Try clearing localStorage.removeItem("chatClearTimestamps") and refresh');
            }
        } else {
            console.log('⚠️ Not in general chat, ignoring message');
        }
    });
    
    socket.on('private message', (message) => {
        console.log('Received private message:', message);
        if (currentChat === 'private') {
            const isRelevant = 
                (message.from === currentChatPartner && message.to === currentUser.displayName) ||
                (message.from === currentUser.displayName && message.to === currentChatPartner);
            
            console.log('Private message relevance check:', {
                isRelevant,
                from: message.from,
                to: message.to,
                currentChatPartner,
                currentUser: currentUser.displayName
            });
            
            if (isRelevant) {
                const chatKey = `private_${currentChatPartner}`;
                if (shouldDisplayMessage(message.created_at, chatKey)) {
                    console.log('Displaying private message:', message);
                    displayPrivateMessage(message);
                    scrollToBottom();
                } else {
                    console.log('Private message filtered out by timestamp');
                }
            } else {
                console.log('Private message not relevant to current chat');
            }
        } else {
            console.log('Not in private chat, ignoring message');
        }
    });
    
    socket.on('load private messages', (messages) => {
        messagesContainer.innerHTML = '';
        console.log('🔔 Loading private messages:', messages);
        console.log('📍 Current chat partner:', currentChatPartner);
        const chatKey = `private_${currentChatPartner}`;
        console.log('🔑 Chat key:', chatKey);
        
        messages.forEach((msg, index) => {
            const shouldShow = shouldDisplayMessage(msg.created_at, chatKey);
            console.log(`📝 Message ${index + 1}:`, {
                text: msg.text,
                created_at: msg.created_at,
                shouldShow: shouldShow
            });
            
            if (shouldShow) {
                console.log('✅ Displaying private message:', msg);
                displayPrivateMessage(msg);
            } else {
                console.log('❌ Private message filtered out by timestamp');
            }
        });
        scrollToBottom();
    });
    
    // System messages
    socket.on('system message', (data) => {
        console.log('Received system message:', data);
        displaySystemMessage(data.text);
    });
    
    // Typing indicator
    socket.on('user typing', (data) => {
        if (currentChat === 'general' && data.username !== currentUser.displayName) {
            if (data.isTyping) {
                typingIndicator.textContent = `${data.username} กำลังพิมพ์...`;
            } else {
                typingIndicator.textContent = '';
            }
        }
    });
    
    // Message deletion
    socket.on('message deleted', (messageId) => {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            messageEl.style.animation = 'fadeOut 0.3s';
            setTimeout(() => messageEl.remove(), 300);
        }
    });
    
    socket.on('private message deleted', (messageId) => {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            messageEl.style.animation = 'fadeOut 0.3s';
            setTimeout(() => messageEl.remove(), 300);
        }
    });
    
    // Clear chat
    socket.on('general chat cleared', () => {
        if (currentChat === 'general') {
            messagesContainer.innerHTML = '<div class="welcome-message"><h3>🎉 ยินดีต้อนรับสู่ห้องแชท!</h3><p>เริ่มสนทนากับเพื่อนๆ ของคุณได้เลย</p></div>';
        }
    });
    
    socket.on('private chat cleared', () => {
        if (currentChat === 'private') {
            messagesContainer.innerHTML = '<div class="welcome-message"><h3>🎉 ยินดีต้อนรับสู่ห้องแชท!</h3><p>เริ่มสนทนากับเพื่อนๆ ของคุณได้เลย</p></div>';
        }
    });
}

// Update users list
function updateUsersList(users) {
    const otherUsers = users.filter(u => u.username !== currentUser.username);
    userCount.textContent = otherUsers.length;
    
    usersList.innerHTML = '';
    
    otherUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `<span>${user.displayName}</span>`;
        userItem.addEventListener('click', () => switchToPrivateChat(user.displayName));
        usersList.appendChild(userItem);
    });
}

// Switch to general chat
function switchToGeneralChat() {
    currentChat = 'general';
    currentChatPartner = null;
    chatTitle.textContent = '🌌 ห้องแชททั่วไป';
    
    // Update active state
    document.querySelectorAll('.user-item').forEach(item => item.classList.remove('active'));
    generalChatBtn.classList.add('active');
    
    // Load messages
    socket.emit('load messages');
    
    // Show clear button for general chat
    clearChatForMeBtn.style.display = 'flex';
    
    // Close mobile menu
    closeMobileMenu();
}

// Switch to private chat
function switchToPrivateChat(username) {
    currentChat = 'private';
    currentChatPartner = username;
    chatTitle.textContent = `💬 ${username}`;
    
    // Update active state
    document.querySelectorAll('.user-item').forEach(item => {
        if (item.textContent.trim() === username) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    generalChatBtn.classList.remove('active');
    
    // Load private messages
    socket.emit('load private messages', username);
    
    // Show clear button for private chat
    clearChatForMeBtn.style.display = 'flex';
    
    // Close mobile menu
    closeMobileMenu();
}

// Handle send message
function handleSendMessage(e) {
    e.preventDefault();
    
    const text = messageInput.value.trim();
    if (!text) return;
    
    console.log('Sending message:', { text, currentChat, currentChatPartner });
    
    if (currentChat === 'general') {
        console.log('Emitting general chat message');
        socket.emit('chat message', { type: 'text', text });
    } else if (currentChat === 'private') {
        console.log('Emitting private message to:', currentChatPartner);
        socket.emit('private message', { 
            to: currentChatPartner, 
            type: 'text', 
            text 
        });
    }
    
    messageInput.value = '';
    socket.emit('typing', false);
}

// Handle typing
function handleTyping() {
    if (currentChat === 'general') {
        socket.emit('typing', true);
        
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('typing', false);
        }, 1000);
    }
}

// Display message (general chat)
function displayMessage(message) {
    console.log('displayMessage called with:', message);
    const messageDiv = document.createElement('div');
    messageDiv.className = `message${message.username === currentUser.displayName ? ' own' : ''}`;
    messageDiv.setAttribute('data-message-id', message.id);
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.username.charAt(0).toUpperCase();
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const header = document.createElement('div');
    header.className = 'message-header';
    
    const username = document.createElement('span');
    username.className = 'message-username';
    username.textContent = message.username;
    
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = formatTime(message.created_at);
    
    header.appendChild(username);
    header.appendChild(time);
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    // Add delete button if own message
    if (message.username === currentUser.displayName) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-message-btn';
        deleteBtn.innerHTML = '🗑️ ลบ';
        deleteBtn.onclick = () => deleteMessage(message.id);
        bubble.appendChild(deleteBtn);
    }
    
    if (message.type === 'image') {
        const img = document.createElement('img');
        img.className = 'message-image';
        img.src = message.image;
        img.alt = 'Image';
        img.onclick = () => openImageViewer(message.image);
        bubble.appendChild(img);
        
        if (message.caption) {
            const caption = document.createElement('div');
            caption.className = 'message-caption';
            caption.textContent = message.caption;
            bubble.appendChild(caption);
        }
    } else {
        bubble.appendChild(document.createTextNode(message.text));
    }
    
    content.appendChild(header);
    content.appendChild(bubble);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    messagesContainer.appendChild(messageDiv);
}

// Display private message
function displayPrivateMessage(message) {
    console.log('displayPrivateMessage called with:', message);
    const messageDiv = document.createElement('div');
    messageDiv.className = `message${message.from === currentUser.displayName ? ' own' : ''}`;
    messageDiv.setAttribute('data-message-id', message.id);
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.from.charAt(0).toUpperCase();
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const header = document.createElement('div');
    header.className = 'message-header';
    
    const username = document.createElement('span');
    username.className = 'message-username';
    username.textContent = message.from;
    
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = formatTime(message.created_at);
    
    header.appendChild(username);
    header.appendChild(time);
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    // Add delete button if own message OR if user is Pluto (can delete any message)
    if (message.from === currentUser.displayName || currentUser.displayName === 'Pluto') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-message-btn';
        deleteBtn.innerHTML = '🗑️ ลบ';
        deleteBtn.onclick = () => deletePrivateMessage(message.id);
        bubble.appendChild(deleteBtn);
    }
    
    if (message.type === 'image') {
        const img = document.createElement('img');
        img.className = 'message-image';
        img.src = message.image;
        img.alt = 'Image';
        img.onclick = () => openImageViewer(message.image);
        bubble.appendChild(img);
        
        if (message.caption) {
            const caption = document.createElement('div');
            caption.className = 'message-caption';
            caption.textContent = message.caption;
            bubble.appendChild(caption);
        }
    } else {
        bubble.appendChild(document.createTextNode(message.text));
    }
    
    content.appendChild(header);
    content.appendChild(bubble);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    messagesContainer.appendChild(messageDiv);
}

// Display system message
function displaySystemMessage(text) {
    console.log('displaySystemMessage called with:', text);
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Delete message
function deleteMessage(messageId) {
    if (confirm('คุณต้องการลบข้อความนี้หรือไม่?')) {
        socket.emit('delete message', messageId);
    }
}

// Delete private message
function deletePrivateMessage(messageId) {
    if (confirm('คุณต้องการลบข้อความนี้หรือไม่?')) {
        socket.emit('delete private message', { messageId });
    }
}

// Handle clear chat for me (Pluto and Saturn can delete from database)
function handleClearChatForMe() {
    console.log('handleClearChatForMe called');
    
    if (!clearChatForMeBtn) {
        console.error('Clear chat button not found!');
        alert('ไม่พบปุ่มล้างแชท');
        return;
    }
    
    const canDeleteFromDB = currentUser.displayName === 'Pluto' || currentUser.displayName === 'Saturn';
    const chatKey = currentChat === 'general' ? 'general' : `private_${currentChatPartner}`;
    
    let message;
    if (canDeleteFromDB) {
        message = 'คุณแน่ใจ?';
    } else {
        message = currentChat === 'general' 
            ? 'คุณต้องการล้างแชททั่วไปในฝั่งของคุณหรือไม่? (เฉพาะคุณเท่านั้นที่จะเห็นการเปลี่ยนแปลง)'
            : `คุณต้องการล้างแชทกับ ${currentChatPartner} ในฝั่งของคุณหรือไม่? (เฉพาะคุณเท่านั้นที่จะเห็นการเปลี่ยนแปลง)`;
    }
    
    console.log('Clear chat requested:', { chatKey, currentChat, currentChatPartner, canDeleteFromDB });
    
    if (confirm(message)) {
        if (canDeleteFromDB) {
            // Delete from database
            if (currentChat === 'general') {
                socket.emit('clear general chat from db');
            } else {
                socket.emit('clear private chat from db', currentChatPartner);
            }
        } else {
            // Local clear only
            const clearData = getClearChatData();
            const clearTimestamp = new Date().toISOString();
            clearData[chatKey] = clearTimestamp;
            localStorage.setItem('chatClearTimestamps', JSON.stringify(clearData));
            
            // Clear messages from view
            messagesContainer.innerHTML = '<div class="welcome-message"><h3>🎉 ยินดีต้อนรับสู่ห้องแชท!</h3><p>เริ่มสนทนากับเพื่อนๆ ของคุณได้เลย</p></div>';
            
            // Show success message
            displaySystemMessage('ล้างแชทในฝั่งของคุณเรียบร้อยแล้ว');
        }
        console.log('Chat cleared successfully');
    }
}

// Get clear chat data from localStorage
function getClearChatData() {
    const data = localStorage.getItem('chatClearTimestamps');
    return data ? JSON.parse(data) : {};
}

// Check if message should be displayed based on clear timestamp
function shouldDisplayMessage(messageTimestamp, chatKey) {
    // DISABLED: Always show messages (localStorage filtering removed)
    console.log('📝 Message display check:', {
        messageTimestamp,
        chatKey,
        decision: 'ALWAYS_SHOW'
    });
    return true;
}

// Image handling
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('กรุณาเลือกไฟล์รูปภาพ');
        return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('ขนาดไฟล์ต้องไม่เกิน 10MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        pendingImageData = e.target.result;
        previewImage.src = pendingImageData;
        imagePreviewModal.classList.add('active');
    };
    reader.readAsDataURL(file);
}

function handleSendImage() {
    if (!pendingImageData) return;
    
    const caption = imageCaption.value.trim();
    
    if (currentChat === 'general') {
        socket.emit('chat message', {
            type: 'image',
            image: pendingImageData,
            caption: caption || null
        });
    } else if (currentChat === 'private') {
        socket.emit('private message', {
            to: currentChatPartner,
            type: 'image',
            image: pendingImageData,
            caption: caption || null
        });
    }
    
    closeImagePreview();
}

function closeImagePreview() {
    imagePreviewModal.classList.remove('active');
    pendingImageData = null;
    imageCaption.value = '';
    imageInput.value = '';
}

function openImageViewer(imageSrc) {
    viewerImage.src = imageSrc;
    imageViewerModal.classList.add('active');
}

function closeImageViewer() {
    imageViewerModal.classList.remove('active');
    viewerImage.src = '';
}

// Mobile menu
function toggleMobileMenu() {
    sidebar.classList.toggle('active');
    mobileOverlay.classList.toggle('active');
}

function closeMobileMenu() {
    sidebar.classList.remove('active');
    mobileOverlay.classList.remove('active');
}

// Utility functions
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function scrollToBottom() {
    console.log('scrollToBottom called');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

// Admin Panel Functions
async function openAdminPanel() {
    adminPanelModal.classList.add('active');
    await loadUsersForAdmin();
}

function closeAdminPanel() {
    adminPanelModal.classList.remove('active');
}

async function loadUsersForAdmin() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (data.success) {
            usersListAdmin.innerHTML = '';
            data.users.forEach(user => {
                const userItem = document.createElement('div');
                userItem.className = 'user-admin-item';
                userItem.innerHTML = `
                    <div class="user-admin-info">
                        <div class="user-admin-name">${user.display_name}</div>
                        <div class="user-admin-username">@${user.username}</div>
                        <div class="user-admin-role">${user.role}</div>
                    </div>
                    <div class="user-admin-actions">
                        <button class="btn-change-password" onclick="openChangePassword(${user.id}, '${user.display_name}', '${user.username}')">
                            🔑 เปลี่ยนรหัสผ่าน
                        </button>
                        ${user.role !== 'admin' ? `
                        <button class="btn-delete-user" onclick="deleteUser(${user.id}, '${user.display_name}')">
                            🗑️ ลบผู้ใช้
                        </button>
                        ` : ''}
                    </div>
                `;
                usersListAdmin.appendChild(userItem);
            });
        }
    } catch (error) {
        console.error('Error loading users for admin:', error);
    }
}

async function handleClearAllChat() {
    if (confirm('คุณต้องการล้างข้อมูลแชททั้งหมดหรือไม่? การกระทำนี้ไม่สามารถกู้คืนได้!')) {
        try {
            const response = await fetch('/api/admin/clear-all-chat', {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                alert('ล้างข้อมูลแชททั้งหมดสำเร็จ');
                closeAdminPanel();
            } else {
                alert(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            console.error('Error clearing all chat:', error);
            alert('เกิดข้อผิดพลาด');
        }
    }
}

let currentPasswordUserId = null;

function openChangePassword(userId, displayName, username) {
    currentPasswordUserId = userId;
    passwordUserInfo.innerHTML = `
        <strong>ผู้ใช้:</strong> ${displayName}<br>
        <strong>Username:</strong> @${username}
    `;
    newPasswordInput.value = '';
    changePasswordModal.classList.add('active');
}

function closeChangePassword() {
    changePasswordModal.classList.remove('active');
    currentPasswordUserId = null;
    newPasswordInput.value = '';
}

async function handleSavePassword() {
    const newPassword = newPasswordInput.value.trim();
    
    if (!newPassword || newPassword.length < 6) {
        alert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/change-password/${currentPasswordUserId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            closeChangePassword();
        } else {
            alert(data.message || 'เกิดข้อผิดพลาด');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        alert('เกิดข้อผิดพลาด');
    }
}

async function deleteUser(userId, displayName) {
    if (confirm(`คุณต้องการลบผู้ใช้ "${displayName}" หรือไม่? การกระทำนี้ไม่สามารถกู้คืนได้!`)) {
        try {
            const response = await fetch(`/api/admin/delete-user/${userId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(data.message);
                await loadUsersForAdmin();
            } else {
                alert(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('เกิดข้อผิดพลาด');
        }
    }
}

// Sleep Mode Functions
async function loadSleepModeStatus() {
    try {
        console.log('Loading sleep mode status...');
        const response = await fetch('/api/sleep-mode');
        console.log('Sleep mode response status:', response.status);
        const data = await response.json();
        console.log('Sleep mode response data:', data);
        
        if (data.success) {
            updateSleepModeButton(data.sleepMode);
        } else {
            console.log('Sleep mode status not available:', data.message);
            updateSleepModeButton(false);
        }
    } catch (error) {
        console.error('Error loading sleep mode status:', error);
        updateSleepModeButton(false);
    }
}

function updateSleepModeButton(isSleeping) {
    console.log('Updating sleep mode button:', { isSleeping, sleepModeBtn: !!sleepModeBtn });
    
    if (!sleepModeBtn) {
        console.error('Sleep mode button not found!');
        return;
    }
    
    if (isSleeping) {
        sleepModeBtn.textContent = '😴 ปิดโหมดสลีป';
        sleepModeBtn.classList.add('active');
        console.log('Sleep mode button set to active');
    } else {
        sleepModeBtn.textContent = '😴 โหมดสลีป';
        sleepModeBtn.classList.remove('active');
        console.log('Sleep mode button set to inactive');
    }
}

async function toggleSleepMode() {
    console.log('toggleSleepMode called');
    
    if (!sleepModeBtn) {
        console.error('Sleep mode button not found!');
        alert('ไม่พบปุ่มโหมดสลีป');
        return;
    }
    
    try {
        const currentStatus = sleepModeBtn.classList.contains('active');
        const newStatus = !currentStatus;
        
        console.log('Toggling sleep mode:', { currentStatus, newStatus });
        
        const response = await fetch('/api/sleep-mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: newStatus })
        });
        
        console.log('Sleep mode response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Sleep mode response data:', data);
        
        if (data.success) {
            updateSleepModeButton(newStatus);
            displaySystemMessage(data.message);
            console.log('Sleep mode updated successfully');
        } else {
            console.error('Sleep mode toggle failed:', data.message);
            alert(data.message || 'เกิดข้อผิดพลาดในการเปลี่ยนโหมดสลีป');
        }
    } catch (error) {
        console.error('Error toggling sleep mode:', error);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
}

