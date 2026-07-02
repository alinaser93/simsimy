import { useStore } from "../store/appStore.js";

// «متاجر يحبها الجميع» — بطاقات كبيرة بعمودين
export default function BigStores({ onOpen }) {
  const BIG_STORES = useStore((s) => s.bigStores);
  return (
    <>
      <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">متاجر يحبها الجميع</div></div></div>
      <div className="bk-bigstores">
        {BIG_STORES.map((s) => (
          <div className="bk-bigstore" key={s.id} onClick={() => onOpen(s.t)}>
            <div className="img" style={{ background: s.bg }}>{s.e}</div>
            <div className="t">{s.t}</div>
            <div className="s">{s.sub}</div>
          </div>
        ))}
      </div>
    </>
  );
}
