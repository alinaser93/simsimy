import { BESTSELLERS } from "../data/collections.js";

// «الأكثر مبيعاً»: شبكة 3 أعمدة، كل بطاقة فيها 2×2 صور وشارة «+المزيد»
export default function Bestsellers({ onOpen }) {
  return (
    <>
      <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">الأكثر مبيعاً</div></div></div>
      <div className="bk-bs-grid">
        {BESTSELLERS.map((b, i) => (
          <div className="bk-bs" key={i} onClick={() => onOpen(b.title)}>
            <div className="bk-bs-g">
              {b.items.map((e, j) => <div className="bk-bs-th" key={j}>{e}</div>)}
              <div className="bk-bs-more">+{b.more} المزيد</div>
            </div>
            <div className="bk-bs-t">{b.title}</div>
          </div>
        ))}
      </div>
    </>
  );
}
