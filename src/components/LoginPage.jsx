import { useState, useRef, useEffect } from "react";
import { ChevronRight, MessageCircle, ShieldCheck, LocateFixed, Loader2, MapPin } from "lucide-react";
import { loginWithPhone, setMyLocation } from "../store/appStore.js";
import { sendWhatsappOtp } from "../utils/otp.js";
import { getCurrentLocation, reverseGeocode } from "../utils/geo.js";

/* تسجيل الدخول عبر واتساب — العراق فقط (+964) — بأسلوب بلينكيت */
export default function LoginPage({ onBack, onDone }) {
  const [step, setStep] = useState("phone");   // phone | otp
  const [phone, setPhone] = useState("");       // 7XXXXXXXXX (10 أرقام بعد 964)
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sentCode, setSentCode] = useState("");
  const [demoHint, setDemoHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState("");
  const [locDone, setLocDone] = useState("");
  const boxes = useRef([]);

  // أرقام العراق: 10 أرقام تبدأ بـ7 (بعد +964)، أو 11 تبدأ بـ07
  const cleanPhone = (v) => v.replace(/\D/g, "").replace(/^964/, "").replace(/^0/, "");
  const validIraq = /^7[0-9]{9}$/.test(cleanPhone(phone));
  const fullNumber = "+964 " + cleanPhone(phone);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const send = async () => {
    if (!validIraq) { setErr("أدخل رقم عراقي صحيح (يبدأ بـ 7 ويتكوّن من 10 أرقام)"); return; }
    if (busy) return;
    // حماية من الضغط المتكرر: ثانيتان بين كل طلب لكل مستخدم (تُحفظ محلياً لتصمد عبر إعادة التحميل)
    const now = Date.now();
    let last = 0;
    try { last = Number(localStorage.getItem("bk-otp-cooldown")) || 0; } catch { last = 0; }
    const wait = 2000 - (now - last);
    if (wait > 0) { setErr(`الرجاء الانتظار ${Math.ceil(wait / 1000)} ثانية قبل المحاولة مجدداً`); return; }
    try { localStorage.setItem("bk-otp-cooldown", String(now)); } catch { /* لا شيء */ }

    setErr(""); setBusy(true);
    const res = await sendWhatsappOtp(cleanPhone(phone));
    setBusy(false);
    if (res.ok) {
      setSentCode(res.code || "");
      if (res.demo) setDemoHint(res.code); // في الوضع التجريبي نعرض الرمز
      setStep("otp"); setCountdown(30);
      setTimeout(() => boxes.current[0]?.focus(), 200);
    } else {
      setErr(res.error || "تعذّر إرسال الرمز — حاول مجدداً");
    }
  };

  const onOtpChange = (i, v) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[i] = d; setOtp(next); setErr("");
    if (d && i < 5) boxes.current[i + 1]?.focus();
    if (next.every((x) => x) && next.join("").length === 6) verify(next.join(""));
  };
  const onOtpKey = (i, e) => { if (e.key === "Backspace" && !otp[i] && i > 0) boxes.current[i - 1]?.focus(); };

  const verify = (code) => {
    // التحقّق: في الوضع التجريبي نطابق الرمز المُرسل؛ في الإنتاج يتحقّق الخادم
    if (sentCode && code !== sentCode) { setErr("الرمز غير صحيح، تحقّق وأعد المحاولة"); setOtp(["", "", "", "", "", ""]); boxes.current[0]?.focus(); return; }
    loginWithPhone(fullNumber);
    setStep("location");   // خطوة تثبيت الموقع لسهولة المستخدم
  };

  const useMyLocation = async () => {
    setLocating(true); setLocErr("");
    try {
      const loc = await getCurrentLocation();
      let geo = { full: "", city: "" };
      try { geo = await reverseGeocode(loc.lat, loc.lng); } catch { /* لا بأس */ }
      setMyLocation({ lat: loc.lat, lng: loc.lng, details: geo.full, city: geo.city });
      setLocDone(geo.full || "تم تحديد موقعك بنجاح");
      setTimeout(() => finish(), 1100);
    } catch (e) { setLocErr(e.message || "تعذّر تحديد الموقع — فعّل خدمة الموقع وحاول مجدداً"); }
    setLocating(false);
  };

  const finish = () => { onDone ? onDone() : onBack(); };

  const resend = async () => { if (countdown > 0) return; await send(); };

  return (
    <div className="lg-page">
      <div className="lg-top">
        <button className="lg-back" onClick={step === "otp" ? () => setStep("phone") : step === "location" ? finish : onBack}><ChevronRight size={24} /></button>
        {step === "phone" && <button className="lg-skip" onClick={onBack}>تخطّي</button>}
      </div>

      <div className="lg-body">
        <div className="lg-logo"><span className="b">ب</span></div>
        <div className="lg-tag">أسرع توصيل بقالة في مدينتك</div>

        {step === "phone" ? (
          <>
            <h2 className="lg-h">تسجيل الدخول أو إنشاء حساب</h2>
            <div className={"lg-phone" + (err ? " err" : "")}>
              <span className="lg-cc"><span className="flag">🇮🇶</span> +964</span>
              <input type="tel" inputMode="numeric" placeholder="7XX XXX XXXX" value={phone} autoFocus
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && validIraq) send(); }} />
            </div>
            {err && <div className="lg-err">{err}</div>}
            <button className="lg-wa" disabled={!validIraq || busy} onClick={send}>
              <MessageCircle size={19} fill="#fff" color="#25D366" />
              {busy ? "جارٍ الإرسال…" : "إرسال الرمز عبر واتساب"}
            </button>
            <div className="lg-terms">بالمتابعة، أنت توافق على <b>شروط الخدمة</b> و<b>سياسة الخصوصية</b></div>
          </>
        ) : step === "otp" ? (
          <>
            <h2 className="lg-h">تأكيد الرمز</h2>
            <div className="lg-sent">أرسلنا رمز التحقّق عبر واتساب إلى<br /><b dir="ltr">{fullNumber}</b></div>
            {demoHint && <div className="lg-demo">🔧 وضع تجريبي — رمزك: <b>{demoHint}</b><br /><small>(في الإطلاق الفعلي يصلك عبر واتساب)</small></div>}
            <div className="lg-otp" dir="ltr">
              {otp.map((d, i) => (
                <input key={i} ref={(el) => (boxes.current[i] = el)} type="tel" inputMode="numeric" maxLength={1}
                  className={"lg-otpbox" + (d ? " filled" : "")} value={d}
                  onChange={(e) => onOtpChange(i, e.target.value)} onKeyDown={(e) => onOtpKey(i, e)} />
              ))}
            </div>
            {err && <div className="lg-err">{err}</div>}
            <div className="lg-resend">
              {countdown > 0
                ? <span>إعادة إرسال الرمز خلال {countdown} ثانية</span>
                : <button onClick={resend}>إعادة إرسال الرمز</button>}
            </div>
            <div className="lg-wavia"><MessageCircle size={15} color="#25D366" /> يصلك الرمز عبر واتساب</div>
          </>
        ) : (
          <>
            <div className="lg-loc-ic"><MapPin size={40} strokeWidth={1.6} color="#0C831F" /></div>
            <h2 className="lg-h">حدّد موقعك</h2>
            <div className="lg-sent">نحتاج موقعك لتوصيل طلباتك بدقّة وسرعة.<br />فعّلها مرة وحدة وتنحفظ لك.</div>
            {locDone ? (
              <div className="lg-demo" style={{ background: "#eaf7ec", borderColor: "#bfe6cb", color: "#0C6B2A" }}>
                ✅ تم تثبيت موقعك<br /><b>{locDone}</b>
              </div>
            ) : (
              <>
                <button className="lg-wa" style={{ background: "#0C831F" }} disabled={locating} onClick={useMyLocation}>
                  {locating ? <Loader2 size={18} className="spin" /> : <LocateFixed size={18} />}
                  {locating ? "جارٍ تحديد موقعك…" : "استخدام موقعي الحالي"}
                </button>
                {locErr && <div className="lg-err">{locErr}</div>}
                <button className="lg-skip-loc" onClick={finish}>تخطّي الآن — أحدّده لاحقاً</button>
              </>
            )}
          </>
        )}
      </div>

      <div className="lg-secure"><ShieldCheck size={14} /> دخول آمن ومحمي</div>
    </div>
  );
}
