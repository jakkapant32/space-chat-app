# 🔐 ข้อมูล Login สำหรับแชทแอพ

## ผู้ใช้ที่มีในระบบ

### User 1: Saturn 🪐
- **Username:** `saturn`
- **Password:** `13141504`
- **Display Name:** Saturn

### User 2: Pluto 🌑
- **Username:** `pluto`
- **Password:** `13141504`
- **Display Name:** Pluto

---

## วิธีใช้งาน

1. **เปิดเว็บไซต์:** `http://localhost:3000`

2. **Login:**
   - กรอกชื่อผู้ใช้: `saturn` หรือ `pluto` (ตัวพิมพ์เล็ก)
   - กรอกรหัสผ่าน: `13141504`
   - กดปุ่ม "เข้าสู่ระบบ"

3. **ทดสอบแชทหลายคน:**
   - เปิดหน้าต่างเบราว์เซอร์ใหม่ (หรือ Incognito/Private mode)
   - Login ด้วย user อีกคนหนึ่ง
   - ลองแชทกันระหว่าง Saturn และ Pluto

4. **ออกจากระบบ:**
   - กดปุ่ม "ออกจากระบบ" ที่ sidebar

---

## ฐานข้อมูล PostgreSQL

### ข้อมูล Connection
```
Host: dpg-d3hhrlvfte5s73cvb3dg-a.oregon-postgres.render.com
Port: 5432
Database: companydb_y6dv
Username: company_admin
Password: oZgkPkO1hZDuuJvDoTTnhoKN6gfyILhx
```

### External Database URL
```
postgresql://company_admin:oZgkPkO1hZDuuJvDoTTnhoKN6gfyILhx@dpg-d3hhrlvfte5s73cvb3dg-a.oregon-postgres.render.com/companydb_y6dv
```

### ตาราง: chat_users

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | รหัสผู้ใช้ (auto increment) |
| username | VARCHAR(50) UNIQUE | ชื่อผู้ใช้สำหรับ login |
| password_hash | VARCHAR(255) | Password ที่ hash ด้วย bcrypt |
| display_name | VARCHAR(100) | ชื่อที่แสดงในแชท |
| created_at | TIMESTAMP | วันที่สร้างบัญชี |

---

## เพิ่มผู้ใช้ใหม่

หากต้องการเพิ่ม user ใหม่ ให้รัน SQL command:

```sql
-- เพิ่มผู้ใช้ใหม่
INSERT INTO chat_users (username, password_hash, display_name)
VALUES ('ชื่อผู้ใช้', 'password_hash_ที่ได้จาก_bcrypt', 'ชื่อที่แสดง');
```

หรือใช้ Node.js script:

```javascript
const bcrypt = require('bcrypt');
const pool = require('./db');

async function addUser(username, password, displayName) {
  const hashedPassword = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO chat_users (username, password_hash, display_name) VALUES ($1, $2, $3)',
    [username, hashedPassword, displayName]
  );
  console.log('User added successfully!');
}

// ตัวอย่าง
addUser('newuser', 'password123', 'New User');
```

---

## Features

✅ **Authentication ที่ปลอดภัย** - ใช้ bcrypt hash password  
✅ **PostgreSQL Database** - เก็บข้อมูลผู้ใช้บน Render  
✅ **Session Management** - ใช้ express-session  
✅ **Real-time Chat** - Socket.io  
✅ **ป้องกัน SQL Injection** - ใช้ Parameterized queries  
✅ **Error Handling** - แสดง error message ที่เข้าใจง่าย  

---

## Security Notes

⚠️ **สำหรับ Production:**
- เปลี่ยน `SESSION_SECRET` ในไฟล์ `.env`
- ตั้ง `cookie.secure = true` ถ้าใช้ HTTPS
- เพิ่ม rate limiting สำหรับ login endpoint
- ใช้ HTTPS เสมอ
- ตั้ง CORS ให้เข้มงวดขึ้น

---

**สร้างเมื่อ:** October 20, 2025  
**Version:** 1.0.0

