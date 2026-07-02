import { useState } from "react";
import { Bike, PackageCheck, Wallet, MapPin, Phone, CheckCircle2, HandCoins, Navigation, DoorOpen, Banknote } from "lucide-react";
import { useStore, setOrderStatus, assignCourier, toggleCourier, courierRemit } from "../store/appStore.js";
import { courierWageOf, courierCash } from "../store/finance.js";
import { fmt, CUR } from "../utils/currency.js";
import { Shell, StatusBadge, Switch, Stat, timeAgo, usePortalPrefs, useOrderAlert } from "../portal/PortalKit.jsx";

const TABS = [
  { id: "avail", l: "المتاحة", Icon: Bike },
  { id: "mine", l: "توصيلاتي", Icon: PackageCheck },
  { id: "earn", l: "محفظتي", Icon: Wallet },
];

export default function CourierApp() {
  const couriers = useStore((s) => s.couriers);
  const [authId, setAuthId] = useState(() => sessionStorage.getItem("bk-courier-id2") || "");
  const logout = () => { sessionStorage.removeItem("bk-courier-id2"); setAuthId(""); };
  const me = couriers.find((c) => c.id === authId);
  if (!me) return <CourierLogin couriers={couriers} onOk={(id) => { sessionStorage.setItem("bk-courier-id2", id); setAuthId(id); }} />;
  return <Courier cid={me.id} onLogout={logout} />;
}

/* دخول مستقل لكل مندوب — حسابه وكلمة مروره يصنعهما الأدمن */
function CourierLogin({ couriers, onOk }) {
  const [cid, setCid] = useState(couriers[0]?.id || "");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    const c = couriers.find((x) => x.id === cid);
    if (!c || pw !== c.password) return setErr("كلمة المرور غير صحيحة");
    if (!c.active) return setErr("حسابك موقوف — راجع الإدارة");
    onOk(c.id);
  };
  return (
    <div className="pt-login">
      <div className="box">
        <div className="lg"><span className="b">ب</span>بوابة المندوب</div>
        <div className="sub">استلم الطلبات الجاهزة ووصّلها وتابع أرباحك</div>
        <div className="pt-field">
          <label>حسابك</label>
          <select className="pt-in" style={{ width: "100%" }} value={cid} onChange={(e) => { setCid(e.target.value); setErr(""); }}>
            {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="pt-field">
          <label>كلمة مرورك</label>
          <input className="pt-in" type="password" value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••" />
        </div>
        {err && <div className="pt-err">{err}</div>}
        <button className="pt-btn" style={{ width: "100%", marginTop: 6 }} onClick={submit}>دخول</button>
        <div className="demo">🔑 تجريبي — أحمد: <b>1111</b> · حسن: <b>2222</b> · مرتضى: <b>3333</b> (موقوف)<br />يديرها الأدمن من تبويب «المندوبون»</div>
      </div>
    </div>
  );
}

function Courier({ cid, onLogout }) {
  const [tab, setTab] = useState("avail");
  const couriers = useStore((s) => s.couriers);
  const me = couriers.find((c) => c.id === cid) || couriers[0];
  const prefs = usePortalPrefs("courier");
  const readyCount = useStore((s) => s.orders.filter((o) => o.status === "جاهز للتوصيل").length);
  useOrderAlert(readyCount, prefs.sound && me.active); // 🔔 طلب أصبح جاهزاً للاستلام
  return (
    <Shell role="المندوب" who={me.name} tabs={TABS} tab={tab} setTab={setTab} onLogout={onLogout} prefs={prefs}>
      <div className="pt-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, marginBottom: 14 }}>
        <Switch on={me.active} onToggle={() => toggleCourier(me.id)} />
        <div><b style={{ fontSize: 13.5 }}>{me.active ? "متاح لاستلام الطلبات" : "غير متاح حالياً"}</b>
          <div style={{ fontSize: 11.5, color: "var(--p-mut)" }}>بدّل حالتك حسب جاهزيتك</div></div>
      </div>
      {tab === "avail" && <Available me={me} />}
      {tab === "mine" && <Mine me={me} />}
      {tab === "earn" && <MyWallet me={me} />}
    </Shell>
  );
}

function OrderCard({ o, action }) {
  const settings = useStore((s) => s.settings);
  const wage = courierWageOf(o, settings);
  return (
    <div className="pt-card">
      <div className="cap"><b>#{o.id}</b><StatusBadge s={o.status} />
        {(o.merchantCount || 1) > 1 && <span className="pt-mini-chip">🏪 {o.merchantCount} متاجر</span>}
        <span className="sp" />
        <span style={{ fontWeight: 600, color: "var(--p-mut)", fontSize: 11 }}>{timeAgo(o.time)}</span></div>
      <div style={{ padding: "12px 14px", fontSize: 12.5, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1 }}><MapPin size={13} style={{ verticalAlign: -2, color: "#c99a24" }} /> <b>{o.customer.name}</b> — {o.customer.address}</span>
          <a className="pt-icobtn" title="توجيه بالخريطة" target="_blank" rel="noreferrer"
            href={`https://maps.google.com/?q=${encodeURIComponent(o.customer.address || "")}`}><Navigation size={14} /></a>
          <a className="pt-icobtn" title="اتصال" href={`tel:${(o.customer.phone || "").replace(/\s/g, "")}`}><Phone size={14} /></a>
        </div>
        <div className="pt-items-mini" style={{ fontSize: 20 }}>{o.items.map((i, x) => <span key={x}>{i.e}</span>)}</div>
        {o.note && <div style={{ background: "#FFF8E1", color: "#7a5c00", borderRadius: 8, padding: "6px 9px", fontSize: 11, fontWeight: 700 }}>📝 {o.note}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ color: "var(--p-mut2)" }}>
            {(o.payMethod || "").includes("نقد") ? "تحصيل نقدي" : "مدفوع مسبقاً"}: <b style={{ color: "var(--p-ink)" }}>{fmt(o.total)} {CUR}</b>
            <span style={{ color: "#0C831F", fontWeight: 800 }}> · أجرتك {fmt(wage)}{o.tip > 0 ? ` + بقشيش ${fmt(o.tip)}` : ""}</span>
          </span>
          {action}
        </div>
      </div>
    </div>
  );
}

function Available({ me }) {
  // بوابة الجاهزية: لا تظهر إلا الطلبات التي أشّرت كل متاجرها «جاهز»
  const orders = useStore((s) => s.orders)
    .filter((o) => o.status === "جاهز للتوصيل" && (!o.courierId || o.courierId === me.id));
  const take = (o) => { assignCourier(o.id, me.id); setOrderStatus(o.id, "في الطريق"); };
  return (
    <>
      <div className="pt-h1">طلبات جاهزة للاستلام<small>تظهر فقط بعد أن تكمل كل متاجر الطلب تجهيزها</small></div>
      {orders.map((o) => (
        <OrderCard key={o.id} o={o}
          action={<button className="pt-btn sm" disabled={!me.active} style={!me.active ? { opacity: 0.5 } : undefined}
            onClick={() => me.active && take(o)}><Bike size={12} style={{ verticalAlign: -2 }} /> استلام وانطلاق</button>} />
      ))}
      {orders.length === 0 && <div className="pt-card"><div className="pt-empty">لا توجد طلبات جاهزة الآن — ستظهر فور اكتمال تجهيزها</div></div>}
    </>
  );
}

function Mine({ me }) {
  const orders = useStore((s) => s.orders).filter((o) => o.courierId === me.id && ["في الطريق", "وصل المندوب"].includes(o.status));
  const nextOf = (o) =>
    o.status === "في الطريق"
      ? { l: "وصلتُ للعنوان", to: "وصل المندوب", Icon: DoorOpen }
      : { l: "تم التسليم", to: "تم التوصيل", Icon: CheckCircle2 };
  return (
    <>
      <div className="pt-h1">توصيلاتي الجارية<small>قدّم الحالة خطوة خطوة — الزبون يتتبعك لحظياً</small></div>
      {orders.map((o) => {
        const n = nextOf(o);
        return (
          <OrderCard key={o.id} o={o}
            action={<button className="pt-btn sm" onClick={() => setOrderStatus(o.id, n.to)}>
              <n.Icon size={12} style={{ verticalAlign: -2 }} /> {n.l}</button>} />
        );
      })}
      {orders.length === 0 && <div className="pt-card"><div className="pt-empty">لا توجد توصيلات جارية</div></div>}
    </>
  );
}

/* محفظة المندوب: الأرباح + محاسبة النقد مع الإدارة */
function MyWallet({ me }) {
  const state = useStore((s) => s);
  const cash = courierCash(state, me.id);
  const done = cash.rows;
  const pending = state.settlements.filter((x) => x.kind === "courier" && x.partyId === me.id && x.status !== "مؤكدة");
  const handedOver = state.settlements.filter((x) => x.kind === "courier" && x.partyId === me.id && x.status === "مؤكدة")
    .reduce((a, x) => a + x.amount, 0);

  return (
    <>
      <div className="pt-h1">محفظتي<small>أرباحك لك — والنقد المحصَّل يُسلَّم للإدارة بعد خصم أجرتك وبقشيشك</small></div>
      <div className="pt-stats" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" }}>
        <Stat Icon={PackageCheck} l="توصيلات مكتملة" v={done.length} />
        <Stat Icon={Wallet} l="أجورك" v={`${fmt(cash.wages)} ${CUR}`} />
        <Stat Icon={HandCoins} l="بقشيش الزبائن 💚" v={`${fmt(cash.tips)} ${CUR}`} />
        <Stat Icon={Banknote} l="نقد بذمّتك للإدارة" v={`${fmt(cash.remitDue)} ${CUR}`} d={pending.length ? "لديك تسليم بانتظار التأكيد" : undefined} />
      </div>

      {cash.remitDue > 0 && (
        <div className="pt-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, flexWrap: "wrap" }}>
            <Banknote size={22} color="#b3261e" />
            <div style={{ flex: 1, minWidth: 180 }}>
              <b style={{ fontSize: 13.5 }}>سلّم النقد للإدارة: {fmt(cash.remitDue)} {CUR}</b>
              <div style={{ fontSize: 11.5, color: "var(--p-mut)" }}>عن {cash.remitOrderIds.length} طلب نقدي — بعد خصم أجرتك وبقشيشك</div>
            </div>
            <button className="pt-btn" onClick={() => courierRemit(me.id, cash.remitDue, cash.remitOrderIds)}>
              سلّمت النقد ✓
            </button>
          </div>
        </div>
      )}
      {pending.map((x) => (
        <div key={x.id} className="pt-card">
          <div className="pt-note" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            ⏳ سلّمت <b>{fmt(x.amount)} {CUR}</b> — بانتظار تأكيد الأدمن ({timeAgo(x.time)})
          </div>
        </div>
      ))}
      {handedOver > 0 && (
        <div className="pt-card"><div className="pt-note">✅ إجمالي ما سلّمته وتأكد: <b>{fmt(handedOver)} {CUR}</b></div></div>
      )}

      <div className="pt-card">
        <div className="cap">سجل التوصيلات والمحاسبة</div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>رقم</th><th>الدفع</th><th>حصّلت</th><th>أجرتك</th><th>بقشيش</th><th>تُسلّم</th><th>الحالة</th><th>الوقت</th></tr></thead>
            <tbody>
              {done.map((r) => (
                <tr key={r.id}>
                  <td><b>#{r.id}</b></td>
                  <td>{r.cod ? "نقدي" : "مسبق"}</td>
                  <td>{r.cod ? `${fmt(r.collected)} ${CUR}` : "—"}</td>
                  <td style={{ color: "#0C831F", fontWeight: 800 }}>+{fmt(r.wage)}</td>
                  <td style={{ color: "#0C831F", fontWeight: 800 }}>{r.tip ? "+" + fmt(r.tip) : "—"}</td>
                  <td style={{ fontWeight: 800 }}>{r.cod ? fmt(r.remit) : "—"}</td>
                  <td>{r.cod ? <span className={"pt-badge " + (r.settled ? "pt-b-done" : "pt-b-prep")}>{r.settled ? "مسوّى" : "بذمّتك"}</span> : <span className="pt-badge pt-b-done">لا نقد</span>}</td>
                  <td>{timeAgo(r.time)}</td>
                </tr>
              ))}
              {done.length === 0 && <tr><td colSpan="8"><div className="pt-empty">لا توجد توصيلات مكتملة بعد</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
