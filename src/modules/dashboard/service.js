const { query, queryAll } = require('../../utils/mysql');

const getSummary = async (schoolId) => {
  const [students, pendingFees, totalRevenue, totalAdmissions] = await Promise.all([
    query("SELECT COUNT(*) AS count FROM tbl_students WHERE school_id = ? AND status = 'ACTIVE'", [schoolId]),
    query("SELECT COUNT(*) AS count, COALESCE(SUM(net_amount - paid_amount), 0) AS total FROM tbl_fee_assignments WHERE school_id = ? AND status IN ('PENDING','PARTIAL','OVERDUE')", [schoolId]),
    query("SELECT COALESCE(SUM(total_paid), 0) AS total FROM tbl_fee_payments WHERE school_id = ?", [schoolId]),
    query("SELECT COUNT(*) AS count FROM tbl_admissions WHERE school_id = ?", [schoolId])
  ]);

  return {
    totalStudents: Number(students?.count || 0),
    pendingFeeCount: Number(pendingFees?.count || 0),
    pendingFeeAmount: Number(pendingFees?.total || 0),
    totalRevenue: Number(totalRevenue?.total || 0),
    totalAdmissions: Number(totalAdmissions?.count || 0)
  };
};

const getClassStrength = async (schoolId) => {
  const rows = await queryAll(
    `SELECT class, COUNT(*) AS strength
     FROM tbl_students WHERE school_id = ? AND status = 'ACTIVE'
     GROUP BY class ORDER BY FIELD(class, 'LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12')`,
    [schoolId]
  );
  return rows.map((r) => ({ class: r.class, strength: Number(r.strength) }));
};

const getSectionOccupancy = async (schoolId) => {
  const rows = await queryAll(
    `SELECT c.name AS class_name, s.name AS section_name, s.max_capacity,
       (SELECT COUNT(*) FROM tbl_students st WHERE st.school_id = s.school_id AND st.class = c.name AND st.section = s.name AND st.status = 'ACTIVE') AS current_count
     FROM tbl_sections s
     INNER JOIN tbl_classes c ON c.id = s.class_id AND c.school_id = s.school_id
     WHERE s.school_id = ?
     ORDER BY c.display_order, s.name`,
    [schoolId]
  );
  return rows.map((r) => ({
    className: r.class_name,
    sectionName: r.section_name,
    maxCapacity: r.max_capacity,
    currentCount: Number(r.current_count),
    available: r.max_capacity - Number(r.current_count)
  }));
};

const getRevenueChart = async (schoolId, year) => {
  const targetYear = year || new Date().getFullYear();
  const rows = await queryAll(
    `SELECT MONTH(payment_date) AS month, SUM(total_paid) AS revenue
     FROM tbl_fee_payments
     WHERE school_id = ? AND YEAR(payment_date) = ?
     GROUP BY MONTH(payment_date)
     ORDER BY month ASC`,
    [schoolId, targetYear]
  );

  // Fill all 12 months
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const found = rows.find((r) => r.month === m);
    months.push({
      month: m,
      monthName: new Date(targetYear, m - 1).toLocaleString('en', { month: 'short' }),
      revenue: found ? Number(found.revenue) : 0
    });
  }
  return { year: targetYear, months };
};

module.exports = { getSummary, getClassStrength, getSectionOccupancy, getRevenueChart };
