const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'training-system-secret-key';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }
  
  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }
  
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
      position: user.position
    }
  });
});

router.post('/register', (req, res) => {
  const { username, password, name, department, position, email, phone, entry_date } = req.body;
  
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    return res.status(400).json({ message: '用户名已存在' });
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  const isNewEmployee = entry_date && (new Date() - new Date(entry_date)) < 90 * 24 * 60 * 60 * 1000;
  
  const result = db.prepare(`
    INSERT INTO users (username, password, name, department, position, email, phone, entry_date, is_new_employee)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(username, hashedPassword, name, department, position, email, phone, entry_date, isNewEmployee ? 1 : 0);
  
  res.status(201).json({ message: '注册成功', userId: result.lastInsertRowid });
});

router.get('/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: '未登录' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, name, role, department, position, email, phone, entry_date, is_new_employee FROM users WHERE id = ?').get(decoded.id);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(401).json({ message: 'token无效' });
  }
});

module.exports = router;
