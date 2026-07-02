import { useStore } from "../store/appStore.js";

export default function WelcomeHero() {
  const t = useStore((s) => s.texts);
  return (
    <div className="bk-whero">
      <div className="rays" />
      <div className="wh-hand l">🛍️</div>
      <div className="wh-title">{t.welcomeTitle}</div>
      <div className="wh-sub">{t.welcomeSub}</div>
      <div className="wh-hand r">🛍️</div>
    </div>
  );
}
