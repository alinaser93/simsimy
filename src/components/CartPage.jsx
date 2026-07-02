import { useState } from "react";
import { ChevronRight, ChevronLeft, Share2, Minus, Plus } from "lucide-react";
import { useStore } from "../store/appStore.js";
import { fmt, CUR } from "../utils/currency.js";
import ProductRow from "./ProductRow.jsx";

/* صفحة السلة الكاملة — مطابقة لتدفق التطبيق الأصلي */
export default function CartPage({ cart, add, inc, dec, onBack, onChangeAddress, onPay }) {
  const products = useStore((s) => s.products);
  const settings = useStore((s) => s.settings);
  const addresses = useStore((s) => s.addresses);
  const selected = useStore((s) => s.selectedAddress);
  const addr = addresses.find((a) => a.id === selected) || addresses[0];

  const [tip, setTip] = useState(0);
  const [notes, setNotes] = useState([]);
  const NOTE_OPTS = ["لا تتصل بي", "اترك الطلب عند الباب", "لا تقرع الجرس"];
  const toggleNote = (n) => setNotes((x) => (x.includes(n) ? x.filter((y) => y !== n) : [...x, n]));

  const items = Object.entries(cart)
    .map(([id, qty]) => { const p = products.find((x) => x.id === +id); return p ? { ...p, qty } : null; })
    .filter(Boolean);
  const subtotal = items.reduce((a, i) => a + i.priceIQD * i.qty, 0);
  const savings = items.reduce((a, i) => a + (i.mrpIQD - i.priceIQD) * i.qty, 0);
  const free = subtotal >= settings.freeAbove;
  const fee = free ? 0 : settings.deliveryFee;
  const total = subtotal + fee + settings.serviceFee + tip;
  const merchants = new Set(items.map((i) => i.merchantId)).size;
  const missed = products.filter((p) => !cart[p.id] && p.stock !== false).slice(0, 6).map((p) => p.id);

  return (
    <div className="bk-page">
      <div className="bk-phead">
        <div className="bk-back" onClick={onBack}><ChevronRight size={22} strokeWidth={2.5} /></div>
        <div className="ti">السلة<small>{items.length} منتج · شحنة خلال {settings.eta} دقيقة</small></div>
        <Share2 size={19} color="#4a4a4a" />
      </div>

      <div className="bk-pbody">
        <div className="bk-eta-banner">
          <span className="e">⚡</span>
          <div>التوصيل خلال {settings.eta} دقيقة<small>شحنة من {items.length} عناصر</small></div>
        </div>
        {merchants > 1 && <div className="bk-multi">📦 توقّع أكثر من تسليم — عناصر طلبك من {merchants} متاجر مختلفة</div>}

        <div className="bk-cardbox">
          {items.map((i) => (
            <div className="bk-crow" key={i.id}>
              <div className="im">{i.img ? <img src={i.img} alt="" /> : i.e}</div>
              <div className="inf">
                <div className="nm">{i.name}</div>
                <div className="wt">{i.weight}</div>
                <div className="mv">نقل إلى المفضلة</div>
              </div>
              <div className="bk-step" style={{ minWidth: 78, height: 30 }}>
                <button onClick={() => dec(i.id)}><Minus size={13} strokeWidth={3} /></button>
                <span className="q">{i.qty}</span>
                <button onClick={() => inc(i.id)}><Plus size={13} strokeWidth={3} /></button>
              </div>
              <div className="pr">{fmt(i.priceIQD * i.qty)}</div>
            </div>
          ))}
          {items.length === 0 && <div className="pt-empty">سلتك فارغة — أضف بعض المنتجات 🧺</div>}
        </div>

        {missed.length > 0 && (
          <div className="bk-cardbox" style={{ paddingBottom: 4 }}>
            <ProductRow title="ربما فاتك" ids={missed} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => {}} />
          </div>
        )}

        <div className="bk-cardbox">
          <div className="cap">تفاصيل الفاتورة</div>
          <div className="bk-bill2">
            <div className="r"><span>قيمة المنتجات</span><b>{fmt(subtotal)} {CUR}</b></div>
            <div className="r"><span>رسوم التوصيل</span>
              {free
                ? <b className="free">مجاني<span className="strike">{fmt(settings.deliveryFee)}</span></b>
                : <b>{fmt(fee)} {CUR}</b>}
            </div>
            <div className="r"><span>رسوم الخدمة</span><b>{fmt(settings.serviceFee)} {CUR}</b></div>
            {tip > 0 && <div className="r"><span>بقشيش المندوب</span><b>{fmt(tip)} {CUR}</b></div>}
            <div className="r tot"><span>الإجمالي الكلي</span><span>{fmt(total)} {CUR}</span></div>
          </div>
          {(savings > 0 || free) && (
            <div className="bk-save-strip">🎉 وفّرت {fmt(savings + (free ? settings.deliveryFee : 0))} {CUR}{free ? " — منها توصيل مجاني" : ""}</div>
          )}
        </div>

        <div className="bk-cardbox">
          <div className="cap">تعليمات التوصيل</div>
          <div className="bk-chips">
            {NOTE_OPTS.map((n) => (
              <span key={n} className={"bk-chip" + (notes.includes(n) ? " on" : "")} onClick={() => toggleNote(n)}>
                {n === NOTE_OPTS[0] ? "📵" : n === NOTE_OPTS[1] ? "🚪" : "🔕"} {n}
              </span>
            ))}
          </div>
        </div>

        <div className="bk-cardbox">
          <div className="cap">أكرم مندوبك 🤝</div>
          <div className="bk-chips">
            {(settings.tipOptions || [250, 500, 1000]).map((t) => (
              <span key={t} className={"bk-chip" + (tip === t ? " on" : "")} onClick={() => setTip(tip === t ? 0 : t)}>
                {fmt(t)} {CUR}
              </span>
            ))}
          </div>
          <div className="bk-tip-note">لطفك يعني الكثير! يذهب البقشيش كاملاً للمندوب مباشرة.</div>
        </div>

        <div className="bk-cardbox">
          <div className="bk-addr">
            <span className="e">📍</span>
            <div className="inf">
              <div className="l">التوصيل إلى {addr?.label}</div>
              <div className="d">{addr?.details}</div>
            </div>
            <span className="ch" onClick={onChangeAddress}>تغيير</span>
          </div>
        </div>
        <div style={{ height: 10 }} />
      </div>

      <div className="bk-pfoot">
        <div className={"bk-paybtn" + (items.length === 0 || !settings.storeOpen ? " dis" : "")}
          style={items.length === 0 || !settings.storeOpen ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          onClick={() => items.length > 0 && settings.storeOpen && onPay({ items: items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, priceIQD: i.priceIQD, e: i.e, img: i.img })), tip, note: notes.join("، ") })}>
          <div>{fmt(total)} {CUR}<small>الإجمالي شامل الرسوم</small></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>{settings.storeOpen ? "اختر طريقة الدفع" : "المتجر مغلق"} <ChevronLeft size={18} strokeWidth={2.6} /></div>
        </div>
      </div>
    </div>
  );
}
