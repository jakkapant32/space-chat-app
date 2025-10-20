# 🌌 Space Chat App - คู่มือฟีเจอร์

## ✨ ฟีเจอร์ที่อัปเดตใหม่

### 🎨 ธีมอวกาศ (Space Theme)
- **พื้นหลังอวกาศ:** ดาวกระพริบเคลื่อนไหวอัตโนมัติ
- **สีสัน:** Gradient สีม่วง-น้ำเงินแบบอวกาศ
- **เอฟเฟกต์:** Glow effects, Glass morphism, Animations
- **Avatar:** ดาวเคราะห์สไตล์พร้อม glow effect
- **ไอคอน:** 🌌 🪐 ✨ 💫 🌟 สไตล์อวกาศ

### 📱 Responsive Design สำหรับมือถือ
- **Desktop (>1024px):** เห็น sidebar เต็ม + พื้นที่แชทกว้างขวาง
- **Tablet (768-1024px):** sidebar ปรับขนาดเล็กลง
- **Mobile (<768px):** 
  - Sidebar ซ่อนอยู่ด้านซ้าย
  - ปุ่มเมนู hamburger แสดงที่มุมซ้ายบน
  - แตะปุ่มเพื่อเปิด/ปิด sidebar
  - Overlay สีดำจางๆ เมื่อเปิด sidebar
- **Small Mobile (<480px):** ปรับขนาดฟอนต์และ spacing ให้เล็กลง

### 💬 ระบบแชทส่วนตัว (Private Chat)
#### การใช้งาน:
1. **แชททั่วไป (General Chat):**
   - คลิกที่ "ห้องแชททั่วไป" ใน sidebar
   - ข้อความที่ส่งจะมองเห็นได้ทุกคน
   - แสดง typing indicator เมื่อมีคนพิมพ์

2. **แชทส่วนตัว (Private Chat):**
   - คลิกที่ชื่อผู้ใช้ใน "ผู้ใช้ออนไลน์"
   - หัวข้อแชทจะเปลี่ยนเป็น "💫 แชทส่วนตัวกับ [ชื่อ]"
   - ข้อความจะส่งเฉพาะคนๆ นั้นเท่านั้น
   - ข้อความถูกเก็บแยกจากแชททั่วไป

#### คุณสมบัติ Private Chat:
- ✅ ข้อความส่วนตัวจริงๆ (เห็นเฉพาะ 2 คน)
- ✅ เก็บประวัติแชท 50 ข้อความล่าสุด
- ✅ แสดงสถานะ active ที่ user ที่กำลังแชทด้วย
- ✅ สลับไปมาระหว่างแชททั่วไปและแชทส่วนตัวได้
- ✅ บนมือถือ: sidebar จะปิดอัตโนมัติเมื่อเลือกแชท

### 🔐 ระบบ Authentication
- **Login:** Username + Password
- **Users:** 
  - Username: `saturn` / Password: `13141504` / Display: Saturn 🪐
  - Username: `pluto` / Password: `13141504` / Display: Pluto 🌑
- **Database:** PostgreSQL บน Render.com
- **Security:** bcrypt password hashing

## 🎮 วิธีใช้งาน

### บน Desktop/Laptop:
1. **Login:** กรอก username และ password
2. **Sidebar ซ้าย:**
   - ดูผู้ใช้ออนไลน์
   - เลือกห้องแชททั่วไป หรือ แชทส่วนตัว
3. **พื้นที่แชทกลาง:**
   - อ่านและส่งข้อความ
   - ดู typing indicator
4. **ส่งข้อความ:**
   - พิมพ์ในช่องด้านล่าง
   - กด Enter หรือคลิกปุ่มส่ง 🚀

### บนมือถือ:
1. **เปิด Sidebar:**
   - แตะปุ่ม ≡ (hamburger) ที่มุมซ้ายบน
   - หรือแตะพื้นที่มืดเพื่อปิด
2. **เลือกแชท:**
   - แตะ "ห้องแชททั่วไป" หรือชื่อผู้ใช้
   - Sidebar จะปิดอัตโนมัติ
3. **แชท:**
   - อ่านและส่งข้อความเหมือนบน desktop
   - ขนาดฟอนต์ปรับให้อ่านง่ายบนหน้าจอเล็ก

## 🎯 UI Elements

### สไตล์ข้อความ:
- **ข้อความของคุณ:** พื้นหลัง gradient ม่วง-ชมพู, อยู่ขวามือ
- **ข้อความคนอื่น:** พื้นหลังกึ่งโปร่งใส, อยู่ซ้ายมือ
- **ข้อความระบบ:** กลางหน้าจอ, สีจาง

### Animations:
- ⭐ ดาวกระพริบเคลื่อนไหวพื้นหลัง
- 🔮 Logo หมุนและลอยขึ้น-ลง
- ✨ User items กระพริบเบาๆ
- 💫 Glow effect เมื่อ hover
- 🚀 ปุ่มส่งหมุนเล็กน้อยเมื่อ hover

### Colors & Theme:
```css
Primary: #6366f1 (Indigo)
Secondary: #a855f7 (Purple)
Accent: #ec4899 (Pink)
Success: #10b981 (Green)
Background: Dark space theme
Text: White/Light gray
```

## 📊 Technical Details

### Frontend:
- Pure JavaScript (Vanilla JS)
- Socket.io Client
- Responsive CSS with media queries
- Glass morphism effects

### Backend:
- Node.js + Express
- Socket.io Server
- PostgreSQL (Users)
- In-memory storage (Messages)
- bcrypt (Password hashing)
- express-session (Sessions)

### Data Storage:
- **General Messages:** Last 100 messages in memory
- **Private Messages:** Last 50 messages per conversation in memory
- **Users:** PostgreSQL database on Render.com
- **Sessions:** Express session store

### Socket.io Events:

#### Client → Server:
- `user joined` - เข้าร่วมแชท
- `chat message` - ส่งข้อความทั่วไป
- `private message` - ส่งข้อความส่วนตัว
- `typing` - แจ้ง typing status
- `load general messages` - โหลดข้อความทั่วไป
- `load private messages` - โหลดข้อความส่วนตัว

#### Server → Client:
- `load messages` - ส่งข้อความทั่วไปทั้งหมด
- `load private messages` - ส่งข้อความส่วนตัว
- `chat message` - broadcast ข้อความทั่วไป
- `private message` - ส่งข้อความส่วนตัว
- `user list` - รายชื่อผู้ใช้ออนไลน์
- `system message` - ข้อความระบบ
- `user typing` - สถานะกำลังพิมพ์

## 🚀 Performance

### Optimizations:
- Message limit (100 general, 50 private) to prevent memory overflow
- Efficient socket.io event handling
- CSS animations ใช้ GPU acceleration
- Lazy load messages (โหลดเมื่อเปลี่ยนแชท)

### Browser Support:
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🎨 Customization

### เปลี่ยนสีธีม:
แก้ไขใน `public/style.css` ที่ `:root` variables:
```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #a855f7;
    --accent-color: #ec4899;
    /* ... */
}
```

### เพิ่ม User:
รัน SQL command หรือใช้ `initDb.js` script

### ปรับ Message Limits:
แก้ไขใน `server.js`:
```javascript
const MAX_MESSAGES = 100;
const MAX_PRIVATE_MESSAGES = 50;
```

## 🐛 Known Issues & Limitations

1. **ข้อความถูกเก็บใน memory:**
   - หาก restart server ข้อความจะหาย
   - แก้ไข: ใช้ database เพื่อเก็บถาวร

2. **ไม่มี notification:**
   - ยังไม่มีแจ้งเตือนเมื่อมีข้อความใหม่
   - แก้ไข: เพิ่ม browser notifications API

3. **ไม่มี file sharing:**
   - ส่งได้แค่ text เท่านั้น
   - แก้ไข: เพิ่ม file upload feature

4. **History limited:**
   - เก็บข้อความจำกัด
   - แก้ไข: เก็บใน database พร้อม pagination

## 📱 Mobile Testing

ทดสอบบน:
- ✅ iPhone (Safari iOS)
- ✅ Android (Chrome Mobile)
- ✅ Tablet (iPad, Android tablets)
- ✅ Small screens (360px width)

## 🎓 คำแนะนำสำหรับผู้ใช้

### เคล็ดลับการใช้งาน:
1. **Mobile:** หมั่นปิด sidebar หลังเลือกแชทเพื่อให้เห็นพื้นที่แชทกว้างขึ้น
2. **Private Chat:** ตรวจสอบชื่อที่หัวข้อให้แน่ใจว่าส่งถูกคน
3. **Typing:** เห็น typing indicator ในแชททั่วไปเท่านั้น
4. **Logout:** Refresh page หรือกดปุ่ม "ออกจากระบบ"

---

**สร้างด้วย ❤️ โดยใช้เทคโนโลยีอวกาศสุดล้ำ** 🚀✨

