# IT O'qituvchilar Namangan

Namangan shahridagi IT/informatika o'qituvchilari uchun Telegram bot + Mini App + admin panel: JSHSHIR orqali identifikatsiya, reyting tizimi, escape-room uslubidagi quest o'yini, onlayn 1v1 battle va admin tomonidan beriladigan topshiriqlar.

## Tarkibi

- **Telegram bot** — foydalanuvchini ro'yxatdan o'tkazadi: telefon raqami + JSHSHIR (PINFL) so'raydi, admin oldindan kiritgan pedagog ma'lumotlari bilan solishtiradi
- **Mini App** — profil, reyting jadvali, ko'p bosqichli quest (escape room), onlayn o'qituvchilar bilan jonli battle
- **Admin panel** — pedagoglar (Excel import/eksport), quest bosqichlari/savollari, battle savollar banki, reyting ball qiymatlari, topshiriqlar, yutuqlar
- **Topshiriqlar** — admin panelda yaratiladi, bot orqali e'lon qilinadi, lekin bajarilishi **alohida Telegram guruhda** amalga oshiriladi; admin faqat "bajardi" belgisini qo'yadi, ball avtomatik qo'shiladi
- **Yutuqlar** — admin panelda alohida bo'lim: olimpiada, viloyat yoki respublika ko'rik-tanlovlaridagi g'oliblik uchun har bir pedagogga individual ball beriladi (tanlov nomi va ball qiymati admin tomonidan erkin kiritiladi)

## Texnologik stek

- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS
- **Backend:** Supabase (Postgres + RLS, Auth, Realtime, Edge Functions)
- **Bot:** Deno Edge Function + [grammY](https://grammy.dev)
- **Mini App real vaqt qismi:** Supabase Realtime (Presence — kim onlayn, Broadcast — battle chaqiruvi)

## O'rnatish

```bash
npm install
cp .env.example .env   # va qiymatlarni to'ldiring
npm run dev
```

| O'zgaruvchi | Tavsif |
|---|---|
| `VITE_SUPABASE_URL` | Supabase loyiha URL manzili |
| `VITE_SUPABASE_ANON_KEY` | Supabase `anon` ochiq kaliti |

```bash
npm run build     # production build (dist/)
npm run preview   # build natijasini lokal ko'rish
```

## Loyiha tuzilishi

```
src/
  admin/          — admin panel (Pedagoglar, Quest, Battle, Reyting, Topshiriqlar, Yutuqlar)
  miniapp/        — Mini App (Profil, Reyting, Quest, Battle)
  lib/            — Supabase client, umumiy tiplar
supabase/
  functions/
    telegram-bot/   — bot (registratsiya, broadcast, topshiriq e'loni)
    miniapp-api/    — Mini App backend (profil/quest/battle — barchasi server tomonda tekshiriladi)
    notify-task/    — admin panel yangi topshiriqni botga e'lon qildiradi (JWT bilan himoyalangan)
    _shared/        — initData tekshiruvi (ikkala funksiya ham ishlatadi)
  migrations/       — barcha jadvallar, RLS siyosatlari, ball berish trigeri
```

## Supabase sozlamalari

### Migratsiyalar

`supabase/migrations/` papkasidagi fayllarni tartib bilan qo'llang (Supabase CLI: `supabase db push`, yoki SQL Editor orqali qo'lda).

### Mini App'ni joylashtirish (deploy)

Telegram Mini App — bu shunchaki `web_app` tugmasi bosilganda Telegram ichida ochiladigan **oddiy veb-sahifa**. U avtomatik "botda ko'rinib qolmaydi" — ochiq (public) HTTPS manzilda turishi shart, xuddi oddiy sayt kabi:

1. `npm run build` — `dist/` papkasini yaratadi (bu — butun ilova: ochiq sahifa yo'q, faqat admin panel va Mini App, `/admin` va `/` yo'llari orqali ajratiladi)
2. `dist/` papkasini statik hosting'ga yuklang (Netlify, Cloudflare Pages, Vercel — istalgani mos, faqat HTTPS bo'lishi shart)
3. Shu domenni (masalan `https://it-teachers-namangan.netlify.app`) `MINIAPP_URL` sifatida quyida sozlang

> Agar `MINIAPP_URL` sozlanmagan bo'lsa, bot Mini App tugmasini umuman ko'rsatmaydi (avvalgi versiyada bu yerda noto'g'ri standart qiymat — `miniapp-api` funksiyasining o'zi — bor edi, u faqat JSON qaytaradi, HTML sahifa emas, shuning uchun olib tashlandi).

### Edge Functions sozlamalari

```bash
supabase secrets set \
  TELEGRAM_BOT_TOKEN=<BotFather bergan token> \
  TELEGRAM_WEBHOOK_SECRET=<o'zingiz tanlagan uzun tasodifiy matn> \
  ADMIN_TELEGRAM_ID=<adminning Telegram ID raqami> \
  ADMIN_USERNAME=<adminning Telegram @username, ixtiyoriy> \
  TASK_GROUP_URL=<topshiriqlar bajariladigan Telegram guruh havolasi> \
  MINIAPP_URL=<Mini App joylashtirilgan ochiq HTTPS manzil>
```

> `TELEGRAM_WEBHOOK_SECRET` va `ADMIN_TELEGRAM_ID` sozlanmasa, bot xavfsizlik sababli ishlamaydi (fail-closed). `MINIAPP_URL` sozlanmasa, bot ishlaydi, lekin "Mini App ni ochish" tugmasi hech qayerda ko'rinmaydi.

Funksiyalarni deploy qiling:

```bash
supabase functions deploy telegram-bot
supabase functions deploy miniapp-api
supabase functions deploy notify-task
```

Webhookni sozlash (bir martalik, brauzerda oching):

```
https://<loyiha-ref>.supabase.co/functions/v1/telegram-bot?setWebhook=true&secret=<TELEGRAM_WEBHOOK_SECRET>
```

### Admin kirish

Admin panelga kirish uchun Supabase Auth orqali foydalanuvchi (email/parol) yaratilgan bo'lishi kerak — **Authentication → Users** bo'limida qo'lda qo'shing. Ro'yxatdan o'tish formasi yo'q, faqat kirish.

> Eslatma: barcha boshqaruv jadvallarida (`pedagog_data`, `quest_*`, `battle_questions`, `tasks`, `task_completions`, `achievements`, `rating_settings`) yozish huquqi har qanday `authenticated` foydalanuvchiga berilgan — alohida "admin" roli yo'q. Supabase loyihangizda **ochiq ro'yxatdan o'tish o'chirilganligini** tekshirib qo'ying.

## Xavfsizlik arxitekturasi (qisqacha)

- **Hech qanday to'g'ri javob klientga to'g'ri etib bormaydi**: `quest_questions.correct_option` va `battle_questions.correct_option` faqat `authenticated` (admin) uchun ochiq — Mini App bu jadvallarga umuman kirmaydi, `miniapp-api` service-role kalit bilan savolni o'qib, javobni "kesib" (correct_option'siz) yuboradi va yuborilgan javobni serverda tekshiradi.
- **Ball faqat serverda beriladi**: `points_history` jadvaliga faqat `miniapp-api` (quest/battle) va bitta trigger (`task_completions` bajarilganda) yoza oladi — klient hech qachon to'g'ridan-to'g'ri ball qo'sha olmaydi.
- **Mini App identifikatsiyasi**: har bir so'rov Telegram'ning imzolangan `initData`sini yuboradi, `miniapp-api` uni HMAC orqali tekshirib, `pedagog_data_id`ni serverda aniqlaydi — klient hech qachon "men shu odamman" deb da'vo qila olmaydi.
- **Bot webhook**: `X-Telegram-Bot-Api-Secret-Token` orqali tekshiriladi — soxta so'rov yuborib adminni taqlid qilib bo'lmaydi.
- **`notify-task`**: alohida funksiya, Supabase'ning o'z JWT tekshiruvi orqali himoyalangan (`verify_jwt = true`) — admin panelda maxfiy kalit saqlash shart emas.

## Ma'lum cheklovlar

- Battle o'yinida real vaqtli push o'rniga qisqa intervalli so'rov (polling, ~1.5s) ishlatiladi — soddaroq va ishonchli, lekin millisekund darajasida tezkor emas.
- To'liq spam himoyasi (CAPTCHA/rate-limit) yo'q.
