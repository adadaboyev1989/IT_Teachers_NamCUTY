# Deploy — to'liq qo'llanma

Loyihani ishga tushirish uchun ketma-ket bajariladigan qadamlar. Ikkita alohida
narsa bor: **Supabase** (baza + bot + backend) va **Netlify** (frontend —
admin panel + Mini App). Netlify Supabase'ga tegmaydi — ikkalasi ham alohida
sozlanishi kerak.

Tartibga rioya qiling — ba'zi qadamlar (masalan `MINIAPP_URL`) keyingi
qadamning natijasiga bog'liq.

---

## 0-qadam. Kerakli narsalar

- [Supabase](https://supabase.com) hisobi va bo'sh loyiha (project)
- [Netlify](https://netlify.com) hisobi
- Telegram'da bot yaratilgan bo'lishi ([@BotFather](https://t.me/BotFather) orqali: `/newbot`) — natijada **bot token** olasiz
- O'zingizning Telegram **ID** raqamingiz — [@userinfobot](https://t.me/userinfobot) ga `/start` bosing, u ID'ni qaytaradi
- Kompyuteringizda: Node.js, [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)

---

## 1-qadam. Supabase — jadvallarni yaratish

Netlify jadvallarni avtomatik yaratmaydi — bu alohida, bir martalik qadam.

```bash
supabase login
supabase link --project-ref <loyiha-ref>   # Supabase Dashboard → Project Settings → General'da ko'rinadi
supabase db push
```

Bu `supabase/migrations/` papkasidagi barcha SQL fayllarni sana tartibida
bazaga qo'llaydi (jadvallar, RLS siyosatlari, ball berish trigerlari,
`leaderboard` view). Shu migratsiyalar orasida bazaning vaqt mintaqasini
O'zbekiston vaqtiga (`Asia/Tashkent`, UTC+5) sozlash ham bor — sana bilan
bog'liq barcha hisob-kitoblar (masalan, tug'ilgan kun tekshiruvi) shu asosda
ishlaydi.

**Muqobil yo'l (CLI'siz):** Supabase Dashboard → **SQL Editor** → har bir
migration faylining tarkibini fayl nomidagi sanaga qarab, eng eskisidan
boshlab, birma-bir nusxalab ishga tushiring.

---

## 2-qadam. Supabase — Edge Functions'ni deploy qilish

```bash
supabase functions deploy telegram-bot
supabase functions deploy miniapp-api
supabase functions deploy notify-task
```

---

## 3-qadam. Supabase — maxfiy kalitlarni (secrets) sozlash

`MINIAPP_URL`'dan tashqari barchasini hozir sozlash mumkin (`MINIAPP_URL`
Netlify manzili ma'lum bo'lgandan keyin, 6-qadamda qo'shiladi):

```bash
supabase secrets set \
  TELEGRAM_BOT_TOKEN=<BotFather bergan token> \
  TELEGRAM_WEBHOOK_SECRET=<o'zingiz o'ylab topgan uzun tasodifiy matn> \
  ADMIN_TELEGRAM_ID=<adminning Telegram ID raqami> \
  ADMIN_USERNAME=<adminning Telegram @username, ixtiyoriy> \
  TASK_GROUP_URL=<topshiriqlar bajariladigan Telegram guruh havolasi>
```

> `TELEGRAM_WEBHOOK_SECRET` va `ADMIN_TELEGRAM_ID` sozlanmasa, bot xavfsizlik
> sababli umuman ishlamaydi (fail-closed) — bularni albatta kiriting.

---

## 4-qadam. Supabase — admin kirish hisobini yaratish

Admin panelga kirish uchun Supabase Auth'da foydalanuvchi bo'lishi kerak —
ro'yxatdan o'tish formasi yo'q, faqat kirish.

Dashboard → **Authentication → Users → Add user** → email va parol kiriting.

---

## 5-qadam. Netlify — frontend'ni deploy qilish

1. Loyihani GitHub'ga bog'lab, Netlify'da **Add new site → Import an existing project** orqali tanlang (yoki `netlify deploy` CLI orqali).
2. Build sozlamalari:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. **Environment variables** (Netlify → Site settings → Environment variables):

   | O'zgaruvchi | Qiymat |
   |---|---|
   | `VITE_SUPABASE_URL` | Supabase loyiha URL manzili |
   | `VITE_SUPABASE_ANON_KEY` | Supabase `anon` ochiq kaliti |

4. Deploy qiling. Natijada `https://<sizning-nom>.netlify.app` kabi manzil olasiz.

> `public/_redirects` fayli loyihada allaqachon bor (`/* /index.html 200`) —
> bu Netlify'ga to'g'ridan-to'g'ri `/admin` manziliga kirilganda 404
> bermasdan ilovani ochishni aytadi (chunki `/admin` alohida fayl emas,
> React ichida JavaScript orqali ajratiladi).

---

## 6-qadam. Supabase — Mini App manzilini bog'lash

Endi Netlify manzili ma'lum, uni botga bog'lang:

```bash
supabase secrets set MINIAPP_URL=https://<sizning-nom>.netlify.app
```

> Bu sozlanmasa, bot ishlayveradi, lekin "Mini App ni ochish" tugmasi hech
> qayerda ko'rinmaydi.

---

## 7-qadam. Telegram webhookni faollashtirish

Brauzerda quyidagi manzilni bir marta oching (o'z qiymatlaringiz bilan):

```
https://<loyiha-ref>.supabase.co/functions/v1/telegram-bot?setWebhook=true&secret=<TELEGRAM_WEBHOOK_SECRET>
```

Javobda `{"webhookSet":true,"miniAppMenuButtonSet":true}` ko'rinishi kerak.

---

## 7.5-qadam. Tug'ilgan kun tabrigi uchun kundalik trigger (ixtiyoriy)

O'qituvchilarni tug'ilgan kunlarida avtomatik tabriklash uchun quyidagi
manzilni **har kuni bir marta** chaqiradigan trigger kerak (Deno Edge
Function'larning o'zida cron yo'q, tashqaridan chaqirilishi shart):

```
https://<loyiha-ref>.supabase.co/functions/v1/telegram-bot?birthdayCheck=true&secret=<TELEGRAM_WEBHOOK_SECRET>
```

Buni sozlashning eng oson yo'li — Supabase Dashboard → **Database → Cron
Jobs** → **Create a new cron job** → turi **HTTP Request**, yuqoridagi
manzilga GET so'rov, jadval masalan `0 3 * * *` (bu UTC 03:00 — Toshkent
vaqti bilan ertalab soat 08:00). Muqobil sifatida istalgan bepul tashqi cron
xizmatidan ([cron-job.org](https://cron-job.org) va h.k.) ham foydalanish
mumkin.

> Bu sozlanmasa, hech narsa buzilmaydi — shunchaki tug'ilgan kun tabriklari
> yuborilmaydi.

---

## 8-qadam. Tekshirish

- [ ] Admin panel: `https://<netlify-manzil>/admin` ochiladi, email/parol bilan kirish ishlaydi
- [ ] Admin panelda kamida bitta pedagog qo'shilgan (yoki Excel orqali yuklangan)
- [ ] Botga Telegram'da `/start` bosilganda javob keladi
- [ ] Telefon + JSHSHIR orqali ro'yxatdan o'tish ishlaydi (admin qo'shgan pedagog bilan mos kelishi kerak)
- [ ] "Mini App ni ochish" tugmasi ko'rinadi va bosilganda profil ochiladi
- [ ] (Ixtiyoriy) `birthdayCheck` manzilini brauzerda qo'lda ochib, javobda `{"ok":true,"sent":N}` kelishini tekshiring

---

## Keyinchalik yangilash

- **Kod o'zgarganda** (frontend): Netlify GitHub'ga ulangan bo'lsa, `git push` qilishning o'zi yetarli — avtomatik qayta deploy bo'ladi.
- **Edge function o'zgarganda**: tegishli funksiyani qayta deploy qiling — masalan `supabase functions deploy miniapp-api`.
- **Yangi migration qo'shilganda**: `supabase db push`.
