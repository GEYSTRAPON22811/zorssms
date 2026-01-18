// ========== ПОДКЛЮЧЕНИЕ К СЕРВЕРУ ==========

const socket = io();

let currentUser = null;
let selectedFriendId = null;
let friendsData = [];

// ========== РЕГИСТРАЦИЯ ==========

function generateNewId() {
    const randomId = 'USER_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    document.getElementById('generatedId').textContent = `ID: ${randomId}`;
    return randomId;
}

function register() {
    const username = document.getElementById('registerUsername').value.trim();

    if (!username) {
        showAlert('Пожалуйста, введите ваше имя', 'error');
        return;
    }

    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                currentUser = data.user;
                currentUser.bio = '';
                currentUser.avatar = '';
                showAlert(`Аккаунт создан! ID: ${data.user.id}`, 'success');

                // Подключиться к сокету
                socket.emit('userConnect', currentUser.id);

                // Перейти на основной экран
                setTimeout(() => {
                    showMainScreen();
                    updateUI();
                }, 1000);
            }
        })
        .catch(err => {
            console.error('Ошибка регистрации:', err);
            showAlert('Ошибка регистрации', 'error');
        });
}

// ========== УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ ==========

function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff6b6b' : type === 'success' ? '#51cf66' : '#339af0'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

function showMainScreen() {
    document.getElementById('registerScreen').classList.remove('active');
    document.getElementById('mainScreen').classList.add('active');
}

function updateUI() {
    updateUserInfo();
    updateFriendsList();
}

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('currentUserName').textContent = currentUser.name;
        document.getElementById('currentUserId').textContent = 'ID: ' + currentUser.id;
    }
}

function copyUserId() {
    if (currentUser) {
        navigator.clipboard.writeText(currentUser.id);
        showAlert('ID скопирован!', 'success');
    }
}

function addFriend() {
    const friendId = document.getElementById('friendId').value.trim();

    if (!friendId) {
        showAlert('Введите ID друга', 'error');
        return;
    }

    fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, friendId })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showAlert('Друг добавлен!', 'success');
                document.getElementById('friendId').value = '';
            } else {
                showAlert(data.error, 'error');
            }
        })
        .catch(err => showAlert('Ошибка при добавлении друга', 'error'));
}

function updateFriendsList() {
    fetch(`/api/friends/${currentUser.id}`)
        .then(res => res.json())
        .then(friends => {
            friendsData = friends;
            renderFriends();
        });
}

function renderFriends() {
    const friendsList = document.getElementById('friendsList');
    document.getElementById('friendsCount').textContent = friendsData.length;

    if (friendsData.length === 0) {
        friendsList.innerHTML = '<p class="empty-message">Нет друзей. Добавьте друга через ID.</p>';
        return;
    }

    friendsList.innerHTML = '';

    friendsData.forEach(friend => {
        const friendElement = document.createElement('div');
        friendElement.className = 'friend-item' + (friend.id === selectedFriendId ? ' active' : '');
        
        // Аватар с индикатором
        const avatarContainer = document.createElement('div');
        avatarContainer.style.position = 'relative';
        
        const avatar = document.createElement('img');
        avatar.className = 'friend-avatar';
        avatar.src = friend.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23e0e0e0"/%3E%3Ccircle cx="50" cy="30" r="15" fill="%23999"/%3E%3Cpath d="M20 80 Q50 60 80 80" fill="%23999"/%3E%3C/svg%3E';
        
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'online-indicator ' + (friend.online ? 'online' : 'offline');
        statusIndicator.style.cssText = 'position: absolute; bottom: 0; right: 0;';
        
        avatarContainer.appendChild(avatar);
        avatarContainer.appendChild(statusIndicator);

        const friendInfo = document.createElement('div');
        friendInfo.style.flex = '1';
        friendInfo.style.cursor = 'pointer';
        friendInfo.innerHTML = `
            <div class="friend-name">${friend.name}</div>
            <div class="friend-id">${friend.id}</div>
            <div class="friend-status">${friend.online ? 'Онлайн' : 'Офлайн'}</div>
        `;
        friendInfo.onclick = () => selectFriend(friend.id);

        const profileBtn = document.createElement('button');
        profileBtn.style.cssText = 'background: none; border: none; cursor: pointer; font-size: 1.2em; padding: 5px; color: #667eea;';
        profileBtn.textContent = 'i';
        profileBtn.title = 'Профиль';
        profileBtn.onclick = (e) => {
            e.stopPropagation();
            openProfile(friend.id);
        };

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-friend-btn';
        removeBtn.textContent = '✕';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Удалить ' + friend.name + ' из друзей?')) {
                fetch(`/api/friends/remove/${currentUser.id}/${friend.id}`, { method: 'DELETE' })
                    .then(() => {
                        if (selectedFriendId === friend.id) {
                            clearChat();
                        }
                        updateFriendsList();
                    });
            }
        };

        friendElement.appendChild(avatarContainer);
        friendElement.appendChild(friendInfo);
        friendElement.appendChild(profileBtn);
        friendElement.appendChild(removeBtn);
        friendsList.appendChild(friendElement);
    });
}

function selectFriend(friendId) {
    selectedFriendId = friendId;
    renderFriends();
    loadChat(friendId);
}

function loadChat(friendId) {
    const friend = friendsData.find(f => f.id === friendId);
    if (!friend) return;

    document.getElementById('chatHeader').innerHTML = `
        <div>
            <h2>${friend.name}</h2>
            <p style="color: #999; font-size: 0.85em;">ID: ${friend.id} 
            ${friend.online ? '🟢 Онлайн' : '🔴 Офлайн'}</p>
        </div>
    `;

    console.log('Загружаю чат с:', friendId);

    // Загрузить сообщения
    fetch(`/api/messages/${currentUser.id}/${friendId}`)
        .then(res => res.json())
        .then(messages => {
            console.log('Загружено сообщений:', messages.length);
            renderMessages(messages);
        })
        .catch(err => console.error('Ошибка загрузки сообщений:', err));

    document.getElementById('messageInputArea').style.display = 'flex';
    document.getElementById('messageInput').focus();
}

function renderMessages(messages) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';

    if (messages.length === 0) {
        container.innerHTML = '<div class="empty-message">Нет сообщений. Напишите первое!</div>';
        return;
    }

    messages.forEach(msg => {
        const messageEl = document.createElement('div');
        messageEl.className = 'message ' + (msg.fromId === currentUser.id ? 'sent' : 'received');

        const time = new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageEl.innerHTML = `
            <div>
                <div class="message-content">${escapeHtml(msg.text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        container.appendChild(messageEl);
    });

    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    if (!selectedFriendId) return;

    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text) return;

    console.log('Отправляю сообщение:', { fromId: currentUser.id, toId: selectedFriendId, text });

    socket.emit('sendMessage', {
        fromId: currentUser.id,
        toId: selectedFriendId,
        text: text
    });

    input.value = '';
    input.focus();
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function clearChat() {
    selectedFriendId = null;
    document.getElementById('chatHeader').innerHTML = '<h2>Выберите друга для общения</h2>';
    document.getElementById('messagesContainer').innerHTML = '<div class="empty-message">Выберите контакт из списка друзей</div>';
    document.getElementById('messageInputArea').style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== СОКЕТ СОБЫТИЯ ==========

// Сообщение отправлено
socket.on('messageSent', (message) => {
    console.log('Сообщение отправлено:', message);
    if (selectedFriendId === message.toId) {
        // Добавить свое сообщение в чат
        const container = document.getElementById('messagesContainer');
        const messageEl = document.createElement('div');
        messageEl.className = 'message sent';

        const time = new Date(message.timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageEl.innerHTML = `
            <div>
                <div class="message-content">${escapeHtml(message.text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }
});

// Сообщение получено
socket.on('messageReceived', (message) => {
    console.log('Получено сообщение:', message);
    
    // Обновить список друзей (чтобы был виден чат)
    updateFriendsList();
    
    // Если это от текущего выбранного друга, добавить в чат
    if (selectedFriendId === message.fromId) {
        const container = document.getElementById('messagesContainer');
        const messageEl = document.createElement('div');
        messageEl.className = 'message received';

        const time = new Date(message.timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageEl.innerHTML = `
            <div>
                <div class="message-content">${escapeHtml(message.text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }
    
    // Показать уведомление
    const friend = friendsData.find(f => f.id === message.fromId);
    if (friend) {
        showAlert(`${friend.name}: ${message.text.substring(0, 30)}...`, 'info');
    }
});

// Друг добавлен
socket.on('friendAdded', (data) => {
    friendsData.push({
        id: data.friendId,
        name: data.friendName,
        online: data.friendOnline
    });
    renderFriends();
    showAlert(`${data.friendName} добавлен в друзья!`, 'success');
});

// Друг удален
socket.on('friendRemoved', (data) => {
    friendsData = friendsData.filter(f => f.id !== data.friendId);
    renderFriends();
});

// Пользователь онлайн
socket.on('userOnline', (data) => {
    const friend = friendsData.find(f => f.id === data.userId);
    if (friend) {
        friend.online = true;
        renderFriends();
        showAlert(`${data.userName} онлайн`, 'info');
    }
});

// Пользователь офлайн
socket.on('userOffline', (data) => {
    const friend = friendsData.find(f => f.id === data.userId);
    if (friend) {
        friend.online = false;
        renderFriends();
        showAlert(`${data.userName} офлайн`, 'info');
    }
});

// Аватар друга обновлен
socket.on('friendAvatarUpdated', (data) => {
    const friend = friendsData.find(f => f.id === data.userId);
    if (friend) {
        friend.avatar = data.avatar;
        renderFriends();
    }
});

// Список друзей
socket.on('friendsList', (friends) => {
    friendsData = friends;
    renderFriends();
});

// ========== ФУНКЦИИ ПРОФИЛЯ ==========

let viewedProfileUserId = null;

function openProfile(friendId) {
    viewedProfileUserId = friendId;
    const friend = friendsData.find(f => f.id === friendId);
    
    if (!friend) return;

    document.getElementById('profileName').textContent = friend.name;
    document.getElementById('profileId').textContent = 'ID: ' + friend.id;
    document.getElementById('profileStatus').textContent = friend.online ? 'Онлайн' : 'Офлайн';
    document.getElementById('profileBio').textContent = friend.bio || 'Без описания';
    
    // Показать аватар друга
    if (friend.avatar) {
        document.getElementById('profileAvatarImg').src = friend.avatar;
    } else {
        document.getElementById('profileAvatarImg').src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23e0e0e0"/%3E%3Ccircle cx="50" cy="30" r="15" fill="%23999"/%3E%3Cpath d="M20 80 Q50 60 80 80" fill="%23999"/%3E%3C/svg%3E';
    }
    
    document.getElementById('messageCount').textContent = getMessageCount(friendId);
    document.getElementById('friendCount').textContent = 0;

    // Показать кнопки действий
    const actionsDiv = document.getElementById('profileActions');
    actionsDiv.innerHTML = `
        <button class="btn-primary" onclick="selectFriendFromProfile('${friendId}')">Написать</button>
        <button class="btn-secondary" onclick="removeFriendFromProfile('${friendId}')">Удалить из друзей</button>
    `;

    // Скрыть редактирование
    document.getElementById('profileEditSection').style.display = 'none';

    // Показать модальное окно
    document.getElementById('profileModal').classList.add('active');
}

function openOwnProfile() {
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileId').textContent = 'ID: ' + currentUser.id;
    document.getElementById('profileStatus').textContent = 'Онлайн (Вы)';
    document.getElementById('profileBio').textContent = currentUser.bio || 'Без описания';
    
    // Показать аватар
    if (currentUser.avatar) {
        document.getElementById('profileAvatarImg').src = currentUser.avatar;
    }
    
    document.getElementById('messageCount').textContent = 0;
    document.getElementById('friendCount').textContent = friendsData.length;

    // Показать кнопку редактирования
    const actionsDiv = document.getElementById('profileActions');
    actionsDiv.innerHTML = `
        <button class="btn-primary" onclick="editOwnProfile()">Редактировать</button>
        <button class="btn-secondary" onclick="copyUserId()">Копировать ID</button>
    `;

    // Скрыть редактирование по умолчанию
    document.getElementById('profileEditSection').style.display = 'none';

    document.getElementById('profileModal').classList.add('active');
}

function editOwnProfile() {
    document.getElementById('profileEditSection').style.display = 'block';
    document.getElementById('editBio').value = currentUser.bio || '';
    document.getElementById('editBio').focus();
}

function saveBio() {
    const bio = document.getElementById('editBio').value.trim();
    
    console.log('Сохраняю биографию:', bio);
    
    fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, bio })
    })
        .then(res => {
            console.log('Ответ от сервера:', res.status);
            return res.json();
        })
        .then(data => {
            console.log('Ответ:', data);
            if (data.success) {
                currentUser.bio = bio;
                document.getElementById('profileBio').textContent = bio || 'Без описания';
                document.getElementById('profileEditSection').style.display = 'none';
                showAlert('Профиль обновлен!', 'success');
            } else {
                showAlert('Ошибка: ' + (data.error || 'Неизвестная ошибка'), 'error');
            }
        })
        .catch(err => {
            console.error('Ошибка при сохранении:', err);
            showAlert('Ошибка при сохранении: ' + err.message, 'error');
        });
}

function cancelEdit() {
    document.getElementById('profileEditSection').style.display = 'none';
}

function closeProfile() {
    document.getElementById('profileModal').classList.remove('active');
    viewedProfileUserId = null;
}

function selectFriendFromProfile(friendId) {
    closeProfile();
    selectFriend(friendId);
}

function removeFriendFromProfile(friendId) {
    if (confirm('Удалить из друзей?')) {
        fetch(`/api/friends/remove/${currentUser.id}/${friendId}`, { method: 'DELETE' })
            .then(() => {
                closeProfile();
                if (selectedFriendId === friendId) {
                    clearChat();
                }
                updateFriendsList();
            });
    }
}

function getMessageCount(friendId) {
    // Можно реализовать счет сообщений
    return 0;
}

function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Загружаю аватар:', file.name);

    // Сжать изображение
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Создать canvas для сжатия
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Масштабировать до 200x200 максимум
            const maxSize = 200;
            if (width > height) {
                if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Получить сжатое изображение в формате base64
            const compressedAvatar = canvas.toDataURL('image/jpeg', 0.7);
            console.log('Аватар сжат. Размер:', compressedAvatar.length);

            fetch('/api/user/avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, avatar: compressedAvatar })
            })
                .then(res => {
                    console.log('Ответ от сервера:', res.status);
                    return res.json();
                })
                .then(data => {
                    console.log('Данные от сервера:', data);
                    if (data.success) {
                        currentUser.avatar = compressedAvatar;
                        document.getElementById('profileAvatarImg').src = compressedAvatar;
                        showAlert('Аватар обновлен!', 'success');
                        updateFriendsList();
                    } else {
                        showAlert('Ошибка: ' + (data.error || 'Неизвестная ошибка'), 'error');
                    }
                })
                .catch(err => {
                    console.error('Ошибка загрузки аватара:', err);
                    showAlert('Ошибка при загрузке аватара: ' + err.message, 'error');
                });
        };
        img.onerror = () => {
            showAlert('Ошибка при загрузке изображения', 'error');
        };
        img.src = e.target.result;
    };
    reader.onerror = (err) => {
        console.error('Ошибка чтения файла:', err);
        showAlert('Ошибка при чтении файла', 'error');
    };
    reader.readAsDataURL(file);
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

window.addEventListener('DOMContentLoaded', () => {
    generateNewId();

    // Подключиться к сокету
    socket.on('connect', () => {
        console.log('Подключено к серверу');
    });

    socket.on('disconnect', () => {
        console.log('Отключено от сервера');
    });

    // Закрытие профиля по клику вне модального окна
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('profileModal');
        if (e.target === modal) {
            closeProfile();
        }
    });
});
