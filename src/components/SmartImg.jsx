import { useEffect, useState } from "react";
import { loadImage, isKnownGood } from "../utils/imgQueue.js";

/* صورة ذكية:
   - تجرّب روابط الصورة بالترتيب: صورة التاجر ← الصورة الدائمة (Supabase) ← توليد لحظي بالذكاء.
   - أثناء التحميل: بديل رمادي ناعم (وميض) — لا إيموجي ولا أيقونة مكسورة.
   - الروابط الناجحة تُحفظ فتظهر فوراً لاحقاً. */
export default function SmartImg({ src, srcs, emoji, alt = "", className = "ph-img", emojiClass = "bk-pc-img", imgStyle }) {
  const list = (srcs && srcs.length ? srcs : (src ? [src] : [])).filter(Boolean);
  const key = list.join("|");
  const [okSrc, setOkSrc] = useState(() => list.find(isKnownGood) || null);

  useEffect(() => {
    let alive = true;
    const known = list.find(isKnownGood);
    if (known) { setOkSrc(known); return undefined; }
    setOkSrc(null);
    (async () => {
      for (const u of list) {
        const ok = await loadImage(u);
        if (!alive) return;
        if (ok) { setOkSrc(u); return; }
      }
    })();
    return () => { alive = false; };
  }, [key]);

  if (!okSrc) return <span className={emojiClass + " bk-imgph"} aria-label={alt} />;
  return <img src={okSrc} alt={alt} className={className} style={imgStyle} draggable="false" />;
}
