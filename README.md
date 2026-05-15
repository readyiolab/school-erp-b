# School ERP Backend

Production-ready multi-tenant backend for a School ERP SaaS platform using Express, MySQL, JWT, Cloudinary, and Puppeteer.

## Folder Structure

```text
backend/
├── database/
│   └── schema.sql
├── src/
│   ├── config/
│   ├── middleware/
│   ├── modules/
│   │   ├── admission/
│   │   ├── auth/
│   │   ├── fees/
│   │   ├── receipt/
│   │   └── student/
│   ├── utils/
│   ├── scripts/
│   ├── app.js
│   └── routes.js
├── .env.example
└── index.js
```

## Example Success Response

```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": 14,
    "schoolId": 2,
    "name": "Aarav Sharma",
    "class": "10",
    "section": "A",
    "parentName": "Rakesh Sharma",
    "phone": "9876543210"
  }
}
```

## Example Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be a positive number"
    }
  ]
}
```

## Database Migration

Run the schema migration with:

```bash
npm run db:migrate
```

This executes [database/schema.sql](d:/school%20ERP/backend/database/schema.sql) against the configured MySQL database.
