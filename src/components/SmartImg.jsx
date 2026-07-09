import { useEffect, useState } from "react";
import { loadImage, isKnownGood } from "../utils/imgQueue.js";

/* صورة ذكية:
   - الإيموجي يظهر افتراضياً — فلا تظهر أبداً أيقونة «صورة مكسورة».
   - الصورة الحقيقية تُطلب عبر طابور محدود التزامن (4 في آنٍ واحد) بدل 100 دفعة واحدة،
     فتنجح الخدمة المجانية في توليدها ثم تُعرض. الروابط الناجحة تُحفظ فتظهر فوراً لاحقاً.
   - عند الفشل التام: يبقى الإيموجي بلا كسر. */
export default function SmartImg({ src, emoji, alt = "", className = "ph-img", emojiClass = "bk-pc-img", imgStyle }) {
  const [ready, setReady] = useState(() => isKnownGood(src));

  useEffect(() => {
    let alive = true;
    if (!src) { setReady(false); return undefined; }
    if (isKnownGood(src)) { setReady(true); return undefined; }
    setReady(false);
    loadImage(src).then((ok) => { if (alive && ok) setReady(true); });
    return () => { alive = false; };
  }, [src]);

  if (!ready) return <span className={emojiClass}>{emoji}</span>;
  return <img src={src} alt={alt} className={className} style={imgStyle} draggable="false" />;
}
