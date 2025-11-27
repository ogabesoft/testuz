# TestUZ Platform

Full-stack test tizimi (student va admin rollari bilan) qurildi:

- **Frontend:** React + Vite + TypeScript (`frontend/`)
- **Backend:** Django 5 + DRF + Jazzmin (`backend/`)
- **Ma'lumotlar bazasi:** PostgreSQL (`DATABASE_URL` orqali sozlanadi, dev rejimida SQLite fallback)

## Tezkor boshlash

### Tizim talablari

- Python 3.10+
- Node.js 18+
- PostgreSQL (yoki tezkor sinov uchun SQLite)

### Backendni ishga tushirish

1. `.env` faylini tayyorlang:
   ```bash
   copy .env.example .env   # Windows
   # cp .env.example .env   # macOS/Linux
   ```
   Kerak bo'lsa, `DATABASE_URL` yoki `POSTGRES_*` qiymatlarini o'zgartiring.

2. Agar lokal Postgres kerak bo'lsa, docker konteynerini ko'taring:
   ```bash
   docker compose up -d postgres
   ```

3. Django migratsiyalari va serverni ishga tushiring:
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

cd backend
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

> **Admin login:** `admin` / `Admin123!` (createsuperuser orqali tayyorlangan). Kiritilgan butun panel Jazzmin orqali styling qilingan.

### Frontendni ishga tushirish

```bash
cd frontend
npm install
npm run dev -- --host localhost --port 8080
```

Tizim `http://localhost:8080` da ochiladi va shu port backend CORS sozlamalariga mos keltirilgan.

### Muhim sozlamalar

- `backend/backend/settings.py`
  - `DATABASE_URL` bilan Postgres ulanishi.
  - `CORS_ALLOWED_ORIGINS` va `CSRF_TRUSTED_ORIGINS` (default `http://localhost:8080`).
- Frontend API adresini o'zgartirish kerak bo'lsa, `frontend/.env` fayliga `VITE_API_URL=https://server/api` yozish kifoya; aks holda `http://localhost:8000/api` ishlatiladi.

## Asosiy imkoniyatlar

### Frontend

- Rol tanlash (student/admin) va professional UI.
- Admin panel:
  - Token bilan login (`/api/auth/login/`).
  - Savollarni yaratish, variantlar va to'g'ri javoblarni belgilash.
  - Telegram bot tokeni + chat ID ni saqlash va faollashtirish.
  - So'nggi test natijalarini ko'rish.
- Student panel:
  - Ism va familiya bilan testni boshlash.
  - Savollarni ko'rsatish va radio buttonlar orqali javob berish.
  - Yakuniy natija ekrani.

### Backend

- REST API (`/api/...`) DRF orqali.
- Jazzmin admin interfeysi (sodda boshqaruv uchun).
- Modellar: `Question`, `AnswerOption`, `TestAttempt`, `AttemptAnswer`, `NotificationSetting`.
- Telegram integratsiyasi (`requests` orqali). `NotificationSetting` da token/chat id va `is_active` faolligi to'ldirilsa, har bir test yakunida adminlarga to'liq hisobot yuboriladi (foydalanuvchi, to'g'ri/xato javoblar, savol bo'yicha tafsilotlar).
- Autentifikatsiya: DRF token (`/api/auth/login/`). Frontend tokenni localStorage da saqlaydi.

## Foydalanish oqimi

1. `http://localhost:8080` ga kirish:
   - Student: ism/familiyani kiritadi, savollarga javob beradi, natija ko'rinadi.
   - Admin: `admin/Admin123!` bilan login, savollarni boshqaradi va Telegram sozlamalarini kiritadi.
2. Telegram bot/chat ID ni kiritish va `is_active` ni yoqish -> har bir attempt yakunida avtomatik xabar yuboriladi.

## Qo'shimcha buyruqlar

- Backend tekshiruvlari: `cd backend && ..\.venv\Scripts\python manage.py test`
- Frontend build: `cd frontend && npm run build`

## Keyingi qadamlar (ixtiyoriy takliflar)

1. Savollarni o'chirish/yangilash uchun qo'shimcha endpointlar.
2. Attemptlar bo'yicha paginatsiya va filtrlash.
3. Docker compose bilan Postgres + Redis kabi xizmatlarni orkestratsiya qilish.
4. Telegram xabarini markdown orqali bezash yoki fayl sifatida yuborish.
