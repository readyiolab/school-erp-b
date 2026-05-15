const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const studentService = require('./service');
const { encryptId } = require('../../utils/encryption');
const { logAction } = require('../audit/service');

const getStudents = asyncHandler(async (req, res) => {
  const result = await studentService.getStudents(req.schoolId, req.query);
  
  // Add encrypted IDs to each student for frontend use
  result.items = result.items.map(student => ({
    ...student,
    encryptedId: encryptId(student.id)
  }));

  return sendSuccess(res, { message: 'Students fetched successfully', data: result });
});

const getStudentById = asyncHandler(async (req, res) => {
  const student = await studentService.getStudentById(req.schoolId, Number(req.params.id));
  return sendSuccess(res, { 
    message: 'Student fetched successfully', 
    data: { ...student, encryptedId: encryptId(student.id) } 
  });
});

const getStudentByEncryptedId = asyncHandler(async (req, res) => {
  const student = await studentService.getStudentByEncryptedId(req.schoolId, req.params.encryptedId);
  return sendSuccess(res, { 
    message: 'Student fetched successfully', 
    data: { ...student, encryptedId: encryptId(student.id) } 
  });
});

const updateStudent = asyncHandler(async (req, res) => {
  const student = await studentService.updateStudent(req.schoolId, Number(req.params.id), req.body, req.file);
  
  await logAction(req.schoolId, req.adminId, 'STUDENT_UPDATED', 'STUDENT', student.id, {
    studentUid: student.studentUid,
    name: student.name
  }, req.ip);

  return sendSuccess(res, { message: 'Student updated successfully', data: student });
});

const deleteStudent = asyncHandler(async (req, res) => {
  const student = await studentService.getStudentById(req.schoolId, Number(req.params.id));
  await studentService.deleteStudent(req.schoolId, Number(req.params.id));
  
  await logAction(req.schoolId, req.adminId, 'STUDENT_DELETED', 'STUDENT', req.params.id, {
    studentUid: student.studentUid,
    name: student.name
  }, req.ip);

  return sendSuccess(res, { message: 'Student deleted successfully', data: null });
});

module.exports = {
  getStudents,
  getStudentById,
  getStudentByEncryptedId,
  updateStudent,
  deleteStudent
};
