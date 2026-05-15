const mysql = require("mysql2/promise");
(async () => {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    database: "school_erp",
  });
  for (const table of ["tbl_students", "tbl_admissions"]) {
    const [rows] = await conn.execute(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='school_erp' AND table_name=?",
      [table]
    );
    console.log(table, rows.map((r) => r.column_name));
  }
  await conn.end();
})();
