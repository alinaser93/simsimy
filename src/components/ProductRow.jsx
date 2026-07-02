import { ChevronLeft } from "lucide-react";
import ProductCard from "./ProductCard.jsx";
import { useStore } from "../store/appStore.js";

/* صف منتجات أفقي بأسلوب بلينكيت:
   - العنوان (وسطر التفرعات) بلا زر جانبي
   - صف أفقي من البطاقات
   - شريط «عرض المنتجات ←» عريض أسفل الصف (مصغّرات + نص وسط + سهم) */
export default function ProductRow({ title, sub, ids, cart, add, inc, dec, onSeeAll, cardBg, cardBorder }) {
  const products = useStore((s) => s.products);
  const all = ids.map((id) => products.find((x) => x.id === id)).filter(Boolean);
  const items = all.slice(0, 4); // شبكة 2×2 ثابتة؛ الباقي عبر «عرض المنتجات»
  return (
    <>
      {title && (
        <div className="bk-sec">
          <div className="bk-sec-h">
            <div>
              <div className="bk-sec-t">{title}</div>
              {sub && <div className="bk-sec-sub">{sub}</div>}
            </div>
          </div>
        </div>
      )}
      <div className="bk-hs hide-sb">
        {items.map((p) => (
          <ProductCard key={p.id} p={p} qty={cart[p.id] || 0} onAdd={add} onInc={inc} onDec={dec} cardBg={cardBg} cardBorder={cardBorder} />
        ))}
      </div>
      {onSeeAll && (
        <div className="bk-seeall-bar" onClick={onSeeAll}>
          <div className="thumbs">
            {all.slice(0, 3).map((p) => (
              <span key={p.id} className="th" style={{ background: p.bg }}>{p.img ? <img src={p.img} alt="" /> : p.e}</span>
            ))}
          </div>
          <div className="txt">عرض المنتجات</div>
          <ChevronLeft size={20} strokeWidth={3} className="chev" />
        </div>
      )}
    </>
  );
}
