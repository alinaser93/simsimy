/* إرسال رمز واتساب.
   - في الإنتاج: ينادي دالة Netlify /.netlify/functions/whatsapp-otp (تستخدم مزوّداً حقيقياً)
   - إن لم تتوفّر الدالة: وضع تجريبي مجاني (يولّد رمزاً ويعرضه للاختبار) */
export async function sendWhatsappOtp(phone) {
  // جرّب الخادم الحقيقي أولاً
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch("/.netlify/functions/whatsapp-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "964" + phone }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      if (data.ok) return { ok: true, code: data.code || null, demo: false }; // الخادم لا يعيد الرمز عادةً
      if (data.error) return { ok: false, error: data.error };
    }
  } catch { /* لا خادم → وضع تجريبي */ }

  // وضع تجريبي: ولّد رمزاً 6 أرقام واعرضه (للاختبار المجاني)
  const code = String(Math.floor(100000 + Math.random() * 900000));
  return { ok: true, code, demo: true };
}
