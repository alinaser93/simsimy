import { useState } from "react";
import { ChevronRight, CreditCard } from "lucide-react";
import { useStore, placeOrder } from "../store/appStore.js";
import { fmt, CUR } from "../utils/currency.js";

/* صفحة اختيار طريقة الدفع — مطابقة للتدفق الأصلي (بطاقات/محافظ/نقداً) */
export default function PaymentPage({ pending, onBack, onPlaced }) {
  const settings = useStore((s) => s.settings);
  const [method, setMethod] = useState("نقداً عند الاستلام");

  const subtotal = pending.items.reduce((a, i) => a + i.priceIQD * i.qty, 0);
  const fee = subtotal >= settings.freeAbove ? 0 : settings.deliveryFee;
  const total = subtotal + fee + settings.serviceFee + (pending.tip || 0);

  const confirm = () => {
    const order = placeOrder(pending.items, { tip: pending.tip, note: pending.note, payMethod: method });
    onPlaced(order);
  };

  const Row = ({ e, title, sub, value, disabled }) => (
    <div className={"bk-pay-row" + (method === value ? " on" : "") + (disabled ? " dis" : "")}
      onClick={() => !disabled && setMethod(value)}>
      <span className="e">{e}</span>
      <div className="inf"><b>{title}</b><span>{sub}</span></div>
      <span className="bk-radio" />
    </div>
  );

  return (
    <div className="bk-page">
      <div className="bk-phead">
        <div className="bk-back" onClick={onBack}><ChevronRight size={22} strokeWidth={2.5} /></div>
        <div className="ti">الدفع<small>الفاتورة: {fmt(total)} {CUR}</small></div>
      </div>

      <div className="bk-pbody">
        <div className="bk-pay-sec">
          <div className="cap">البطاقات</div>
          <div className="bk-pay-row dis">
            <span className="e"><CreditCard size={20} /></span>
            <div className="inf"><b>إضافة بطاقة ائتمان أو دفع</b><span>قريباً — سيتوفر مع الربط البنكي</span></div>
            <span style={{ fontSize: 11.5, fontWeight: 900, color: "#0C831F" }}>إضافة</span>
          </div>
        </div>

        <div className="bk-pay-sec">
          <div className="cap">المحافظ الإلكترونية</div>
          <Row e="💳" title="زين كاش" sub="ادفع من رصيد محفظتك" value="زين كاش" />
          <Row e="📱" title="آسيا حوالة" sub="تحويل فوري وآمن" value="آسيا حوالة" />
        </div>

        <div className="bk-pay-sec">
          <div className="cap">الدفع عند الاستلام</div>
          <Row e="💵" title="نقداً عند الاستلام" sub="ادفع للمندوب عند وصول طلبك (مستحسن)" value="نقداً عند الاستلام" />
        </div>
        <div style={{ height: 10 }} />
      </div>

      <div className="bk-pfoot">
        <div className="bk-paybtn" onClick={confirm}>
          <div>{fmt(total)} {CUR}<small>{method}</small></div>
          <div>تأكيد الطلب ✓</div>
        </div>
      </div>
    </div>
  );
}
