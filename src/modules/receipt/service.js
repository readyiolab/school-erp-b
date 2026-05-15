const { connectDb, query, queryAll } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');
const { mapReceipt } = require('../../utils/mappers');
const { generateReceiptPdf } = require('../../utils/receiptPdf');

const formatReceiptNumber = (schoolId, sequence) =>
  `RCP-${schoolId}-${String(sequence).padStart(6, '0')}`;

const getReceiptDetailRow = (schoolId, receiptId) =>
  query(
    `SELECT
      r.*,
      s.name AS school_name,
      st.name AS student_name,
      COALESCE(r.amount, f.amount, fp.total_paid) AS amount,
      COALESCE(fp.payment_date, f.payment_date, r.created_at) AS payment_date
    FROM tbl_receipts r
    INNER JOIN tbl_schools s ON s.id = r.school_id
    INNER JOIN tbl_students st ON st.id = r.student_id AND st.school_id = r.school_id
    LEFT JOIN tbl_fees f ON f.id = r.fee_id AND f.school_id = r.school_id
    LEFT JOIN tbl_fee_payments fp ON fp.id = r.fee_payment_id AND fp.school_id = r.school_id
    WHERE r.id = ? AND r.school_id = ?
    LIMIT 1`,
    [receiptId, schoolId]
  );

const getReceiptItems = async (schoolId, receiptId) =>
  queryAll(
    `SELECT item_name, amount, discount_amount, paid_amount
     FROM tbl_receipt_items
     WHERE school_id = ? AND receipt_id = ?
     ORDER BY id ASC`,
    [schoolId, receiptId]
  );

const buildReceiptPdfBuffer = async (schoolId, receiptId) => {
  const receipt = await getReceiptDetailRow(schoolId, receiptId);

  if (!receipt) {
    throw new ApiError(404, 'Receipt not found');
  }

  const items = await getReceiptItems(schoolId, receiptId);

  const pdfBuffer = await generateReceiptPdf({
    schoolName: receipt.school_name,
    receiptNumber: receipt.receipt_number,
    studentName: receipt.student_name,
    amount: receipt.amount,
    paymentDate: receipt.payment_date,
    items: items.map((item) => ({
      itemName: item.item_name,
      amount: Number(item.amount),
      discountAmount: Number(item.discount_amount),
      paidAmount: Number(item.paid_amount)
    }))
  });

  return {
    buffer: pdfBuffer,
    receiptNumber: receipt.receipt_number
  };
};

const generateReceiptForFee = async (schoolId, feeId) => {
  const existingReceipt = await query(
    'SELECT * FROM tbl_receipts WHERE school_id = ? AND fee_id = ? LIMIT 1',
    [schoolId, feeId]
  );

  if (existingReceipt) {
    return getReceiptById(schoolId, existingReceipt.id);
  }

  const pool = await connectDb();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [feeRows] = await connection.query(
      `SELECT f.id, f.school_id, f.student_id, f.amount, f.payment_date
       FROM tbl_fees f
       WHERE f.id = ? AND f.school_id = ? AND f.status = 'PAID'
       LIMIT 1 FOR UPDATE`,
      [feeId, schoolId]
    );
    const fee = feeRows[0];

    if (!fee) {
      throw new ApiError(404, 'Paid fee record not found');
    }

    await connection.query(
      'UPDATE tbl_schools SET receipt_sequence = receipt_sequence + 1, updated_at = NOW() WHERE id = ?',
      [schoolId]
    );

    const [schoolRows] = await connection.query(
      'SELECT receipt_sequence FROM tbl_schools WHERE id = ? LIMIT 1',
      [schoolId]
    );
    const school = schoolRows[0];

    if (!school) {
      throw new ApiError(404, 'School not found');
    }

    const receiptNumber = formatReceiptNumber(schoolId, school.receipt_sequence);

    const [result] = await connection.query('INSERT INTO tbl_receipts SET ?', {
      school_id: schoolId,
      student_id: fee.student_id,
      fee_id: fee.id,
      receipt_number: receiptNumber,
      amount: fee.amount
    });

    await connection.commit();

    return getReceiptById(schoolId, result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getReceiptById = async (schoolId, receiptId) => {
  const receipt = await getReceiptDetailRow(schoolId, receiptId);

  if (!receipt) {
    throw new ApiError(404, 'Receipt not found');
  }

  const items = await getReceiptItems(schoolId, receiptId);
  return mapReceipt({
    ...receipt,
    items: items.map((item) => ({
      itemName: item.item_name,
      amount: Number(item.amount),
      discountAmount: Number(item.discount_amount),
      paidAmount: Number(item.paid_amount)
    }))
  });
};

module.exports = {
  generateReceiptForFee,
  getReceiptById,
  buildReceiptPdfBuffer
};
