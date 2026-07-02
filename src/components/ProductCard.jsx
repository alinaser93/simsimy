import { Clock, Star, Plus, Minus } from "lucide-react";
import { fmt, CUR } from "../utils/currency.js";

export default function ProductCard({ p, qty, onAdd, onInc, onDec, grid, cardBg, cardBorder }) {
  const style = {};
  if (cardBg) style.background = cardBg;
  if (cardBorder) style.borderColor = cardBorder;
  const price = p.priceIQD;
  const mrp = p.mrpIQD;
  const off = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const oos = p.stock === false;
  return (
    <div className={"bk-pc" + (grid ? " grid" : "") + (oos ? " oos" : "")} style={style}>
      <div className="bk-pc-imgwrap" style={{ background: p.bg, cursor: "pointer" }}
        onClick={() => window.dispatchEvent(new CustomEvent("bk:openProduct", { detail: p.id }))}>
        {off > 0 && <div className="bk-off">{off}%<br />خصم</div>}
        {oos && <div className="bk-oos-badge">غير متوفر حالياً</div>}
        <div className="bk-veg"><i /></div>
        <div className="bk-pc-img">{p.img ? <img className="ph-img" src={p.img} alt={p.name} loading="lazy" /> : p.e}</div>
        <div className="bk-eta"><Clock size={10} strokeWidth={2.5} />{p.eta}</div>
      </div>
      <div className="bk-pc-body">
        <div className="bk-w">{p.weight}</div>
        <div className="bk-pn">{p.name}</div>
        <div className="bk-rt">
          <span className="b"><Star size={10} fill="#f0a500" stroke="#f0a500" />{p.rating}</span>
          <span className="c">({p.reviews})</span>
        </div>
        <div className="bk-foot">
          <div>
            <div className="bk-price">{fmt(price)} {CUR}{mrp > price && <span className="bk-mrp">{fmt(mrp)}</span>}</div>
            {off > 0 && <div className="bk-offt">خصم {off}%</div>}
          </div>
          {qty > 0 ? (
            <div className="bk-step">
              <button onClick={() => onDec(p.id)} aria-label="إنقاص"><Minus size={15} strokeWidth={3} /></button>
              <span className="q">{qty}</span>
              <button onClick={() => onInc(p.id)} aria-label="زيادة"><Plus size={15} strokeWidth={3} /></button>
            </div>
          ) : (
            <button className="bk-add" disabled={oos} style={oos ? { opacity: 0.45, cursor: "not-allowed" } : undefined} onClick={() => !oos && onAdd(p.id)}>أضف</button>
          )}
        </div>
      </div>
    </div>
  );
}
