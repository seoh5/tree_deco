const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer'); // 이미지 업로드용
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// SQLite DB 초기화
const db = new sqlite3.Database('./database.db');
db.run(`CREATE TABLE IF NOT EXISTS decorations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT,
    width TEXT,
    top TEXT,
    left TEXT
)`);

// 이미지 업로드 설정
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// [API] 이미지 저장
app.post('/api/upload', upload.single('image'), (req, res) => {
    const filePath = `/uploads/${req.file.filename}`;
    db.run(`INSERT INTO decorations (path, width, top, left) VALUES (?, ?, ?, ?)`, 
    [filePath, '150px', '100px', '100px'], function(err) {
        res.json({ id: this.lastID, path: filePath });
    });
});

// [API] 데이터 불러오기
app.get('/api/decorations', (req, res) => {
    db.all("SELECT * FROM decorations", [], (err, rows) => res.json(rows));
});

// [API] 데이터 업데이트 (위치, 크기)
app.put('/api/decorations/:id', (req, res) => {
    const { width, top, left } = req.body;
    db.run(`UPDATE decorations SET width=?, top=?, left=? WHERE id=?`, [width, top, left, req.params.id]);
    res.sendStatus(200);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));