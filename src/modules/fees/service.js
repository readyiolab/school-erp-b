const { connectDb, insert, query, queryAll, update } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');
const { mapFee, mapFeeAssignment, mapFeePayment, mapReceipt } = require('../../utils/mappers');
const { generateReceiptForFee } = require('../receipt/service');
const { getCurrentAcademicYear } = require('../school/service');

const createReceiptNumber = async (connection, schoolId) => {
  await connection.query(
    'UPDATE tbl_schools SET receipt_sequence = receipt_sequence + 1, updated_at = NOW() WHERE id = ?',
    [schoolId]
  );
  const [schoolRows] = await connection.query(
    'SELECT receipt_sequence, code FROM tbl_schools WHERE id = ? LIMIT 1',
    [schoolId]
  );
  const school = schoolRows[0];
  return `RCP-${school.code}-${String(school.receipt_sequence).padStart(6, '0')}`;
};

const buildEffectiveLineItems = async (schoolId, structure, payload) => {
  const rows = await queryAll(
    `SELECT id, item_name, amount, sort_order
     FROM tbl_fee_structure_items
     WHERE school_id = ? AND fee_structure_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [schoolId, structure.id]
  );

  const baseItems = rows.length > 0
    ? rows.map((item) => ({
        structureItemId: item.id,
        name: item.item_name,
        amount: Number(item.amount),
        sortOrder: item.sort_order,
      }))
    : [{
        structureItemId: null,
        name: structure.name,
        amount: Number(structure.amount),
        sortOrder: 0,
      }];

  if (!Array.isArray(payload.lineItems) || payload.lineItems.length === 0) {
    return baseItems.map((item) => ({
      ...item,
      discountAmount: Number(payload.discountAmount || 0),
      discountReason: payload.discountReason || null,
    }));
  }

  return payload.lineItems
    .filter((item) => Number(item.amount) > 0)
    .map((item, index) => ({
      structureItemId: item.structureItemId || null,
      name: item.name,
      amount: Number(item.amount),
      discountAmount: Number(item.discountAmount || 0),
      discountReason: item.discountReason || payload.discountReason || null,
      sortOrder: item.sortOrder ?? index,
    }));
};

// ─── Legacy pay (backward compat) ──────────────────────────────────
const payFee = async (schoolId, payload) => {
  const student = await query('SELECT id FROM tbl_students WHERE id = ? AND school_id = ? LIMIT 1', [
    payload.studentId, schoolId
  ]);
  if (!student) throw new ApiError(404, 'Student not found');

  const result = await insert('tbl_fees', {
    school_id: schoolId,
    student_id: payload.studentId,
    amount: payload.amount,
    status: 'PAID',
    payment_date: payload.paymentDate ? new Date(payload.paymentDate) : new Date()
  });

  const fee = await query('SELECT * FROM tbl_fees WHERE id = ? AND school_id = ? LIMIT 1', [
    result.insert_id, schoolId
  ]);
  const receipt = await generateReceiptForFee(schoolId, result.insert_id);

  return { fee: mapFee(fee), receipt };
};

// ─── Legacy history ─────────────────────────────────────────────────
const getStudentFeeHistory = async (schoolId, studentId) => {
  const student = await query('SELECT id FROM tbl_students WHERE id = ? AND school_id = ? LIMIT 1', [
    studentId, schoolId
  ]);
  if (!student) throw new ApiError(404, 'Student not found');

  const fees = await queryAll(
    `SELECT f.*, r.id AS receipt_id, r.receipt_number, r.pdf_url AS receipt_pdf_url
     FROM tbl_fees f
     LEFT JOIN tbl_receipts r ON r.fee_id = f.id AND r.school_id = f.school_id
     WHERE f.school_id = ? AND f.student_id = ?
     ORDER BY f.created_at DESC`,
    [schoolId, studentId]
  );
  return fees.map(mapFee);
};

// ─── Legacy pending ─────────────────────────────────────────────────
const getPendingFees = async (schoolId) => {
  const fees = await queryAll(
    `SELECT f.*, s.name AS student_name
     FROM tbl_fees f
     INNER JOIN tbl_students s ON s.id = f.student_id AND s.school_id = f.school_id
     WHERE f.school_id = ? AND f.status = 'PENDING'
     ORDER BY f.created_at DESC`,
    [schoolId]
  );
  return fees.map(mapFee);
};

// ═══════════════════════════════════════════════════════════════════
// NEW FEE SYSTEM: Assignments + Payments + Late Fees + Discounts
// ═══════════════════════════════════════════════════════════════════

// ─── Assign fees to student ─────────────────────────────────────────
const assignFeesToStudent = async (schoolId, payload) => {
  const student = await query(
    'SELECT id, class FROM tbl_students WHERE id = ? AND school_id = ? LIMIT 1',
    [payload.studentId, schoolId]
  );
  if (!student) throw new ApiError(404, 'Student not found');

  const structure = await query(
    'SELECT * FROM tbl_fee_structures WHERE id = ? AND school_id = ? AND is_active = 1 LIMIT 1',
    [payload.feeStructureId, schoolId]
  );
  if (!structure) throw new ApiError(404, 'Fee structure not found or inactive');

  if (structure.applicable_classes) {
    const applicableClasses = JSON.parse(structure.applicable_classes);
    if (Array.isArray(applicableClasses) && applicableClasses.length > 0 && !applicableClasses.includes(student.class)) {
      throw new ApiError(409, `Fee structure is not applicable for Class ${student.class}`);
    }
  }

  const lineItems = await buildEffectiveLineItems(schoolId, structure, payload);
  const academicYear = payload.academicYear || getCurrentAcademicYear();
  const assignments = [];
  for (const item of lineItems) {
    const totalAmount = Number(item.amount);
    const discountAmount = Number(item.discountAmount || 0);
    const netAmount = Math.max(0, totalAmount - discountAmount);
    const result = await insert('tbl_fee_assignments', {
      school_id: schoolId,
      student_id: payload.studentId,
      fee_structure_id: payload.feeStructureId,
      fee_item_name: item.name,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      discount_reason: item.discountReason || null,
      net_amount: netAmount,
      paid_amount: 0,
      due_date: payload.dueDate ? new Date(payload.dueDate) : new Date(),
      status: 'PENDING',
      installment_count: 1,
      academic_year: academicYear
    });

    const assignment = await query(
      `SELECT fa.*, fs.name AS structure_name, fs.fee_type
       FROM tbl_fee_assignments fa
       INNER JOIN tbl_fee_structures fs ON fs.id = fa.fee_structure_id
       WHERE fa.id = ? AND fa.school_id = ? LIMIT 1`,
      [result.insert_id, schoolId]
    );
    assignments.push(mapFeeAssignment(assignment));
  }

  return assignments;
};

// ─── Calculate late fee ─────────────────────────────────────────────
const calculateLateFee = (dueDate, finePerDay, gracePeriodDays) => {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = now - due;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const lateDays = Math.max(0, diffDays - (gracePeriodDays || 5));
  return Math.round(lateDays * Number(finePerDay) * 100) / 100;
};

// ─── Record payment against assignment ──────────────────────────────
const recordPayment = async (schoolId, payload) => {
  const pool = await connectDb();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const result = await recordBulkPaymentInTransaction(connection, schoolId, {
      payments: [{
        feeAssignmentId: payload.feeAssignmentId,
        amount: payload.amount,
      }],
      paymentMode: payload.paymentMode,
      paymentDate: payload.paymentDate,
      transactionRef: payload.transactionRef,
    });

    await connection.commit();
    return result.payments[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const recordBulkPaymentInTransaction = async (connection, schoolId, payload) => {
  const payments = [];
  const receiptItems = [];
  let studentId = null;
  let totalReceiptAmount = 0;

  for (const item of payload.payments) {
    const [assignRows] = await connection.query(
      `SELECT fa.*, fs.name AS structure_name, fs.fine_per_day, fs.grace_period_days
       FROM tbl_fee_assignments fa
       INNER JOIN tbl_fee_structures fs ON fs.id = fa.fee_structure_id
       WHERE fa.id = ? AND fa.school_id = ?
       LIMIT 1 FOR UPDATE`,
      [item.feeAssignmentId, schoolId]
    );
    const assignment = assignRows[0];
    if (!assignment) throw new ApiError(404, 'Fee assignment not found');
    if (assignment.status === 'PAID') throw new ApiError(409, 'Fee already fully paid');

    if (studentId === null) {
      studentId = assignment.student_id;
    } else if (studentId !== assignment.student_id) {
      throw new ApiError(409, 'All selected fee rows must belong to the same student');
    }

    const remaining = Number(assignment.net_amount) - Number(assignment.paid_amount);
    const payAmount = Math.min(Number(item.amount), remaining);
    const lateFee = calculateLateFee(assignment.due_date, assignment.fine_per_day, assignment.grace_period_days);
    const totalPaid = payAmount + lateFee;

    const [paymentResult] = await connection.query('INSERT INTO tbl_fee_payments SET ?', {
      school_id: schoolId,
      student_id: assignment.student_id,
      fee_assignment_id: assignment.id,
      amount: payAmount,
      late_fee: lateFee,
      total_paid: totalPaid,
      payment_mode: payload.paymentMode || 'CASH',
      transaction_ref: payload.transactionRef || null,
      payment_date: payload.paymentDate ? new Date(payload.paymentDate) : new Date()
    });

    const newPaidAmount = Number(assignment.paid_amount) + payAmount;
    const newStatus = newPaidAmount >= Number(assignment.net_amount) ? 'PAID' : 'PARTIAL';
    await connection.query(
      'UPDATE tbl_fee_assignments SET paid_amount = ?, status = ?, updated_at = NOW() WHERE id = ? AND school_id = ?',
      [newPaidAmount, newStatus, assignment.id, schoolId]
    );

    payments.push({
      paymentId: paymentResult.insertId,
      assignmentId: assignment.id,
      itemName: assignment.fee_item_name || assignment.structure_name,
      amount: payAmount,
      discountAmount: Number(assignment.discount_amount || 0),
      totalPaid,
    });
    receiptItems.push({
      feeAssignmentId: assignment.id,
      itemName: assignment.fee_item_name || assignment.structure_name,
      amount: Number(assignment.total_amount),
      discountAmount: Number(assignment.discount_amount || 0),
      paidAmount: totalPaid,
    });
    totalReceiptAmount += totalPaid;
  }

  const receiptNumber = await createReceiptNumber(connection, schoolId);
  const [receiptResult] = await connection.query('INSERT INTO tbl_receipts SET ?', {
    school_id: schoolId,
    student_id: studentId,
    fee_payment_id: payments.length === 1 ? payments[0].paymentId : null,
    receipt_number: receiptNumber,
    amount: totalReceiptAmount
  });

  for (const item of receiptItems) {
    await connection.query('INSERT INTO tbl_receipt_items SET ?', {
      school_id: schoolId,
      receipt_id: receiptResult.insertId,
      fee_assignment_id: item.feeAssignmentId,
      item_name: item.itemName,
      amount: item.amount,
      discount_amount: item.discountAmount,
      paid_amount: item.paidAmount
    });
  }

  const mappedPayments = [];
  for (const payment of payments) {
    const [rows] = await connection.query(
      `SELECT fp.*, r.id AS receipt_id, r.receipt_number
       FROM tbl_fee_payments fp
       LEFT JOIN tbl_receipts r ON r.id = ? AND r.school_id = fp.school_id
       WHERE fp.id = ? AND fp.school_id = ? LIMIT 1`,
      [receiptResult.insertId, payment.paymentId, schoolId]
    );
    mappedPayments.push(mapFeePayment(rows[0]));
  }

  const [receiptRows] = await connection.query(
    `SELECT r.*, s.name AS school_name, st.name AS student_name, r.amount, r.created_at AS payment_date
     FROM tbl_receipts r
     INNER JOIN tbl_schools s ON s.id = r.school_id
     INNER JOIN tbl_students st ON st.id = r.student_id AND st.school_id = r.school_id
     WHERE r.id = ? AND r.school_id = ?
     LIMIT 1`,
    [receiptResult.insertId, schoolId]
  );

  return {
    payments: mappedPayments,
    receipt: mapReceipt({
      ...receiptRows[0],
      items: receiptItems.map((item) => ({
        itemName: item.itemName,
        amount: item.amount,
        discountAmount: item.discountAmount,
        paidAmount: item.paidAmount,
      })),
    }),
  };
};

const recordBulkPayment = async (schoolId, payload) => {
  const pool = await connectDb();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await recordBulkPaymentInTransaction(connection, schoolId, payload);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ─── Get student fee assignments ────────────────────────────────────
const getStudentFeeAssignments = async (schoolId, studentId) => {
  const assignments = await queryAll(
      `SELECT fa.*, fs.name AS structure_name, fs.fee_type, fs.fine_per_day, fs.grace_period_days,
       s.name AS student_name, s.student_uid
     FROM tbl_fee_assignments fa
     INNER JOIN tbl_fee_structures fs ON fs.id = fa.fee_structure_id
     INNER JOIN tbl_students s ON s.id = fa.student_id AND s.school_id = fa.school_id
     WHERE fa.school_id = ? AND fa.student_id = ?
     ORDER BY fa.due_date ASC`,
    [schoolId, studentId]
  );

  return assignments.map((row) => {
    const mapped = mapFeeAssignment(row);
    // Attach real-time late fee
    if (row.status !== 'PAID') {
      mapped.lateFee = calculateLateFee(row.due_date, row.fine_per_day, row.grace_period_days);
    }
    return mapped;
  });
};

const getStudentById = async (schoolId, studentId) => {
  const student = await query(
    `SELECT id, school_id, student_uid, name, class, section, stream, parent_name, phone, status
     FROM tbl_students
     WHERE id = ? AND school_id = ?
     LIMIT 1`,
    [studentId, schoolId]
  );

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  return student;
};

// ─── Get payments for an assignment ─────────────────────────────────
const getPaymentsByAssignment = async (schoolId, assignmentId) => {
  const payments = await queryAll(
    `SELECT fp.*, r.receipt_number
     FROM tbl_fee_payments fp
     LEFT JOIN tbl_receipts r ON r.fee_payment_id = fp.id AND r.school_id = fp.school_id
     WHERE fp.school_id = ? AND fp.fee_assignment_id = ?
     ORDER BY fp.payment_date DESC`,
    [schoolId, assignmentId]
  );
  return payments.map(mapFeePayment);
};

const getStudentLedger = async (schoolId, studentId) => {
  const student = await getStudentById(schoolId, studentId);
  const assignments = await getStudentFeeAssignments(schoolId, studentId);

  const payments = await queryAll(
    `SELECT fp.*, r.id AS receipt_id, r.receipt_number, fa.fee_item_name, fs.name AS structure_name
     FROM tbl_fee_payments fp
     INNER JOIN tbl_fee_assignments fa ON fa.id = fp.fee_assignment_id AND fa.school_id = fp.school_id
     INNER JOIN tbl_fee_structures fs ON fs.id = fa.fee_structure_id
     LEFT JOIN tbl_receipts r ON r.fee_payment_id = fp.id AND r.school_id = fp.school_id
     WHERE fp.school_id = ? AND fp.student_id = ?
     ORDER BY fp.payment_date DESC, fp.id DESC`,
    [schoolId, studentId]
  );

  const summary = assignments.reduce((acc, assignment) => {
    const due = Math.max(
      Number(assignment.netAmount) - Number(assignment.paidAmount) + Number(assignment.lateFee || 0),
      0
    );

    acc.totalAssigned += Number(assignment.netAmount);
    acc.totalPaid += Number(assignment.paidAmount);
    acc.totalDiscount += Number(assignment.discountAmount || 0);
    acc.totalDue += due;

    if (assignment.status === 'OVERDUE') {
      acc.overdueCount += 1;
    }

    if (assignment.status !== 'PAID') {
      acc.openItemCount += 1;
    }

    return acc;
  }, {
    totalAssigned: 0,
    totalPaid: 0,
    totalDiscount: 0,
    totalDue: 0,
    overdueCount: 0,
    openItemCount: 0
  });

  return {
    student: {
      id: student.id,
      schoolId: student.school_id,
      studentUid: student.student_uid || null,
      name: student.name,
      class: student.class,
      section: student.section,
      stream: student.stream || null,
      parentName: student.parent_name || null,
      phone: student.phone || null,
      status: student.status
    },
    summary: {
      ...summary,
      totalAssigned: Number(summary.totalAssigned.toFixed(2)),
      totalPaid: Number(summary.totalPaid.toFixed(2)),
      totalDiscount: Number(summary.totalDiscount.toFixed(2)),
      totalDue: Number(summary.totalDue.toFixed(2))
    },
    assignments,
    payments: payments.map((row) => ({
      ...mapFeePayment(row),
      itemName: row.fee_item_name || row.structure_name || undefined
    }))
  };
};

// ─── Get all pending/overdue fee assignments ────────────────────────
const getPendingAssignments = async (schoolId) => {
  const assignments = await queryAll(
      `SELECT fa.*, fs.name AS structure_name, fs.fee_type, fs.fine_per_day, fs.grace_period_days,
       s.name AS student_name, s.student_uid
     FROM tbl_fee_assignments fa
     INNER JOIN tbl_fee_structures fs ON fs.id = fa.fee_structure_id
     INNER JOIN tbl_students s ON s.id = fa.student_id AND s.school_id = fa.school_id
     WHERE fa.school_id = ? AND fa.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
     ORDER BY fa.due_date ASC`,
    [schoolId]
  );

  return assignments.map((row) => {
    const mapped = mapFeeAssignment(row);
    mapped.lateFee = calculateLateFee(row.due_date, row.fine_per_day, row.grace_period_days);
    // Auto-update status to OVERDUE if past due
    if (mapped.lateFee > 0 && row.status === 'PENDING') {
      mapped.status = 'OVERDUE';
    }
    return mapped;
  });
};

const assignFeesBulkByClass = async (schoolId, payload) => {
  const { class: className, feeStructureId, dueDate, academicYear, studentIds } = payload;

  const structure = await query(
    'SELECT * FROM tbl_fee_structures WHERE id = ? AND school_id = ? AND is_active = 1 LIMIT 1',
    [feeStructureId, schoolId]
  );
  if (!structure) throw new ApiError(404, 'Fee structure not found or inactive');

  // If studentIds provided, use those. Otherwise, fetch all active students in class.
  let targetStudentIds = studentIds;
  if (!Array.isArray(targetStudentIds) || targetStudentIds.length === 0) {
    const students = await queryAll(
      'SELECT id FROM tbl_students WHERE school_id = ? AND class = ? AND status = "ACTIVE"',
      [schoolId, className]
    );
    targetStudentIds = students.map(s => s.id);
  }

  if (targetStudentIds.length === 0) {
    throw new ApiError(400, 'No active students found in the specified class');
  }

  const results = {
    total: targetStudentIds.length,
    success: 0,
    failed: 0,
    errors: []
  };

  const pool = await connectDb();
  const connection = await pool.getConnection();

  try {
    for (const studentId of targetStudentIds) {
      try {
        await assignFeesToStudent(schoolId, {
          studentId,
          feeStructureId,
          dueDate,
          academicYear
        });
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ studentId, error: err.message });
      }
    }
  } finally {
    connection.release();
  }

  return results;
};

module.exports = {
  payFee, getStudentFeeHistory, getPendingFees,
  assignFeesToStudent, recordPayment, recordBulkPayment, getStudentFeeAssignments,
  getPaymentsByAssignment, getPendingAssignments, getStudentLedger, calculateLateFee,
  assignFeesBulkByClass
};
