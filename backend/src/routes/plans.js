const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
  const { plan_type, status, keyword, page = 1, pageSize = 10 } = req.query;
  
  let sql = 'SELECT * FROM training_plans WHERE 1=1';
  const params = [];
  
  if (plan_type) {
    sql += ' AND plan_type = ?';
    params.push(plan_type);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (keyword) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const plans = db.prepare(sql).all(...params);
  
  res.json({ list: plans, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.get('/:id', (req, res) => {
  const plan = db.prepare('SELECT * FROM training_plans WHERE id = ?').get(req.params.id);
  
  if (!plan) {
    return res.status(404).json({ message: '培训计划不存在' });
  }
  
  res.json(plan);
});

router.post('/', (req, res) => {
  const { 
    title, description, plan_type, start_date, end_date, 
    target_departments, target_positions, target_users, 
    courses, requirements, assessment_standard, status, created_by 
  } = req.body;
  
  const result = db.prepare(`
    INSERT INTO training_plans (
      title, description, plan_type, start_date, end_date,
      target_departments, target_positions, target_users,
      courses, requirements, assessment_standard, status, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, description, plan_type || 'monthly', start_date, end_date,
    JSON.stringify(target_departments), JSON.stringify(target_positions), JSON.stringify(target_users),
    JSON.stringify(courses), requirements, assessment_standard, status || 'draft', created_by
  );
  
  res.status(201).json({ message: '培训计划创建成功', id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { 
    title, description, plan_type, start_date, end_date, 
    target_departments, target_positions, target_users, 
    courses, requirements, assessment_standard, status 
  } = req.body;
  
  const existing = db.prepare('SELECT * FROM training_plans WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: '培训计划不存在' });
  }
  
  db.prepare(`
    UPDATE training_plans 
    SET title = ?, description = ?, plan_type = ?, start_date = ?, end_date = ?,
        target_departments = ?, target_positions = ?, target_users = ?,
        courses = ?, requirements = ?, assessment_standard = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || existing.title,
    description || existing.description,
    plan_type || existing.plan_type,
    start_date || existing.start_date,
    end_date || existing.end_date,
    JSON.stringify(target_departments) || existing.target_departments,
    JSON.stringify(target_positions) || existing.target_positions,
    JSON.stringify(target_users) || existing.target_users,
    JSON.stringify(courses) || existing.courses,
    requirements || existing.requirements,
    assessment_standard || existing.assessment_standard,
    status || existing.status,
    req.params.id
  );
  
  res.json({ message: '培训计划更新成功' });
});

router.delete('/:id', (req, res) => {
  const plan = db.prepare('SELECT * FROM training_plans WHERE id = ?').get(req.params.id);
  
  if (!plan) {
    return res.status(404).json({ message: '培训计划不存在' });
  }
  
  db.prepare('DELETE FROM training_plans WHERE id = ?').run(req.params.id);
  
  res.json({ message: '培训计划删除成功' });
});

router.post('/:id/publish', (req, res) => {
  const plan = db.prepare('SELECT * FROM training_plans WHERE id = ?').get(req.params.id);
  
  if (!plan) {
    return res.status(404).json({ message: '培训计划不存在' });
  }
  
  db.prepare('UPDATE training_plans SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('published', req.params.id);
  
  const targetDepartments = JSON.parse(plan.target_departments || '[]');
  const targetPositions = JSON.parse(plan.target_positions || '[]');
  const targetUsers = JSON.parse(plan.target_users || '[]');
  
  let sql = 'SELECT id FROM users WHERE 1=1';
  const params = [];
  
  if (targetDepartments.length > 0) {
    sql += ' AND department IN (' + targetDepartments.map(() => '?').join(',') + ')';
    params.push(...targetDepartments);
  }
  if (targetPositions.length > 0) {
    sql += ' AND position IN (' + targetPositions.map(() => '?').join(',') + ')';
    params.push(...targetPositions);
  }
  if (targetUsers.length > 0) {
    sql += ' AND id IN (' + targetUsers.map(() => '?').join(',') + ')';
    params.push(...targetUsers);
  }
  
  const targetStudentIds = db.prepare(sql).all(...params).map(u => u.id);
  
  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, title, content, type, link)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  targetStudentIds.forEach(userId => {
    insertNotification.run(userId, '新培训计划发布', `您有新的培训计划：${plan.title}`, 'plan', `/plans/${req.params.id}`);
  });
  
  res.json({ message: '培训计划发布成功', targetCount: targetStudentIds.length });
});

router.get('/types/list', (req, res) => {
  const types = [
    { value: 'yearly', label: '年度计划' },
    { value: 'quarterly', label: '季度计划' },
    { value: 'monthly', label: '月度计划' }
  ];
  res.json(types);
});

module.exports = router;
