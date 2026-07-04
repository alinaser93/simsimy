import React from "react";
import ProductManager from "../components/ProductManager.jsx";
import StoreEditor from "./StoreEditor.jsx";
import { useState } from "react";
import { LayoutDashboard, ShoppingCart, PackageSearch, Wallet, Clock3, CheckCircle2, Store, Hourglass, Trash2, ChevronDown, XCircle, Plus, Minus , Phone, MessageCircle} from "lucide-react";
import { useStore, updateProduct, updateMerchant, setOrderStatus, setMerchantReady, confirmSettlement , removeOrderItem, updateOrderItemQty, rejectOrder } from "../store/appStore.js";
import { merchantDues, merchantInvoices } from "../store/finance.js";
import { fmt, CUR } from "../utils/currency.js";
import { Shell, StatusBadge, Switch, Stat, timeAgo, usePortalPrefs, useOrderAlert } from "../portal/PortalKit.jsx";

const TABS = [
  { id: "dash", l: "اللوحة", Icon: LayoutDashboard },
  { id: "orders", l: "طلباتي", Icon: ShoppingCart },
  { id: "products", l: "منتجاتي", Icon: PackageSearch },
  { id: "wallet", l: "محفظتي", Icon: Wallet },
  { id: "shop", l: "متجري", Icon: Store },
];

export default function MerchantApp() {
  const merchants = useStore((s) => s.merchants);
  const [authId, setAuthId] = useState(() => sessionStorage.getItem("bk-merchant-id") || "");
  const logout = () => { sessionStorage.removeItem("bk-merchant-id"); setAuthId(""); };
  const me = merchants.find((m) => m.id === authId);
  if (!me) return <MerchantLogin merchants={merchants} onOk={(id) => { sessionStorage.setItem("bk-merchant-id", id); setAuthId(id); }} />;
  return <Merchant mid={me.id} onLogout={logout} />;
}

/* دخول مستقل لكل تاجر — كلمة المرور خاصة بمتجره ويديرها الأدمن */
function MerchantLogin({ merchants, onOk }) {
  const [mid, setMid] = useState(merchants[0]?.id || "");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    const m = merchants.find((x) => x.id === mid);
    if (m && pw === m.password) onOk(m.id); else setErr(true);
  };
  return (
    <div className="pt-login">
      <div className="box">
        <div className="lg"><span className="b">ب</span>بوابة التاجر</div>
        <div className="sub">إدارة متجرك وطلباتك ومنتجاتك</div>
        <div className="pt-field">
          <label>متجرك</label>
          <select className="pt-in" style={{ width: "100%" }} value={mid} onChange={(e) => { setMid(e.target.value); setErr(false); }}>
            {merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="pt-field">
          <label>كلمة مرور متجرك</label>
          <input className="pt-in" type="password" value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(false); }}
            onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••" />
        </div>
        {err && <div className="pt-err">كلمة المرور غير صحيحة لهذا المتجر</div>}
        <button className="pt-btn" style={{ width: "100%", marginTop: 6 }} onClick={submit}>دخول</button>
        <div className="demo">🔑 تجريبي — النخيل: <b>1111</b> · بيوتي لاند: <b>2222</b> · تك ستور: <b>3333</b> · مطبعة: <b>4444</b><br />يغيّرها الأدمن من تبويب «التجار»</div>
      </div>
    </div>
  );
}

const mineOrders = (orders, mid) => orders.filter((o) => (o.readiness && o.readiness[mid] !== undefined) || o.merchantId === mid || (o.items || []).some((i) => i.merchantId === mid));

function Merchant({ mid, onLogout }) {
  const [tab, setTab] = useState("dash");
  const merchants = useStore((s) => s.merchants);
  const me = merchants.find((m) => m.id === mid) || merchants[0];
  const outCount = useStore((s) => s.products).filter((p) => p.merchantId === me.id && (p.qty === 0 || (p.qty != null && p.qty <= (p.lowAt || 0)) || (p.qty == null && p.stock === false))).length;
  const tabsWithBadge = TABS.map((t) => (t.id === "products" && outCount > 0 ? { ...t, badge: String(outCount) } : t));
  const prefs = usePortalPrefs("merchant");
  const myCount = mineOrders(useStore((s) => s.orders), mid).length;
  useOrderAlert(myCount, { sound: prefs.sound, notif: prefs.notif, title: "🛒 طلب جديد لمتجرك", body: "لديك طلب جديد — جهّزه للتوصيل" }); // 🔔 نغمة + إشعار
  return (
    <Shell role="التاجر" who={me.name} tabs={tabsWithBadge} tab={tab} setTab={setTab} onLogout={onLogout} prefs={prefs}>
      {tab === "dash" && <Dash mid={me.id} />}
      {tab === "orders" && <Orders mid={me.id} />}
      {tab === "products" && <ProductManager scope="merchant" mid={me.id} />}
      {tab === "wallet" && <MyWallet mid={me.id} />}
      {tab === "shop" && <StoreEditor mid={me.id} prefs={prefs} />}
    </Shell>
  );
}

function Dash({ mid }) {
  const orders = mineOrders(useStore((s) => s.orders), mid);
  const products = useStore((s) => s.products).filter((p) => p.merchantId === mid);
  const revenue = orders.filter((o) => o.status === "تم التوصيل").reduce((a, o) => a + o.subtotal, 0);
  const pending = orders.filter((o) => ["جديد", "قيد التجهيز"].includes(o.status)).length;
  const outOfStock = products.filter((p) => p.qty === 0 || (p.qty == null && p.stock === false));
  const lowStock = products.filter((p) => p.qty != null && p.qty > 0 && p.qty <= (p.lowAt || 0));
  // الأكثر مبيعًا (من الطلبات المُسلَّمة)
  const soldMap = {};
  orders.filter((o) => o.status === "تم التوصيل").forEach((o) => {
    (o.items || []).filter((i) => i.merchantId === mid).forEach((i) => {
      soldMap[i.id] = soldMap[i.id] || { name: i.name, e: i.e, qty: 0, rev: 0 };
      soldMap[i.id].qty += i.qty; soldMap[i.id].rev += i.priceIQD * i.qty;
    });
  });
  const bestSellers = Object.values(soldMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
  return (
    <>
      <div className="pt-h1">لوحة المتجر<small>أداء متجرك اليوم</small></div>
      {(outOfStock.length > 0 || lowStock.length > 0) && (
        <div className="mc-stockalert">
          {outOfStock.length > 0 && <div className="hd">⚠️ {outOfStock.length} {outOfStock.length === 1 ? "منتج نفد" : "منتجات نفدت"} — لا يراها الزبائن الآن</div>}
          {lowStock.length > 0 && <div className="hd low">🔔 {lowStock.length} {lowStock.length === 1 ? "منتج قارب" : "منتجات قاربت"} على النفاد — جدّد المخزون</div>}
          <div className="items">
            {outOfStock.slice(0, 4).map((p) => (
              <div key={p.id} className="it">
                <span className="nm">🔴 {p.e} {p.name}</span>
                <button className="restore" onClick={() => updateProduct(p.id, { qty: p.qty != null ? Math.max(20, p.lowAt ? p.lowAt * 2 : 20) : undefined, stock: true })}>✓ تجديد المخزون</button>
              </div>
            ))}
            {lowStock.slice(0, 4).map((p) => (
              <div key={p.id} className="it">
                <span className="nm">🟡 {p.e} {p.name} <b>({p.qty} متبقٍ)</b></span>
                <button className="restore" onClick={() => updateProduct(p.id, { qty: (p.lowAt || 10) * 3 })}>✓ تجديد المخزون</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="pt-stats">
        <Stat Icon={ShoppingCart} l="طلبات متجري" v={orders.length} />
        <Stat Icon={Wallet} l="إيراد المُسلَّم" v={`${fmt(revenue)} ${CUR}`} />
        <Stat Icon={Clock3} l="بانتظار التجهيز" v={pending} />
        <Stat Icon={PackageSearch} l="منتجاتي" v={products.length} />
        {outOfStock.length > 0 && <Stat Icon={PackageSearch} l="نفدت من المخزون" v={outOfStock.length} />}
      </div>
      {bestSellers.length > 0 && (
        <div className="pt-card">
          <div className="cap">🔥 الأكثر مبيعاً في متجرك</div>
          <div className="bs-list">
            {bestSellers.map((p, i) => (
              <div className="bs-row" key={i}>
                <span className="bs-rank">{i + 1}</span>
                <span className="bs-e">{p.e}</span>
                <span className="bs-nm">{p.name}</span>
                <span className="bs-qty">{p.qty} مبيع</span>
                <span className="bs-rev">{fmt(p.rev)} {CUR}</span>
              </div>
            ))}
          </div>
          <div className="pt-note" style={{ margin: "8px 12px 12px" }}>💡 تأكّد من توفّر هذه المنتجات دائماً — فهي مصدر دخلك الأساسي.</div>
        </div>
      )}
      <div className="pt-card">
        <div className="cap">أحدث طلبات متجري</div>
        <div className="mw-list">
          {orders.slice(0, 6).map((o) => (
            <div className="mw-row" key={o.id}>
              <div className="mw-l">
                <div className="mw-id">#{o.id} <span className="mw-time">{timeAgo(o.time)}</span></div>
                <div className="mw-sub">{o.customer.name}</div>
              </div>
              <div className="mw-r">
                <StatusBadge s={o.status} />
                <div className="mw-amt">{fmt(o.subtotal)} {CUR}</div>
              </div>
            </div>
          ))}
          {orders.length === 0 && <div className="pt-empty">لا توجد طلبات بعد</div>}
        </div>
      </div>
    </>
  );
}

// معلومات المندوب للطلب (للتاجر): الإسناد، الاسم، اتصال/واتساب، حالة الوصول
function CourierInfo({ order }) {
  const couriers = useStore((s) => s.couriers);
  const courier = order.courierId ? couriers.find((c) => c.id === order.courierId) : null;
  if (!courier) {
    return (
      <div className="ci-box pending">
        <span className="ci-ic">🚚</span>
        <div className="ci-tx"><b>لم يُسنَد مندوب بعد</b><small>سيُعيَّن مندوب عند جاهزية الطلب</small></div>
      </div>
    );
  }
  const ph = (courier.phone || "").replace(/\s/g, "");
  // حالة وصول المندوب للمتجر (تقديرياً من الحالة)
  const atStore = ["وصل المندوب"].includes(order.status);
  const onWay = order.status === "في الطريق";
  const statusTxt = order.status === "جاهز للتوصيل" ? "المندوب قادم لاستلام الطلب"
    : onWay ? "🛵 المندوب انطلق للزبون"
    : atStore ? "✅ المندوب استلم الطلب"
    : order.status === "تم التوصيل" ? "✅ تم التوصيل"
    : "المندوب مُسنَد للطلب";
  return (
    <div className="ci-box">
      <div className="ci-head">
        <span className="ci-ic">🛵</span>
        <div className="ci-tx"><b>المندوب: {courier.name}</b><small>{statusTxt}</small></div>
      </div>
      <div className="ci-btns">
        <a className="ord-cbtn call" href={`tel:${ph}`}><Phone size={14} /> اتصال</a>
        <a className="ord-cbtn wa" target="_blank" rel="noreferrer" href={`https://wa.me/964${ph.replace(/^0/, "")}?text=${encodeURIComponent(`مرحباً ${courier.name}، بخصوص الطلب #${order.id}`)}`}><MessageCircle size={14} /> واتساب</a>
      </div>
      {(order.courierLat != null) && (onWay || atStore) && (
        <div className="ci-track">📍 موقع المندوب مُحدَّث لحظياً — <b>{onWay ? "في الطريق للزبون" : "عند المتجر"}</b></div>
      )}
    </div>
  );
}

function Orders({ mid }) {
  const orders = mineOrders(useStore((s) => s.orders), mid);
  const [expanded, setExpanded] = useState(null);
  const canEdit = (o) => ["جديد", "قيد التجهيز"].includes(o.status); // تعديل قبل انطلاق المندوب
  // بوابة الجاهزية: أؤشّر «جاهز» لحصّتي فقط؛ الطلب ينتقل تلقائياً عندما تكتمل كل المتاجر
  const actionFor = (o) => {
    const meReady = o.readiness ? o.readiness[mid] : false;
    if (o.status === "جديد") return { kind: "status", l: "قبول وبدء التجهيز", to: "قيد التجهيز" };
    if (o.status === "قيد التجهيز" && !meReady) return { kind: "ready", l: "منتجاتي جاهزة ✅" };
    if (o.status === "قيد التجهيز" && meReady) return { kind: "waiting" };
    if (o.status === "جاهز للتوصيل" && meReady && (o.merchantCount || 1) === 1)
      return { kind: "unready", l: "إلغاء الجاهزية" };
    return null;
  };
  return (
    <>
      <div className="pt-h1">طلبات متجري<small>اضغط على الطلب لعرضه — اقبله، جهّزه، أو احذف الناقص</small></div>
      <div className="pt-card">
        <div className="cap">قائمة الطلبات ({orders.length})</div>
        <div className="ord-list">
          {orders.map((o) => {
            const n = actionFor(o);
            const myShare = (o.items || []).filter((i) => i.merchantId === mid);
            const isOpen = expanded === o.id;
            const ph = (o.customer.phone || "").replace(/\s/g, "");
            return (
              <div key={o.id} className={"ord-card" + (isOpen ? " open" : "")}>
                <div className="ord-head" onClick={() => setExpanded(isOpen ? null : o.id)}>
                  <div className="ord-l">
                    <div className="ord-id">#{o.id} <span className="ord-time">{timeAgo(o.time)}</span></div>
                    <div className="ord-cust">طلب توصيل{(o.merchantCount || 1) > 1 ? ` · مشترك مع ${o.merchantCount - 1} متجر` : ""}</div>
                    <div className="ord-items-mini">{myShare.map((i, x) => <span key={x}>{i.e}</span>)}</div>
                  </div>
                  <div className="ord-r">
                    <StatusBadge s={o.status} />
                    <div className="ord-total">{fmt(myShare.reduce((a, i) => a + i.priceIQD * i.qty, 0))} {CUR}</div>
                    <ChevronDown size={16} className="ord-chev" style={{ transform: isOpen ? "rotate(180deg)" : "none" }} />
                  </div>
                </div>
                {isOpen && (
                  <div className="ord-body">
                    {/* العنوان فقط — نُخفي اسم/هاتف الزبون حمايةً من سرقة الطلب */}
                    <div className="ord-addr">📍 {o.customer.address}</div>
                    <CourierInfo order={o} />
                    {o.printJob && (
                      <div className="pj-box">
                        <div className="pj-t">🖨️ تفاصيل الطباعة</div>
                        <div className="pj-spec">
                          <span>النوع: <b>{{ docs: "مستندات", photos: "صور", passport: "صور شخصية" }[o.printJob.type] || o.printJob.type}</b></span>
                          {o.printJob.type !== "passport" && <span>اللون: <b>{o.printJob.color === "color" ? "ملوّن" : "أبيض/أسود"}</b></span>}
                          {o.printJob.type !== "passport" && <span>النسخ: <b>{o.printJob.copies}</b></span>}
                          <span>الملفات: <b>{o.printJob.files.length}</b></span>
                        </div>
                        <div className="pj-files">
                          {o.printJob.files.map((f, x) => (
                            <a className="pj-file" key={x} href={f.url || undefined} target="_blank" rel="noreferrer" download={f.name}>
                              {f.isImage && f.url ? <img src={f.url} alt={f.name} /> : <div className="pj-file-doc">📄<span>{(f.name.split(".").pop() || "").toUpperCase()}</span></div>}
                              <span className="pj-file-nm">{f.name}</span>
                            </a>
                          ))}
                        </div>
                        <div className="pj-hint">💡 اطبع الملفات وجهّزها للمندوب. اضغط أي ملف لفتحه/تنزيله.</div>
                      </div>
                    )}
                    {!o.printJob && <div className="ord-sec-t">📦 عناصر طلبك {canEdit(o) ? "— احذف الناقص أو عدّل الكمية" : "(لا يمكن التعديل بعد انطلاق المندوب)"}</div>}
                    {!o.printJob && <div className="mc-items">
                      {myShare.map((i) => (
                        <div className="mc-item" key={i.id}>
                          <span className="e">{i.e}</span>
                          <span className="nm">{i.name}</span>
                          {canEdit(o) ? (
                            <span className="qtybox">
                              <button onClick={() => updateOrderItemQty(o.id, i.id, i.qty - 1)} title="تقليل الكمية"><Minus size={12} /></button>
                              <b>{i.qty}</b>
                            </span>
                          ) : <span className="qty">×{i.qty}</span>}
                          <span className="pr">{fmt(i.priceIQD * i.qty)} {CUR}</span>
                          {canEdit(o) && <button className="rm" title="نفد المنتج — حذف" onClick={() => { if (confirm(`حذف «${i.name}» من الطلب؟ (نفد من المخزون)`)) removeOrderItem(o.id, i.id); }}><Trash2 size={13} /></button>}
                        </div>
                      ))}
                    </div>}
                    {/* إجراء رئيسي */}
                    <div style={{ marginTop: 12 }}>
                      {n?.kind === "status" && <button className="ord-autobtn" onClick={() => setOrderStatus(o.id, n.to)}><CheckCircle2 size={15} style={{ verticalAlign: -3 }} /> {n.l}</button>}
                      {n?.kind === "ready" && <button className="ord-autobtn" onClick={() => setMerchantReady(o.id, mid, true)}>{n.l}</button>}
                      {n?.kind === "unready" && <button className="mc-reject" onClick={() => setMerchantReady(o.id, mid, false)}>{n.l}</button>}
                      {n?.kind === "waiting" && <div className="ord-note" style={{ textAlign: "center" }}><Hourglass size={12} style={{ verticalAlign: -1 }} /> بانتظار المتاجر الأخرى لإكمال تجهيزها</div>}
                    </div>
                    {canEdit(o) && (
                      <button className="mc-reject" style={{ marginTop: 8 }} onClick={() => { if (confirm("رفض الطلب كاملاً؟ سيُلغى ويُخطر الزبون.")) rejectOrder(o.id, "المنتجات غير متوفرة"); }}>
                        <XCircle size={14} /> رفض الطلب كاملاً
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {orders.length === 0 && <div className="pt-empty">لا توجد طلبات بعد</div>}
        </div>
      </div>
    </>
  );
}

/* ---------------- محفظتي: المستحقات والفواتير والتسويات ---------------- */
function MyWallet({ mid }) {
  const state = useStore((s) => s);
  const dues = merchantDues(state, mid);
  const invoices = merchantInvoices(state, mid);
  const myStl = state.settlements.filter((x) => x.kind === "merchant" && x.partyId === mid);
  const awaiting = myStl.filter((x) => x.status !== "مؤكدة");
  const received = myStl.filter((x) => x.status === "مؤكدة").reduce((a, x) => a + x.amount, 0);

  return (
    <>
      <div className="pt-h1">محفظتي<small>مستحقاتك بعد خصم عمولة المنصة — تسوية من الأدمن وتأكيد منك</small></div>
      <div className="pt-stats" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <Stat Icon={Hourglass} l="قيد التحصيل (غير مسوّى)" v={`${fmt(dues.amount)} ${CUR}`} d={`${dues.rows.length} فاتورة`} />
        <Stat Icon={Wallet} l="بانتظار تأكيدك" v={`${fmt(awaiting.reduce((a, x) => a + x.amount, 0))} ${CUR}`} />
        <Stat Icon={CheckCircle2} l="المستلَم" v={`${fmt(received)} ${CUR}`} />
      </div>

      {awaiting.length > 0 && (
        <div className="pt-card">
          <div className="cap">💸 دفعات بانتظار تأكيدك</div>
          <div className="mw-list">
            {awaiting.map((x) => (
              <div className="mw-pay" key={x.id}>
                <div className="mw-pay-top">
                  <div><div className="mw-amt-big">{fmt(x.amount)} {CUR}</div><div className="mw-sub">{(x.orders || []).length} طلبات · {timeAgo(x.time)} · رقم {x.id.slice(-5)}</div></div>
                  <button className="pt-btn sm" onClick={() => confirmSettlement(x.id)}>استلمتها ✓</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-card">
        <div className="cap">🧾 سجل الفواتير (لكل طلب مُسلَّم)</div>
        <div className="mw-list">
          {invoices.map((r) => (
            <div className="mw-inv" key={r.id}>
              <div className="mw-inv-head">
                <b>#{r.id}</b>
                <span className={"pt-badge " + (r.settled ? "pt-b-done" : "pt-b-prep")}>{r.settled ? "مسوّاة" : "قيد التحصيل"}</span>
                <span className="mw-time">{timeAgo(r.time)}</span>
              </div>
              <div className="mw-inv-nums">
                <span>بضاعتي<b>{fmt(r.goods)}</b></span>
                <span>العمولة<b style={{ color: "#b3261e" }}>− {fmt(r.commission)}</b></span>
                <span>صافي مستحقي<b style={{ color: "#0C831F" }}>{fmt(r.due)} {CUR}</b></span>
              </div>
            </div>
          ))}
          {invoices.length === 0 && <div className="pt-empty">لا فواتير بعد — تُنشأ تلقائياً عند تسليم الطلبات</div>}
        </div>
      </div>
    </>
  );
}
