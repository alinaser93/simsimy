import { useState, useRef } from "react";
import { Star, Plus, Minus, ChevronLeft } from "lucide-react";
import { fmt, CUR } from "../utils/currency.js";
import SmartImg from "./SmartImg.jsx";

// خلفية موحّدة لكل بطاقات المنتجات — أزرق فاتح ناعم بأسلوب بلينكيت
export const PROD_BG = "#EFF3FA";

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
  const nOpts = (p.variants || []).length;
  const imgs = (p.images && p.images.length ? p.images : (p.img ? [p.img] : [])).slice(0, 5);
  const [ci, setCi] = useState(0);
  const drag = useRef({ x: 0, dx: 0, moved: false });
  const openProduct = () => window.dispatchEvent(new CustomEvent("bk:openProduct", { detail: p.id }));
  const startDrag = (x) => { drag.current = { x, dx: 0, moved: false }; };
  const moveDrag = (x) => { drag.current.dx = x - drag.current.x; if (Math.abs(drag.current.dx) > 6) drag.current.moved = true; };
  const endDrag = () => {
    const { dx, moved } = drag.current;
    if (imgs.length > 1 && Math.abs(dx) > 30) {
      if (dx < 0) setCi((i) => (i + 1) % imgs.length);
      else setCi((i) => (i - 1 + imgs.length) % imgs.length);
    }
    return moved; // إن تحرّك فهو سحب لا نقر
  };
  const onCardTap = () => { if (!drag.current.moved) openProduct(); };
  return (
    <div className={"bk-pc" + (grid ? " grid" : "") + (oos ? " oos" : "")} style={style}>
      <div className="bk-pc-imgwrap" style={{ background: PROD_BG }}
        onClick={onCardTap}
        onTouchStart={(e) => startDrag(e.touches[0].clientX)}
        onTouchMove={(e) => { moveDrag(e.touches[0].clientX); if (Math.abs(drag.current.dx) > 8 && imgs.length > 1) e.preventDefault(); }}
        onTouchEnd={endDrag}
        onMouseDown={(e) => startDrag(e.clientX)}
        onMouseMove={(e) => { if (e.buttons === 1) moveDrag(e.clientX); }}
        onMouseUp={endDrag}>
        <div className="bk-pc-slider">
          {imgs.length > 0 ? (
            <div className="bk-pc-track" style={{ transform: `translateX(${ci * 100}%)` }}>
              {imgs.map((u, i) => (
                <div className="bk-pc-slide" key={i}>
                  <SmartImg src={u} emoji={p.e} alt={p.name} />
                </div>
              ))}
            </div>
          ) : <div className="bk-pc-img">{p.e}</div>}
        </div>
        {off > 0 && <div className="bk-off">{off}%<br />خصم</div>}
        {oos && <div className="bk-oos-badge">غير متوفر حالياً</div>}
        {p.badge && <div className="bk-pbadge">{p.badge}</div>}
        <div className="bk-veg"><i /></div>
        {imgs.length > 1 && <div className="bk-imgdots">{imgs.map((_, i) => <i key={i} className={i === ci ? "on" : ""} onClick={(e) => { e.stopPropagation(); setCi(i); }} />)}</div>}
        <div className="bk-addwrap" onClick={(e) => e.stopPropagation()}>
          {qty > 0 ? (
            <div className="bk-step">
              <button onClick={() => onDec(p.id)} aria-label="إنقاص"><Minus size={14} strokeWidth={3} /></button>
              <span className="q">{qty}</span>
              <button onClick={() => onInc(p.id)} aria-label="زيادة"><Plus size={14} strokeWidth={3} /></button>
            </div>
          ) : (
            nOpts > 0 ? (
              <button className="bk-add opts" onClick={openProduct}>أضف<small>{nOpts} خيارات</small></button>
            ) : (
              <button className="bk-add" disabled={oos} style={oos ? { opacity: 0.45, cursor: "not-allowed" } : undefined} onClick={() => !oos && onAdd(p.id)}>أضف</button>
            )
          )}
        </div>
      </div>
      <div className="bk-pc-body">
        {p.weight && <div className="bk-wt-inline">{p.weight}</div>}
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
