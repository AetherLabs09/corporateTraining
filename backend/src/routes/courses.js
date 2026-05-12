const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
  const { type, status, keyword, page = 1, pageSize = 10 } = req.query;
  
  let sql = 'SELECT * FROM courses WHERE 1=1';
  const params = [];
  
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
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
  
  const courses = db.prepare(sql).all(...params);
  
  const coursesWithChapters = courses.map(course => {
    const chapters = db.prepare('SELECT * FROM course_chapters WHERE course_id = ? ORDER BY order_num').all(course.id);
    return { ...course, chapters };
  });
  
  res.json({ list: coursesWithChapters, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.get('/:id', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  
  if (!course) {
    return res.status(404).json({ message: '课程不存在' });
  }
  
  const chapters = db.prepare('SELECT cc.*, r.title as resource_title, r.type as resource_type, r.duration as resource_duration FROM course_chapters cc LEFT JOIN resources r ON cc.resource_id = r.id WHERE cc.course_id = ? ORDER BY cc.order_num').all(req.params.id);
  
  res.json({ ...course, chapters });
});

router.post('/', (req, res) => {
  const { title, description, type, cover_image, total_hours, is_required, target_departments, target_positions, status, created_by, chapters } = req.body;
  
  const result = db.prepare(`
    INSERT INTO courses (title, description, type, cover_image, total_hours, is_required, target_departments, target_positions, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, type, cover_image, total_hours || 0, is_required ? 1 : 0, target_departments, target_positions, status || 'draft', created_by);
  
  const courseId = result.lastInsertRowid;
  
  if (chapters && chapters.length > 0) {
    const insertChapter = db.prepare(`
      INSERT INTO course_chapters (course_id, title, description, order_num, resource_id, duration, is_required)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    chapters.forEach((chapter, index) => {
      insertChapter.run(courseId, chapter.title, chapter.description, index + 1, chapter.resource_id, chapter.duration || 0, chapter.is_required ? 1 : 1);
    });
  }
  
  res.status(201).json({ message: '课程创建成功', id: courseId });
});

router.put('/:id', (req, res) => {
  const { title, description, type, cover_image, total_hours, is_required, target_departments, target_positions, status, chapters } = req.body;
  
  const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: '课程不存在' });
  }
  
  db.prepare(`
    UPDATE courses 
    SET title = ?, description = ?, type = ?, cover_image = ?, total_hours = ?, 
        is_required = ?, target_departments = ?, target_positions = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || existing.title,
    description || existing.description,
    type || existing.type,
    cover_image || existing.cover_image,
    total_hours || existing.total_hours,
    is_required !== undefined ? (is_required ? 1 : 0) : existing.is_required,
    target_departments || existing.target_departments,
    target_positions || existing.target_positions,
    status || existing.status,
    req.params.id
  );
  
  if (chapters) {
    db.prepare('DELETE FROM course_chapters WHERE course_id = ?').run(req.params.id);
    
    const insertChapter = db.prepare(`
      INSERT INTO course_chapters (course_id, title, description, order_num, resource_id, duration, is_required)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    chapters.forEach((chapter, index) => {
      insertChapter.run(req.params.id, chapter.title, chapter.description, index + 1, chapter.resource_id, chapter.duration || 0, chapter.is_required ? 1 : 1);
    });
  }
  
  res.json({ message: '课程更新成功' });
});

router.delete('/:id', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  
  if (!course) {
    return res.status(404).json({ message: '课程不存在' });
  }
  
  db.prepare('DELETE FROM course_chapters WHERE course_id = ?').run(req.params.id);
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  
  res.json({ message: '课程删除成功' });
});

router.get('/types/list', (req, res) => {
  const types = [
    { value: 'required', label: '必修课' },
    { value: 'elective', label: '选修课' },
    { value: 'position', label: '岗位专属课' },
    { value: 'onboarding', label: '新员工入职课' }
  ];
  res.json(types);
});

module.exports = router;
