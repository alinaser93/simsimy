import { ChevronRight, Phone } from "lucide-react";
import { useStore, cancelOrder } from "../store/appStore.js";
import { fmt, CUR } from "../utils/currency.js";
import { timeAgo } from "../portal/PortalKit.jsx";

const FLOW = ["جديد", "قيد التجهيز", "في الطريق", "وصل المندوب", "تم التوصيل"];
const STEP_INFO = {
  "جديد": ["استلمنا طلبك 🎉", "المتجر يراجع الطلب الآن"],
  "قيد التجهيز": ["يتم تجهيز طلبك 👨‍🍳", "نغلّف منتجاتك بعناية"],
  "في الطريق": ["المندوب في الطريق 🛵", "اقترب من عنوانك"],
  "وصل المندوب": ["المندوب عند بابك 🚪", "افتح الباب واستلم طلبك"],
  "تم التوصيل": ["تم التوصيل بنجاح ✅", "بالعافية! نراك في الطلب القادم"],
};

/* تتبّع الطلب الحي — الحالة تتحدث لحظياً مع إجراءات التاجر والمندوب */
export default function TrackingPage({ orderId, onBack }) {
  const order = useStore((s) => s.orders.find((o) => o.id === orderId));
  const couriers = useStore((s) => s.couriers);
  const appearance = useStore((s) => s.appearance);
  const eta = useStore((s) => s.settings.eta);
  if (!order) return null;

  const cancelled = order.status === "ملغي";
  const stage = cancelled ? -1 : Math.max(0, FLOW.indexOf(order.status === "جاهز للتوصيل" ? "قيد التجهيز" : order.status));
  const courier = couriers.find((c) => c.id === order.courierId);
  const done = order.status === "تم التوصيل";

  return (
    <div className="bk-page">
      <div className="bk-trk-head" style={{ background: `linear-gradient(160deg, ${appearance.green}, #063d10)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="bk-back" style={{ background: "rgba(255,255,255,.18)" }} onClick={onBack}>
            <ChevronRight size={22} strokeWidth={2.5} color="#fff" />
          </div>
          <div>
            <div className="big">
              {cancelled ? "تم إلغاء الطلب" : done ? "وصل طلبك 🎉" : `يصل خلال ~${eta} دقيقة`}
            </div>
            <div className="sub">طلب #{order.id} · {timeAgo(order.time)} · {order.payMethod}</div>
          </div>
        </div>
      </div>

      <div className="bk-pbody" style={{ background: "#f7f7f9" }}>
        {!cancelled && (
          <div className="bk-map">
            <div className="road" />
            <span className="store">🏪</span>
            <span className="home">🏠</span>
            {order.status === "في الطريق" && <span className="bike">🛵</span>}
            {done && <span style={{ position: "absolute", top: "20%", left: "9%", fontSize: 20 }}>✅</span>}
          </div>
        )}

        <div className="bk-steps">
          {cancelled ? (
            <div className="bk-tstep cancel">
              <span className="dot">✕</span>
              <div className="inf"><b>تم إلغاء الطلب</b><span>أُعيد المبلغ إن كان مدفوعاً مسبقاً</span></div>
            </div>
          ) : FLOW.map((st, i) => (
            <div key={st} className={"bk-tstep" + (i <= stage ? " done" : "")}>
              <span className="dot">{i <= stage ? "✓" : ""}</span>
              <div className="inf"><b>{STEP_INFO[st][0]}</b><span>{STEP_INFO[st][1]}</span></div>
            </div>
          ))}
        </div>

        {courier && !cancelled && (
          <div className="bk-courier">
            <span className="av">🧑‍✈️</span>
            <div className="inf">
              <b>{courier.name}</b>
              <span>مندوب التوصيل{order.tip > 0 ? ` · بقشيشك ${fmt(order.tip)} ${CUR} 💚` : ""}</span>
            </div>
            <a className="bk-call" href={`tel:${courier.phone.replace(/\s/g, "")}`}><Phone size={17} /></a>
          </div>
        )}

        <div className="bk-cardbox">
          <div className="cap">ملخص الطلب</div>
          {order.items.map((i, x) => (
            <div className="bk-crow" key={x}>
              <div className="im">{i.img ? <img src={i.img} alt="" /> : i.e}</div>
              <div className="inf"><div className="nm">{i.name}</div><div className="wt">الكمية: {i.qty}</div></div>
              <div className="pr">{fmt(i.priceIQD * i.qty)}</div>
            </div>
          ))}
          <div className="bk-bill2">
            <div className="r"><span>قيمة المنتجات</span><b>{fmt(order.subtotal)} {CUR}</b></div>
            <div className="r"><span>التوصيل</span>{order.fee === 0 ? <b className="free">مجاني</b> : <b>{fmt(order.fee)} {CUR}</b>}</div>
            {order.serviceFee > 0 && <div className="r"><span>رسوم الخدمة</span><b>{fmt(order.serviceFee)} {CUR}</b></div>}
            {order.tip > 0 && <div className="r"><span>بقشيش المندوب</span><b>{fmt(order.tip)} {CUR}</b></div>}
            <div className="r tot"><span>الإجمالي</span><span>{fmt(order.total)} {CUR}</span></div>
          </div>
          {order.note && <div className="bk-save-strip">📝 تعليماتك: {order.note}</div>}
        </div>

        {order.status === "جديد" && (
          <div className="bk-cancel-link" onClick={() => cancelOrder(order.id)}>إلغاء الطلب</div>
        )}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}
