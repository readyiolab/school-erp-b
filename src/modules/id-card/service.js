const puppeteer = require('puppeteer');
const { query, queryAll, insert, update } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');
const { generateQRDataURL } = require('../../utils/qrGenerator');
const { uploadFromBuffer } = require('../../utils/cloudinary');
const { mapIdCard } = require('../../utils/mappers');
const { getCurrentAcademicYear } = require('../school/service');

/**
 * Generate a single student ID card
 */
const generateIdCard = async (schoolId, studentId) => {
  const [student, school] = await Promise.all([
    query('SELECT * FROM tbl_students WHERE id = ? AND school_id = ? LIMIT 1', [studentId, schoolId]),
    query('SELECT name, code, logo_url FROM tbl_schools WHERE id = ? LIMIT 1', [schoolId])
  ]);

  if (!student) throw new ApiError(404, 'Student not found');
  if (!school) throw new ApiError(404, 'School not found');

  const academicYear = getCurrentAcademicYear();
  const qrDataURL = await generateQRDataURL(student.student_uid);

  // 1. Build Premium ID Card HTML Template
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: #f0f0f0; }
        .card {
          width: 336px; height: 528px;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          position: relative;
          color: #1e293b;
        }
        .header {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          padding: 20px 10px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 { font-size: 16px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .header p { font-size: 10px; margin: 5px 0 0; opacity: 0.9; }
        .school-logo { width: 40px; height: 40px; border-radius: 50%; background: #fff; padding: 4px; margin-bottom: 8px; }
        
        .photo-container {
          margin: 25px auto 15px;
          width: 120px; height: 120px;
          border-radius: 12px;
          border: 4px solid #e2e8f0;
          overflow: hidden;
          background: #f8fafc;
        }
        .photo-container img { width: 100%; height: 100%; object-fit: cover; }
        
        .details { padding: 0 20px; text-align: center; }
        .details h2 { font-size: 20px; margin: 0; color: #0f172a; font-weight: 700; }
        .details .uid { font-size: 12px; color: #64748b; margin: 5px 0 15px; font-weight: 600; letter-spacing: 1px; }
        
        .info-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; text-align: left;
          background: #f8fafc;
          padding: 12px; border-radius: 8px;
          margin-bottom: 20px;
        }
        .info-item { display: flex; flex-direction: column; }
        .info-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-value { font-size: 11px; color: #334155; font-weight: 600; }
        
        .footer {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: #f1f5f9;
          padding: 15px 20px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .qr-code { width: 60px; height: 60px; }
        .year-stamp { text-align: right; }
        .year-stamp span { display: block; font-size: 9px; color: #64748b; }
        .year-stamp strong { font-size: 11px; color: #1e40af; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          ${school.logo_url ? `<img src="${school.logo_url}" class="school-logo" />` : ''}
          <h1>${school.name}</h1>
          <p>Excellence in Education</p>
        </div>
        
        <div class="photo-container">
          <img src="${student.photo_url || 'https://via.placeholder.com/120'}" />
        </div>
        
        <div class="details">
          <h2>${student.name}</h2>
          <div class="uid">${student.student_uid || 'N/A'}</div>
          
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Class</span>
              <span class="info-value">${student.class}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Section</span>
              <span class="info-value">${student.section}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Phone</span>
              <span class="info-value">${student.phone || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Blood Group</span>
              <span class="info-value">B+</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <img src="${qrDataURL}" class="qr-code" />
          <div class="year-stamp">
            <span>Academic Year</span>
            <strong>${academicYear}</strong>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // 2. Launch Puppeteer and generate Image
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 336, height: 528, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const buffer = await page.screenshot({ type: 'png', omitBackground: true });
  await browser.close();

  // 3. Upload to Cloudinary
  const upload = await uploadFromBuffer(buffer, {
    folder: 'school_erp/id_cards',
    public_id: `id_${student.student_uid}`.replace(/-/g, '_')
  });

  // 4. Save/Update record in tbl_id_cards
  const existingIdCard = await query(
    'SELECT id FROM tbl_id_cards WHERE school_id = ? AND student_id = ? AND academic_year = ? LIMIT 1',
    [schoolId, studentId, academicYear]
  );

  if (existingIdCard) {
    await update('tbl_id_cards', {
      card_url: upload.secure_url,
      qr_data: student.student_uid,
      generated_at: new Date()
    }, 'id = ?', [existingIdCard.id]);
  } else {
    await insert('tbl_id_cards', {
      school_id: schoolId,
      student_id: studentId,
      card_url: upload.secure_url,
      qr_data: student.student_uid,
      academic_year: academicYear,
      generated_at: new Date()
    });
  }

  const idCard = await query(
    `SELECT i.*, s.name as student_name, s.student_uid, s.class, s.section, s.photo_url, sch.name as school_name
     FROM tbl_id_cards i
     JOIN tbl_students s ON s.id = i.student_id
     JOIN tbl_schools sch ON sch.id = i.school_id
     WHERE i.student_id = ? AND i.school_id = ? AND i.academic_year = ? LIMIT 1`,
    [studentId, schoolId, academicYear]
  );

  return mapIdCard(idCard);
};

/**
 * Bulk generate ID cards for a class/section
 */
const bulkGenerateIdCards = async (schoolId, filters) => {
  const conditions = ['school_id = ?', "status = 'ACTIVE'"];
  const params = [schoolId];

  if (filters.class) {
    conditions.push('class = ?');
    params.push(filters.class);
  }
  if (filters.section) {
    conditions.push('section = ?');
    params.push(filters.section);
  }

  const students = await queryAll(
    `SELECT id FROM tbl_students WHERE ${conditions.join(' AND ')}`,
    params
  );

  const results = [];
  for (const student of students) {
    try {
      const card = await generateIdCard(schoolId, student.id);
      results.push({ studentId: student.id, status: 'SUCCESS', cardUrl: card.cardUrl });
    } catch (error) {
      results.push({ studentId: student.id, status: 'FAILED', error: error.message });
    }
  }

  return results;
};

const getIdCardByStudent = async (schoolId, studentId) => {
  const academicYear = getCurrentAcademicYear();
  const idCard = await query(
    `SELECT i.*, s.name as student_name, s.student_uid, s.class, s.section, s.photo_url, sch.name as school_name
     FROM tbl_id_cards i
     JOIN tbl_students s ON s.id = i.student_id
     JOIN tbl_schools sch ON sch.id = i.school_id
     WHERE i.student_id = ? AND i.school_id = ? AND i.academic_year = ? LIMIT 1`,
    [studentId, schoolId, academicYear]
  );
  if (!idCard) throw new ApiError(404, 'ID card not found for this academic year');
  return mapIdCard(idCard);
};

module.exports = { generateIdCard, bulkGenerateIdCards, getIdCardByStudent };
