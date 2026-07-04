import { useState } from "react";
import {
  Store, Camera, Trash2, Bell, MapPin, QrCode, Clock, LocateFixed, Loader2, Video, Image as ImageIcon, Check,
} from "lucide-react";
import { useStore, updateMerchant } from "../store/appStore.js";
import { Switch } from "../portal/PortalKit.jsx";
import MapView from "../components/MapView.jsx";
import { getCurrentLocation, reverseGeocode } from "../utils/geo.js";
import { uploadImage } from "../utils/supabase.js";
import { requestNotifyPermission, notifyPermission } from "../utils/notify.js";

const CATS = ["بقالة وأغذية", "خضار وفواكه", "لحوم وأسماك", "مخبز وحلويات", "جمال وعناية", "إلكترونيات", "صيدلية", "مطعم", "أخرى"];
const DAYS = [["sun", "الأحد"], ["mon", "الاثنين"], ["tue", "الثلاثاء"], ["wed", "الأربعاء"], ["thu", "الخميس"], ["fri", "الجمعة"], ["sat", "السبت"]];
const HOURS = Array.from({ length: 48 }, (_, i) => { const h = Math.floor(i / 2), m = i % 2 ? "30" : "00"; const ap = h < 12 ? "AM" : "PM"; const hh = h % 12 === 0 ? 12 : h % 12; return `${hh}:${m} ${ap}`; });

/* بيانات المتجر — غلاف، شعار، تصنيف، هاتف، وصف، إشعارات، موقع، QR، ساعات العمل */
export default function StoreEditor({ mid, prefs }) {
  const me = useStore((s) => s.merchants.find((m) => m.id === mid)) || {};
  const [uploading, setUploading] = useState("");
  const [locating, setLocating] = useState(false);
  const [locMsg, setLocMsg] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [saved, setSaved] = useState(false);

  const upd = (patch) => updateMerchant(mid, patch);
  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500); };

  const uploadTo = async (key, file) => {
    if (!file) return;
    setUploading(key);
    try { const url = await uploadImage(file); if (url) { upd({ [key]: url }); flash(); } else alert("تعذّر الرفع — تأكّد من إعداد Supabase"); }
    catch (e) { alert("خطأ في الرفع: " + e.message); }
    setUploading("");
  };

  const detectLocation = async () => {
    setLocating(true); setLocMsg("");
    try {
      const p = await getCurrentLocation();
      upd({ lat: p.lat, lng: p.lng });
      const addr = await reverseGeocode(p.lat, p.lng);
      upd({ lat: p.lat, lng: p.lng, address: addr });
      setLocMsg("✓ حُفظ الموقع: " + addr);
    } catch (e) { setLocMsg("⚠️ " + e.message); }
    setLocating(false);
  };

  const storeUrl = `${window.location.origin}/?store=${mid}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(storeUrl)}`;

  // ساعات العمل الأسبوعية
  const hrs = me.weeklyHours || {};
  const setDay = (d, patch) => upd({ weeklyHours: { ...hrs, [d]: { ...(hrs[d] || { open: "9:00 AM", close: "11:00 PM", closed: false }), ...patch } } });
  const applyToAll = () => { const sun = hrs.sun || { open: "9:00 AM", close: "11:00 PM", closed: false }; const all = {}; DAYS.forEach(([d]) => (all[d] = { ...sun })); upd({ weeklyHours: all }); flash(); };

  return (
    <div className="se-wrap">
      <div className="pt-h1">بيانات متجري<small>عدّل شعار وغلاف ووصف متجرك كما يظهر للزبائن</small></div>

      {/* حالة المتجر */}
      <div className="pt-card">
        <div className="se-status">
          <Switch on={me.open !== false} onToggle={() => upd({ open: !(me.open !== false) })} />
          <div>
            <b style={{ fontSize: 14 }}>{me.open !== false ? "🟢 متجرك مفتوح ويستقبل الطلبات" : "🔴 متجرك مغلق مؤقتاً"}</b>
            <div style={{ fontSize: 11.5, color: "var(--p-mut)" }}>أغلقه يدوياً في الإجازات أو خارج الدوام</div>
          </div>
        </div>
      </div>

      {/* غلاف المتجر */}
      <div className="pt-card se-sec">
        <div className="se-t"><ImageIcon size={16} /> غلاف المتجر (صورة وفيديو)</div>
        <div className="se-cover">
          {me.coverVideo ? (
            <video src={me.coverVideo} controls playsInline poster={me.cover || undefined} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : me.cover ? (
            <img src={me.cover} alt="غلاف" />
          ) : (
            <div className="se-cover-ph"><ImageIcon size={30} /><span>لا يوجد غلاف بعد</span></div>
          )}
        </div>
        {me.cover && me.coverVideo && <div className="se-desc" style={{ marginTop: 6, marginBottom: 0 }}>🎬 يظهر الفيديو للزبون؛ الصورة تُستخدم كغلاف احتياطي.</div>}
        <div className="se-btns">
          <label className="se-btn"><Camera size={15} /> {uploading === "cover" ? "جارٍ الرفع…" : "تغيير الصورة"}<input type="file" accept="image/*" hidden onChange={(e) => uploadTo("cover", e.target.files[0])} /></label>
          {me.cover && <button className="se-btn del" onClick={() => upd({ cover: "" })}><Trash2 size={14} /> حذف الصورة</button>}
          <label className="se-btn"><Video size={15} /> {uploading === "coverVideo" ? "جارٍ الرفع…" : "تغيير الفيديو"}<input type="file" accept="video/*" hidden onChange={(e) => uploadTo("coverVideo", e.target.files[0])} /></label>
          {me.coverVideo && <button className="se-btn del" onClick={() => upd({ coverVideo: "" })}><Trash2 size={14} /> حذف الفيديو</button>}
        </div>
      </div>

      {/* شعار المتجر */}
      <div className="pt-card se-sec">
        <div className="se-t"><Store size={16} /> شعار المتجر (يظهر دائرياً — الأفضل خلفية بيضاء)</div>
        <div className="se-logo-row">
          <div className="se-logo">{me.logo || me.img ? <img src={me.logo || me.img} alt="شعار" /> : <Store size={26} />}</div>
          <div className="se-btns" style={{ flex: 1 }}>
            <label className="se-btn"><Camera size={15} /> {uploading === "logo" ? "جارٍ الرفع…" : "رفع شعار"}<input type="file" accept="image/*" hidden onChange={(e) => uploadTo("logo", e.target.files[0])} /></label>
            {(me.logo || me.img) && <button className="se-btn del" onClick={() => upd({ logo: "", img: "" })}><Trash2 size={14} /> إزالة الشعار</button>}
          </div>
        </div>
      </div>

      {/* البيانات الأساسية */}
      <div className="pt-card se-sec">
        <div className="pt-field"><label>التصنيف</label>
          <select className="pt-in" value={me.cat || CATS[0]}
            onChange={(e) => { if (e.target.value === "__new") { const nc = prompt("اسم التصنيف الجديد:"); if (nc && nc.trim()) upd({ cat: nc.trim() }); } else upd({ cat: e.target.value }); }}>
            {[...new Set([me.cat, ...CATS].filter(Boolean))].map((c) => <option key={c} value={c}>{c}{!CATS.includes(c) ? " 🆕" : ""}</option>)}
            <option value="__new">➕ إضافة تصنيف جديد…</option>
          </select>
        </div>
        <div className="pt-field"><label>هاتف المتجر</label>
          <input className="pt-in se-phone" dir="ltr" placeholder="07XXXXXXXXX" value={me.phone || ""} onChange={(e) => upd({ phone: e.target.value })} /></div>
        <div className="pt-field"><label>وصف قصير للمتجر</label>
          <input className="pt-in" placeholder="مثال: متجرك العراقي الطازج — توصيل سريع" value={me.desc || ""} onChange={(e) => upd({ desc: e.target.value })} /></div>
      </div>

      {/* إشعارات الطلبات */}
      <div className="pt-card se-sec se-highlight">
        <div className="se-t"><Bell size={16} /> إشعارات الطلبات الجديدة</div>
        <div className="se-desc">فعّلها لتصلك تنبيهات الطلبات على جهازك حتى لو التطبيق مسكّر</div>
        <button className={"se-cta" + (prefs?.notif ? " on" : "")} onClick={prefs?.toggleNotif}>
          {prefs?.notif ? <><Check size={17} /> الإشعارات مُفعّلة</> : <><Bell size={17} /> فعّل إشعارات الجهاز (حتى لو التطبيق مسكّر)</>}
        </button>
      </div>

      {/* رمز QR */}
      <div className="pt-card se-sec">
        <div className="se-t"><QrCode size={16} /> رمز QR لمتجرك</div>
        <div className="se-desc">اطبعه وعلّقه في محلّك — الزبون يمسحه فيفتح متجرك مباشرة</div>
        {showQR ? (
          <div className="se-qr">
            <img src={qrSrc} alt="QR" />
            <div className="se-qr-url">{storeUrl}</div>
            <a className="se-btn" href={qrSrc} download={`qr-${me.name || "store"}.png`}><QrCode size={14} /> تنزيل الرمز</a>
          </div>
        ) : (
          <button className="se-cta green" onClick={() => setShowQR(true)}><QrCode size={17} /> اعرض رمز QR</button>
        )}
      </div>

      {/* موقع المتجر على الخريطة */}
      <div className="pt-card se-sec">
        <div className="se-t"><MapPin size={16} /> موقع المتجر على الخريطة</div>
        <div className="se-desc">يساعد المندوب يوصل متجرك بسرعة. كن داخل المتجر واضغط الزر مرّة واحدة.</div>
        <button className="se-cta green" onClick={detectLocation} disabled={locating}>
          {locating ? <><Loader2 size={16} className="spin" /> جارٍ التحديد…</> : <><LocateFixed size={16} /> تحديث موقعي الحالي</>}
        </button>
        {locMsg && <div className={"se-locmsg" + (locMsg.startsWith("✓") ? " ok" : "")}>{locMsg}</div>}
        {me.lat && me.lng && (
          <>
            <div className="se-locsaved"><Check size={14} /> الموقع محفوظ</div>
            <div style={{ borderRadius: 10, overflow: "hidden", marginTop: 8 }}>
              <MapView center={[me.lat, me.lng]} zoom={15} height={180} markers={[{ lat: me.lat, lng: me.lng, type: "store", label: me.name }]} />
            </div>
          </>
        )}
      </div>

      {/* ساعات العمل */}
      <div className="pt-card se-sec">
        <div className="se-t"><Clock size={16} /> ساعات العمل وحالة المتجر</div>
        <div className="se-desc">حدّد متى متجرك مفتوح — الزبون يرى «مفتوح / مغلق» مباشرة.</div>
        <div className="se-autohours">
          <Switch on={!!me.autoHours} onToggle={() => upd({ autoHours: !me.autoHours })} />
          <div><b style={{ fontSize: 13 }}>المتجر يعمل حسب الساعات</b><div style={{ fontSize: 11, color: "var(--p-mut)" }}>عند التفعيل، يُفتح ويُغلق تلقائياً حسب الجدول</div></div>
        </div>
        <div className="se-days">
          {DAYS.map(([d, label]) => {
            const day = hrs[d] || { open: "9:00 AM", close: "11:00 PM", closed: false };
            return (
              <div className="se-day" key={d}>
                <span className="se-dname">{label}</span>
                <button className={"se-dtoggle" + (day.closed ? " closed" : "")} onClick={() => setDay(d, { closed: !day.closed })}>{day.closed ? "مغلق" : "مفتوح"}</button>
                {!day.closed && (
                  <>
                    <select className="pt-in se-time" value={day.open} onChange={(e) => setDay(d, { open: e.target.value })}>{HOURS.map((h) => <option key={h}>{h}</option>)}</select>
                    <span className="se-dash">–</span>
                    <select className="pt-in se-time" value={day.close} onChange={(e) => setDay(d, { close: e.target.value })}>{HOURS.map((h) => <option key={h}>{h}</option>)}</select>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <button className="se-btn" style={{ marginTop: 10 }} onClick={applyToAll}>📋 طبّق ساعات «الأحد» على كل الأيام</button>
      </div>

      <div className="pt-note" style={{ margin: "4px 0 20px" }}>💡 عمولة المنصة على متجرك: <b>{me.commission ?? 10}%</b> — يضبطها الأدمن. كل التعديلات تُحفظ تلقائياً.</div>

      {saved && <div className="se-toast"><Check size={16} /> تم الحفظ</div>}
    </div>
  );
}
