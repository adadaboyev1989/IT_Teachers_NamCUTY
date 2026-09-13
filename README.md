# IT O'qituvchilar Namangan

Namangan shahridagi IT/informatika o'qituvchilari uchun jamoat platformasi: o'qituvchilar reestri, ta'lim resurslari, tadbirlar e'loni, admin panel va Telegram bot orqali pedagog kadrlar ro'yxatdan o'tkazish tizimi.

## Tarkibi

- **Ochiq sayt** — o'qituvchilar, resurslar va tadbirlar bilan tanishish (kirishsiz, hamma ko'ra oladi va qo'sha oladi)
- **Admin panel** (`/admin` yoki `#admin`) — o'qituvchilar/resurslar/tadbirlarni boshqarish, pedagog kadrlar ma'lumotlari (Excel import/eksport bilan) va reyting statistikasi
- **Telegram bot** — foydalanuvchini ro'yxatdan o'tkazadi (kontakt + PINFL), pedagog ma'lumotlarini topib beradi, admin bilan ikki tomonlama xabar almashinuvini ta'minlaydi
- **Telegram Mini App** — foydalanuvchi o'z pedagog ma'lumotlari va reyting balini ko'radi

## Texnologik stek

- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS, `lucide-react`, `xlsx` (Excel import/eksport)
- **Backend:** Supabase (Postgres + Row Level Security, Auth, Storage, Edge Functions)
- **Bot/Mini App:** Supabase Edge Functions (Deno) — Telegram Bot API bilan to'g'ridan-to'g'ri ishlaydi

## Loyihani ishga tushirish

```bash
npm install
cp .env.example .env   # va qiymatlarni to'ldiring
npm run dev
```

`.env` uchun kerakli qiymatlar Supabase loyihangizning **Settings → API** bo'limida:

| O'zgaruvchi | Tavsif |
|---|---|
| `VITE_SUPABASE_URL` | Supabase loyiha URL manzili |
| `VITE_SUPABASE_ANON_KEY` | Supabase `anon` ochiq kaliti |

Boshqa buyruqlar:

```bash
npm run build     # production build (dist/)
npm run preview   # build natijasini lokal ko'rish
```

## Supabase sozlamalari

### Migratsiyalar

`supabase/migrations/` papkasidagi barcha fayllarni tartib bilan qo'llang (Supabase CLI yoki SQL Editor orqali). Ular jadvallarni, RLS siyosatlarini va ma'lumotlarni tekshirish cheklovlarini yaratadi.

### Edge Functions

`supabase/functions/telegram-bot` va `supabase/functions/miniapp-data` — Telegram bot va Mini App uchun serverlar. Ularni deploy qilishdan oldin quyidagi maxfiy o'zgaruvchilarni sozlash **shart**:

```bash
supabase secrets set \
  TELEGRAM_BOT_TOKEN=<BotFather bergan token> \
  TELEGRAM_WEBHOOK_SECRET=<o'zingiz tanlagan uzun tasodifiy matn> \
  ADMIN_TELEGRAM_ID=<adminning Telegram ID raqami> \
  ADMIN_USERNAME=<adminning Telegram @username (ixtiyoriy)> \
  MINIAPP_URL=<Mini App sahifasi manzili, ixtiyoriy>
```

> `TELEGRAM_WEBHOOK_SECRET` va `ADMIN_TELEGRAM_ID` sozlanmasa, bot xavfsizlik sababli ishlamaydi (fail-closed): webhook so'rovlari va admin-only funksiyalar rad etiladi.

Funksiyalarni deploy qilgach, webhookni sozlang (bir martalik, brauzerda oching):

```
https://<loyiha-ref>.supabase.co/functions/v1/telegram-bot?setWebhook=true&secret=<TELEGRAM_WEBHOOK_SECRET>
```

Boshqa foydali sozlash/diagnostika parametrlari (barchasi `?secret=<TELEGRAM_WEBHOOK_SECRET>` talab qiladi):

| Parametr | Vazifasi |
|---|---|
| `setWebhook=true` | Webhookni Telegram'da o'rnatadi |
| `setMenu=true` | Bot menyu tugmasini (Mini App) o'rnatadi |
| `webhookInfo=true` | Joriy webhook holatini ko'rsatadi |
| `getMe=true` | Bot ma'lumotlarini ko'rsatadi |
| `testMessage=true` | Adminga test xabar yuboradi |

## Admin kirish

Admin panelga kirish uchun Supabase Auth orqali foydalanuvchi (email/parol) yaratilgan bo'lishi kerak — **Authentication → Users** bo'limida qo'lda qo'shing. Loyihada ro'yxatdan o'tish (sign-up) formasi yo'q, faqat kirish (`AdminLogin`) mavjud.

> Eslatma: `teachers`/`resources`/`events`/`pedagog_data` jadvallarida tahrirlash/o'chirish huquqi har qanday `authenticated` foydalanuvchiga berilgan (alohida "admin" roli yo'q). Shu sababli Supabase loyihangizda **ochiq ro'yxatdan o'tish (public sign-up) o'chirilganligini** tekshirib qo'ying, aks holda har qanday ro'yxatdan o'tgan foydalanuvchi admin bilan bab-baravar huquqqa ega bo'ladi.

## Loyiha tuzilishi

```
src/
  admin/        — admin panel sahifalari (O'qituvchilar, Resurslar, Tadbirlar, Bot > Pedagog/Reyting)
  components/   — ochiq sayt komponentlari (Navbar, Hero, Teachers/Resources/Events View va formalar)
  lib/          — Supabase client va reyting hisoblash formulasi
supabase/
  functions/    — telegram-bot va miniapp-data Edge Functions (Deno)
  migrations/   — Postgres jadvallar, RLS siyosatlari, validatsiya cheklovlari
public/
  miniapp.html  — Mini App'ning statik nusxasi (miniapp-data funksiyasidagi generatsiya qilingan
                  HTML bilan qo'lda sinxronlanadi — ikkalasida ham bir xil o'zgarish kiritilishi kerak)
```

## Xavfsizlik bo'yicha ma'lum cheklovlar

- To'liq spam himoyasi (CAPTCHA/rate-limit) hozircha yo'q — ochiq forma orqali qo'shilgan yozuvlar DB darajasidagi uzunlik/format tekshiruvidan o'tadi, lekin tashqi CAPTCHA xizmati ulanmagan.
- Alohida "admin" roli yo'q — yuqoridagi eslatmaga qarang.
