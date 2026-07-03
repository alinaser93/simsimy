import { Star, Plus, Minus, ChevronLeft } from "lucide-react";
import { fmt, CUR } from "../utils/currency.js";

/* بطاقة منتج بأسلوب بلينكيت:
   - إطار صورة موحّد + شارة خصم + زرّ «أضف» فوق الصورة (أسفل) + الوزن
   - أسفل الصورة: السعر ثم الاسم ثم التقييم ثم رابط التفرّع «كل … ‹»
   - ارتفاع البطاقة طبيعي (يتغيّر حسب المحتوى تمامًا كبلينكيت) */
export default function ProductCard({ p, qty, onAdd, onInc, onDec, grid, cardBg, cardBorder }) {
  const style = {};
  if (cardBg) style.background = cardBg;
  if (cardBorder) style.borderColor = cardBorder;
  const price = p.priceIQD;
  const mrp = p.mrpIQD;
  const off = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const oos = p.stock === false;
  const openProduct = () => window.dispatchEvent(new CustomEvent("bk:openProduct", { detail: p.id }));
  return (
    <div className={"bk-pc" + (grid ? " grid" : "") + (oos ? " oos" : "")} style={style}>
      <div className="bk-pc-imgwrap" style={{ background: p.bg, cursor: "pointer" }} onClick={openProduct}>
        {off > 0 && <div className="bk-off">{off}%<br />خصم</div>}
        {oos && <div className="bk-oos-badge">غير متوفر حالياً</div>}
        <div className="bk-veg"><i /></div>
        <div className="bk-pc-img">{p.img ? <img className="ph-img" src={p.img} alt={p.name} loading="lazy" /> : p.e}</div>
        <div className="bk-wtag">{p.weight}</div>
        <div className="bk-addwrap" onClick={(e) => e.stopPropagation()}>
          {qty > 0 ? (
            <div className="bk-step">
              <button onClick={() => onDec(p.id)} aria-label="إنقاص"><Minus size={14} strokeWidth={3} /></button>
              <span className="q">{qty}</span>
              <button onClick={() => onInc(p.id)} aria-label="زيادة"><Plus size={14} strokeWidth={3} /></button>
            </div>
          ) : (
            <button className="bk-add" disabled={oos} style={oos ? { opacity: 0.45, cursor: "not-allowed" } : undefined} onClick={() => !oos && onAdd(p.id)}>أضف</button>
          )}
        </div>
      </div>
      <div className="bk-pc-body">
        <div className="bk-price-row">
          <span className="bk-price">{fmt(price)} {CUR}</span>
          {mrp > price && <span className="bk-mrp">{fmt(mrp)}</span>}
          {off > 0 && <span className="bk-offt">{off}%−</span>}
        </div>
        <div className="bk-pn" onClick={openProduct} style={{ cursor: "pointer" }}>{p.name}</div>
        <div className="bk-rt">
          <span className="b"><Star size={9} fill="#f0a500" stroke="#f0a500" />{p.rating}</span>
          <span className="c">({p.reviews})</span>
        </div>
        {p.sub && (
          <div className="bk-sublink" onClick={() => window.dispatchEvent(new CustomEvent("bk:openList", { detail: p.cat || p.sub }))}>
            كل {p.sub}<ChevronLeft size={13} strokeWidth={2.6} />
          </div>
        )}
      </div>
    </div>
  );
}
