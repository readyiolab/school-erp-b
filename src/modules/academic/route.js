const express = require('express');
const { query, queryAll } = require('../../utils/mysql');
const marksValidator = require('./validators/marksValidator');
const marksController = require('./controllers/marksController');
const assignmentValidator = require('./validators/assignmentValidator');
const assignmentController = require('./controllers/assignmentController');
const reportCardController = require('./controllers/reportCardController');
const attendanceController = require('./controllers/attendanceController');
const leaveController = require('./controllers/leaveController');
const holidayController = require('./controllers/holidayController');
const examController = require('./controllers/examController');
const classController = require('./controllers/classController');

const router = express.Router();

/**
 * ========================================================
 * 1. SESSIONS
 * ========================================================
 */
router.get('/sessions', async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const sessions = await queryAll('SELECT * FROM tbl_academic_sessions WHERE school_id = ? ORDER BY start_date DESC', [schoolId]);
    res.json({ success: true, data: sessions, sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

router.get('/active-session', async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const session = await query('SELECT * FROM tbl_academic_sessions WHERE school_id = ? AND is_active = 1 LIMIT 1', [schoolId]);
    res.json({ success: true, data: session, session });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

/**
 * ========================================================
 * 2. SUBJECTS (Subject Master)
 * ========================================================
 */
const subjectController = require('./controllers/subjectController');
router.get('/subjects', subjectController.getSubjects);
router.post('/subjects', subjectController.addSubject);
router.put('/subjects/:id', subjectController.updateSubject);
router.delete('/subjects/:id', subjectController.deleteSubject);
router.get('/subjects/class/:classId', subjectController.getClassSubjects);
router.post('/subjects/class/:classId', subjectController.saveClassSubjects);
router.get('/classes', classController.getClasses);
router.get('/classes/:classId/sections', classController.getSections);

/**
 * ========================================================
 * 3. TEACHER ASSIGNMENTS & TIMETABLE
 * ========================================================
 */
router.post('/assignments/assign-subject', assignmentValidator.assignTeacherValidation, assignmentController.assignTeacher);
router.get('/assignments/timetable/section/:sectionId', assignmentController.getSectionTimetable);
router.post('/assignments/set-timetable', assignmentValidator.setTimetableValidation, assignmentController.setTimetable);
router.get('/assignments/my-subjects', assignmentController.getMySubjects);
router.get('/assignments/my-timetable', assignmentController.getMyTimetable);

/**
 * ========================================================
 * 4. MARKS ENTRY
 * ========================================================
 */
router.get('/marks/status', marksController.getMarksStatus);
router.post('/marks/bulk', marksValidator.saveMarksValidation, marksController.bulkSaveMarks);
router.post('/marks/finalize', marksController.finalizeMarks);

/**
 * ========================================================
 * 4.5 EXAMS
 * ========================================================
 */
router.get('/exams', examController.getExams);
router.post('/exams', examController.createExam);

/**
 * ========================================================
 * 5. REPORTS
 * ========================================================
 */
router.post('/reports/generate', reportCardController.generateClassReportCards);

/**
 * ========================================================
 * 6. STUDENT ATTENDANCE
 * ========================================================
 */
router.get('/attendance/sheet', attendanceController.getAttendanceSheet);
router.post('/attendance/bulk', attendanceController.markBulkAttendance);
router.get('/attendance/my-students', attendanceController.getMyStudents);
router.get('/attendance/my-summary', attendanceController.getMyAttendanceSummary);
router.post('/attendance/teacher/punch', attendanceController.punchTeacherAttendance);
router.get('/attendance/teacher/status', attendanceController.getPunchStatus);
router.get('/attendance/teacher/history', attendanceController.getTeacherAttendance);

/**
 * ========================================================
 * 7. LEAVE MANAGEMENT
 * ========================================================
 */
router.post('/leaves/apply', leaveController.applyLeave);
router.get('/leaves/pending', leaveController.getPendingLeaves);
router.post('/leaves/update', leaveController.updateLeaveStatus);
router.get('/leaves/student/:student_id', leaveController.getStudentLeaves);

/**
 * ========================================================
 * 8. HOLIDAYS
 * ========================================================
 */
router.get('/holidays', holidayController.getHolidays);
router.post('/holidays', holidayController.addHoliday);
router.delete('/holidays/:id', holidayController.deleteHoliday);

/**
 * ========================================================
 * 9. TEACHERS & CLASS TEACHERS
 * ========================================================
 */
const teacherController = require('./controllers/teacherController');
router.get('/teachers', teacherController.getTeachers);
router.get('/class-teachers', teacherController.getClassTeachers);
router.post('/class-teachers/assign', teacherController.assignClassTeacher);

module.exports = router;
