const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
  const { department, position, role, keyword, is_new_employee, page = 1, pageSize = 10 } = req.query;
  
  let sql = 'SELECT id, username, name, role, department, position, email, phone, entry_date, is_new_employee, created_at FROM users WHERE 1=1';
  const params = [];
  
  if (department) {
    sql += ' AND department = ?';
    params.push(department);
  }
  if (position) {
    sql += ' AND position = ?';
    params.push(position);
  }
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  if (is_new_employee !== undefined) {
    sql += ' AND is_new_employee = ?';
    params.push(is_new_employee ? 1 : 0);
  }
  if (keyword) {
    sql += ' AND (name LIKE ? OR username LIKE ? OR email LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  
  const countSql = sql.replace('SELECT id, username, name, role, department, position, email, phone, entry_date, is_new_employee, created_at', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const students = db.prepare(sql).all(...params);
  
  res.json({ list: students, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.get('/:id', (req, res) => {
  const student = db.prepare('SELECT id, username, name, role, department, position, email, phone, entry_date, is_new_employee, created_at FROM users WHERE id = ?').get(req.params.id);
  
  if (!student) {
    return res.status(404).json({ message: '学员不存在' });
  }
  
  res.json(student);
});

router.post('/', (req, res) => {
  const { username, password, name, department, position, email, phone, entry_date, role } = req.body;
  
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    return res.status(400).json({ message: '用户名已存在' });
  }
  
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync(password || '123456', 10);
  
  const isNewEmployee = entry_date && (new Date() - new Date(entry_date)) < 90 * 24 * 60 * 60 * 1000;
  
  const result = db.prepare(`
    INSERT INTO users (username, password, name, department, position, email, phone, entry_date, is_new_employee, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(username, hashedPassword, name, department, position, email, phone, entry_date, isNewEmployee ? 1 : 0, role || 'student');
  
  res.status(201).json({ message: '学员添加成功', id: result.lastInsertRowid });
});

router.post('/batch', (req, res) => {
  const { students } = req.body;
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('123456', 10);
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO users (username, password, name, department, position, email, phone, entry_date, is_new_employee, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let successCount = 0;
  let failCount = 0;
  
  const insertMany = db.transaction((studentsList) => {
    studentsList.forEach(student => {
      try {
        const isNewEmployee = student.entry_date && (new Date() - new Date(student.entry_date)) < 90 * 24 * 60 * 60 * 1000;
        insertStmt.run(
          student.username,
          hashedPassword,
          student.name,
          student.department,
          student.position,
          student.email,
          student.phone,
          student.entry_date,
          isNewEmployee ? 1 : 0,
          student.role || 'student'
        );
        successCount++;
      } catch (error) {
        failCount++;
      }
    });
  });
  
  insertMany(students);
  
  res.json({ message: '批量导入完成', successCount, failCount });
});

router.put('/:id', (req, res) => {
  const { name, department, position, email, phone, entry_date, role } = req.body;
  
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: '学员不存在' });
  }
  
  const isNewEmployee = entry_date && (new Date() - new Date(entry_date)) < 90 * 24 * 60 * 60 * 1000;
  
  db.prepare(`
    UPDATE users 
    SET name = ?, department = ?, position = ?, email = ?, phone = ?, entry_date = ?, is_new_employee = ?, role = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name || existing.name,
    department || existing.department,
    position || existing.position,
    email || existing.email,
    phone || existing.phone,
    entry_date || existing.entry_date,
    isNewEmployee ? 1 : 0,
    role || existing.role,
    req.params.id
  );
  
  res.json({ message: '学员信息更新成功' });
});

router.delete('/:id', (req, res) => {
  const student = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  
  if (!student) {
    return res.status(404).json({ message: '学员不存在' });
  }
  
  db.prepare('DELETE FROM learning_progress WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM user_onboarding WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  
  res.json({ message: '学员删除成功' });
});

router.get('/departments/list', (req, res) => {
  const departments = db.prepare('SELECT * FROM departments ORDER BY name').all();
  res.json(departments);
});

router.post('/departments', (req, res) => {
  const { name, parent_id, description } = req.body;
  
  const existing = db.prepare('SELECT id FROM departments WHERE name = ?').get(name);
  if (existing) {
    return res.status(400).json({ message: '部门名称已存在' });
  }
  
  const result = db.prepare('INSERT INTO departments (name, parent_id, description) VALUES (?, ?, ?)').run(name, parent_id, description);
  res.status(201).json({ message: '部门创建成功', id: result.lastInsertRowid });
});

router.get('/positions/list', (req, res) => {
  const { department_id } = req.query;
  let sql = 'SELECT * FROM positions';
  const params = [];
  
  if (department_id) {
    sql += ' WHERE department_id = ?';
    params.push(department_id);
  }
  
  const positions = db.prepare(sql).all(...params);
  res.json(positions);
});

router.post('/positions', (req, res) => {
  const { name, department_id, description } = req.body;
  
  const existing = db.prepare('SELECT id FROM positions WHERE name = ?').get(name);
  if (existing) {
    return res.status(400).json({ message: '岗位名称已存在' });
  }
  
  const result = db.prepare('INSERT INTO positions (name, department_id, description) VALUES (?, ?, ?)').run(name, department_id, description);
  res.status(201).json({ message: '岗位创建成功', id: result.lastInsertRowid });
});

module.exports = router;
