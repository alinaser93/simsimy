import { useStore } from "../store/appStore.js";

// شاشة البداية — تظهر ثانيتين ثم تنزلق للأعلى (انقر للتخطي)
export default function SplashScreen({ exiting, onSkip }) {
  const t = useStore((s) => s.texts);
  return (
    <div className={"bk-splash" + (exiting ? " out" : "")} onClick={onSkip}>
      <div className="bk-logo"><span className="b"><img src="/logo-sesame.png" alt={t.appName} onError={(e) => { e.target.style.display = "none"; e.target.parentNode.textContent = t.logoLetter; }} /></span>{t.appName}</div>
      <div className="bk-tagline">{t.tagline}</div>
      <div className="bk-welcome">{t.splashWelcome}</div>
      <div className="bk-load"><i /></div>
    </div>
  );
}
