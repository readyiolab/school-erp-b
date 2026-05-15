const buildReceiptHtml = ({
  schoolName,
  studentName,
  amount,
  paymentDate,
  receiptNumber
}) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fee Receipt</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f4f7fb;
        margin: 0;
        padding: 24px;
        color: #1f2937;
      }
      .receipt {
        max-width: 760px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #dbe3f0;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
      }
      .header {
        background: linear-gradient(135deg, #0f172a, #1d4ed8);
        color: #ffffff;
        padding: 32px;
      }
      .header h1 {
        margin: 0 0 8px;
        font-size: 28px;
      }
      .header p {
        margin: 0;
        opacity: 0.88;
      }
      .content {
        padding: 32px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 20px;
      }
      .card {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 18px;
        background: #f8fafc;
      }
      .label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #64748b;
        margin-bottom: 8px;
      }
      .value {
        font-size: 18px;
        font-weight: 700;
      }
      .footer {
        padding: 24px 32px 32px;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <div class="receipt">
      <div class="header">
        <h1>${schoolName}</h1>
        <p>Official Fee Receipt</p>
      </div>
      <div class="content">
        <div class="grid">
          <div class="card">
            <div class="label">Student Name</div>
            <div class="value">${studentName}</div>
          </div>
          <div class="card">
            <div class="label">Amount</div>
            <div class="value">INR ${amount}</div>
          </div>
          <div class="card">
            <div class="label">Payment Date</div>
            <div class="value">${paymentDate}</div>
          </div>
          <div class="card">
            <div class="label">Receipt Number</div>
            <div class="value">${receiptNumber}</div>
          </div>
        </div>
      </div>
      <div class="footer">
        This receipt was generated electronically and is valid without signature.
      </div>
    </div>
  </body>
</html>
`;

module.exports = {
  buildReceiptHtml
};
