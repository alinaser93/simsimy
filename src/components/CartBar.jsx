import { ChevronLeft } from "lucide-react";
import { fmt, CUR } from "../utils/currency.js";

// شريط السلة العائم — يعرض صوراً دائرية مصغّرة لأحدث المنتجات كما في بلينكيت
export default function CartBar({ count, total, savings, items = [] }) {
  const thumbs = items.slice(0, 3); // أحدث 3 منتجات
  return (
    <div className="bk-cart">
      <div className="l">
        <div className="bk-cart-thumbs">
          {thumbs.map((p, i) => (
            <div className="th" key={p.id} style={{ zIndex: 5 - i, marginLeft: i ? -12 : 0 }}>
              {p.img ? <img src={p.img} alt="" /> : <span>{p.e}</span>}
            </div>
          ))}
        </div>
        <div className="txt">
          <b>{fmt(total)} {CUR}</b>
          <span>{savings > 0 ? `وفّرت ${fmt(savings)} ${CUR}` : `${count} منتج`}</span>
        </div>
      </div>
      <div className="view">عرض السلة <ChevronLeft size={20} strokeWidth={2.6} /></div>
    </div>
  );
}
