const mapStudent = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  studentUid: row.student_uid || undefined,
  name: row.name,
  class: row.class,
  section: row.section,
  stream: row.stream || undefined,
  admissionType: row.admission_type || undefined,
  dateOfBirth: row.date_of_birth || undefined,
  gender: row.gender || undefined,
  address: row.address || undefined,
  email: row.email || undefined,
  aadhaarNumber: row.aadhaar_number || undefined,
  photoUrl: row.photo_url || undefined,
  parentName: row.parent_name || undefined,
  phone: row.phone || undefined,
  status: row.status || 'ACTIVE',
  admissionId: row.admission_id || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapAdmission = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  studentName: row.student_name,
  class: row.class,
  section: row.section,
  stream: row.stream || undefined,
  admissionType: row.admission_type || undefined,
  dateOfBirth: row.date_of_birth || undefined,
  gender: row.gender || undefined,
  address: row.address || undefined,
  email: row.email || undefined,
  aadhaarNumber: row.aadhaar_number || undefined,
  photoUrl: row.photo_url || undefined,
  transferCertificateUrl: row.transfer_certificate_url || undefined,
  parentName: row.parent_name || undefined,
  phone: row.phone || undefined,
  status: row.status,
  approvedAt: row.approved_at,
  approvedBy: row.approved_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapFee = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  studentId: row.student_id,
  amount: Number(row.amount),
  status: row.status,
  paymentDate: row.payment_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  studentName: row.student_name || undefined,
  receiptId: row.receipt_id || undefined,
  receiptNumber: row.receipt_number || undefined,
  receiptPdfUrl: row.receipt_pdf_url || undefined
});

const mapReceipt = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  studentId: row.student_id,
  feeId: row.fee_id,
  feePaymentId: row.fee_payment_id || undefined,
  receiptNumber: row.receipt_number,
  amount: row.amount !== undefined ? Number(row.amount) : undefined,
  pdfUrl: row.pdf_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  schoolName: row.school_name || undefined,
  studentName: row.student_name || undefined,
  paymentDate: row.payment_date || undefined,
  items: Array.isArray(row.items) ? row.items : undefined
});

const mapClass = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  name: row.name,
  displayOrder: row.display_order,
  hasStreams: Boolean(row.has_streams),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapSection = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  classId: row.class_id,
  className: row.class_name || undefined,
  name: row.name,
  maxCapacity: row.max_capacity,
  currentCount: row.current_count !== undefined ? Number(row.current_count) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapStream = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  classId: row.class_id,
  className: row.class_name || undefined,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapFeeStructure = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  name: row.name,
  feeType: row.fee_type,
  frequency: row.frequency,
  amount: Number(row.amount),
  finePerDay: Number(row.fine_per_day),
  gracePeriodDays: row.grace_period_days,
  applicableClasses: row.applicable_classes ? JSON.parse(row.applicable_classes) : null,
  isActive: Boolean(row.is_active),
  items: Array.isArray(row.items) ? row.items : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapFeeAssignment = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  studentId: row.student_id,
  feeStructureId: row.fee_structure_id,
  structureName: row.structure_name || undefined,
  feeItemName: row.fee_item_name || undefined,
  feeType: row.fee_type || undefined,
  totalAmount: Number(row.total_amount),
  discountAmount: Number(row.discount_amount),
  discountReason: row.discount_reason || undefined,
  netAmount: Number(row.net_amount),
  paidAmount: Number(row.paid_amount),
  dueDate: row.due_date,
  status: row.status,
  installmentCount: row.installment_count,
  academicYear: row.academic_year || undefined,
  studentName: row.student_name || undefined,
  studentUid: row.student_uid || undefined,
  lateFee: row.late_fee !== undefined ? Number(row.late_fee) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapFeePayment = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  studentId: row.student_id,
  feeAssignmentId: row.fee_assignment_id,
  amount: Number(row.amount),
  lateFee: Number(row.late_fee),
  totalPaid: Number(row.total_paid),
  paymentMode: row.payment_mode,
  transactionRef: row.transaction_ref || undefined,
  paymentDate: row.payment_date,
  receiptId: row.receipt_id || undefined,
  receiptNumber: row.receipt_number || undefined,
  studentName: row.student_name || undefined,
  createdAt: row.created_at
});

const mapIdCard = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  studentId: row.student_id,
  cardUrl: row.card_url,
  qrData: row.qr_data,
  academicYear: row.academic_year,
  generatedAt: row.generated_at,
  studentName: row.student_name || undefined,
  studentUid: row.student_uid || undefined,
  className: row.class || row.class_name || undefined,
  section: row.section || undefined,
  photoUrl: row.photo_url || undefined,
  schoolName: row.school_name || undefined
});

const mapPromotion = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  studentId: row.student_id,
  studentName: row.student_name || undefined,
  studentUid: row.student_uid || undefined,
  fromClass: row.from_class,
  fromSection: row.from_section,
  toClass: row.to_class,
  toSection: row.to_section,
  academicYear: row.academic_year,
  promotedBy: row.promoted_by,
  promotedAt: row.promoted_at,
  createdAt: row.created_at
});

const mapAuditLog = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  adminId: row.admin_id,
  adminName: row.admin_name || undefined,
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : undefined,
  ipAddress: row.ip_address || undefined,
  createdAt: row.created_at
});

const mapDocument = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  studentId: row.student_id,
  docType: row.doc_type,
  fileUrl: row.file_url,
  originalName: row.original_name,
  createdAt: row.created_at
});

// ═══════════════════════════════════════════════════════════════════
// PAYROLL MAPPERS
// ═══════════════════════════════════════════════════════════════════

const mapEmployee = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  employeeUid: row.employee_uid || undefined,
  name: row.name,
  email: row.email || undefined,
  phone: row.phone || undefined,
  role: row.role,
  department: row.department || undefined,
  designation: row.designation || undefined,
  joiningDate: row.joining_date || undefined,
  bankName: row.bank_name || undefined,
  bankAccount: row.bank_account || undefined,
  ifscCode: row.ifsc_code || undefined,
  panNumber: row.pan_number || undefined,
  salaryStructureId: row.salary_structure_id || undefined,
  salaryStructureName: row.salary_structure_name || undefined,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapSalaryStructure = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  name: row.name,
  description: row.description || undefined,
  isActive: Boolean(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapSalaryComponent = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  salaryStructureId: row.salary_structure_id,
  name: row.name,
  type: row.type,
  calcType: row.calc_type,
  value: Number(row.value),
  percentageOf: row.percentage_of || undefined,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapEmployeeAttendance = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  employeeId: row.employee_id,
  date: row.date,
  status: row.status,
  leaveType: row.leave_type || undefined,
  remarks: row.remarks || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapPayrollRun = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  month: row.month,
  year: row.year,
  workingDays: row.working_days,
  totalEmployees: row.total_employees,
  totalGross: Number(row.total_gross),
  totalDeductions: Number(row.total_deductions),
  totalNet: Number(row.total_net),
  status: row.status,
  processedBy: row.processed_by || undefined,
  processedByName: row.processed_by_name || undefined,
  processedAt: row.processed_at || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapPayrollRecord = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  payrollRunId: row.payroll_run_id,
  employeeId: row.employee_id,
  employeeName: row.employee_name || undefined,
  employeeUid: row.employee_uid || undefined,
  department: row.department || undefined,
  role: row.role || undefined,
  workingDays: row.working_days,
  presentDays: Number(row.present_days),
  leaveDays: Number(row.leave_days),
  absentDays: Number(row.absent_days),
  baseSalary: Number(row.base_salary),
  grossSalary: Number(row.gross_salary),
  totalDeductions: Number(row.total_deductions),
  netSalary: Number(row.net_salary),
  paymentStatus: row.payment_status,
  paymentDate: row.payment_date || undefined,
  paymentMethod: row.payment_method || undefined,
  transactionRef: row.transaction_ref || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapPayrollLineItem = (row) => ({
  id: row.id,
  payrollRecordId: row.payroll_record_id,
  componentName: row.component_name,
  type: row.type,
  amount: Number(row.amount),
  sortOrder: row.sort_order
});

const mapSalaryIncrement = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  employeeId: row.employee_id,
  oldStructureId: row.old_structure_id || undefined,
  newStructureId: row.new_structure_id || undefined,
  effectiveDate: row.effective_date,
  reason: row.reason || undefined,
  changedBy: row.changed_by || undefined,
  createdAt: row.created_at
});

module.exports = {
  mapStudent,
  mapAdmission,
  mapFee,
  mapReceipt,
  mapClass,
  mapSection,
  mapStream,
  mapFeeStructure,
  mapFeeAssignment,
  mapFeePayment,
  mapIdCard,
  mapPromotion,
  mapAuditLog,
  mapDocument,
  // Payroll
  mapEmployee,
  mapSalaryStructure,
  mapSalaryComponent,
  mapEmployeeAttendance,
  mapPayrollRun,
  mapPayrollRecord,
  mapPayrollLineItem,
  mapSalaryIncrement
};
