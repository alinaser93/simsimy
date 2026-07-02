import { useStore } from "../store/appStore.js";

// بانرات عروض عريضة قابلة للتمرير أفقياً
export default function BannerCarousel({ onOpen }) {
  const WIDE_BANNERS = useStore((s) => s.banners);
  return (
    <div className="bk-wbanners hide-sb">
      {WIDE_BANNERS.map((b) => (
        <div className="bk-wbanner" key={b.id} style={{ background: b.bg }} onClick={() => onOpen(b.t)}>
          <div className="tx">
            <div className="t" style={{ color: b.fg }}>{b.t}</div>
            <div className="s" style={{ color: b.fg }}>{b.sub}</div>
            <div className="cta">{b.cta}</div>
          </div>
          <div className="e">{b.e}</div>
        </div>
      ))}
    </div>
  );
}
