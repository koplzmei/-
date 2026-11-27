const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));

function readDB() {
    // Если базы нет, создаем структуру с предметами
    if (!fs.existsSync('database.json')) return { users: [], characters: [], items: [] };
    const data = JSON.parse(fs.readFileSync('database.json', 'utf8'));
    // На всякий случай, если items нет, добавляем
    if (!data.items) data.items = [];
    return data;
}

function writeDB(data) {
    fs.writeFileSync('database.json', JSON.stringify(data, null, 2));
}

app.post('/api/register', (req, res) => {
    const { login, pass, isMaster } = req.body;
    const db = readDB();
    if (db.users.find(u => u.login === login)) return res.status(400).json({ error: 'Занято' });
    db.users.push({ login, pass, isMaster });
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { login, pass } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.login === login && u.pass === pass);
    if (!user) return res.status(400).json({ error: 'Неверно' });
    res.json({ success: true, isMaster: user.isMaster });
});

app.get('/api/characters', (req, res) => {
    const db = readDB();
    res.json(db.characters);
});

// === НОВОЕ: ПОЛУЧИТЬ ВСЕ ПРЕДМЕТЫ ===
app.get('/api/items', (req, res) => {
    const db = readDB();
    res.json(db.items);
});

// === НОВОЕ: ДОБАВИТЬ ПРЕДМЕТ (для Админа) ===
app.post('/api/items', (req, res) => {
    const { name, description } = req.body;
    const db = readDB();
    
    // Если предмет с таким названием уже есть, обновляем описание
    const existingIndex = db.items.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
    if (existingIndex !== -1) {
        db.items[existingIndex].description = description;
    } else {
        db.items.push({ name, description });
    }
    
    writeDB(db);
    res.json({ success: true });
});

// === НОВОЕ: УДАЛИТЬ ПРЕДМЕТ ===
app.delete('/api/items/:name', (req, res) => {
    const name = req.params.name;
    const db = readDB();
    db.items = db.items.filter(i => i.name !== name);
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/characters', (req, res) => {
    const newChar = req.body;
    const db = readDB();
    newChar.id = Date.now().toString();
    newChar.login = req.body.login || 'unknown';
    db.characters.push(newChar);
    writeDB(db);
    res.json({ success: true, newChar });
});

app.delete('/api/characters/:id', (req, res) => {
    const db = readDB();
    db.characters = db.characters.filter(c => c.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
});

app.put('/api/characters/:id', (req, res) => {
    const id = req.params.id;
    const db = readDB();
    const charIndex = db.characters.findIndex(c => c.id === id);
    if (charIndex !== -1) {
        db.characters[charIndex] = { ...db.characters[charIndex], ...req.body };
        writeDB(db);
    }
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});