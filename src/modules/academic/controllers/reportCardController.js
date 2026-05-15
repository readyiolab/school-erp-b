const { query, queryAll, insert } = require('../../../utils/mysql');
const ApiError = require('../../../utils/apiError');

// Calculates Grade based on CBSE style absolute grading
const getGrade = (percentage) => {
  if (percentage >= 91) return 'A1';
  if (percentage >= 81) return 'A2';
  if (percentage >= 71) return 'B1';
  if (percentage >= 61) return 'B2';
  if (percentage >= 51) return 'C1';
  if (percentage >= 41) return 'C2';
  if (percentage >= 33) return 'D';
  return 'E (FAIL)';
};

exports.generateClassReportCards = async (req, res, next) => {
  try {
    const { session_id, exam_id, section_id } = req.body;

    // 1. Validate if all subjects in the section have their marks locked.
    const classSubjects = await queryAll(
      `SELECT subject_id FROM tbl_class_subjects 
       JOIN tbl_sections on tbl_class_subjects.class_id = tbl_sections.class_id
       WHERE tbl_sections.id = ?`,
       [section_id]
    );

    const lockedSubjects = await queryAll(
      `SELECT subject_id FROM tbl_marks_status 
       WHERE exam_id = ? AND section_id = ? AND is_completed = 1`,
       [exam_id, section_id]
    );

    if (classSubjects.length !== lockedSubjects.length) {
      return next(new ApiError(400, 'Cannot generate report cards. Not all subjects have completed marks entry.'));
    }

    // 2. Fetch all students in that section
    const students = await queryAll(
      `SELECT id FROM tbl_students WHERE section = (SELECT name FROM tbl_sections WHERE id = ?) AND class = (SELECT c.name FROM tbl_classes c JOIN tbl_sections s ON c.id = s.class_id WHERE s.id = ?)`,
      [section_id, section_id] // This relies on the way tbl_students stores class/section strings. Let's fetch safe ids:
    );

    const studentIds = await queryAll(
      `SELECT std.id as student_id FROM tbl_students std
       JOIN tbl_sections sec ON std.section = sec.name AND std.class = (SELECT name FROM tbl_classes WHERE id = sec.class_id)
       WHERE sec.id = ? AND std.status = 'ACTIVE'`,
       [section_id]
    );

    // 3. For each student, aggregate marks
    let generatedCount = 0;
    for (const stu of studentIds) {
      const marks = await queryAll(
        `SELECT m.theory_marks, m.practical_marks, cs.theory_max_marks, cs.practical_max_marks
         FROM tbl_marks m
         JOIN tbl_class_subjects cs ON m.subject_id = cs.subject_id
         JOIN tbl_sections s ON cs.class_id = s.class_id
         WHERE m.student_id = ? AND m.exam_id = ? AND s.id = ?`,
         [stu.student_id, exam_id, section_id]
      );

      if (marks.length === 0) continue; // No records for this student yet

      let studentTotalObtained = 0;
      let studentTotalMax = 0;

      for (let mark of marks) {
        studentTotalObtained += (parseFloat(mark.theory_marks || 0) + parseFloat(mark.practical_marks || 0));
        studentTotalMax += (parseFloat(mark.theory_max_marks || 0) + parseFloat(mark.practical_max_marks || 0));
      }

      const percentage = (studentTotalObtained / studentTotalMax) * 100;
      const grade = getGrade(percentage);

      // Upsert report card
      const existingReport = await query(
        `SELECT id FROM tbl_report_cards WHERE student_id = ? AND exam_id = ?`,
        [stu.student_id, exam_id]
      );

      if (existingReport) {
        await query(
          `UPDATE tbl_report_cards SET total_marks = ?, percentage = ?, grade = ? WHERE id = ?`,
          [studentTotalObtained.toFixed(2), percentage.toFixed(2), grade, existingReport.id]
        );
      } else {
        await insert('tbl_report_cards', {
          student_id: stu.student_id,
          exam_id: exam_id,
          total_marks: studentTotalObtained.toFixed(2),
          percentage: percentage.toFixed(2),
          grade: grade
        });
      }
      generatedCount++;
    }

    res.json({ success: true, message: `Successfully generated ${generatedCount} report cards.` });

  } catch (error) {
    next(error);
  }
};
