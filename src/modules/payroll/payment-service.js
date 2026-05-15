/**
 * Payment Service — Track salary payment status
 */

const { connectDb, query, queryAll, update } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');
const { mapPayrollRecord } = require('../../utils/mappers');

// ─── Mark Single Record as Paid ─────────────────────────────────────
const markAsPaid = async (schoolId, recordId, payload) => {
  const record = await query(
    `SELECT prec.*, pr.status AS run_status
     FROM tbl_payroll_records prec
     INNER JOIN tbl_payroll_runs pr ON pr.id = prec.payroll_run_id
     WHERE prec.id = ? AND prec.school_id = ? LIMIT 1`,
    [recordId, schoolId]
  );
  if (!record) throw new ApiError(404, 'Payroll record not found');
  if (record.payment_status === 'PAID') throw new ApiError(409, 'Already paid');
  if (record.run_status === 'DRAFT') throw new ApiError(409, 'Cannot pay before payroll is finalized');

  await update('tbl_payroll_records', {
    payment_status: 'PAID',
    payment_date: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
    payment_method: payload.paymentMethod || 'BANK',
    transaction_ref: payload.transactionRef || null
  }, 'id = ? AND school_id = ?', [recordId, schoolId]);

  // Check if all records in this run are paid
  const unpaid = await query(
    `SELECT COUNT(*) AS cnt FROM tbl_payroll_records
     WHERE payroll_run_id = ? AND school_id = ? AND payment_status = 'UNPAID'`,
    [record.payroll_run_id, schoolId]
  );
  if (Number(unpaid.cnt) === 0) {
    await update('tbl_payroll_runs', { status: 'PAID' }, 'id = ? AND school_id = ?', [record.payroll_run_id, schoolId]);
  }

  return { message: 'Payment recorded' };
};

// ─── Bulk Mark All Records in a Run as Paid ─────────────────────────
const bulkMarkAsPaid = async (schoolId, runId, payload) => {
  const run = await query(
    'SELECT id, status FROM tbl_payroll_runs WHERE id = ? AND school_id = ? LIMIT 1',
    [runId, schoolId]
  );
  if (!run) throw new ApiError(404, 'Payroll run not found');
  if (run.status === 'DRAFT') throw new ApiError(409, 'Cannot pay before payroll is finalized');

  const pool = await connectDb();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE tbl_payroll_records SET
        payment_status = 'PAID',
        payment_date = ?,
        payment_method = ?,
        transaction_ref = ?,
        updated_at = NOW()
       WHERE payroll_run_id = ? AND school_id = ? AND payment_status = 'UNPAID'`,
      [
        payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
        payload.paymentMethod || 'BANK',
        payload.transactionRef || null,
        runId, schoolId
      ]
    );

    await connection.query(
      "UPDATE tbl_payroll_runs SET status = 'PAID', updated_at = NOW() WHERE id = ? AND school_id = ?",
      [runId, schoolId]
    );

    await connection.commit();
    return { message: 'All payments recorded' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ─── Get Payment Status for a Run ───────────────────────────────────
const getPaymentStatus = async (schoolId, runId) => {
  const records = await queryAll(
    `SELECT prec.*, e.name AS employee_name, e.employee_uid, e.bank_name, e.bank_account
     FROM tbl_payroll_records prec
     INNER JOIN tbl_employees e ON e.id = prec.employee_id AND e.school_id = prec.school_id
     WHERE prec.payroll_run_id = ? AND prec.school_id = ?
     ORDER BY e.name ASC`,
    [runId, schoolId]
  );

  const paid = records.filter(r => r.payment_status === 'PAID');
  const unpaid = records.filter(r => r.payment_status === 'UNPAID');

  return {
    total: records.length,
    paidCount: paid.length,
    unpaidCount: unpaid.length,
    records: records.map(r => ({
      ...mapPayrollRecord(r),
      bankName: r.bank_name,
      bankAccount: r.bank_account
    }))
  };
};

module.exports = {
  markAsPaid,
  bulkMarkAsPaid,
  getPaymentStatus
};
