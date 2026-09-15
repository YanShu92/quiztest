# ⚡ Quiz Battle – Trắc Nghiệm 4 Đội Thời Gian Thực

Game quiz thời gian thực cho 4 đội thi đấu, với timer 15 giây, tính điểm theo tốc độ, và bảng xếp hạng Podium.

## 🎮 Cách Chơi

| Màn hình | URL | Mô tả |
|----------|-----|--------|
| Đội tham gia | `/` | Đội đăng nhập, đặt tên và chọn vị trí |
| Host Board | `/host` | Màn hình chính chiếu lên TV/projector |
| Trả lời | `/play` | Tự động chuyển sau khi đăng nhập |

### Luồng hoạt động:
1. Mở `/host` trên màn hình chiếu
2. Các đội mở `/` trên điện thoại/máy tính, nhập tên và chọn vị trí
3. Host bấm **"Bắt đầu Game"**
4. Host click vào ô số để hiện câu hỏi → Timer 15s chạy
5. Đội bấm đáp án A/B/C/D trên thiết bị của mình
6. Hết 15s → Hiện đáp án đúng + bảng kết quả
7. Host bấm "Câu tiếp theo" → lặp lại
8. Hết 10 câu → Bảng tổng kết Podium 🏆

### Tính điểm:
- Trả lời đúng nhanh nhất: **10 điểm**
- Đúng nhì: **9 điểm**
- Đúng ba: **8 điểm**
- Đúng tư: **7 điểm**
- Sai hoặc không trả lời: **0 điểm**

---

## 🚀 Setup Firebase (Bước bắt buộc)

### 1. Tạo Firebase Project
1. Truy cập [console.firebase.google.com](https://console.firebase.google.com)
2. Bấm **"Add project"** → Đặt tên → Tạo project
3. Vào **Build → Realtime Database** → **"Create database"**
4. Chọn **"Start in test mode"** (cho phép đọc/ghi)
5. Chọn vùng **asia-southeast1** (Singapore) để có độ trễ thấp nhất

### 2. Lấy Firebase Config
1. Vào **Project Settings** (icon ⚙️)
2. Tab **General** → cuộn xuống **"Your apps"**
3. Bấm **"Add app"** → chọn biểu tượng **Web** (`</>`)
4. Đặt nickname app → **"Register app"**
5. Copy đoạn `firebaseConfig` hiện ra

### 3. Tạo file `.env.local`
Tạo file `.env.local` trong thư mục gốc project với nội dung:
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## 💻 Chạy Local

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy lên Vercel

### 1. Push lên GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/quiz-battle.git
git push -u origin main
```

### 2. Deploy lên Vercel
1. Truy cập [vercel.com](https://vercel.com) → Đăng nhập bằng GitHub
2. Bấm **"New Project"** → Import repo từ GitHub
3. Vào **Settings → Environment Variables** → Thêm tất cả các biến từ `.env.local`
4. Bấm **Deploy** ✅

### 3. Firebase Security Rules
Sau khi deploy, cập nhật rules trong Firebase Realtime Database:
```json
{
  "rules": {
    "quiz": {
      ".read": true,
      ".write": true
    }
  }
}
```

---

## 📝 Tuỳ chỉnh câu hỏi

Sửa file `lib/questions.js` để thêm/sửa câu hỏi:

```javascript
{
  id: 1,
  question: "Câu hỏi của bạn?",
  options: {
    A: "Đáp án A",
    B: "Đáp án B",
    C: "Đáp án C",
    D: "Đáp án D"
  },
  answer: "B",  // Đáp án đúng
  category: "Danh mục"
}
```
