import { useState } from "react";
import { ChevronRight, CreditCard, Tag, X } from "lucide-react";
import { useStore, placeOrder, updateOrderLocation, validateCoupon, redeemPoints, POINT_VALUE } from "../store/appStore.js";
import { fmt, CUR } from "../utils/currency.js";
import { getCurrentLocation } from "../utils/geo.js";

/* صفحة اختيار طريقة الدفع — مطابقة للتدفق الأصلي (بطاقات/محافظ/نقداً) */
export default function PaymentPage({ pending, onBack, onPlaced }) {
  const settings = useStore((s) => s.settings);
  const [method, setMethod] = useState("نقداً عند الاستلام");
  const [placing, setPlacing] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [codeErr, setCodeErr] = useState("");
  const userPoints = useStore((s) => s.user.points) || 0;
  const [usePoints, setUsePoints] = useState(false);

  const subtotal = pending.items.reduce((a, i) => a + i.priceIQD * i.qty, 0);
  const fee = subtotal >= settings.freeAbove ? 0 : settings.deliveryFee;
  const couponDisc = coupon ? coupon.discount : 0;
  const preTotal = subtotal + fee + settings.serviceFee + (pending.tip || 0) - couponDisc;
  const maxPointsDisc = Math.min(userPoints * POINT_VALUE, Math.max(0, preTotal)); // لا يتجاوز الإجمالي
  const pointsToUse = usePoints ? Math.floor(maxPointsDisc / POINT_VALUE) : 0;
  const pointsDisc = pointsToUse * POINT_VALUE;
  const discount = couponDisc + pointsDisc;
  const total = Math.max(0, preTotal - pointsDisc);

  const applyCode = () => {
    setCodeErr("");
    const res = validateCoupon(codeInput, subtotal);
    if (res.ok) { setCoupon({ code: res.coupon.code, discount: res.discount }); setCodeInput(""); }
    else { setCodeErr(res.error); setCoupon(null); }
  };

  const confirm = async () => {
    setPlacing(true);
    // التقط موقع الزبون الحقيقي بالGPS (لتوصيل دقيق)
    let coords = null;
    try { const loc = await getCurrentLocation(); coords = { lat: loc.lat, lng: loc.lng }; } catch { /* سيُستخدم موقع العنوان */ }
    if (pointsToUse > 0) redeemPoints(pointsToUse);
    const order = placeOrder(pending.items, { tip: pending.tip, note: pending.note, payMethod: method, discount, couponCode: coupon?.code });
    if (coords) updateOrderLocation(order.id, coords); // استبدل بالموقع الحقيقي
    setPlacing(false);
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

        {/* كود الخصم */}
        <div className="bk-pay-sec">
          <div className="cap">🏷️ كود الخصم</div>
          {coupon ? (
            <div className="bk-coupon-applied">
              <Tag size={16} />
              <span className="cc">كود <b>{coupon.code}</b> — وفّرت {fmt(coupon.discount)} {CUR}</span>
              <button className="cx" onClick={() => setCoupon(null)}><X size={15} /></button>
            </div>
          ) : (
            <div className="bk-coupon-box">
              <input className="bk-coupon-in" placeholder="أدخل كود الخصم" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} />
              <button className="bk-coupon-btn" disabled={!codeInput.trim()} onClick={applyCode}>تطبيق</button>
            </div>
          )}
          {codeErr && <div className="bk-coupon-err">⚠️ {codeErr}</div>}
        </div>

        {userPoints > 0 && (
          <div className="bk-pay-sec">
            <div className="cap">🎁 نقاط الولاء</div>
            <div className={"bk-points-toggle" + (usePoints ? " on" : "")} onClick={() => setUsePoints(!usePoints)}>
              <span className="bk-pt-ic">🎁</span>
              <div className="bk-pt-inf">
                <b>استخدم نقاطك ({userPoints} نقطة)</b>
                <small>{usePoints ? `خصم ${fmt(pointsDisc)} ${CUR} — تُستخدم ${pointsToUse} نقطة` : `متاح خصم حتى ${fmt(Math.floor(maxPointsDisc))} ${CUR}`}</small>
              </div>
              <span className={"bk-pt-check" + (usePoints ? " on" : "")}>{usePoints ? "✓" : ""}</span>
            </div>
          </div>
        )}

        {/* ملخص المبلغ */}
        <div className="bk-pay-summary">
          <div className="r"><span>قيمة المنتجات</span><b>{fmt(subtotal)} {CUR}</b></div>
          <div className="r"><span>التوصيل</span><b>{fee === 0 ? "مجاني 🎁" : `${fmt(fee)} ${CUR}`}</b></div>
          {settings.serviceFee > 0 && <div className="r"><span>رسوم الخدمة</span><b>{fmt(settings.serviceFee)} {CUR}</b></div>}
          {(pending.tip || 0) > 0 && <div className="r"><span>بقشيش المندوب</span><b>{fmt(pending.tip)} {CUR}</b></div>}
          {couponDisc > 0 && <div className="r disc"><span>خصم ({coupon.code})</span><b>− {fmt(couponDisc)} {CUR}</b></div>}
          {pointsDisc > 0 && <div className="r disc"><span>خصم النقاط ({pointsToUse} نقطة)</span><b>− {fmt(pointsDisc)} {CUR}</b></div>}
          <div className="r tot"><span>الإجمالي</span><span>{fmt(total)} {CUR}</span></div>
        </div>
        <div style={{ height: 10 }} />
      </div>

      <div className="bk-pfoot">
        <div className={"bk-paybtn" + (placing ? " dis" : "")} onClick={() => !placing && confirm()}>
          <div>{fmt(total)} {CUR}<small>{method}</small></div>
          <div>{placing ? "جارٍ تحديد موقعك…" : "تأكيد الطلب ✓"}</div>
        </div>
      </div>
    </div>
  );
}
