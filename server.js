const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// ========== ЯДРО (BACKEND) ==========

// Хранилище данных
let database = {
    users: {},
    friends: {},
    messages: {},
    onlineUsers: {}
};

// Загрузить базу данных из файла
function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            const loaded = JSON.parse(data);
            database.users = loaded.users || {};
            database.friends = loaded.friends || {};
            database.messages = loaded.messages || {};
            console.log('База данных загружена. Пользователей:', Object.keys(database.users).length);
        }
    } catch (err) {
        console.error('Ошибка загрузки БД:', err.message);
    }
}

// Сохранить базу данных в файл
function saveDatabase() {
    try {
        const data = {
            users: database.users,
            friends: database.friends,
            messages: database.messages
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Ошибка сохранения БД:', err.message);
    }
}

// Загрузить БД при запуске
loadDatabase();

// Функция для генерации ID
function generateId() {
    return 'USER_' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Получить ключ чата
function getChatKey(id1, id2) {
    return [id1, id2].sort().join('_');
}

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// ========== REST API ==========

// Регистрация пользователя
app.post('/api/register', (req, res) => {
    const { username } = req.body;
    if (!username || username.trim() === '') {
        return res.status(400).json({ error: 'Имя пользователя не может быть пустым' });
    }

    const userId = generateId();
    database.users[userId] = {
        id: userId,
        name: username.trim(),
        createdAt: new Date().toISOString(),
        bio: '',
        avatar: ''
    };
    database.friends[userId] = [];
    
    saveDatabase();

    res.json({
        success: true,
        user: database.users[userId]
    });
});

// Получить информацию о пользователе
app.get('/api/user/:id', (req, res) => {
    const user = database.users[req.params.id];
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const isOnline = database.onlineUsers[req.params.id] ? true : false;
    res.json({
        ...user,
        online: isOnline
    });
});

// Добавить друга
app.post('/api/friends/add', (req, res) => {
    const { userId, friendId } = req.body;

    if (!database.users[userId]) {
        return res.status(400).json({ error: 'Текущий пользователь не найден' });
    }

    if (!database.users[friendId]) {
        return res.status(404).json({ error: 'Пользователь с таким ID не найден' });
    }

    if (userId === friendId) {
        return res.status(400).json({ error: 'Вы не можете добавить себя' });
    }

    if (database.friends[userId].includes(friendId)) {
        return res.status(400).json({ error: 'Этот пользователь уже в списке друзей' });
    }

    // Добавить в обе стороны
    database.friends[userId].push(friendId);
    if (!database.friends[friendId].includes(userId)) {
        database.friends[friendId].push(userId);
    }
    
    saveDatabase();

    // Отправить событие обоим пользователям
    io.to(userId).emit('friendAdded', {
        friendId: friendId,
        friendName: database.users[friendId].name,
        friendOnline: database.onlineUsers[friendId] ? true : false
    });

    io.to(friendId).emit('friendAdded', {
        friendId: userId,
        friendName: database.users[userId].name,
        friendOnline: database.onlineUsers[userId] ? true : false
    });

    res.json({ success: true });
});

// Получить список друзей
app.get('/api/friends/:userId', (req, res) => {
    const friends = database.friends[req.params.userId] || [];
    const friendsList = friends.map(fid => ({
        ...database.users[fid],
        online: database.onlineUsers[fid] ? true : false
    }));

    res.json(friendsList);
});

// Удалить друга
app.delete('/api/friends/remove/:userId/:friendId', (req, res) => {
    const { userId, friendId } = req.params;

    if (!database.friends[userId]) {
        return res.status(400).json({ error: 'Пользователь не найден' });
    }

    database.friends[userId] = database.friends[userId].filter(id => id !== friendId);

    io.to(userId).emit('friendRemoved', { friendId });
    
    saveDatabase();

    res.json({ success: true });
});

// Получить сообщения между пользователями
app.get('/api/messages/:userId/:friendId', (req, res) => {
    const { userId, friendId } = req.params;
    const chatKey = getChatKey(userId, friendId);
    const messages = database.messages[chatKey] || [];

    res.json(messages);
});

// Обновить профиль пользователя
app.put('/api/user/profile', (req, res) => {
    const { userId, bio } = req.body;

    if (!database.users[userId]) {
        return res.status(400).json({ error: 'Пользователь не найден' });
    }

    database.users[userId].bio = bio || '';
    
    saveDatabase();
    
    res.json({ 
        success: true,
        user: database.users[userId]
    });
});

// Загрузить аватар
app.post('/api/user/avatar', (req, res) => {
    const { userId, avatar } = req.body;

    if (!database.users[userId]) {
        return res.status(400).json({ error: 'Пользователь не найден' });
    }

    database.users[userId].avatar = avatar;
    
    saveDatabase();
    
    // Оповестить всех друзей об обновлении аватара
    const friends = database.friends[userId] || [];
    friends.forEach(friendId => {
        io.to(friendId).emit('friendAvatarUpdated', {
            userId: userId,
            avatar: avatar,
            userName: database.users[userId].name
        });
    });

    res.json({ 
        success: true,
        user: database.users[userId]
    });
});

// Основной маршрут
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== SOCKET.IO (РЕАЛЬНОЕ ВРЕМЯ) ==========

io.on('connection', (socket) => {
    console.log('Подключен клиент: ' + socket.id);

    // Пользователь подключился
    socket.on('userConnect', (userId) => {
        socket.join(userId);
        database.onlineUsers[userId] = socket.id;

        // Оповестить друзей, что пользователь онлайн
        const friends = database.friends[userId] || [];
        friends.forEach(friendId => {
            io.to(friendId).emit('userOnline', {
                userId: userId,
                userName: database.users[userId].name
            });
        });

        // Отправить список друзей с их статусом
        const friendsList = friends.map(fid => ({
            ...database.users[fid],
            online: database.onlineUsers[fid] ? true : false
        }));

        socket.emit('friendsList', friendsList);

        console.log('Онлайн: ' + database.users[userId].name + ' (' + userId + ')');
    });

    // Отправить сообщение
    socket.on('sendMessage', (data) => {
        const { fromId, toId, text } = data;
        const chatKey = getChatKey(fromId, toId);

        if (!database.messages[chatKey]) {
            database.messages[chatKey] = [];
        }

        const message = {
            id: 'MSG_' + Date.now(),
            fromId: fromId,
            toId: toId,
            text: text,
            timestamp: new Date().toISOString()
        };

        database.messages[chatKey].push(message);

        console.log('Сообщение: ' + database.users[fromId].name + ' -> ' + database.users[toId].name);
        
        saveDatabase();

        // Отправить сообщение получателю
        io.to(toId).emit('messageReceived', {
            ...message,
            senderName: database.users[fromId].name
        });

        // Подтверждение отправителю
        socket.emit('messageSent', message);
    });

    // Пользователь отключился
    socket.on('disconnect', () => {
        for (const [userId, socketId] of Object.entries(database.onlineUsers)) {
            if (socketId === socket.id) {
                delete database.onlineUsers[userId];

                // Оповестить друзей, что пользователь офлайн
                const friends = database.friends[userId] || [];
                friends.forEach(friendId => {
                    io.to(friendId).emit('userOffline', {
                        userId: userId,
                        userName: database.users[userId].name
                    });
                });

                console.log('Офлайн: ' + database.users[userId].name + ' (' + userId + ')');
                break;
            }
        }
    });

    // Пользователь печатает
    socket.on('typing', (data) => {
        const { fromId, toId } = data;
        io.to(toId).emit('userTyping', { fromId });
    });

    // Пользователь перестал печатать
    socket.on('stopTyping', (data) => {
        const { fromId, toId } = data;
        io.to(toId).emit('userStopTyping', { fromId });
    });
});

// ========== ЗАПУСК СЕРВЕРА ==========

// Загрузить данные при запуске
loadDatabase();

server.listen(PORT, () => {
    console.clear();
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║        ZORSSMS - Мессенджер запущен       ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');
    console.log('Откройте браузер: http://localhost:' + PORT);
    console.log('WebSocket сервер готов');
    console.log('');
    console.log('═════════════════════════════════════════════');
    console.log('Нажмите Ctrl+C для остановки сервера');
    console.log('═════════════════════════════════════════════');
    console.log('');
});
