import { ChevronRight, RotateCcw } from "lucide-react";
import SmartImg from "./SmartImg.jsx";
import { useStore } from "../store/appStore.js";
import { fmt, CUR } from "../utils/currency.js";
import { timeAgo } from "../portal/PortalKit.jsx";

const BADGE = {
  "جديد": ["#E8F0FE", "#1a56b0"], "قيد التجهيز": ["#FFF4D6", "#8a6400"],
  "جاهز للتوصيل": ["#EDE7F8", "#5b3ba5"], "في الطريق": ["#E0F2F1", "#00695c"], "وصل المندوب": ["#DFF3FF", "#0b6aa8"],
  "تم التوصيل": ["#E8F4EA", "#0C831F"], "ملغي": ["#FDE9E7", "#b3261e"],
};

/* طلباتي — تفتح تتبّع أي طلب + إعادة الطلب بضغطة */
export default function OrdersPage({ onBack, onOpen, onReorder, add, cart, inc, dec }) {
  const orders = useStore((s) => s.orders).filter((o) => o.mine);
  const products = useStore((s) => s.products);

  // المنتجات الأكثر شراءً (كروس) — تُحسب من طلبات الزبون السابقة
  const freqMap = {};
  orders.forEach((o) => (o.items || []).forEach((i) => { freqMap[i.id] = (freqMap[i.id] || 0) + i.qty; }));
  const frequent = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => products.find((p) => p.id === +id))
    .filter((p) => p && p.stock !== false && p.qty !== 0)
    .slice(0, 10);
  return (
    <div className="bk-page">
      <div className="bk-phead">
        <div className="bk-back" onClick={onBack}><ChevronRight size={22} strokeWidth={2.5} /></div>
        <div className="ti">طلباتي<small>اضغط أي طلب لتتبّعه لحظياً</small></div>
      </div>
      <div className="bk-pbody">
        {frequent.length > 0 && (
          <div className="bk-freq">
            <div className="bk-freq-t">🔁 اشتريتها من قبل — أضِفها بسرعة</div>
            <div className="bk-freq-row">
              {frequent.map((p) => {
                const qty = cart?.[p.id] || 0;
                return (
                  <div className="bk-freq-card" key={p.id}>
                    <div className="bk-freq-img" style={{ background: p.bg || "#f5f5f5" }}>
                      <SmartImg src={p.img || (p.images && p.images[0])} emoji={p.e} className="" emojiClass="e" />
                    </div>
                    <div className="bk-freq-nm">{p.name}</div>
                    <div className="bk-freq-pr">{fmt(p.priceIQD)} {CUR}</div>
                    {qty === 0 ? (
                      <button className="bk-freq-add" onClick={() => add && add(p.id)}>+ إضافة</button>
                    ) : (
                      <div className="bk-freq-qty">
                        <button onClick={() => dec && dec(p.id)}>−</button><b>{qty}</b><button onClick={() => inc && inc(p.id)}>+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {orders.length > 0 && <div className="bk-freq-divider">طلباتك السابقة</div>}
        {orders.map((o) => {
          const [bg, fg] = BADGE[o.status] || BADGE["جديد"];
          return (
            <div className="bk-ord" key={o.id} onClick={() => onOpen(o.id)}>
              <div className="top">
                <b>طلب #{o.id}</b>
                <span className="st" style={{ background: bg, color: fg }}>{o.status}</span>
              </div>
              <div className="items">{o.items.slice(0, 6).map((i, x) => <span key={x}>{i.e}</span>)}</div>
              <div className="meta"><span>{o.items.length} عنصر · {o.payMethod}</span><span>{fmt(o.total)} {CUR} · {timeAgo(o.time)}</span></div>
              <span className="bk-reorder" onClick={(e) => { e.stopPropagation(); onReorder(o); }}>
                <RotateCcw size={12} strokeWidth={2.6} /> اطلب مجدداً
              </span>
            </div>
          );
        })}
        {orders.length === 0 && (
          <div className="bk-noresult"><div className="e">🧾</div>لا توجد طلبات بعد — اطلب أول مرة وستظهر هنا</div>
        )}
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}
