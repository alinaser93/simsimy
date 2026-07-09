import { useStore } from "../store/appStore.js";
import { BESTSELLERS } from "../data/collections.js";
import SmartImg from "./SmartImg.jsx";
import { productImgCandidates, arToEnPrompt } from "../utils/imageGen.js";

// خلية صورة منتج: الإيموجي يظهر حتى تنجح الصورة (بلا أيقونة مكسورة)
function Thumb({ p }) {
  return <SmartImg srcs={productImgCandidates(p)} query={arToEnPrompt(p.name)} emoji={p.e} className="" emojiClass="" />;
}

// مطابقة مرنة بين عنوان البلاطة وأقسام المنتجات
const norm = (s) => (s || "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
const words = (s) => norm(s).split(/[\s،و]+/).filter((w) => w.length > 2);

// «الأكثر مبيعاً»: شبكة 3 أعمدة، كل بطاقة فيها 2×2 صور منتجات حقيقية وشارة «+المزيد»
export default function Bestsellers({ onOpen }) {
  const products = useStore((s) => s.products);
  return (
    <>
      <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">الأكثر مبيعاً</div></div></div>
      <div className="bk-bs-grid">
        {BESTSELLERS.map((b, i) => {
          const tw = words(b.title);
          const match = (p) => {
            if (p.cat === b.title || p.sub === b.title) return true;
            const pw = [...words(p.cat), ...words(p.sub || "")];
            return tw.some((t) => pw.some((w) => w.includes(t) || t.includes(w)));
          };
          const prods = products.filter(match).slice(0, 4);
          const useReal = prods.length >= 4; // إن لم نجد 4 صور، استخدم الإيموجي الافتراضي (بلا كسر)
          return (
            <div className="bk-bs" key={i} onClick={() => onOpen(b.title)}>
              <div className="bk-bs-g">
                {useReal
                  ? prods.map((p, j) => <div className="bk-bs-th" key={j}><Thumb p={p} /></div>)
                  : b.items.map((e, j) => <div className="bk-bs-th" key={j}>{e}</div>)}
                <div className="bk-bs-more">+{b.more} المزيد</div>
              </div>
              <div className="bk-bs-t">{b.title}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
