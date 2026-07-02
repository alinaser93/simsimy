import { useState } from "react";
import { LayoutDashboard, ShoppingCart, PackageSearch, Wallet, Clock3, CheckCircle2, Store, Hourglass } from "lucide-react";
import { useStore, updateProduct, updateMerchant, setOrderStatus, setMerchantReady, confirmSettlement } from "../store/appStore.js";
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
        <div className="demo">🔑 تجريبي — النخيل: <b>1111</b> · بيوتي لاند: <b>2222</b> · تك ستور: <b>3333</b><br />يغيّرها الأدمن من تبويب «التجار»</div>
      </div>
    </div>
  );
}

const mineOrders = (orders, mid) => orders.filter((o) => (o.readiness && o.readiness[mid] !== undefined) || o.merchantId === mid || (o.items || []).some((i) => i.merchantId === mid));

function Merchant({ mid, onLogout }) {
  const [tab, setTab] = useState("dash");
  const merchants = useStore((s) => s.merchants);
  const me = merchants.find((m) => m.id === mid) || merchants[0];
  const prefs = usePortalPrefs("merchant");
  const myCount = mineOrders(useStore((s) => s.orders), mid).length;
  useOrderAlert(myCount, prefs.sound); // 🔔 طلب جديد لمتجري
  return (
    <Shell role="التاجر" who={me.name} tabs={TABS} tab={tab} setTab={setTab} onLogout={onLogout} prefs={prefs}>
      {tab === "dash" && <Dash mid={me.id} />}
      {tab === "orders" && <Orders mid={me.id} />}
      {tab === "products" && <Products mid={me.id} />}
      {tab === "wallet" && <MyWallet mid={me.id} />}
      {tab === "shop" && <MyShop mid={me.id} />}
    </Shell>
  );
}

function Dash({ mid }) {
  const orders = mineOrders(useStore((s) => s.orders), mid);
  const products = useStore((s) => s.products).filter((p) => p.merchantId === mid);
  const revenue = orders.filter((o) => o.status === "تم التوصيل").reduce((a, o) => a + o.subtotal, 0);
  const pending = orders.filter((o) => ["جديد", "قيد التجهيز"].includes(o.status)).length;
  return (
    <>
      <div className="pt-h1">لوحة المتجر<small>أداء متجرك اليوم</small></div>
      <div className="pt-stats">
        <Stat Icon={ShoppingCart} l="طلبات متجري" v={orders.length} />
        <Stat Icon={Wallet} l="إيراد المُسلَّم" v={`${fmt(revenue)} ${CUR}`} />
        <Stat Icon={Clock3} l="بانتظار التجهيز" v={pending} />
        <Stat Icon={PackageSearch} l="منتجاتي" v={products.length} />
      </div>
      <div className="pt-card">
        <div className="cap">أحدث طلبات متجري</div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>رقم</th><th>الزبون</th><th>الحالة</th><th>قيمة السلة</th><th>الوقت</th></tr></thead>
            <tbody>
              {orders.slice(0, 6).map((o) => (
                <tr key={o.id}>
                  <td><b>#{o.id}</b></td><td>{o.customer.name}</td>
                  <td><StatusBadge s={o.status} /></td>
                  <td>{fmt(o.subtotal)} {CUR}</td><td>{timeAgo(o.time)}</td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan="5"><div className="pt-empty">لا توجد طلبات بعد</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Orders({ mid }) {
  const orders = mineOrders(useStore((s) => s.orders), mid);
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
      <div className="pt-h1">طلبات متجري<small>قبول الطلبات وتجهيزها للمندوب</small></div>
      <div className="pt-card">
        <div className="cap">قائمة الطلبات</div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>رقم</th><th>العناصر</th><th>الزبون</th><th>قيمة السلة</th><th>الحالة</th><th>إجراء</th></tr></thead>
            <tbody>
              {orders.map((o) => {
                const n = actionFor(o);
                const myShare = (o.items || []).filter((i) => i.merchantId === mid);
                return (
                  <tr key={o.id}>
                    <td><b>#{o.id}</b><div style={{ color: "var(--p-mut)", fontSize: 10.5 }}>{timeAgo(o.time)}</div></td>
                    <td><span className="pt-items-mini">{myShare.map((i, x) => <span key={x}>{i.e}</span>)}</span>
                      <div style={{ color: "var(--p-mut)", fontSize: 10.5 }}>
                        {myShare.length} من عناصري{(o.merchantCount || 1) > 1 ? ` · طلب مشترك مع ${o.merchantCount - 1} متجر` : ""}
                      </div></td>
                    <td>{o.customer.name}</td>
                    <td><b>{fmt(myShare.reduce((a, i) => a + i.priceIQD * i.qty, 0))} {CUR}</b></td>
                    <td><StatusBadge s={o.status} /></td>
                    <td>
                      {n?.kind === "status" && <button className="pt-btn sm" onClick={() => setOrderStatus(o.id, n.to)}><CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> {n.l}</button>}
                      {n?.kind === "ready" && <button className="pt-btn sm" onClick={() => setMerchantReady(o.id, mid, true)}>{n.l}</button>}
                      {n?.kind === "unready" && <button className="pt-btn ghost sm" onClick={() => setMerchantReady(o.id, mid, false)}>{n.l}</button>}
                      {n?.kind === "waiting" && <span className="pt-mini-chip"><Hourglass size={10} /> بانتظار المتاجر الأخرى</span>}
                      {!n && <span style={{ color: "var(--p-mut)", fontSize: 11.5 }}>—</span>}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && <tr><td colSpan="6"><div className="pt-empty">لا توجد طلبات بعد</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Products({ mid }) {
  const products = useStore((s) => s.products).filter((p) => p.merchantId === mid);
  return (
    <>
      <div className="pt-h1">منتجاتي<small>سعرك وتوفّرك — يظهران فوراً للزبائن</small></div>
      <div className="pt-card">
        <div className="cap">{products.length} منتج</div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>المنتج</th><th>الوزن</th><th>السعر ({CUR})</th><th>رابط الصورة</th><th>متوفر</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={p.stock === false ? { opacity: 0.55 } : undefined}>
                  <td><span style={{ fontSize: 18, marginLeft: 6 }}>{p.e}</span><b>{p.name}</b></td>
                  <td>{p.weight}</td>
                  <td>
                    <input className="pt-in" type="number" step="50" style={{ width: 110 }}
                      value={p.priceIQD}
                      onChange={(e) => updateProduct(p.id, { priceIQD: +e.target.value || 0 })} />
                  </td>
                  <td><input className="pt-in" dir="ltr" placeholder="https://…" style={{ width: 150, padding: "6px 9px", fontSize: 11 }}
                    value={p.img || ""} onChange={(e) => updateProduct(p.id, { img: e.target.value })} /></td>
                  <td><Switch on={p.stock !== false} onToggle={() => updateProduct(p.id, { stock: !(p.stock !== false) })} /></td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan="5"><div className="pt-empty">لا توجد منتجات مسندة لمتجرك</div></td></tr>}
            </tbody>
          </table>
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
          <div className="pt-scroll">
            <table className="pt-table">
              <thead><tr><th>الدفعة</th><th>المبلغ</th><th>طلبات</th><th>الوقت</th><th></th></tr></thead>
              <tbody>
                {awaiting.map((x) => (
                  <tr key={x.id}>
                    <td style={{ color: "var(--p-mut)", fontSize: 10.5 }}>{x.id.slice(-5)}</td>
                    <td style={{ fontWeight: 900 }}>{fmt(x.amount)} {CUR}</td>
                    <td>{(x.orders || []).length}</td>
                    <td>{timeAgo(x.time)}</td>
                    <td><button className="pt-btn sm" onClick={() => confirmSettlement(x.id)}>استلمتها ✓</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="pt-card">
        <div className="cap">🧾 سجل الفواتير (لكل طلب مُسلَّم)</div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>طلب</th><th>بضاعتي</th><th>العمولة</th><th>صافي مستحقي</th><th>الحالة</th><th>الوقت</th></tr></thead>
            <tbody>
              {invoices.map((r) => (
                <tr key={r.id}>
                  <td><b>#{r.id}</b></td>
                  <td>{fmt(r.goods)} {CUR}</td>
                  <td style={{ color: "#b3261e" }}>− {fmt(r.commission)}</td>
                  <td style={{ fontWeight: 900, color: "#0C831F" }}>{fmt(r.due)} {CUR}</td>
                  <td><span className={"pt-badge " + (r.settled ? "pt-b-done" : "pt-b-prep")}>{r.settled ? "مسوّاة" : "قيد التحصيل"}</span></td>
                  <td>{timeAgo(r.time)}</td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan="6"><div className="pt-empty">لا فواتير بعد — تُنشأ تلقائياً عند تسليم الطلبات</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- متجري: بيانات المتجر وساعاته وحالته ---------------- */
function MyShop({ mid }) {
  const me = useStore((s) => s.merchants.find((m) => m.id === mid)) || {};
  const T = (label, key, dir, ph) => (
    <div className="pt-field"><label>{label}</label>
      <input className="pt-in" dir={dir} placeholder={ph} value={me[key] || ""}
        onChange={(e) => updateMerchant(mid, { [key]: e.target.value })} /></div>
  );
  return (
    <>
      <div className="pt-h1">متجري<small>بياناتك تظهر للأدمن وتُستخدم في الفوترة</small></div>
      <div className="pt-card">
        <div className="cap">حالة المتجر</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
          <Switch on={me.open !== false} onToggle={() => updateMerchant(mid, { open: !(me.open !== false) })} />
          <div>
            <b style={{ fontSize: 13.5 }}>{me.open !== false ? "متجري مفتوح ويستقبل الطلبات" : "متجري مغلق مؤقتاً"}</b>
            <div style={{ fontSize: 11.5, color: "var(--p-mut)" }}>أغلقه يدوياً في الإجازات أو خارج الدوام</div>
          </div>
        </div>
      </div>
      <div className="pt-card">
        <div className="cap">البيانات الأساسية</div>
        <div style={{ padding: 14 }}>
          <div className="pt-row2">
            {T("الهاتف", "phone", "ltr")}
            {T("ساعات العمل", "hours", undefined, "مثال: 9 صباحاً — 11 مساءً")}
          </div>
          {T("وصف قصير للمتجر", "desc", undefined, "مثال: أفضل البقالة الطازجة في بغداد")}
          {T("رابط صورة/شعار المتجر", "img", "ltr", "https://…")}
          <div className="pt-note">💡 عمولة المنصة على متجرك: <b>{me.commission ?? 10}%</b> — يضبطها الأدمن من تبويب «التجار».</div>
        </div>
      </div>
    </>
  );
}
