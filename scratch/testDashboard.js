
const { connectDb, query, queryAll } = require("../src/utils/mysql");
const schoolId = 1;

async function test() {
  try {
    const pool = await connectDb();
    console.log("DB connected");
    
    console.log("Query empCount");
    const empCount = await query(
      "SELECT COUNT(*) AS cnt FROM tbl_employees WHERE school_id = ? AND status = \"ACTIVE\"",
      [schoolId]
    );
    console.log("empCount:", empCount);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    console.log("Query thisMonthRun");
    const thisMonthRun = await query(
      "SELECT * FROM tbl_payroll_runs WHERE school_id = ? AND month = ? AND year = ? LIMIT 1",
      [schoolId, currentMonth, currentYear]
    );
    console.log("thisMonthRun:", thisMonthRun);

    console.log("Query pending");
    const pending = await query(
      "SELECT COUNT(*) AS cnt, COALESCE(SUM(prec.net_salary), 0) AS total FROM tbl_payroll_records prec INNER JOIN tbl_payroll_runs pr ON pr.id = prec.payroll_run_id AND pr.school_id = prec.school_id WHERE prec.school_id = ? AND prec.payment_status = \"UNPAID\" AND pr.status != \"DRAFT\"",
      [schoolId]
    );
    console.log("pending:", pending);

    console.log("Query ytd");
    const ytd = await query(
      "SELECT COALESCE(SUM(total_net), 0) AS total FROM tbl_payroll_runs WHERE school_id = ? AND year = ? AND status != \"DRAFT\"",
      [schoolId, currentYear]
    );
    console.log("ytd:", ytd);

    console.log("Query trend");
    const trend = await queryAll(
      "SELECT month, year, total_net, total_employees, status FROM tbl_payroll_runs WHERE school_id = ? AND status != \"DRAFT\" ORDER BY year DESC, month DESC LIMIT 12",
      [schoolId]
    );
    console.log("trend:", trend);

    process.exit(0);
  } catch (e) {
    console.error("ERROR:", e);
    process.exit(1);
  }
}

test();

