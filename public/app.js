// Socket.io connection
const socket = io();

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const errorMessage = document.getElementById('errorMessage');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const messagesContainer = document.getElementById('messagesContainer');
const usersList = document.getElementById('usersList');
const userCount = document.getElementById('userCount');
const logoutBtn = document.getElementById('logoutBtn');
const typingIndicator = document.getElementById('typingIndicator');
const chatTitle = document.getElementById('chatTitle');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileOverlay = document.getElementById('mobileOverlay');
const sidebar = document.getElementById('sidebar');
const generalChatBtn = document.getElementById('generalChatBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const imageBtn = document.getElementById('imageBtn');
const imageInput = document.getElementById('imageInput');
const imagePreviewModal = document.getElementById('imagePreviewModal');
const previewImage = document.getElementById('previewImage');
const imageCaption = document.getElementById('imageCaption');
const sendImageBtn = document.getElementById('sendImageBtn');
const cancelImageBtn = document.getElementById('cancelImageBtn');
const closePreviewModal = document.getElementById('closePreviewModal');
const imageViewerModal = document.getElementById('imageViewerModal');
const viewerImage = document.getElementById('viewerImage');
const closeViewerModal = document.getElementById('closeViewerModal');

let currentUsername = '';
let currentDisplayName = '';
let typingTimer = null;
let isTyping = false;
let currentChatType = 'general'; // 'general' or 'private'
let currentChatWith = null; // username for private chat
let selectedImageData = null;

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    
    if (username && password) {
        try {
            // Disable form during login
            loginForm.querySelector('button').disabled = true;
            loginForm.querySelector('button').textContent = 'กำลังเข้าสู่ระบบ...';
            
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                currentUsername = username;
                currentDisplayName = data.displayName;
                socket.emit('user joined', data.displayName);
                loginScreen.classList.remove('active');
                chatScreen.classList.add('active');
                messageInput.disabled = false;
                messageForm.querySelector('.btn-send').disabled = false;
                imageBtn.disabled = false;
                messageInput.focus();
            } else {
                showError(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
                loginForm.querySelector('button').disabled = false;
                loginForm.querySelector('button').textContent = 'เข้าสู่ระบบ';
            }
        } catch (error) {
            showError('เกิดข้อผิดพลาด: ' + error.message);
            loginForm.querySelector('button').disabled = false;
            loginForm.querySelector('button').textContent = 'เข้าสู่ระบบ';
        }
    }
});

// Mobile Menu Toggle
mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    mobileOverlay.classList.toggle('active');
});

mobileOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    mobileOverlay.classList.remove('active');
});

// Close mobile menu when clicking a user or chat room
function closeMobileMenu() {
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        mobileOverlay.classList.remove('active');
    }
}

// Clear Chat History
clearChatBtn.addEventListener('click', () => {
    const chatName = currentChatType === 'general' 
        ? 'ห้องแชททั่วไป' 
        : `แชทกับ ${currentChatWith}`;
    
    if (confirm(`คุณต้องการล้างประวัติ${chatName}หรือไม่?\n(การดำเนินการนี้ไม่สามารถย้อนกลับได้)`)) {
        if (currentChatType === 'general') {
            socket.emit('clear general chat');
        } else if (currentChatType === 'private') {
            socket.emit('clear private chat', currentChatWith);
        }
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        location.reload();
    }
});

// Switch to General Chat
generalChatBtn.addEventListener('click', () => {
    currentChatType = 'general';
    currentChatWith = null;
    chatTitle.textContent = '🌌 ห้องแชททั่วไป';
    messagesContainer.innerHTML = '';
    socket.emit('load general messages');
    
    // Update active state
    document.querySelectorAll('.user-item').forEach(item => item.classList.remove('active'));
    generalChatBtn.classList.add('active');
    
    closeMobileMenu();
});

// Image Upload Handlers
imageBtn.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('ขนาดไฟล์ใหญ่เกินไป! กรุณาเลือกรูปภาพที่มีขนาดไม่เกิน 5MB');
            imageInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            selectedImageData = event.target.result;
            previewImage.src = selectedImageData;
            imageCaption.value = '';
            imagePreviewModal.classList.add('active');
        };
        reader.readAsDataURL(file);
    }
    imageInput.value = '';
});

sendImageBtn.addEventListener('click', () => {
    if (selectedImageData) {
        const caption = imageCaption.value.trim();
        
        console.log('📤 Sending image:', {
            type: currentChatType,
            chatWith: currentChatWith,
            hasImage: !!selectedImageData,
            imageSize: selectedImageData.length,
            caption: caption
        });
        
        if (currentChatType === 'general') {
            socket.emit('chat message', { 
                type: 'image',
                image: selectedImageData,
                caption: caption
            });
        } else if (currentChatType === 'private') {
            socket.emit('private message', { 
                to: currentChatWith,
                type: 'image',
                image: selectedImageData,
                caption: caption
            });
            
            // Show own message immediately
            addPrivateMessage({
                from: currentDisplayName,
                to: currentChatWith,
                type: 'image',
                image: selectedImageData,
                caption: caption,
                timestamp: new Date().toISOString(),
                isOwn: true
            });
        }
        
        closeImagePreview();
    }
});

cancelImageBtn.addEventListener('click', closeImagePreview);
closePreviewModal.addEventListener('click', closeImagePreview);

function closeImagePreview() {
    imagePreviewModal.classList.remove('active');
    selectedImageData = null;
    previewImage.src = '';
    imageCaption.value = '';
}

// Image Viewer
closeViewerModal.addEventListener('click', () => {
    imageViewerModal.classList.remove('active');
    viewerImage.src = '';
});

function viewFullImage(imageSrc) {
    viewerImage.src = imageSrc;
    imageViewerModal.classList.add('active');
}

window.viewFullImage = viewFullImage;

// Send Message
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    
    if (text) {
        if (currentChatType === 'general') {
            socket.emit('chat message', { text });
        } else if (currentChatType === 'private') {
            socket.emit('private message', { 
                to: currentChatWith, 
                text 
            });
            
            // Show own message immediately
            addPrivateMessage({
                from: currentDisplayName,
                to: currentChatWith,
                text,
                timestamp: new Date().toISOString(),
                isOwn: true
            });
        }
        messageInput.value = '';
        stopTyping();
    }
});

// Typing Indicator
messageInput.addEventListener('input', () => {
    if (!isTyping) {
        isTyping = true;
        socket.emit('typing', true);
    }

    clearTimeout(typingTimer);
    typingTimer = setTimeout(stopTyping, 1000);
});

function stopTyping() {
    if (isTyping) {
        isTyping = false;
        socket.emit('typing', false);
    }
}

// Socket Events
socket.on('load messages', (messages) => {
    messagesContainer.innerHTML = '';
    if (messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <h3>🎉 ยินดีต้อนรับสู่ห้องแชท!</h3>
                <p>เริ่มสนทนากับเพื่อนๆ ของคุณได้เลย</p>
            </div>
        `;
    } else {
        messages.forEach(message => {
            addMessage(message);
        });
    }
});

socket.on('chat message', (message) => {
    addMessage(message);
    scrollToBottom();
});

socket.on('system message', (data) => {
    const messageEl = document.createElement('div');
    messageEl.className = 'system-message';
    messageEl.textContent = `${data.text} • ${formatTime(data.timestamp)}`;
    messagesContainer.appendChild(messageEl);
    scrollToBottom();
});

socket.on('user list', (users) => {
    const otherUsers = users.filter(u => u !== currentDisplayName);
    userCount.textContent = otherUsers.length;
    usersList.innerHTML = '';
    
    otherUsers.forEach(username => {
        const userEl = document.createElement('div');
        userEl.className = 'user-item';
        userEl.textContent = `💬 ${username}`;
        userEl.dataset.username = username;
        
        // Click to open private chat
        userEl.addEventListener('click', () => {
            openPrivateChat(username);
        });
        
        usersList.appendChild(userEl);
    });
    
    // Restore active state if in private chat
    if (currentChatType === 'private' && currentChatWith) {
        const activeUser = usersList.querySelector(`[data-username="${currentChatWith}"]`);
        if (activeUser) {
            activeUser.classList.add('active');
        }
    }
});

socket.on('user typing', ({ username, isTyping }) => {
    // Only show typing indicator in general chat
    if (currentChatType === 'general') {
        if (isTyping) {
            typingIndicator.textContent = `${username} กำลังพิมพ์...`;
        } else {
            typingIndicator.textContent = '';
        }
    }
});

// Private Message Events
socket.on('private message', (data) => {
    console.log('📨 Received private message:', {
        from: data.from,
        to: data.to,
        type: data.type,
        hasImage: !!data.image,
        currentChatWith: currentChatWith,
        currentChatType: currentChatType
    });
    
    if (currentChatType === 'private' && 
        (data.from === currentChatWith || data.to === currentChatWith)) {
        console.log('✅ Adding private message to chat');
        addPrivateMessage(data);
        scrollToBottom();
    } else {
        console.log('⚠️ Message not added - wrong chat or type');
    }
});

socket.on('load private messages', (messages) => {
    messagesContainer.innerHTML = '';
    if (messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <h3>💫 แชทส่วนตัว</h3>
                <p>เริ่มสนทนากับ ${currentChatWith}</p>
            </div>
        `;
    } else {
        messages.forEach(msg => {
            addPrivateMessage(msg);
        });
    }
    scrollToBottom();
});

// Clear chat events
socket.on('general chat cleared', () => {
    if (currentChatType === 'general') {
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <h3>🎉 ประวัติแชทถูกล้างแล้ว</h3>
                <p>เริ่มสนทนาใหม่ได้เลย</p>
            </div>
        `;
    }
});

socket.on('private chat cleared', () => {
    messagesContainer.innerHTML = `
        <div class="welcome-message">
            <h3>💫 ประวัติแชทถูกล้างแล้ว</h3>
            <p>เริ่มสนทนากับ ${currentChatWith} ใหม่</p>
        </div>
    `;
});

// Delete message events
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

// Private Chat Functions
function openPrivateChat(username) {
    currentChatType = 'private';
    currentChatWith = username;
    chatTitle.textContent = `💫 แชทส่วนตัวกับ ${username}`;
    messagesContainer.innerHTML = '<div class="welcome-message"><h3>⏳ กำลังโหลดข้อความ...</h3></div>';
    
    // Update active state
    document.querySelectorAll('.user-item').forEach(item => item.classList.remove('active'));
    const userItem = usersList.querySelector(`[data-username="${username}"]`);
    if (userItem) {
        userItem.classList.add('active');
    }
    
    // Request private messages
    socket.emit('load private messages', username);
    
    closeMobileMenu();
}

function addPrivateMessage(data) {
    console.log('🎨 Adding private message:', {
        type: data.type,
        hasImage: !!data.image,
        imageSize: data.image ? data.image.length : 0,
        from: data.from,
        isOwn: data.from === currentDisplayName || data.isOwn
    });
    
    const isOwn = data.from === currentDisplayName || data.isOwn;
    const displayName = isOwn ? currentDisplayName : data.from;
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${isOwn ? 'own' : ''}`;
    messageEl.dataset.messageId = data.id || `${data.from}-${data.timestamp}`;
    
    const avatar = displayName.charAt(0).toUpperCase();
    const time = formatTime(data.timestamp);
    
    const deleteBtn = isOwn ? `<button class="delete-message-btn" onclick="deletePrivateMessage('${messageEl.dataset.messageId}')">🗑️</button>` : '';
    
    let messageContent = '';
    if (data.type === 'image' && data.image) {
        console.log('🖼️ Creating image message');
        messageContent = `
            <img src="${data.image}" class="message-image" onclick="viewFullImage('${data.image}')" alt="Image" onerror="console.error('❌ Image failed to load')">
            ${data.caption ? `<div class="message-caption">${escapeHtml(data.caption)}</div>` : ''}
        `;
    } else {
        console.log('📝 Creating text message');
        messageContent = escapeHtml(data.text || '');
    }
    
    messageEl.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-username">${displayName}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-bubble">
                ${messageContent}
                ${deleteBtn}
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageEl);
    console.log('✅ Message added to DOM');
}

// Delete Functions
function deleteMessage(messageId) {
    if (confirm('ลบข้อความนี้หรือไม่?')) {
        socket.emit('delete message', messageId);
    }
}

function deletePrivateMessage(messageId) {
    if (confirm('ลบข้อความนี้หรือไม่?')) {
        socket.emit('delete private message', { messageId, chatWith: currentChatWith });
    }
}

// Make functions global for inline onclick
window.deleteMessage = deleteMessage;
window.deletePrivateMessage = deletePrivateMessage;

// Helper Functions
function addMessage(message) {
    const isOwn = message.username === currentDisplayName;
    const messageEl = document.createElement('div');
    messageEl.className = `message ${isOwn ? 'own' : ''}`;
    messageEl.dataset.messageId = message.id;
    
    const avatar = message.username.charAt(0).toUpperCase();
    const time = formatTime(message.timestamp);
    
    const deleteBtn = isOwn ? `<button class="delete-message-btn" onclick="deleteMessage('${message.id}')">🗑️</button>` : '';
    
    let messageContent = '';
    if (message.type === 'image') {
        messageContent = `
            <img src="${message.image}" class="message-image" onclick="viewFullImage('${message.image}')" alt="Image">
            ${message.caption ? `<div class="message-caption">${escapeHtml(message.caption)}</div>` : ''}
        `;
    } else {
        messageContent = escapeHtml(message.text);
    }
    
    messageEl.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-username">${message.username}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-bubble">
                ${messageContent}
                ${deleteBtn}
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageEl);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-focus username input on load
usernameInput.focus();

// Set general chat as default active
if (generalChatBtn) {
    generalChatBtn.classList.add('active');
}

