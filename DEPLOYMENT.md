# 🚀 คู่มือ Deploy บน Render.com

## ✅ ตรวจสอบความพร้อม

### ฟีเจอร์ทั้งหมดที่มี:
- ✅ **ธีมอวกาศ** - พื้นหลังดาวกระพริบเคลื่อนไหว
- ✅ **Responsive Design** - รองรับมือถือ, แท็บเล็ต, desktop
- ✅ **Login ปลอดภัย** - PostgreSQL + bcrypt (Saturn, Pluto)
- ✅ **แชททั่วไป** - ทุกคนเห็น
- ✅ **แชทส่วนตัว** - คลิกชื่อ user เพื่อแชทส่วนตัว
- ✅ **ส่งรูปภาพ** - พร้อม preview และคำบรรยาย (max 5MB)
- ✅ **ลบข้อความ** - ลบทีละข้อความหรือล้างทั้งหมด
- ✅ **Real-time** - Socket.io
- ✅ **Mobile Menu** - Sidebar พับได้บนมือถือ

### Mobile Responsive:
- ✅ Desktop (>1024px) - UI เต็มรูปแบบ
- ✅ Tablet (768-1024px) - ปรับขนาด sidebar
- ✅ Mobile (<768px) - Hamburger menu, sidebar ซ่อนได้
- ✅ Small Mobile (<480px) - ฟอนต์และ spacing ปรับเล็กลง

## 📋 ขั้นตอนการ Deploy บน Render.com

### 1️⃣ เตรียม Git Repository

```bash
# Initialize git (ถ้ายังไม่ได้ทำ)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Space Chat App"

# Create GitHub repository และ push
git remote add origin YOUR_GITHUB_REPO_URL
git branch -M main
git push -u origin main
```

### 2️⃣ สร้าง Web Service บน Render

1. **Login** ไปที่ [render.com](https://render.com)
2. **New +** → **Web Service**
3. **Connect GitHub** repository ของคุณ
4. **Configure:**
   - **Name:** `vega` (หรือชื่อที่คุณต้องการ)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (หรือตามที่ต้องการ)

### 3️⃣ ตั้งค่า Environment Variables

ใน Render Dashboard → Environment:

```
DATABASE_URL = postgresql://company_admin:oZgkPkO1hZDuuJvDoTTnhoKN6gfyILhx@dpg-d3hhrlvfte5s73cvb3dg-a.oregon-postgres.render.com/companydb_y6dv

SESSION_SECRET = your-random-secret-key-here-change-this

NODE_ENV = production
```

**⚠️ สำคัญ:** 
- เปลี่ยน `SESSION_SECRET` เป็นค่าลับของคุณเอง
- ใช้ `DATABASE_URL` จากฐานข้อมูล PostgreSQL ของคุณที่ Render

### 4️⃣ Deploy!

1. กด **Create Web Service**
2. Render จะ build และ deploy อัตโนมัติ
3. รอ 2-3 นาที
4. เมื่อเสร็จจะได้ URL: `https://vega.onrender.com`

### 5️⃣ Initialize Database

หลัง deploy สำเร็จ:

**วิธีที่ 1: ใช้ Render Shell**
```bash
# ใน Render Dashboard → Shell
node initDb.js
```

**วิธีที่ 2: ใช้ psql จากเครื่องของคุณ**
```bash
PGPASSWORD=oZgkPkO1hZDuuJvDoTTnhoKN6gfyILhx psql -h dpg-d3hhrlvfte5s73cvb3dg-a.oregon-postgres.render.com -U company_admin companydb_y6dv

# จากนั้นรัน SQL:
CREATE TABLE IF NOT EXISTS chat_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# Insert users (ใช้ password hash ที่สร้างไว้แล้ว)
```

## 🎯 ทดสอบหลัง Deploy

### Test Checklist:
- [ ] เว็บไซต์เปิดได้
- [ ] Login ด้วย `saturn` / `13141504` ได้
- [ ] Login ด้วย `pluto` / `13141504` ได้
- [ ] ส่งข้อความในแชททั่วไปได้
- [ ] คลิกชื่อ user เพื่อแชทส่วนตัวได้
- [ ] ส่งรูปภาพได้
- [ ] ลบข้อความได้
- [ ] ล้างแชทได้
- [ ] Mobile responsive (ทดสอบด้วยมือถือ)

### Test บนมือถือ:
1. เปิดเว็บจากมือถือ
2. ทดสอบปุ่มเมนู ≡ (hamburger)
3. Login และส่งข้อความ
4. ส่งรูปจากกล้องหรือแกลเลอรี่
5. ทดสอบแชทส่วนตัว

## 🔧 Troubleshooting

### ปัญหา: Database connection error
**แก้ไข:**
- ตรวจสอบ `DATABASE_URL` ใน Environment Variables
- ตรวจสอบว่าฐานข้อมูล PostgreSQL บน Render ยังทำงานอยู่
- ตรวจสอบว่า IP ของ Render ไม่ถูกบล็อกโดยฐานข้อมูล

### ปัญหา: Session not working
**แก้ไข:**
- ตรวจสอบ `SESSION_SECRET` ใน Environment Variables
- ถ้าใช้ HTTPS (บน Render จะใช้) อาจต้องปรับ cookie settings

### ปัญหา: Images not displaying
**แก้ไข:**
- รูปภาพถูกเก็บใน memory (Base64)
- ถ้า restart server รูปจะหาย
- ถ้าต้องการเก็บถาวร ให้ใช้ Cloudinary หรือ AWS S3

## 📱 Custom Domain (Optional)

หากต้องการใช้โดเมนของตัวเอง:

1. ไปที่ Render Dashboard → Settings → Custom Domains
2. เพิ่มโดเมนของคุณ
3. ตั้งค่า DNS ตาม instructions ของ Render
4. รอ DNS propagation (10-30 นาที)

## 🔐 Security Checklist สำหรับ Production

- [x] Password hashing (bcrypt)
- [x] Session secret เป็นค่าลับ
- [x] Database connection ใช้ SSL
- [x] Environment variables แยกออกจาก code
- [ ] HTTPS (Render ให้ฟรี)
- [ ] Rate limiting (แนะนำเพิ่ม)
- [ ] CORS จำกัด origin (ปัจจุบันเปิด "*")

## 💡 Tips

### ประหยัด Memory:
- ปัจจุบันเก็บข้อความใน memory
- Render Free tier มี memory จำกัด
- ถ้าใช้งานหนัก ควรเก็บข้อความใน database

### ปรับปรุงในอนาคต:
1. เก็บรูปภาพใน Cloud Storage (Cloudinary)
2. เพิ่ม notifications
3. เพิ่ม typing indicator ในแชทส่วนตัว
4. เพิ่มประวัติการแชทถาวร
5. เพิ่ม user profiles
6. เพิ่ม emoji picker

## 🎉 เสร็จแล้ว!

เว็บไซต์ของคุณพร้อม deploy แล้ว! 🚀

**ข้อมูล Users:**
- Username: `saturn` / Password: `13141504` / Display: Saturn 🪐
- Username: `pluto` / Password: `13141504` / Display: Pluto 🌑

---

**สร้างด้วย ❤️ - Space Theme Chat Application**

