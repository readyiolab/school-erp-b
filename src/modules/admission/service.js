const { connectDb, insert, query, queryAll, update } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');
const { mapAdmission, mapStudent } = require('../../utils/mappers');
const { checkSectionCapacity, getCurrentAcademicYear } = require('../school/service');
const { assignFeesToStudent, recordBulkPayment, recordPayment } = require('../fees/service');
const { uploadFromBuffer } = require('../../utils/cloudinary');
const bcrypt = require('bcryptjs');

/**
 * Create a new admission application
 */
const createAdmission = async (schoolId, payload, files = {}) => {
  // 1. Capacity Check
  const capacity = await checkSectionCapacity(schoolId, payload.class, payload.section);
  if (!capacity.available) {
    throw new ApiError(409, `Section ${payload.section} of Class ${payload.class} is full (${capacity.current}/${capacity.max})`);
  }

  // 2. Handle File Uploads (Photo & TC)
  let photoUrl = null;
  let tcUrl = null;

  if (files.photo && files.photo[0]) {
    const upload = await uploadFromBuffer(files.photo[0].buffer, { folder: 'school_erp/students' });
    photoUrl = upload.secure_url;
  }

  if (files.transferCertificate && files.transferCertificate[0]) {
    const upload = await uploadFromBuffer(files.transferCertificate[0].buffer, { folder: 'school_erp/documents' });
    tcUrl = upload.secure_url;
  }

  // 3. Insert Admission
  const result = await insert('tbl_admissions', {
    school_id: schoolId,
    student_name: payload.studentName,
    class: payload.class,
    section: payload.section || 'A',
    stream: payload.stream || null,
    admission_type: payload.admissionType || 'REGULAR',
    date_of_birth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
    gender: payload.gender || null,
    address: payload.address || null,
    email: payload.email || null,
    aadhaar_number: payload.aadhaarNumber || null,
    photo_url: photoUrl,
    transfer_certificate_url: tcUrl,
    parent_name: payload.parentName || null,
    phone: payload.phone || null,
    status: 'PENDING'
  });

  const admission = await query('SELECT * FROM tbl_admissions WHERE id = ? AND school_id = ? LIMIT 1', [
    result.insert_id,
    schoolId
  ]);

  return mapAdmission(admission);
};

const getAdmissions = async (schoolId, filters) => {
  const conditions = ['school_id = ?'];
  const params = [schoolId];

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  if (filters.class) {
    conditions.push('class = ?');
    params.push(filters.class);
  }

  const admissions = await queryAll(
    `SELECT * FROM tbl_admissions WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    params
  );

  return admissions.map(mapAdmission);
};

/**
 * Approve admission and convert to student
 */
const approveAdmission = async (schoolId, admissionId, adminId, options = {}) => {
  const pool = await connectDb();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch and Lock Admission
    const [admissionRows] = await connection.query(
      'SELECT * FROM tbl_admissions WHERE id = ? AND school_id = ? LIMIT 1 FOR UPDATE',
      [admissionId, schoolId]
    );
    const admission = admissionRows[0];

    if (!admission) throw new ApiError(404, 'Admission not found');
    if (admission.status === 'APPROVED') throw new ApiError(409, 'Admission already approved');

    // 2. Fetch and Lock School for Sequence
    const [schoolRows] = await connection.query(
      'SELECT code, student_sequence FROM tbl_schools WHERE id = ? LIMIT 1 FOR UPDATE',
      [schoolId]
    );
    const school = schoolRows[0];
    const newSequence = school.student_sequence + 1;
    const academicYear = getCurrentAcademicYear().split('-')[0]; // Use start year, e.g., 2026

    // 3. Generate Student UID (Format: SCH001-2026-0001)
    const studentUid = `${school.code}-${academicYear}-${String(newSequence).padStart(4, '0')}`;

    // 4. Update School Sequence
    await connection.query(
      'UPDATE tbl_schools SET student_sequence = ? WHERE id = ?',
      [newSequence, schoolId]
    );

    // 5. Update Admission Status
    await connection.query(
      `UPDATE tbl_admissions SET status = 'APPROVED', approved_at = NOW(), approved_by = ? WHERE id = ?`,
      [adminId, admissionId]
    );

    // 6. Create Student
    const [studentResult] = await connection.query('INSERT INTO tbl_students SET ?', {
      school_id: schoolId,
      student_uid: studentUid,
      name: admission.student_name,
      class: admission.class,
      section: admission.section || 'A',
      stream: admission.stream || null,
      admission_type: admission.admission_type,
      date_of_birth: admission.date_of_birth,
      gender: admission.gender,
      address: admission.address,
      email: admission.email,
      aadhaar_number: admission.aadhaar_number,
      photo_url: admission.photo_url,
      parent_name: admission.parent_name,
      phone: admission.phone,
      status: 'ACTIVE',
      admission_id: admission.id
    });

    const studentId = studentResult.insertId;

    // 7. Create Student Credentials
    const studentEmail = admission.email || `${studentUid.toLowerCase()}@school.com`;
    const defaultPassword = 'Welcome@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    await connection.query('INSERT IGNORE INTO tbl_admins SET ?', {
      school_id: schoolId,
      email: studentEmail,
      username: studentUid,
      password_hash: passwordHash,
      full_name: admission.student_name,
      role: 'STUDENT',
      profile_id: studentId, // Link to tbl_students.id
      is_active: 1
    });

    await connection.commit();

    const approvedAdmission = await query('SELECT * FROM tbl_admissions WHERE id = ?', [admissionId]);
    const student = await query('SELECT * FROM tbl_students WHERE id = ?', [studentId]);
    let assignedFees = [];
    let payment = null;

    if (options.feeStructureId) {
      assignedFees = await assignFeesToStudent(schoolId, {
        studentId,
        feeStructureId: Number(options.feeStructureId),
        dueDate: options.dueDate,
        discountAmount: Number(options.discountAmount || 0),
        discountReason: options.discountReason || undefined,
        installmentCount: 1,
        lineItems: Array.isArray(options.feeLineItems) ? options.feeLineItems : undefined,
        academicYear: getCurrentAcademicYear()
      });

      if (options.collectPayment && assignedFees.length > 0) {
        const payments = assignedFees
          .map((assignment) => ({
            feeAssignmentId: assignment.id,
            amount: Math.max(Number(assignment.netAmount) - Number(assignment.paidAmount || 0), 0),
          }))
          .filter((item) => item.amount > 0);

        if (payments.length === 1) {
          const singlePayment = await recordPayment(schoolId, {
            feeAssignmentId: payments[0].feeAssignmentId,
            amount: Number(options.paymentAmount || payments[0].amount),
            paymentMode: options.paymentMode || 'CASH',
            paymentDate: options.paymentDate,
            transactionRef: options.transactionRef || undefined
          });
          payment = singlePayment;
        } else if (payments.length > 1) {
          const bulkPayment = await recordBulkPayment(schoolId, {
            payments,
            paymentMode: options.paymentMode || 'CASH',
            paymentDate: options.paymentDate,
            transactionRef: options.transactionRef || undefined
          });
          payment = {
            receiptId: bulkPayment.receipt?.id,
            receiptNumber: bulkPayment.receipt?.receiptNumber,
            receipt: bulkPayment.receipt,
            payments: bulkPayment.payments,
          };
        }
      }
    }

    return {
      admission: mapAdmission(approvedAdmission),
      student: mapStudent(student),
      assignedFees,
      payment
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  createAdmission,
  getAdmissions,
  approveAdmission
};
