const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');

const uploadDir = path.join(__dirname, '../../uploads/resources');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/', (req, res) => {
  const { type, department, position, course_type, keyword, page = 1, pageSize = 10 } = req.query;
  
  let sql = 'SELECT * FROM resources WHERE 1=1';
  const params = [];
  
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (department) {
    sql += ' AND department = ?';
    params.push(department);
  }
  if (position) {
    sql += ' AND position = ?';
    params.push(position);
  }
  if (course_type) {
    sql += ' AND course_type = ?';
    params.push(course_type);
  }
  if (keyword) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const resources = db.prepare(sql).all(...params);
  
  res.json({ list: resources, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.get('/:id', (req, res) => {
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  
  if (!resource) {
    return res.status(404).json({ message: '资源不存在' });
  }
  
  res.json(resource);
});

router.post('/', upload.single('file'), (req, res) => {
  const { title, type, description, tags, department, position, course_type, duration, created_by } = req.body;
  
  const filePath = req.file ? `/uploads/resources/${req.file.filename}` : null;
  const fileSize = req.file ? req.file.size : 0;
  
  const result = db.prepare(`
    INSERT INTO resources (title, type, file_path, file_size, description, tags, department, position, course_type, duration, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, type, filePath, fileSize, description, tags, department, position, course_type, duration, created_by);
  
  res.status(201).json({ message: '资源创建成功', id: result.lastInsertRowid });
});

router.put('/:id', upload.single('file'), (req, res) => {
  const { title, type, description, tags, department, position, course_type, duration } = req.body;
  
  let filePath = null;
  let fileSize = 0;
  
  if (req.file) {
    filePath = `/uploads/resources/${req.file.filename}`;
    fileSize = req.file.size;
  }
  
  const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: '资源不存在' });
  }
  
  db.prepare(`
    UPDATE resources 
    SET title = ?, type = ?, file_path = ?, file_size = ?, description = ?, tags = ?, 
        department = ?, position = ?, course_type = ?, duration = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || existing.title,
    type || existing.type,
    filePath || existing.file_path,
    fileSize || existing.file_size,
    description || existing.description,
    tags || existing.tags,
    department || existing.department,
    position || existing.position,
    course_type || existing.course_type,
    duration || existing.duration,
    req.params.id
  );
  
  res.json({ message: '资源更新成功' });
});

router.delete('/:id', (req, res) => {
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  
  if (!resource) {
    return res.status(404).json({ message: '资源不存在' });
  }
  
  if (resource.file_path) {
    const fullPath = path.join(__dirname, '../..', resource.file_path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
  
  db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
  
  res.json({ message: '资源删除成功' });
});

router.get('/types/list', (req, res) => {
  const types = [
    { value: 'video', label: '视频' },
    { value: 'document', label: '文档' },
    { value: 'courseware', label: '课件' },
    { value: 'audio', label: '音频' },
    { value: 'image', label: '图文' }
  ];
  res.json(types);
});

module.exports = router;
