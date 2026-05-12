const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/overview', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('student').count;
  const totalCourses = db.prepare('SELECT COUNT(*) as count FROM courses').get().count;
  const totalPlans = db.prepare('SELECT COUNT(*) as count FROM training_plans WHERE status = ?').get('published').count;
  
  const completedProgress = db.prepare('SELECT COUNT(*) as count FROM learning_progress WHERE status = ?').get('completed').count;
  const inProgressCount = db.prepare('SELECT COUNT(*) as count FROM learning_progress WHERE status = ?').get('in_progress').count;
  
  res.json({
    totalUsers,
    totalCourses,
    totalPlans,
    completedCourses: completedProgress,
    inProgressCourses: inProgressCount
  });
});

router.get('/department', (req, res) => {
  const departments = db.prepare('SELECT DISTINCT department FROM users WHERE department IS NOT NULL').all();
  
  const result = departments.map(dept => {
    const users = db.prepare('SELECT id FROM users WHERE department = ?').all(dept.department);
    const userIds = users.map(u => u.id);
    
    if (userIds.length === 0) {
      return { department: dept.department, total: 0, completed: 0, inProgress: 0, notStarted: 0, completionRate: 0 };
    }
    
    const total = userIds.length;
    const completed = db.prepare(`SELECT COUNT(DISTINCT user_id) as count FROM learning_progress WHERE user_id IN (${userIds.map(() => '?').join(',')}) AND status = ?`).get(...userIds, 'completed').count;
    const inProgress = db.prepare(`SELECT COUNT(DISTINCT user_id) as count FROM learning_progress WHERE user_id IN (${userIds.map(() => '?').join(',')}) AND status = ?`).get(...userIds, 'in_progress').count;
    const notStarted = total - completed - inProgress;
    
    return {
      department: dept.department,
      total,
      completed,
      inProgress,
      notStarted,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });
  
  res.json(result);
});

router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }
  
  const progress = db.prepare(`
    SELECT lp.*, c.title as course_title, c.type as course_type, cc.title as chapter_title
    FROM learning_progress lp
    LEFT JOIN courses c ON lp.course_id = c.id
    LEFT JOIN course_chapters cc ON lp.chapter_id = cc.id
    WHERE lp.user_id = ?
    ORDER BY lp.updated_at DESC
  `).all(userId);
  
  const totalCourses = progress.length;
  const completedCourses = progress.filter(p => p.status === 'completed').length;
  const inProgressCourses = progress.filter(p => p.status === 'in_progress').length;
  
  res.json({
    user,
    progress,
    summary: {
      totalCourses,
      completedCourses,
      inProgressCourses,
      completionRate: totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0
    }
  });
});

router.get('/course/:courseId', (req, res) => {
  const { courseId } = req.params;
  
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course) {
    return res.status(404).json({ message: '课程不存在' });
  }
  
  const chapters = db.prepare('SELECT * FROM course_chapters WHERE course_id = ? ORDER BY order_num').all(courseId);
  
  const progress = db.prepare(`
    SELECT lp.*, u.name as user_name, u.department, u.position
    FROM learning_progress lp
    LEFT JOIN users u ON lp.user_id = u.id
    WHERE lp.course_id = ?
    ORDER BY lp.updated_at DESC
  `).all(courseId);
  
  const totalEnrolled = new Set(progress.map(p => p.user_id)).size;
  const completed = progress.filter(p => p.status === 'completed').length;
  const inProgress = progress.filter(p => p.status === 'in_progress').length;
  
  res.json({
    course,
    chapters,
    progress,
    summary: {
      totalEnrolled,
      completed,
      inProgress,
      completionRate: totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0
    }
  });
});

router.post('/update', (req, res) => {
  const { user_id, course_id, chapter_id, progress, status } = req.body;
  
  const existing = db.prepare('SELECT * FROM learning_progress WHERE user_id = ? AND course_id = ? AND chapter_id = ?').get(user_id, course_id, chapter_id);
  
  if (existing) {
    db.prepare(`
      UPDATE learning_progress 
      SET progress = ?, status = ?, last_access_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND course_id = ? AND chapter_id = ?
    `).run(progress, status, user_id, course_id, chapter_id);
  } else {
    db.prepare(`
      INSERT INTO learning_progress (user_id, course_id, chapter_id, progress, status, start_time, last_access_time)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(user_id, course_id, chapter_id, progress, status);
  }
  
  if (status === 'completed') {
    db.prepare(`
      UPDATE learning_progress 
      SET end_time = CURRENT_TIMESTAMP, score = 100
      WHERE user_id = ? AND course_id = ? AND chapter_id = ?
    `).run(user_id, course_id, chapter_id);
  }
  
  res.json({ message: '学习进度更新成功' });
});

router.get('/not-completed', (req, res) => {
  const { course_id, department } = req.query;
  
  let sql = `
    SELECT u.id, u.name, u.department, u.position, u.email, u.phone
    FROM users u
    WHERE u.role = 'student'
  `;
  const params = [];
  
  if (department) {
    sql += ' AND u.department = ?';
    params.push(department);
  }
  
  if (course_id) {
    sql += ` AND u.id NOT IN (SELECT user_id FROM learning_progress WHERE course_id = ? AND status = 'completed')`;
    params.push(course_id);
  }
  
  const users = db.prepare(sql).all(...params);
  
  res.json(users);
});

router.post('/remind', (req, res) => {
  const { user_ids, course_id, message } = req.body;
  
  const course = db.prepare('SELECT title FROM courses WHERE id = ?').get(course_id);
  if (!course) {
    return res.status(404).json({ message: '课程不存在' });
  }
  
  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, title, content, type, link)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  user_ids.forEach(userId => {
    insertNotification.run(userId, '学习提醒', message || `请尽快完成课程：${course.title}`, 'reminder', `/courses/${course_id}`);
  });
  
  res.json({ message: '提醒发送成功', count: user_ids.length });
});

module.exports = router;
