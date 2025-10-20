# 💬 Chat App - แชทกับเพื่อน

เว็บแอพพลิเคชันแชทแบบ real-time ที่สวยงาม ทันสมัย และใช้งานง่าย

## ✨ ฟีเจอร์

- 🔐 **ระบบ Login ที่ปลอดภัย** - Authentication ด้วย PostgreSQL + bcrypt
- 💬 **แชทแบบ Real-time** - ส่งและรับข้อความแบบทันที
- 👥 **แสดงผู้ใช้ออนไลน์** - เห็นว่าใครออนไลน์อยู่
- ⌨️ **Typing Indicator** - แสดงสถานะกำลังพิมพ์
- 📱 **Responsive Design** - ใช้งานได้ทั้ง Desktop และ Mobile
- 🎨 **UI/UX ที่สวยงาม** - ออกแบบมาอย่างพิถีพิถัน
- 🗄️ **PostgreSQL Database** - เชื่อมต่อกับ Render.com
- 🚀 **Deploy ง่าย** - Deploy ได้ง่ายบน Render, Heroku, หรือ Vercel

## 🛠️ เทคโนโลยีที่ใช้

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **PostgreSQL** - Database (hosted on Render.com)
- **bcrypt** - Password hashing
- **express-session** - Session management

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with modern gradients and animations
- **Vanilla JavaScript** - Client-side logic
- **Socket.io Client** - Real-time connection

## 📦 การติดตั้ง

### วิธีที่ 1: รันบน Local

1. **Clone repository**
```bash
git clone <your-repo-url>
cd Car_rental
```

2. **ติดตั้ง dependencies**
```bash
npm install
```

3. **สร้างฐานข้อมูล** (รันครั้งแรกเท่านั้น)
```bash
node initDb.js
```

4. **รัน server**
```bash
npm start
```

5. **เปิดเว็บไซต์**
เปิดเบราว์เซอร์และไปที่ `http://localhost:3000`

6. **Login ด้วยบัญชีทดสอบ:**
   - Username: `saturn` / Password: `13141504`
   - Username: `pluto` / Password: `13141504`

ดูข้อมูลเพิ่มเติมได้ที่ [LOGIN_INFO.md](LOGIN_INFO.md)

### วิธีที่ 2: รันด้วย Development Mode (มี auto-reload)

```bash
npm run dev
```

## 🚀 การ Deploy

### Deploy บน Render

1. **สร้างบัญชีที่** [render.com](https://render.com)

2. **เชื่อมต่อ GitHub repository**

3. **สร้าง Web Service ใหม่**
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

4. **Deploy!** 🎉

### Deploy บน Heroku

1. **ติดตั้ง Heroku CLI**
```bash
npm install -g heroku
```

2. **Login และสร้าง app**
```bash
heroku login
heroku create your-chat-app-name
```

3. **Deploy**
```bash
git push heroku main
```

4. **เปิดเว็บไซต์**
```bash
heroku open
```

### Deploy บน Railway

1. **ไปที่** [railway.app](https://railway.app)
2. **เลือก "Deploy from GitHub"**
3. **เลือก repository ของคุณ**
4. **Railway จะ detect และ deploy อัตโนมัติ**

## 📝 Environment Variables

สร้างไฟล์ `.env` (มีตัวอย่างอยู่ใน `.env.example`):

```bash
PORT=3000
NODE_ENV=development

# PostgreSQL Database (ใส่ URL จาก Render.com)
DATABASE_URL=your_postgresql_connection_string

# Session Secret (เปลี่ยนเป็นค่าลับของคุณเอง)
SESSION_SECRET=your-secret-key-here
```

**หมายเหตุ:** ไฟล์ `.env` จะถูก ignore โดย git เพื่อความปลอดภัย

## 🎯 การใช้งาน

1. **เข้าสู่ระบบ**
   - กรอกชื่อของคุณ
   - กดปุ่ม "เข้าร่วมแชท"

2. **แชทกับเพื่อน**
   - พิมพ์ข้อความในช่องด้านล่าง
   - กด Enter หรือกดปุ่มส่ง

3. **ดูผู้ใช้ออนไลน์**
   - ตรวจสอบรายชื่อทางซ้ายมือ

4. **ออกจากระบบ**
   - กดปุ่ม "ออกจากระบบ" ที่ sidebar

## 📱 Mobile Support

แอพนี้รองรับการใช้งานบน mobile โดยจะมี responsive design ที่ปรับตามขนาดหน้าจอ

## 🔧 การพัฒนาต่อยอด

### เพิ่มฐานข้อมูล

ปัจจุบันข้อความเก็บอยู่ใน memory สามารถเพิ่ม database ได้:

```bash
npm install mongoose
```

แล้วเชื่อมต่อกับ MongoDB

### เพิ่มห้องแชท

แก้ไข `server.js` เพื่อเพิ่มระบบห้องแชทหลายห้อง

### เพิ่ม Authentication

ใช้ JWT หรือ Passport.js สำหรับ authentication ที่ปลอดภัยยิ่งขึ้น

## 🐛 การแก้ปัญหา

### ถ้า Socket.io ไม่เชื่อมต่อ
- ตรวจสอบว่า server รันอยู่หรือไม่
- ตรวจสอบ port ที่ใช้
- ตรวจสอบ firewall settings

### ถ้าข้อความไม่ส่ง
- เปิด browser console (F12) เพื่อดู errors
- ตรวจสอบว่าเข้าสู่ระบบแล้วหรือยัง

## 📄 License

MIT License - ใช้งานได้อย่างอิสระ

## 🤝 Contributing

Pull requests ยินดีต้อนรับเสมอ!

## 📧 Contact

หากมีคำถามหรือข้อเสนอแนะ สามารถติดต่อได้เสมอ

---

สร้างด้วย ❤️ เพื่อการแชทที่ดีขึ้น

