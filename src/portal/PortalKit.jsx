import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, ExternalLink, Moon, Sun, Volume2, VolumeX } from "lucide-react";

/* عدّة البوابات: قشرة موحّدة + بوابة دخول + عناصر صغيرة مشتركة */

/* تفضيلات البوابة (ليلي/صوت) — تُحفظ لكل جهاز */
export function usePortalPrefs(ns) {
  const [dark, setDark] = useState(() => localStorage.getItem(`bk-${ns}-dark`) === "1");
  const [sound, setSound] = useState(() => localStorage.getItem(`bk-${ns}-sound`) !== "0");
  const toggleDark = () => setDark((v) => { localStorage.setItem(`bk-${ns}-dark`, v ? "0" : "1"); return !v; });
  const toggleSound = () => setSound((v) => { localStorage.setItem(`bk-${ns}-sound`, v ? "0" : "1"); return !v; });
  return { dark, toggleDark, sound, toggleSound };
}

/* تنبيه صوتي عند ازدياد عدّاد (طلب جديد) — نغمتان قصيرتان */
export function useOrderAlert(count, enabled) {
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current && enabled) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const t = ctx.currentTime;
        const tone = (f, at) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = "sine"; o.frequency.value = f;
          o.connect(g); g.connect(ctx.destination);
          g.gain.setValueAtTime(0.0001, t + at);
          g.gain.exponentialRampToValueAtTime(0.22, t + at + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.25);
          o.start(t + at); o.stop(t + at + 0.3);
        };
        tone(880, 0); tone(1245, 0.18);
      } catch { /* المتصفح منع الصوت قبل أول تفاعل */ }
    }
    prev.current = count;
  }, [count, enabled]);
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
            <span className="pt-topbtn" title={prefs.sound ? "كتم تنبيه الطلبات" : "تفعيل تنبيه الطلبات"} onClick={prefs.toggleSound}>
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
          {tabs.map((t) => (
            <div key={t.id} className={"it" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
              <t.Icon size={17} strokeWidth={2.2} />{t.l}
            </div>
          ))}
        </div>
        <div className="pt-main">{children}</div>
      </div>
      <div className="pt-tabs">
        {tabs.map((t) => (
          <div key={t.id} className={"it" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
            <t.Icon size={19} strokeWidth={2.2} />{t.l}
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
