import { useEffect, useRef, useState } from "react";
import { loadImage, isKnownGood, isKnownBad } from "../utils/imgQueue.js";

/* صورة ذكية:
   - لا تُطلب الصورة إلا عند اقتراب البطاقة من الشاشة (فلا نرهق الخدمة بـ100 طلب دفعة واحدة).
   - تجرّب الروابط بالترتيب: صورة التاجر ← الصورة الدائمة (Supabase) ← توليد لحظي بالذكاء.
     الروابط الأولى تُعطى محاولة سريعة واحدة، وتوليد الذكاء يُعطى محاولات أكثر (لأنه يتأخّر).
   - أثناء التحميل: وميض رمادي ناعم — لا إيموجي ولا صورة مكسورة أبداً. */
export default function SmartImg({ src, srcs, emoji, alt = "", className = "ph-img", emojiClass = "bk-pc-img", imgStyle }) {
  const list = (srcs && srcs.length ? srcs : (src ? [src] : [])).filter(Boolean);
  const key = list.join("|");
  const [okSrc, setOkSrc] = useState(() => list.find(isKnownGood) || null);
  const [near, setNear] = useState(false);
  const holder = useRef(null);

  // ابدأ التحميل فقط عند اقتراب العنصر من الشاشة
  useEffect(() => {
    if (okSrc || near) return undefined;
    const el = holder.current;
    if (!el || typeof IntersectionObserver === "undefined") { setNear(true); return undefined; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); }
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [okSrc, near]);

  useEffect(() => {
    let alive = true;
    const known = list.find(isKnownGood);
    if (known) { setOkSrc(known); return undefined; }
    setOkSrc(null);
    if (!near) return undefined;
    (async () => {
      for (let i = 0; i < list.length; i++) {
        const u = list[i];
        if (isKnownBad(u)) continue;                       // فشل سابقاً — تخطَّ فوراً
        const last = i === list.length - 1;                // آخر مرشّح = توليد الذكاء
        const ok = await loadImage(u, last ? { attempts: 4, timeout: 15000 } : { attempts: 1, timeout: 5000 });
        if (!alive) return;
        if (ok) { setOkSrc(u); return; }
      }
    })();
    return () => { alive = false; };
  }, [key, near]);

  if (!okSrc) return <span ref={holder} className={emojiClass + " bk-imgph"} aria-label={alt} />;
  return <img src={okSrc} alt={alt} className={className} style={imgStyle} draggable="false" />;
}
