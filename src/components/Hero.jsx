import { OCCASIONS } from "../data/collections.js";

export default function Hero({ hero }) {
  if (!hero) return null;
  if (hero.kind === "store") {
    return (
      <div className="bk-store" style={{ background: hero.bg, color: hero.text }}>
        <div className="rays" />
        <span className="spk l">✦</span>
        <h3>{hero.title}</h3>
        <p>{hero.sub}</p>
        <span className="spk r">✦</span>
      </div>
    );
  }
  if (hero.kind === "glow") {
    return (
      <div className={"bk-glow" + (hero.script ? " script" : "")} style={{ background: hero.bg }}>
        <div className="spk" style={{ color: hero.text }}>✦ ✧ ✦</div>
        <h3 style={{ color: hero.text }}>{hero.title}</h3>
        <p style={{ color: hero.subText }}>{hero.sub}</p>
      </div>
    );
  }
  if (hero.kind === "featured") {
    return (
      <div className="bk-hero-feat">
        <div className="bk-hero-chips hide-sb">
          {hero.chips.map((c, i) => (
            <div className="bk-fcard" key={i}>
              <div className="ft">مميّز</div>
              <div className="fe">{c.e}</div>
              <div className="fl">{c.t}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (hero.kind === "occasions") {
    return (
      <div className="bk-occ">
        {OCCASIONS.map((o, i) => (
          <div className="bk-occ-c" key={i} style={{ background: hero.cardBg }}>
            <div className="oe">{o.e}</div>
            <div className="ol">{o.t}</div>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
