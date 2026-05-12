const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/programs', (req, res) => {
  const programs = db.prepare('SELECT * FROM onboarding_programs ORDER BY created_at DESC').all();
  
  const programsWithCourses = programs.map(program => {
    const courseIds = JSON.parse(program.courses || '[]');
    const courses = courseIds.map(id => db.prepare('SELECT id, title, description, total_hours FROM courses WHERE id = ?').get(id)).filter(Boolean);
    return { ...program, courses };
  });
  
  res.json(programsWithCourses);
});

router.get('/programs/:id', (req, res) => {
  const program = db.prepare('SELECT * FROM onboarding_programs WHERE id = ?').get(req.params.id);
  
  if (!program) {
    return res.status(404).json({ message: '入职培训计划不存在' });
  }
  
  const courseIds = JSON.parse(program.courses || '[]');
  const courses = courseIds.map(id => {
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
    if (course) {
      const chapters = db.prepare('SELECT * FROM course_chapters WHERE course_id = ? ORDER BY order_num').all(id);
      return { ...course, chapters };
    }
    return null;
  }).filter(Boolean);
  
  res.json({ ...program, courses });
});

router.post('/programs', (req, res) => {
  const { title, description, courses, duration_days } = req.body;
  
  const result = db.prepare(`
    INSERT INTO onboarding_programs (title, description, courses, duration_days)
    VALUES (?, ?, ?, ?)
  `).run(title, description, JSON.stringify(courses), duration_days || 30);
  
  res.status(201).json({ message: '入职培训计划创建成功', id: result.lastInsertRowid });
});

router.put('/programs/:id', (req, res) => {
  const { title, description, courses, duration_days, is_active } = req.body;
  
  const existing = db.prepare('SELECT * FROM onboarding_programs WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: '入职培训计划不存在' });
  }
  
  db.prepare(`
    UPDATE onboarding_programs 
    SET title = ?, description = ?, courses = ?, duration_days = ?, is_active = ?
    WHERE id = ?
  `).run(
    title || existing.title,
    description || existing.description,
    JSON.stringify(courses) || existing.courses,
    duration_days || existing.duration_days,
    is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    req.params.id
  );
  
  res.json({ message: '入职培训计划更新成功' });
});

router.delete('/programs/:id', (req, res) => {
  db.prepare('DELETE FROM user_onboarding WHERE program_id = ?').run(req.params.id);
  db.prepare('DELETE FROM onboarding_programs WHERE id = ?').run(req.params.id);
  
  res.json({ message: '入职培训计划删除成功' });
});

router.get('/new-employees', (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  
  const count = db.prepare('SELECT COUNT(*) as total FROM users WHERE is_new_employee = 1').get().total;
  
  const employees = db.prepare(`
    SELECT id, username, name, department, position, email, phone, entry_date, created_at
    FROM users 
    WHERE is_new_employee = 1
    ORDER BY entry_date DESC
    LIMIT ? OFFSET ?
  `).all(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  const employeesWithProgress = employees.map(emp => {
    const onboarding = db.prepare(`
      SELECT uo.*, op.title as program_title
      FROM user_onboarding uo
      LEFT JOIN onboarding_programs op ON uo.program_id = op.id
      WHERE uo.user_id = ?
    `).get(emp.id);
    
    return { ...emp, onboarding };
  });
  
  res.json({ list: employeesWithProgress, total: count, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.post('/assign', (req, res) => {
  const { user_id, program_id } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }
  
  const program = db.prepare('SELECT * FROM onboarding_programs WHERE id = ?').get(program_id);
  if (!program) {
    return res.status(404).json({ message: '入职培训计划不存在' });
  }
  
  const existing = db.prepare('SELECT * FROM user_onboarding WHERE user_id = ?').get(user_id);
  if (existing) {
    return res.status(400).json({ message: '该用户已分配入职培训' });
  }
  
  db.prepare(`
    INSERT INTO user_onboarding (user_id, program_id, status, start_date)
    VALUES (?, ?, ?, ?)
  `).run(user_id, program_id, 'in_progress', new Date().toISOString().split('T')[0]);
  
  const courseIds = JSON.parse(program.courses || '[]');
  courseIds.forEach(courseId => {
    const chapters = db.prepare('SELECT id FROM course_chapters WHERE course_id = ?').all(courseId);
    chapters.forEach(chapter => {
      db.prepare(`
        INSERT OR IGNORE INTO learning_progress (user_id, course_id, chapter_id, status)
        VALUES (?, ?, ?, ?)
      `).run(user_id, courseId, chapter.id, 'not_started');
    });
  });
  
  db.prepare(`
    INSERT INTO notifications (user_id, title, content, type, link)
    VALUES (?, ?, ?, ?, ?)
  `).run(user_id, '入职培训通知', `您已加入入职培训计划：${program.title}`, 'onboarding', '/onboarding');
  
  res.json({ message: '入职培训分配成功' });
});

router.post('/auto-assign', (req, res) => {
  const activeProgram = db.prepare('SELECT * FROM onboarding_programs WHERE is_active = 1 LIMIT 1').get();
  
  if (!activeProgram) {
    return res.json({ message: '没有激活的入职培训计划', assigned: 0 });
  }
  
  const newEmployees = db.prepare(`
    SELECT id FROM users 
    WHERE is_new_employee = 1 
    AND id NOT IN (SELECT user_id FROM user_onboarding)
  `).all();
  
  let assigned = 0;
  const courseIds = JSON.parse(activeProgram.courses || '[]');
  
  const assignEmployee = db.transaction((employees) => {
    employees.forEach(emp => {
      db.prepare(`
        INSERT INTO user_onboarding (user_id, program_id, status, start_date)
        VALUES (?, ?, ?, ?)
      `).run(emp.id, activeProgram.id, 'in_progress', new Date().toISOString().split('T')[0]);
      
      courseIds.forEach(courseId => {
        const chapters = db.prepare('SELECT id FROM course_chapters WHERE course_id = ?').all(courseId);
        chapters.forEach(chapter => {
          db.prepare(`
            INSERT OR IGNORE INTO learning_progress (user_id, course_id, chapter_id, status)
            VALUES (?, ?, ?, ?)
          `).run(emp.id, courseId, chapter.id, 'not_started');
        });
      });
      
      db.prepare(`
        INSERT INTO notifications (user_id, title, content, type, link)
        VALUES (?, ?, ?, ?, ?)
      `).run(emp.id, '入职培训通知', `您已自动加入入职培训计划：${activeProgram.title}`, 'onboarding', '/onboarding');
      
      assigned++;
    });
  });
  
  assignEmployee(newEmployees);
  
  res.json({ message: '自动分配完成', assigned });
});

router.get('/user/:userId/progress', (req, res) => {
  const { userId } = req.params;
  
  const userOnboarding = db.prepare(`
    SELECT uo.*, op.title as program_title, op.courses
    FROM user_onboarding uo
    LEFT JOIN onboarding_programs op ON uo.program_id = op.id
    WHERE uo.user_id = ?
  `).get(userId);
  
  if (!userOnboarding) {
    return res.status(404).json({ message: '该用户未分配入职培训' });
  }
  
  const courseIds = JSON.parse(userOnboarding.courses || '[]');
  
  const coursesProgress = courseIds.map(courseId => {
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    if (!course) return null;
    
    const chapters = db.prepare('SELECT * FROM course_chapters WHERE course_id = ? ORDER BY order_num').all(courseId);
    
    const chaptersProgress = chapters.map(chapter => {
      const progress = db.prepare('SELECT * FROM learning_progress WHERE user_id = ? AND chapter_id = ?').get(userId, chapter.id);
      return {
        ...chapter,
        progress: progress || { status: 'not_started', progress: 0 }
      };
    });
    
    const completedChapters = chaptersProgress.filter(cp => cp.progress.status === 'completed').length;
    const totalChapters = chapters.length;
    
    return {
      ...course,
      chapters: chaptersProgress,
      completionRate: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
    };
  }).filter(Boolean);
  
  const totalCourses = coursesProgress.length;
  const completedCourses = coursesProgress.filter(c => c.completionRate === 100).length;
  
  const overallCompletionRate = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
  
  db.prepare('UPDATE user_onboarding SET completion_rate = ? WHERE user_id = ?').run(overallCompletionRate, userId);
  
  if (overallCompletionRate === 100) {
    db.prepare(`UPDATE user_onboarding SET status = 'completed', end_date = ? WHERE user_id = ?`).run(new Date().toISOString().split('T')[0], userId);
  }
  
  res.json({
    ...userOnboarding,
    courses: coursesProgress,
    overallCompletionRate
  });
});

module.exports = router;
