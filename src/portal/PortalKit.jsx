import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, ExternalLink, Moon, Sun, Volume2, VolumeX, Bell, BellOff } from "lucide-react";
import { requestNotifyPermission, notifyPermission, showNotification, playBeep } from "../utils/notify.js";

/* عدّة البوابات: قشرة موحّدة + بوابة دخول + عناصر صغيرة مشتركة */

/* تفضيلات البوابة (ليلي/صوت) — تُحفظ لكل جهاز */
export function usePortalPrefs(ns) {
  const [dark, setDark] = useState(() => localStorage.getItem(`bk-${ns}-dark`) === "1");
  const [sound, setSound] = useState(() => localStorage.getItem(`bk-${ns}-sound`) !== "0");
  const [notif, setNotif] = useState(() => localStorage.getItem(`bk-${ns}-notif`) === "1" && notifyPermission() === "granted");
  const toggleDark = () => setDark((v) => { localStorage.setItem(`bk-${ns}-dark`, v ? "0" : "1"); return !v; });
  const toggleSound = () => setSound((v) => { localStorage.setItem(`bk-${ns}-sound`, v ? "0" : "1"); return !v; });
  const toggleNotif = async () => {
    if (notif) { localStorage.setItem(`bk-${ns}-notif`, "0"); setNotif(false); return; }
    const perm = await requestNotifyPermission();
    if (perm === "granted") { localStorage.setItem(`bk-${ns}-notif`, "1"); setNotif(true); showNotification("✅ الإشعارات مُفعّلة", "ستصلك تنبيهات الطلبات الجديدة فوراً"); }
    else if (perm === "denied") alert("الإشعارات محظورة — فعّلها من إعدادات المتصفح لهذا الموقع");
    else if (perm === "unsupported") alert("متصفحك لا يدعم الإشعارات");
  };
  return { dark, toggleDark, sound, toggleSound, notif, toggleNotif };
}

/* تنبيه عند ازدياد عدّاد (طلب جديد): نغمة + إشعار متصفح.
   opts: { sound, notif, title, body } */
export function useOrderAlert(count, opts) {
  // دعم التوقيع القديم: useOrderAlert(count, boolEnabled)
  const cfg = typeof opts === "boolean" ? { sound: opts, notif: false } : (opts || {});
  const prev = useRef(count);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; prev.current = count; return; } // لا تنبّه عند أول تحميل
    if (count > prev.current) {
      if (cfg.sound) playBeep();
      if (cfg.notif) showNotification(cfg.title || "🛒 طلب جديد", cfg.body || "لديك طلب جديد", { tag: "new-order", renotify: true });
    }
    prev.current = count;
  }, [count, cfg.sound, cfg.notif, cfg.title, cfg.body]);
}

export function Shell({ role, tabs, tab, setTab, children, onLogout, who, prefs }) {
  return (
    <div className={"pt-root" + (prefs?.dark ? " dark" : "")}>
      <div className="pt-top">
        <div className="logo"><span className="b">ب</span>بلينكيت</div>
        <span className="role">{role}{who ? ` · ${who}` : ""}</span>
        <span className="sp" />
        {prefs && (
          <>
            <span className="pt-topbtn" title={prefs.notif ? "إيقاف إشعارات المتصفح" : "تفعيل إشعارات المتصفح"} onClick={prefs.toggleNotif} style={prefs.notif ? { color: "#0C831F" } : undefined}>
              {prefs.notif ? <Bell size={16} /> : <BellOff size={16} />}
            </span>
            <span className="pt-topbtn" title={prefs.sound ? "كتم نغمة الطلبات" : "تفعيل نغمة الطلبات"} onClick={prefs.toggleSound}>
              {prefs.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </span>
            <span className="pt-topbtn" title={prefs.dark ? "الوضع الفاتح" : "الوضع الليلي"} onClick={prefs.toggleDark}>
              {prefs.dark ? <Sun size={16} /> : <Moon size={16} />}
            </span>
          </>
        )}
        <Link to="/" className="store-link"><ExternalLink size={13} style={{ marginLeft: 4, verticalAlign: -2 }} />المتجر</Link>
        <span className="out" onClick={onLogout}><LogOut size={14} />خروج</span>
      </div>
      <div className="pt-shell">
        <div className="pt-side">
          {tabs.map((t, i) => t.group ? (
            <div key={"g" + i} className="pt-tabgroup">{t.group}</div>
          ) : (
            <div key={t.id} className={"it" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
              <t.Icon size={17} strokeWidth={2.2} />{t.l}{t.badge && <span className="pt-tab-badge">{t.badge}</span>}
            </div>
          ))}
        </div>
        <div className="pt-main">{children}</div>
      </div>
      <div className="pt-tabs">
        {tabs.filter((t) => !t.group).map((t) => (
          <div key={t.id} className={"it" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)} style={{ position: "relative" }}>
            <t.Icon size={19} strokeWidth={2.2} />{t.l}{t.badge && <span className="pt-tab-badge">{t.badge}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Gate({ title, sub, pin, storageKey, demo, children, extra }) {
  const [ok, setOk] = useState(() => sessionStorage.getItem(storageKey) === "1");
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const logout = () => { sessionStorage.removeItem(storageKey); setOk(false); };
  if (ok) return children(logout);
  const submit = () => {
    if (val === pin) { sessionStorage.setItem(storageKey, "1"); setOk(true); }
    else setErr(true);
  };
  return (
    <div className="pt-login">
      <div className="box">
        <div className="lg"><span className="b">ب</span>{title}</div>
        <div className="sub">{sub}</div>
        {extra}
        <div className="pt-field">
          <label>كلمة المرور</label>
          <input className="pt-in" type="password" inputMode="numeric" value={val}
            onChange={(e) => { setVal(e.target.value); setErr(false); }}
            onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••" />
        </div>
        {err && <div className="pt-err">كلمة المرور غير صحيحة</div>}
        <button className="pt-btn" style={{ width: "100%", marginTop: 6 }} onClick={submit}>دخول</button>
        <div className="demo">🔑 حساب تجريبي — كلمة المرور: <b>{demo}</b></div>
      </div>
    </div>
  );
}

const BADGE = {
  "جديد": "pt-b-new", "قيد التجهيز": "pt-b-prep", "جاهز للتوصيل": "pt-b-ready",
  "في الطريق": "pt-b-way", "وصل المندوب": "pt-b-arr", "تم التوصيل": "pt-b-done", "ملغي": "pt-b-cancel",
};
export function StatusBadge({ s }) {
  return <span className={"pt-badge " + (BADGE[s] || "pt-b-new")}>{s}</span>;
}

export function Switch({ on, onToggle }) {
  return <span className={"pt-sw" + (on ? " on" : "")} onClick={onToggle}><i /></span>;
}

export function Stat({ Icon, l, v, d }) {
  return (
    <div className="pt-stat">
      <div className="l"><Icon size={15} strokeWidth={2.3} />{l}</div>
      <div className="v">{v}</div>
      {d && <div className="d">{d}</div>}
    </div>
  );
}

export const timeAgo = (iso) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso)) / 60000));
  if (m < 60) return `قبل ${m} د`;
  const h = Math.round(m / 60);
  return h < 24 ? `قبل ${h} س` : `قبل ${Math.round(h / 24)} يوم`;
};
