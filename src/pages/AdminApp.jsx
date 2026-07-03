import React from "react";
import { useState, useRef, useEffect } from "react";
import { DEALS_ROWS } from "../data/rowSections.js";
import { classify, suggestPrice, suggestBadge, generateDesc, findSimilar } from "../utils/smartProduct.js";
import { uploadImage, getSupabaseCfg, setSupabaseCfg, hasBakedConfig } from "../utils/supabase.js";
import { aiCall } from "../utils/aiClient.js";
import ProductManager from "../components/ProductManager.jsx";
import { addBlock, updateBlock, removeBlock, moveBlock, addCustomTab, removeCustomTab, undoLayout, redoLayout, resetTabLayout, histState } from "../store/appStore.js";
import {
  LayoutDashboard, PackageSearch, ShoppingCart, Store, Bike, Settings2,
  Wallet, Clock3, Plus, Trash2, Pencil, RotateCcw, Palette, LayoutTemplate, KeyRound,
  Coins, Phone, MessageCircle, MapPin, CheckCircle2,
} from "lucide-react";
import {
  useStore, updateProduct, addProduct, removeProduct, updateSettings,
  setOrderStatus, assignCourier, toggleCourier, addCourier, addMerchant,
  updateMerchant, updateAppearance, updateTexts,
  addBanner, updateBanner, removeBanner, updateTrio,
  addBigStore, updateBigStore, removeBigStore,
  updateCourier, removeCourier, removeMerchant,
  settleMerchant, confirmSettlement,
  resetStore, ORDER_STATUSES,
} from "../store/appStore.js";
import { financeSummary, merchantDues, courierCash } from "../store/finance.js";
import { fmt, CUR } from "../utils/currency.js";
import { Shell, Gate, StatusBadge, Switch, Stat, timeAgo, usePortalPrefs, useOrderAlert } from "../portal/PortalKit.jsx";

const TABS = [
  { id: "dash", l: "اللوحة", Icon: LayoutDashboard },
  { id: "orders", l: "الطلبات", Icon: ShoppingCart },
  { id: "products", l: "المنتجات", Icon: PackageSearch },
  { id: "finance", l: "المالية", Icon: Coins },
  { id: "content", l: "المحتوى", Icon: LayoutTemplate },
  { id: "look", l: "المظهر", Icon: Palette },
  { id: "merchants", l: "التجار", Icon: Store },
  { id: "couriers", l: "المندوبون", Icon: Bike },
  { id: "settings", l: "الإعدادات", Icon: Settings2 },
];

export default function AdminApp() {
  const pin = useStore((st) => st.settings.adminPin || "1234");
  return (
    <Gate title="لوحة الإدارة" sub="تحكم كامل بالمتجر والطلبات والفريق" pin={pin} storageKey="bk-auth-admin" demo={pin}>
      {(logout) => <Admin onLogout={logout} />}
    </Gate>
  );
}

function Admin({ onLogout }) {
  const [tab, setTab] = useState("dash");
  const prefs = usePortalPrefs("admin");
  const ordersCount = useStore((st) => st.orders.length);
  useOrderAlert(ordersCount, prefs.sound); // 🔔 نغمة عند وصول طلب جديد
  return (
    <Shell role="الإدارة" tabs={TABS} tab={tab} setTab={setTab} onLogout={onLogout} prefs={prefs}>
      {tab === "dash" && <Dash />}
      {tab === "orders" && <Orders />}
      {tab === "products" && <ProductManager scope="admin" />}
      {tab === "finance" && <Finance />}
      {tab === "content" && <Content />}
      {tab === "look" && <Look />}
      {tab === "merchants" && <Merchants />}
      {tab === "couriers" && <Couriers />}
      {tab === "settings" && <SettingsPage />}
    </Shell>
  );
}

/* ---------------- اللوحة ---------------- */
function Dash() {
  const orders = useStore((s) => s.orders);
  const products = useStore((s) => s.products);
  const dayMs = 24 * 60 * 60 * 1000;
  const today = orders.filter((o) => Date.now() - new Date(o.time).getTime() < dayMs);
  const sales = (list) => list.filter((o) => o.status !== "ملغي").reduce((a, o) => a + o.total, 0);
  const active = orders.filter((o) => !["تم التوصيل", "ملغي"].includes(o.status)).length;
  const oos = products.filter((p) => p.stock === false).length;

  // المناطق الأكثر طلباً — من أول مقطع في عنوان الزبون
  const areas = {};
  orders.forEach((o) => {
    const a = (o.customer?.address || "").split("،")[0].trim() || "غير محدد";
    areas[a] = (areas[a] || 0) + 1;
  });
  const topAreas = Object.entries(areas).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxA = topAreas[0]?.[1] || 1;

  const days = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "اليوم"];
  const bars = [42, 65, 51, 78, 60, 88, Math.max(20, Math.min(100, orders.length * 12))];
  return (
    <>
      <div className="pt-h1">لوحة المتابعة<small>مزامنة حية — أي تغيير من الزبون أو التاجر أو المندوب يظهر فوراً</small></div>
      <div className="pt-stats" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <Stat Icon={ShoppingCart} l="طلبات اليوم" v={today.length} />
        <Stat Icon={ShoppingCart} l="إجمالي الطلبات" v={orders.length} />
        <Stat Icon={Wallet} l="مبيعات اليوم" v={`${fmt(sales(today))} ${CUR}`} />
        <Stat Icon={Wallet} l="إجمالي المبيعات" v={`${fmt(sales(orders))} ${CUR}`} />
        <Stat Icon={Clock3} l="قيد التنفيذ" v={active} d={oos ? `${oos} منتج نافد` : "المخزون سليم"} />
      </div>
      <div className="pt-row2" style={{ alignItems: "start" }}>
        <div className="pt-card">
          <div className="cap">الطلبات خلال الأسبوع</div>
          <div className="pt-chart" style={{ paddingBottom: 30 }}>
            {bars.map((h, i) => <div key={i} className="b" style={{ height: `${h}%` }}><span>{days[i]}</span></div>)}
          </div>
        </div>
        <div className="pt-card">
          <div className="cap">📍 المناطق الأكثر طلباً</div>
          <div style={{ padding: 14, display: "grid", gap: 10 }}>
            {topAreas.map(([name, n]) => (
              <div key={name} style={{ display: "grid", gridTemplateColumns: "90px 1fr 26px", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 700 }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                <div style={{ height: 8, borderRadius: 6, background: "var(--p-line2)" }}>
                  <div style={{ width: `${(n / maxA) * 100}%`, height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#F8CB46,#F0B500)" }} />
                </div>
                <b>{n}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pt-card">
        <div className="cap">أحدث الطلبات</div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>رقم</th><th>الزبون</th><th>الحالة</th><th>الإجمالي</th><th>الوقت</th></tr></thead>
            <tbody>
              {orders.slice(0, 5).map((o) => (
                <tr key={o.id}>
                  <td><b>#{o.id}</b></td><td>{o.customer.name}</td>
                  <td><StatusBadge s={o.status} /></td>
                  <td>{fmt(o.total)} {CUR}</td><td>{timeAgo(o.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- الطلبات ---------------- */
function Orders() {
  const orders = useStore((s) => s.orders);
  const couriers = useStore((s) => s.couriers);
  const merchants = useStore((s) => s.merchants);
  const [filter, setFilter] = useState("الكل");
  const list = filter === "الكل" ? orders : orders.filter((o) => o.status === filter);
  const mName = (id) => merchants.find((m) => m.id === id)?.name || "—";
  return (
    <>
      <div className="pt-h1">إدارة الطلبات<small>تغيير الحالات وتعيين المندوبين</small></div>
      <div className="pt-card">
        <div className="cap">
          كل الطلبات<span className="sp" />
          <select className="pt-in" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>الكل</option>
            {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>رقم</th><th>الزبون</th><th>العناصر</th><th>المتجر</th><th>الإجمالي</th><th>الدفع</th><th>بقشيش</th><th>الحالة</th><th>المندوب</th><th>الوقت</th></tr></thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td><b>#{o.id}</b></td>
                  <td>
                    {o.customer.name}
                    <div style={{ color: "var(--p-mut)", fontSize: 10.5, direction: "ltr", textAlign: "right" }}>{o.customer.phone}</div>
                    <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                      <a className="pt-icobtn" title="اتصال" href={`tel:${(o.customer.phone || "").replace(/\s/g, "")}`}><Phone size={13} /></a>
                      <a className="pt-icobtn wa" title="واتساب" target="_blank" rel="noreferrer"
                        href={`https://wa.me/964${(o.customer.phone || "").replace(/\s/g, "").replace(/^0/, "")}?text=${encodeURIComponent(`مرحباً ${o.customer.name}، بخصوص طلبك رقم ${o.id}`)}`}><MessageCircle size={13} /></a>
                      <a className="pt-icobtn" title="الموقع على الخريطة" target="_blank" rel="noreferrer"
                        href={`https://maps.google.com/?q=${encodeURIComponent(o.customer.address || "")}`}><MapPin size={13} /></a>
                    </div>
                  </td>
                  <td><span className="pt-items-mini">{o.items.slice(0, 4).map((i, x) => <span key={x}>{i.e}</span>)}</span></td>
                  <td>
                    {(o.merchantCount || 1) > 1 ? `${o.merchantCount} متاجر` : mName(o.merchantId)}
                    <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                      {Object.entries(o.readiness || {}).map(([mid, ok]) => (
                        <span key={mid} className={"pt-mini-chip" + (ok ? " ok" : "")} title={mName(mid)}>
                          {ok ? "✓" : "⌛"} {mName(mid).split(" ")[0]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td><b>{fmt(o.total)} {CUR}</b></td>
                  <td style={{ fontSize: 11 }}>{o.payMethod || "نقداً"}{o.note ? <div style={{ color: "#c99a24", fontSize: 10 }}>📝 {o.note}</div> : null}</td>
                  <td style={{ color: "#0C831F", fontWeight: 800 }}>{o.tip ? "+" + fmt(o.tip) : "—"}</td>
                  <td>
                    <select className="pt-in" value={o.status} onChange={(e) => setOrderStatus(o.id, e.target.value)}>
                      {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="pt-in" value={o.courierId || ""} onChange={(e) => assignCourier(o.id, e.target.value || null)}>
                      <option value="">بدون</option>
                      {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td>{timeAgo(o.time)}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan="10"><div className="pt-empty">لا توجد طلبات بهذه الحالة</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- المنتجات ---------------- */
const CATS = ["مشروبات وعصائر","زيوت وسكر وبهارات","طعام سريع ومجمّد","حلويات وشوكولاتة","آيس كريم ومثلجات","خضار وفواكه","طحين وأرز وبقوليات","ألبان وخبز وبيض","منظفات وعناية منزلية","جمال وعناية","إلكترونيات","منزل وديكور","أطفال وألعاب","بقالة أساسية","تسالي وحلويات","مشروبات"];
function Merchants() {
  const merchants = useStore((s) => s.merchants);
  const products = useStore((s) => s.products);
  const orders = useStore((s) => s.orders);
  const [f, setF] = useState({ name: "", cat: "", phone: "", password: "", commission: 10 });
  const submit = () => {
    if (!f.name) return;
    addMerchant(f.name, f.cat, f.phone, f.password || "0000");
    setF({ name: "", cat: "", phone: "", password: "", commission: 10 });
  };
  return (
    <>
      <div className="pt-h1">التجار<small>المتاجر الشريكة ومنتجاتها</small></div>
      <div className="pt-card">
        <div className="cap">إضافة تاجر</div>
        <div style={{ padding: 14 }} className="pt-row2">
          <input className="pt-in" placeholder="اسم المتجر" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="pt-in" placeholder="التخصص" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })} />
          <input className="pt-in" placeholder="الهاتف" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input className="pt-in" dir="ltr" placeholder="كلمة مرور البوابة" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <input className="pt-in" type="number" placeholder="العمولة %" value={f.commission} onChange={(e) => setF({ ...f, commission: e.target.value })} />
          <button className="pt-btn" onClick={submit}>إضافة</button>
        </div>
      </div>
      <div className="pt-card">
        <div className="cap">قائمة التجار</div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>المتجر</th><th>التخصص</th><th>الهاتف</th><th>كلمة المرور</th><th>العمولة %</th><th>مفتوح</th><th>المنتجات</th><th>الطلبات</th><th></th></tr></thead>
            <tbody>
              {merchants.map((m) => (
                <tr key={m.id}>
                  <td><b>{m.name}</b></td><td>{m.cat}</td><td style={{ direction: "ltr" }}>{m.phone}</td>
                  <td><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><KeyRound size={13} color="#c99a24" />
                    <input className="pt-in" style={{ width: 90, padding: "5px 9px", fontSize: 12 }} dir="ltr"
                      value={m.password || ""} onChange={(e) => updateMerchant(m.id, { password: e.target.value })} /></span></td>
                  <td><input className="pt-in" type="number" style={{ width: 62, padding: "5px 8px", fontSize: 12 }}
                    value={m.commission ?? 10} onChange={(e) => updateMerchant(m.id, { commission: +e.target.value || 0 })} /></td>
                  <td><Switch on={m.open !== false} onToggle={() => updateMerchant(m.id, { open: !(m.open !== false) })} /></td>
                  <td>{products.filter((p) => p.merchantId === m.id).length}</td>
                  <td>{orders.filter((o) => o.merchantId === m.id || (o.readiness && o.readiness[m.id] !== undefined)).length}</td>
                  <td><button className="pt-btn warn sm" onClick={() => removeMerchant(m.id)}><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- المندوبون ---------------- */
function Couriers() {
  const couriers = useStore((s) => s.couriers);
  const orders = useStore((s) => s.orders);
  const [f, setF] = useState({ name: "", phone: "", password: "" });
  const delivered = (id) => orders.filter((o) => o.courierId === id && o.status === "تم التوصيل").length;
  return (
    <>
      <div className="pt-h1">المندوبون<small>فريق التوصيل وحالته</small></div>
      <div className="pt-card">
        <div className="cap">إضافة مندوب</div>
        <div style={{ padding: 14, display: "flex", gap: 10 }}>
          <input className="pt-in" placeholder="الاسم" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="pt-in" placeholder="الهاتف" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input className="pt-in" dir="ltr" placeholder="كلمة مرور البوابة" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <button className="pt-btn" onClick={() => { if (f.name) { addCourier(f.name, f.phone, f.password || "0000"); setF({ name: "", phone: "", password: "" }); } }}>إضافة</button>
        </div>
      </div>
      <div className="pt-card">
        <div className="cap">الفريق</div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>المندوب</th><th>الهاتف</th><th>كلمة المرور</th><th>توصيلات</th><th>نشط</th><th></th></tr></thead>
            <tbody>
              {couriers.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td><td style={{ direction: "ltr" }}>{c.phone}</td>
                  <td><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><KeyRound size={13} color="#c99a24" />
                    <input className="pt-in" style={{ width: 80, padding: "5px 8px", fontSize: 12 }} dir="ltr"
                      value={c.password || ""} onChange={(e) => updateCourier(c.id, { password: e.target.value })} /></span></td>
                  <td>{delivered(c.id)}</td>
                  <td><Switch on={c.active} onToggle={() => toggleCourier(c.id)} /></td>
                  <td><button className="pt-btn warn sm" onClick={() => removeCourier(c.id)}><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- الإعدادات ---------------- */
function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const baked = hasBakedConfig();
  return (
    <>
      <div className="pt-h1">إعدادات المتجر<small>تنعكس فوراً على واجهة الزبائن</small></div>
      <div className="pt-card">
        <div className="cap">🗄️ تكامل Supabase — رفع صور المنتجات{baked && <span className="save-badge" style={{ marginRight: 8 }}>✓ مزامَن لكل الأجهزة</span>}</div>
        <SupabaseCard />
      </div>
      <div className="pt-card">
        <div className="cap">الواجهة والتوصيل</div>
        <div style={{ padding: 14 }}>
          <div className="pt-field"><label>نص شريط العرض (أعلى المتجر)</label>
            <input className="pt-in" value={settings.promoText} onChange={(e) => updateSettings({ promoText: e.target.value })} /></div>
          <div className="pt-row2">
            <div className="pt-field"><label>زمن التوصيل (دقيقة)</label>
              <input className="pt-in" type="number" value={settings.eta} onChange={(e) => updateSettings({ eta: +e.target.value || 0 })} /></div>
            <div className="pt-field"><label>رسوم التوصيل ({CUR})</label>
              <input className="pt-in" type="number" step="250" value={settings.deliveryFee} onChange={(e) => updateSettings({ deliveryFee: +e.target.value || 0 })} /></div>
          </div>
          <div className="pt-row2">
            <div className="pt-field"><label>توصيل مجاني للطلبات فوق ({CUR})</label>
              <input className="pt-in" type="number" step="1000" value={settings.freeAbove} onChange={(e) => updateSettings({ freeAbove: +e.target.value || 0 })} /></div>
            <div className="pt-field"><label>رسوم الخدمة ({CUR})</label>
              <input className="pt-in" type="number" step="50" value={settings.serviceFee} onChange={(e) => updateSettings({ serviceFee: +e.target.value || 0 })} /></div>
          </div>
          <div className="pt-row2">
            <div className="pt-field"><label>أجرة المندوب الأساسية ({CUR})</label>
              <input className="pt-in" type="number" step="250" value={settings.courierBase ?? 1500} onChange={(e) => updateSettings({ courierBase: +e.target.value || 0 })} /></div>
            <div className="pt-field"><label>إضافة لكل متجر إضافي ({CUR})</label>
              <input className="pt-in" type="number" step="250" value={settings.courierExtra ?? 500} onChange={(e) => updateSettings({ courierExtra: +e.target.value || 0 })} /></div>
          </div>
          <div className="pt-row2">
            <div className="pt-field"><label>رمز دخول الأدمن</label>
              <input className="pt-in" dir="ltr" value={settings.adminPin || "1234"} onChange={(e) => updateSettings({ adminPin: e.target.value })} /></div>
            <div className="pt-field"><label>رقم واتساب الدعم</label>
              <input className="pt-in" dir="ltr" value={settings.whatsapp || ""} onChange={(e) => updateSettings({ whatsapp: e.target.value })} /></div>
          </div>
          <div className="pt-field"><label>خيارات بقشيش المندوب (أرقام مفصولة بفاصلة)</label>
            <input className="pt-in" dir="ltr" value={(settings.tipOptions || []).join(", ")}
              onChange={(e) => updateSettings({ tipOptions: e.target.value.split(",").map((x) => +x.trim()).filter(Boolean) })} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
            <Switch on={settings.storeOpen} onToggle={() => updateSettings({ storeOpen: !settings.storeOpen })} />
            <div><b style={{ fontSize: 13.5 }}>المتجر مفتوح</b>
              <div style={{ fontSize: 11.5, color: "var(--p-mut)" }}>عند الإغلاق يظهر شريط أحمر ويتوقف استقبال الطلبات</div></div>
          </div>
        </div>
      </div>
      <div className="pt-card">
        <div className="cap">البيانات التجريبية</div>
        <div style={{ padding: 14 }}>
          <button className="pt-btn ghost" onClick={() => confirm("إعادة كل البيانات لحالتها الأولى؟") && resetStore()}>
            <RotateCcw size={13} style={{ verticalAlign: -2 }} /> إعادة ضبط البيانات
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------------- المظهر: ألوان ونصوص الموقع ---------------- */
function ColorField({ label, value, onChange }) {
  return (
    <div className="pt-field">
      <label>{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ width: 44, height: 38, border: "1.5px solid #e2e2e2", borderRadius: 10, padding: 2, background: "#fff", cursor: "pointer" }} />
        <input className="pt-in" dir="ltr" style={{ width: 110 }} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function Look() {
  const a = useStore((s) => s.appearance);
  const t = useStore((s) => s.texts);
  const T = (label, key, dir) => (
    <div className="pt-field"><label>{label}</label>
      <input className="pt-in" dir={dir} value={t[key]} onChange={(e) => updateTexts({ [key]: e.target.value })} /></div>
  );
  return (
    <>
      <div className="pt-h1">مظهر الموقع<small>الألوان والنصوص — تنعكس مباشرة على المتجر</small></div>

      <div className="pt-card">
        <div className="cap"><Palette size={15} color="#c99a24" /> ألوان الهوية</div>
        <div style={{ padding: 14 }} className="pt-row2">
          <ColorField label="الهيدر — أعلى التدرّج" value={a.headTop} onChange={(v) => updateAppearance({ headTop: v })} />
          <ColorField label="الهيدر — أسفل التدرّج" value={a.headBot} onChange={(v) => updateAppearance({ headBot: v })} />
          <ColorField label="اللون الأساسي (أزرار الإضافة والتأكيد)" value={a.green} onChange={(v) => updateAppearance({ green: v })} />
          <ColorField label="الأصفر المميز (الشعار والبداية)" value={a.yellow} onChange={(v) => updateAppearance({ yellow: v })} />
          <ColorField label="الأصفر الداكن" value={a.yellowDk} onChange={(v) => updateAppearance({ yellowDk: v })} />
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">نصوص الهوية</div>
        <div style={{ padding: 14 }}>
          <div className="pt-row2">
            {T("اسم التطبيق", "appName")}
            {T("حرف الشعار", "logoLetter")}
          </div>
          {T("سطر الشعار (شاشة البداية)", "tagline")}
          {T("رسالة الترحيب (شاشة البداية)", "splashWelcome")}
          <div className="pt-row2">
            {T("عنوان البانر الرئيسي", "welcomeTitle")}
            {T("وصف البانر الرئيسي", "welcomeSub")}
          </div>
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">نصوص عامة</div>
        <div style={{ padding: 14 }}>
          <div className="pt-row2">
            {T("عنوان موقع التوصيل", "addressTitle")}
            {T("العنوان التفصيلي", "address")}
          </div>
          {T("رسالة إغلاق المتجر", "closedMsg")}
          <div className="pt-row2">
            {T("الفوتر — الاسم الكبير", "footerBig")}
            {T("الفوتر — السطر الثاني", "footerTag")}
          </div>
          {T("الفوتر — السطر الصغير", "footerMini")}
        </div>
      </div>
    </>
  );
}

/* ---------------- المحتوى: بانرات وأقسام الصفحة الرئيسية ---------------- */

/* ===== منشئ الصفحات التفاعلي: معاينة حيّة + سحب/أسهم + إضافة/حذف كتل وتبويبات ===== */

/* مصغّرات رسومية لكتالوج الكتل */

function Thumb({ kind }) {
  const sq = (n, cls) => Array.from({ length: n }, (_, i) => <i key={i} className={cls || ""} />);
  return (
    <div className={"pal-th th-" + kind}>
      {kind === "grid" && sq(6)}
      {kind === "slide" && <>{sq(3)}<i className="cut" /></>}
      {kind === "ad" && <><b /><em /></>}
      {kind === "carousel" && <>{sq(2, "bar")}</>}
      {kind === "best" && sq(3, "col")}
      {kind === "tiles" && sq(8, "tile")}
      {kind === "trio" && sq(3, "tall")}
      {kind === "big" && sq(2, "bigc")}
      {kind === "head" && <><b className="hbar" /><em className="srch" /></>}
      {kind === "tabs" && sq(5, "dot")}
      {kind === "strip" && <b className="line" />}
      {kind === "dz" && <b className="star" />}
    </div>
  );
}


/* مجموعة قابلة للطي — لتجميع التحكمات المتشابهة */
function Group({ icon, title, sub, children, open: dOpen }) {
  const [open, setOpen] = useState(!!dOpen);
  return (
    <div className="pt-card pt-group">
      <div className="gcap" onClick={() => setOpen(!open)}>
        <span className="chev">{open ? "▾" : "◂"}</span>
        <span className="gt">{icon} {title}</span>
        {sub && <small>{sub}</small>}
      </div>
      {open && <div className="gbody">{children}</div>}
    </div>
  );
}

function PageBuilder() {
  const homeBlocks = useStore((s) => s.homeBlocks);
  const customTabs = useStore((s) => s.customTabs);
  const products = useStore((s) => s.products);
  const [tabId, setTabId] = useState("home");
  const [drag, setDrag] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [pending, setPending] = useState(null); // موضع الإدراج القادم من المعاينة
  const tabRef = useRef(tabId); tabRef.current = tabId;
  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data || {};
      if (!d.bk) return;
      if (d.act === "insert" && d.tabId === tabRef.current) { setPending(d.index); setPalOpen(true); }
      if (d.act === "select") { setOpenId(d.id); setPending(null); }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  const THEMED_TABS = [
    ["electronics", "🎧 إلكترونيات"], ["beauty", "💄 الجمال"], ["decor", "🛋️ ديكور"],
    ["kids", "🧸 الأطفال"], ["gifting", "🎁 الهدايا"], ["imported", "🌍 مستورد"],
  ];
  const tabBlocksAll = useStore((s) => s.tabBlocks);
  const blocks = tabId === "home" ? homeBlocks : tabBlocksAll[tabId] ? tabBlocksAll[tabId] : (customTabs.find((t) => t.id === tabId)?.blocks || []);
  useStore((s) => s.histV || 0); // إعادة رسم عند تغيّر السجل
  const hs = histState();
  const [palOpen, setPalOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undoLayout(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); redoLayout(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const CATS_LIST = [...new Set(products.map((p) => p.cat).filter(Boolean))];

  const label = (b) => b.type === "builtin" ? "🧩 " + (b.label || b.key)
    : b.type === "row" ? (b.layout === "slide" ? "⇄ " : "▦ ") + b.title
    : "📢 إعلان: " + b.t;

  const onDrop = (targetId) => {
    if (!drag || drag === targetId) return setDrag(null);
    const arr = [...blocks];
    const from = arr.findIndex((b) => b.id === drag);
    const to = arr.findIndex((b) => b.id === targetId);
    if (from < 0 || to < 0) return setDrag(null);
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    // اكتب الترتيب الجديد عبر التحريك المتسلسل (أبسط: استبدال كامل عبر update متتالٍ)
    window.__setBlocks && window.__setBlocks(tabId, arr);
    setDrag(null);
  };

  return (
    <div className="pt-card">
      <div className="cap">🧱 منشئ الصفحات التفاعلي<span className="sp" />
        <select className="pt-in" style={{ width: 170 }} value={tabId} onChange={(e) => setTabId(e.target.value)}>
          <option value="home">🏠 الصفحة الرئيسية (الكل)</option>
          {THEMED_TABS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          {customTabs.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
        </select>
        <button className="pt-btn sm" onClick={() => { const l = prompt("اسم التبويب الجديد:"); if (l) { const e = prompt("إيموجي التبويب:", "🛍️"); addCustomTab(l, e || "🛍️"); } }}>+ تبويب</button>
        {tabId !== "home" && !tabBlocksAll[tabId] && <button className="pt-btn warn sm" onClick={() => { if (confirm("حذف هذا التبويب وكل كتله؟")) { removeCustomTab(tabId); setTabId("home"); } }}><Trash2 size={12} /></button>}
        <span className="sp" />
        <div className="pt-toolbar">
          <button className="tb" disabled={!hs.u} title="تراجع (Ctrl+Z)" onClick={undoLayout}>↩ تراجع{hs.u ? ` (${hs.u})` : ""}</button>
          <button className="tb" disabled={!hs.r} title="إعادة (Ctrl+Y)" onClick={redoLayout}>↪ إعادة</button>
          <button className="tb" title="استعادة التصميم الافتراضي لهذا التبويب" onClick={() => { if (confirm("استعادة هذا التبويب لتصميمه الافتراضي؟ (يمكن التراجع)")) resetTabLayout(tabId); }}>⟲ استعادة</button>
          <span className="save-badge">✓ يُحفظ تلقائياً</span>
        </div>
      </div>

      <div className="pt-builder">
        <div className="pt-blocks">
          <button className="pal-toggle" onClick={() => setPalOpen(!palOpen)}>{palOpen ? "▾" : "＋"} إضافة كتلة <small>كتالوج أنماط بلينكيت</small></button>
          {pending != null && (
            <div className="pal-pending">📍 سيُدرَج في الموضع {pending + 1} — اختر كتلة من الكتالوج
              <button onClick={() => setPending(null)}>إلغاء</button></div>
          )}
          {palOpen && <div className="pal-grid">
            {[
              { k: "grid", n: "صف منتجات 3×2", th: "grid", add: { type: "row", title: "صف جديد", sub: "", ids: [1, 2, 3, 4, 5, 14], cat: CATS_LIST[0] || "", layout: "grid" } },
              { k: "slide", n: "صف سلايد دوّار", th: "slide", add: { type: "row", title: "سلايد جديد", sub: "", ids: [1, 2, 3, 4, 5, 14, 28, 29], cat: CATS_LIST[0] || "", layout: "slide" } },
              { k: "ad", n: "بانر إعلاني", th: "ad", add: { type: "ad", t: "إعلان جديد", p: "وصف الإعلان", cta: "تسوّق الآن", e: "🛒", bg: "" } },
              { k: "banners", n: "كاروسيل بانرات", th: "carousel", add: { type: "builtin", key: "banners", label: "بانرات العروض العريضة" } },
              { k: "best", n: "شبكة الأكثر مبيعاً", th: "best", add: { type: "builtin", key: "bestsellers", label: "الأكثر مبيعاً (شبكة الفئات)" } },
              { k: "trio", n: "البطاقات الثلاثية", th: "trio", add: { type: "builtin", key: "trio", label: "البطاقات الثلاثية" } },
              { k: "big", n: "متاجر كبرى", th: "big", add: { type: "builtin", key: "bigstores", label: "متاجر يحبها الجميع" } },
            ].map((p) => (
              <div key={p.k} className="pal-item" onClick={() => { addBlock(tabId, p.add, pending); setPending(null); setPalOpen(false); }}>
                <Thumb kind={p.th} /><span>{p.n}</span>
              </div>
            ))}
            <div className="pal-item" onClick={() => {
              const opts = ["grocery:البقالة والمطبخ","snacks:وجبات ومشروبات","beauty:الجمال","household:المنزل","stores:متاجر مميّزة","lifestyle:أسلوب حياتك","tiles_electronics:الإلكترونيات","tiles_decor:الديكور","tiles_kids:الأطفال","tiles_imported:المستورد"];
              const pick = prompt("اختر مجموعة البلاطات:\n" + opts.map((o,i)=>(i+1)+") "+o.split(":")[1]).join("\n"), "1");
              const idx = (+pick || 1) - 1; const [key, lbl] = (opts[idx] || opts[0]).split(":");
              addBlock(tabId, { type: "builtin", key, label: "بلاطات: " + lbl }, pending); setPending(null); setPalOpen(false);
            }}><Thumb kind="tiles" /><span>بلاطات فئات</span></div>
            {[["head","رأس مُثيّم","المظهر"],["tabs","شريط التبويبات","زر + تبويب"],["strip","شريط تحفيزي","المظهر"],["dz","منطقة العروض","بطاقة العروض"]].map(([k,n,w]) => (
              <div key={k} className="pal-item struct" title={"هيكلي — يُدار من: " + w}>
                <Thumb kind={k} /><span>{n}</span><small>{w}</small>
              </div>
            ))}
          </div>}
          {blocks.length === 0 && <div style={{ color: "var(--p-mut)", fontSize: 12, padding: 14, textAlign: "center" }}>لا توجد كتل بعد — أضف صفًا أو إعلانًا</div>}
          {blocks.map((b, i) => (
            <div key={b.id}
              className={"pt-block" + (drag === b.id ? " dragging" : "") + (b.hidden ? " off" : "")}
              draggable onDragStart={() => setDrag(b.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(b.id)} onDragEnd={() => setDrag(null)}>
              <span className="grip">⠿</span>
              <span className="bl" onClick={() => setOpenId(openId === b.id ? null : b.id)}>{label(b)}</span>
              <span className="ops">
                <button title="أعلى" disabled={i === 0} onClick={() => moveBlock(tabId, b.id, -1)}>▲</button>
                <button title="أسفل" disabled={i === blocks.length - 1} onClick={() => moveBlock(tabId, b.id, +1)}>▼</button>
                <button title={b.hidden ? "إظهار" : "إخفاء"} onClick={() => updateBlock(tabId, b.id, { hidden: !b.hidden })}>{b.hidden ? "🙈" : "👁"}</button>
                <button title="نسخ الكتلة" onClick={() => { const c = JSON.parse(JSON.stringify(b)); delete c.id; addBlock(tabId, c, i + 1); }}>⧉</button>
                <button title="حذف" className="del" onClick={() => removeBlock(tabId, b.id)}>✕</button>
              </span>
              {openId === b.id && b.type === "row" && (
                <div className="edit">
                  <input className="pt-in" placeholder="العنوان" value={b.title} onChange={(e) => updateBlock(tabId, b.id, { title: e.target.value })} />
                  <input className="pt-in" placeholder="سطر فرعي (اختياري)" value={b.sub || ""} onChange={(e) => updateBlock(tabId, b.id, { sub: e.target.value })} />
                  <input className="pt-in" dir="ltr" placeholder="معرّفات المنتجات: 1,2,3" value={(b.ids || []).join(",")} onChange={(e) => updateBlock(tabId, b.id, { ids: e.target.value.split(",").map((x) => +x.trim()).filter(Boolean) })} />
                  <div className="row2">
                    <select className="pt-in" value={b.cat || ""} onChange={(e) => updateBlock(tabId, b.id, { cat: e.target.value })}>
                      {CATS_LIST.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <div className="pt-seg">
                      <button className={"seg" + (b.layout !== "slide" ? " on" : "")} onClick={() => updateBlock(tabId, b.id, { layout: "grid" })}>▦ 3×2</button>
                      <button className={"seg" + (b.layout === "slide" ? " on" : "")} onClick={() => updateBlock(tabId, b.id, { layout: "slide" })}>⇄ سلايد</button>
                    </div>
                  </div>
                </div>
              )}
              {openId === b.id && b.type === "ad" && (
                <div className="edit">
                  <input className="pt-in" placeholder="عنوان الإعلان" value={b.t} onChange={(e) => updateBlock(tabId, b.id, { t: e.target.value })} />
                  <input className="pt-in" placeholder="الوصف" value={b.p || ""} onChange={(e) => updateBlock(tabId, b.id, { p: e.target.value })} />
                  <div className="row2">
                    <input className="pt-in" placeholder="نص الزر" value={b.cta || ""} onChange={(e) => updateBlock(tabId, b.id, { cta: e.target.value })} />
                    <input className="pt-in" placeholder="إيموجي" value={b.e || ""} onChange={(e) => updateBlock(tabId, b.id, { e: e.target.value })} />
                  </div>
                  <input className="pt-in" dir="ltr" placeholder="خلفية CSS (اختياري)" value={b.bg || ""} onChange={(e) => updateBlock(tabId, b.id, { bg: e.target.value })} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="pt-preview-wrap">
          <div className="ph-note">معاينة حيّة — تتحدث فور أي تعديل{tabId !== "home" ? " (افتح التبويب الجديد من شريط المتجر)" : ""}</div>
          <iframe key={tabId} className="pt-preview" src={"/?builder=1&tab=" + (tabId === "home" ? "all" : tabId)} title="معاينة المتجر" />
        </div>
      </div>
    </div>
  );
}


function SupabaseCard() {
  const [cfg, setCfg] = useState(() => getSupabaseCfg() || { url: "", anonKey: "", bucket: "products" });
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState("");
  const save = () => { setSupabaseCfg(cfg); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const baked = hasBakedConfig();
  const runTest = async () => {
    setSupabaseCfg(cfg); setTest("جارٍ الاختبار…");
    try {
      // صورة PNG صغيرة 1×1 كاختبار رفع
      const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const file = new File([bytes], "test.png", { type: "image/png" });
      const url = await uploadImage(file);
      setTest("✅ نجح! الصور تُرفع بشكل صحيح. " + (url ? "" : ""));
    } catch (e) { setTest("❌ " + e.message); }
  };
  return (
    <div>
      <div className="pt-field"><label>رابط المشروع (Project URL)</label>
        <input className="pt-in" dir="ltr" placeholder="https://xxxx.supabase.co" value={cfg.url} onChange={(e) => setCfg({ ...cfg, url: e.target.value })} /></div>
      <div className="pt-field"><label>المفتاح العام (publishable / anon) — ليس secret</label>
        <input className="pt-in" dir="ltr" placeholder="sb_publishable_... أو eyJ..." value={cfg.anonKey} onChange={(e) => setCfg({ ...cfg, anonKey: e.target.value })} /></div>
      <div className="pt-field"><label>اسم الـ Bucket (عام)</label>
        <input className="pt-in" dir="ltr" placeholder="products" value={cfg.bucket} onChange={(e) => setCfg({ ...cfg, bucket: e.target.value })} /></div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="pt-btn sm" onClick={save}>{saved ? "✓ حُفظ" : "حفظ الإعداد"}</button>
        <button className="pt-btn sm ghost" onClick={runTest} disabled={!cfg.url || !cfg.anonKey}>🧪 اختبار الاتصال</button>
      </div>
      {test && <div className={"pt-testres " + (test.startsWith("✅") ? "ok" : test.startsWith("❌") ? "err" : "")}>{test}</div>}
      <div className="pt-tip" style={{ marginTop: 8 }}>{baked ? <>✅ الإعداد الدائم مرفوع مع الموقع — <b>يعمل تلقائياً على كل الأجهزة</b> بلا إعادة إدخال. الحقول أعلاه لتجاوز مؤقت على هذا الجهاز فقط.</> : <>ℹ️ للمزامنة على كل الأجهزة: ضع القيم في <b>src/config.js</b> وارفعها على GitHub. أو أدخلها هنا لهذا الجهاز فقط.</>}</div>
    </div>
  );
}

function Content() {
  const banners = useStore((s) => s.banners);
  const trio = useStore((s) => s.trio);
  const bigStores = useStore((s) => s.bigStores);
  const dealZone = useStore((s) => s.settings.dealZone);
  const setDZ = (patch) => updateSettings({ dealZone: { ...dealZone, ...patch } });
  const setTile = (i, patch) => setDZ({ tiles: dealZone.tiles.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const rowLayouts = useStore((s) => s.settings.rowLayouts || {});
  const setLayout = (title, mode) => updateSettings({ rowLayouts: { ...rowLayouts, [title]: mode } });
  const In = (val, on, w, dir) => (
    <input className="pt-in" dir={dir} style={{ width: w || "100%", padding: "6px 9px", fontSize: 12 }} value={val} onChange={(e) => on(e.target.value)} />
  );
  return (
    <>
      <div className="pt-h1">محتوى الصفحة الرئيسية<small>حرّر البانرات والأقسام — تظهر فوراً في المتجر</small></div>

      <PageBuilder />

      <Group icon="🏷️" title="تبويب العروض" sub="منطقة العروض + أنماط صفوفه (يُبنى تلقائياً من الخصومات)">
        <div className="pt-row2" style={{ marginBottom: 10 }}>
          <div className="pt-field"><label>عنوان البانر</label>{In(dealZone?.title || "", (v) => setDZ({ title: v }))}</div>
          <div className="pt-field"><label>الوصف الفرعي</label>{In(dealZone?.subtitle || "", (v) => setDZ({ subtitle: v }))}</div>
        </div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>القيمة</th><th>التسمية</th><th>سطر فرعي</th><th>النوع</th><th>الحد / النسبة</th></tr></thead>
            <tbody>
              {(dealZone?.tiles || []).map((t, i) => (
                <tr key={t.id}>
                  <td>{In(t.value, (v) => setTile(i, { value: v }), 75)}</td>
                  <td>{In(t.label, (v) => setTile(i, { label: v }), 70)}</td>
                  <td>{In(t.sub, (v) => setTile(i, { sub: v }), 95)}</td>
                  <td>
                    <select className="pt-in" style={{ width: 110, padding: "6px 8px", fontSize: 12 }} value={t.type} onChange={(e) => setTile(i, { type: e.target.value })}>
                      <option value="max">سعر أقصى</option>
                      <option value="minoff">خصم أدنى</option>
                    </select>
                  </td>
                  <td>{In(String(t.n), (v) => setTile(i, { n: +v || 0 }), 80, "ltr")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pt-subhead">🎚️ نمط عرض كل صف</div>
        {DEALS_ROWS.map((title) => {
          const mode = rowLayouts[title] || "grid";
          return (
            <div key={title} className="pt-layout-row">
              <span className="nm">{title}</span>
              <div className="pt-seg">
                <button className={"seg" + (mode === "grid" ? " on" : "")} onClick={() => setLayout(title, "grid")}>▦ 3×2</button>
                <button className={"seg" + (mode === "slide" ? " on" : "")} onClick={() => setLayout(title, "slide")}>⇄ سلايد</button>
              </div>
            </div>
          );
        })}
      </Group>


      <div className="pt-h2">🧩 محتوى الكتل الجاهزة<small>البانرات والبطاقات — مكانها وترتيبها من المنشئ أعلاه</small></div>

      <div className="pt-card">
        <div className="cap">بانرات العروض العريضة<span className="sp" />
          <button className="pt-btn sm" onClick={addBanner}><Plus size={13} style={{ verticalAlign: -2 }} /> بانر</button></div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>العنوان</th><th>الوصف</th><th>زر</th><th>إيموجي</th><th>الخلفية (CSS)</th><th></th></tr></thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b.id}>
                  <td>{In(b.t, (v) => updateBanner(b.id, { t: v }), 120)}</td>
                  <td>{In(b.sub, (v) => updateBanner(b.id, { sub: v }), 190)}</td>
                  <td>{In(b.cta, (v) => updateBanner(b.id, { cta: v }), 80)}</td>
                  <td>{In(b.e, (v) => updateBanner(b.id, { e: v }), 55)}</td>
                  <td>{In(b.bg, (v) => updateBanner(b.id, { bg: v }), 230, "ltr")}</td>
                  <td><button className="pt-btn warn sm" onClick={() => removeBanner(b.id)}><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">البطاقات الثلاثية (صيدلية/حيوانات/أطفال)</div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>العنوان</th><th>الوصف</th><th>إيموجي</th><th>الخلفية</th><th>لون العنوان</th></tr></thead>
            <tbody>
              {trio.map((c, i) => (
                <tr key={i}>
                  <td>{In(c.t, (v) => updateTrio(i, { t: v }), 130)}</td>
                  <td>{In(c.sub, (v) => updateTrio(i, { sub: v }), 200)}</td>
                  <td>{In(c.e, (v) => updateTrio(i, { e: v }), 55)}</td>
                  <td>{In(c.bg, (v) => updateTrio(i, { bg: v }), 95, "ltr")}</td>
                  <td>{In(c.fg, (v) => updateTrio(i, { fg: v }), 95, "ltr")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">متاجر يحبها الجميع<span className="sp" />
          <button className="pt-btn sm" onClick={addBigStore}><Plus size={13} style={{ verticalAlign: -2 }} /> متجر</button></div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>الاسم</th><th>الوصف</th><th>إيموجي</th><th>الخلفية</th><th></th></tr></thead>
            <tbody>
              {bigStores.map((g) => (
                <tr key={g.id}>
                  <td>{In(g.t, (v) => updateBigStore(g.id, { t: v }), 140)}</td>
                  <td>{In(g.sub, (v) => updateBigStore(g.id, { sub: v }), 180)}</td>
                  <td>{In(g.e, (v) => updateBigStore(g.id, { e: v }), 55)}</td>
                  <td>{In(g.bg, (v) => updateBigStore(g.id, { bg: v }), 95, "ltr")}</td>
                  <td><button className="pt-btn warn sm" onClick={() => removeBigStore(g.id)}><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- المالية: صافي الربح والتسويات ---------------- */
const PERIODS = [["اليوم", 24 * 60 * 60 * 1000], ["آخر 7 أيام", 7 * 24 * 60 * 60 * 1000], ["كل الفترة", null]];

function Finance() {
  const state = useStore((s) => s);
  const [period, setPeriod] = useState(2);
  const sum = financeSummary(state, PERIODS[period][1]);
  const mName = (id) => state.merchants.find((m) => m.id === id)?.name || id;
  const cName = (id) => state.couriers.find((c) => c.id === id)?.name || id;

  return (
    <>
      <div className="pt-h1">المالية<small>الأرباح والتسويات — تُحسب من الطلبات المُسلّمة تلقائياً</small></div>

      <div className="pt-card">
        <div className="cap">ملخص الفترة<span className="sp" />
          <select className="pt-in" value={period} onChange={(e) => setPeriod(+e.target.value)}>
            {PERIODS.map(([l], i) => <option key={l} value={i}>{l}</option>)}
          </select>
        </div>
        <div className="pt-stats" style={{ padding: 14, marginBottom: 0, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
          <Stat Icon={Wallet} l="إيراد الطلبات المُسلّمة" v={`${fmt(sum.revenue)} ${CUR}`} d={`${sum.deliveredCount} توصيلة`} />
          <Stat Icon={Coins} l="عمولات المتاجر" v={`${fmt(sum.commissions)} ${CUR}`} />
          <Stat Icon={Coins} l="رسوم التوصيل والخدمة" v={`${fmt(sum.deliveryFees + sum.serviceFees)} ${CUR}`} />
          <Stat Icon={Bike} l="أجور المندوبين" v={`− ${fmt(sum.wages)} ${CUR}`} />
          <Stat Icon={CheckCircle2} l="💰 صافي ربح المنصة" v={`${fmt(sum.net)} ${CUR}`} />
        </div>
        <div className="pt-note">الصافي = العمولات + رسوم التوصيل والخدمة − أجور المندوبين. قيمة البضاعة تعود للتجار والبقشيش للمندوبين.</div>
      </div>

      <div className="pt-card">
        <div className="cap">🏪 تسويات التجار<span className="sp" /><span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--p-mut)" }}>ادفع مستحقاتهم ثم يؤكدون الاستلام من لوحتهم</span></div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>المتجر</th><th>العمولة</th><th>مستحق غير مسوّى</th><th>طلبات</th><th></th></tr></thead>
            <tbody>
              {state.merchants.map((m) => {
                const d = merchantDues(state, m.id);
                return (
                  <tr key={m.id}>
                    <td><b>{m.name}</b></td>
                    <td>{m.commission ?? 10}%</td>
                    <td style={{ fontWeight: 900, color: d.amount ? "#0C831F" : "var(--p-mut)" }}>{fmt(d.amount)} {CUR}</td>
                    <td>{d.rows.length}</td>
                    <td>
                      <button className="pt-btn sm" disabled={!d.amount} style={{ opacity: d.amount ? 1 : 0.45 }}
                        onClick={() => settleMerchant(m.id, d.amount, d.rows.map((r) => r.id))}>
                        تسوية الآن
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">🏍️ نقد المندوبين<span className="sp" /><span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--p-mut)" }}>يسلّمون النقد من لوحتهم وتؤكد الاستلام هنا</span></div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>المندوب</th><th>نقد بذمّته</th><th>أجوره + بقشيشه</th><th>طلبات نقدية</th></tr></thead>
            <tbody>
              {state.couriers.map((c) => {
                const cash = courierCash(state, c.id);
                return (
                  <tr key={c.id}>
                    <td><b>{c.name}</b></td>
                    <td style={{ fontWeight: 900, color: cash.remitDue ? "#b3261e" : "var(--p-mut)" }}>{fmt(cash.remitDue)} {CUR}</td>
                    <td style={{ color: "#0C831F", fontWeight: 800 }}>{fmt(cash.wages + cash.tips)} {CUR}</td>
                    <td>{cash.remitOrderIds.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-card">
        <div className="cap">📜 سجل التسويات</div>
        <div className="pt-scroll">
          <table className="pt-table">
            <thead><tr><th>رقم</th><th>النوع</th><th>الطرف</th><th>المبلغ</th><th>طلبات</th><th>الحالة</th><th>الوقت</th><th></th></tr></thead>
            <tbody>
              {state.settlements.map((st) => (
                <tr key={st.id}>
                  <td style={{ fontSize: 10.5, color: "var(--p-mut)" }}>{st.id.slice(-5)}</td>
                  <td>{st.kind === "merchant" ? "🏪 دفعة لتاجر" : "🏍️ نقد من مندوب"}</td>
                  <td><b>{st.kind === "merchant" ? mName(st.partyId) : cName(st.partyId)}</b></td>
                  <td style={{ fontWeight: 900 }}>{fmt(st.amount)} {CUR}</td>
                  <td>{(st.orders || []).length}</td>
                  <td><span className={"pt-badge " + (st.status === "مؤكدة" ? "pt-b-done" : "pt-b-prep")}>{st.status}</span></td>
                  <td>{timeAgo(st.time)}</td>
                  <td>
                    {st.kind === "courier" && st.status !== "مؤكدة" && (
                      <button className="pt-btn sm" onClick={() => confirmSettlement(st.id)}>تأكيد الاستلام ✓</button>
                    )}
                  </td>
                </tr>
              ))}
              {state.settlements.length === 0 && <tr><td colSpan="8"><div className="pt-empty">لا تسويات بعد — ستظهر هنا عند أول تسوية</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
