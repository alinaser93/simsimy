// دالة إرسال رمز واتساب — العراق فقط (+964)
// تُفعّل عند إضافة مزوّد حقيقي (Twilio/Meta) ومتغيّرات البيئة السرية.
// الرمز يُخزّن مؤقتاً (هنا في الذاكرة كمثال؛ للإنتاج استخدم قاعدة/Redis).
const store = new Map(); // phone -> { code, exp }

export default async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: cors });

  let body; try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: cors }); }
  const phone = String(body.phone || "").replace(/\D/g, "");
  // تحقّق أنه رقم عراقي: 964 ثم 7 ثم 9 أرقام
  if (!/^9647[0-9]{9}$/.test(phone)) return new Response(JSON.stringify({ error: "رقم عراقي غير صحيح" }), { status: 400, headers: cors });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  store.set(phone, { code, exp: Date.now() + 5 * 60 * 1000 });

  // ═══ هنا يُرسل الرمز عبر واتساب فعلياً — مثال Twilio (يحتاج متغيّرات بيئة) ═══
  const SID = process.env.TWILIO_SID, TOKEN = process.env.TWILIO_TOKEN, FROM = process.env.TWILIO_WHATSAPP_FROM;
  if (SID && TOKEN && FROM) {
    try {
      const auth = Buffer.from(`${SID}:${TOKEN}`).toString("base64");
      const params = new URLSearchParams({
        From: `whatsapp:${FROM}`,
        To: `whatsapp:+${phone}`,
        Body: `رمز الدخول إلى بلينكيت هو: ${code}\nصالح لمدة 5 دقائق. لا تشاركه مع أحد.`,
      });
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      if (!r.ok) { const e = await r.json(); return new Response(JSON.stringify({ error: e.message || "فشل الإرسال" }), { status: 502, headers: cors }); }
      return new Response(JSON.stringify({ ok: true }), { headers: cors }); // لا نعيد الرمز للعميل (أمان)
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
    }
  }

  // لا مزوّد مضبوط → أخبر العميل ليستخدم الوضع التجريبي
  return new Response(JSON.stringify({ error: "مزوّد واتساب غير مضبوط بعد" }), { status: 501, headers: cors });
};
