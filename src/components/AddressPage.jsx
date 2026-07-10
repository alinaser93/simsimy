import { useState } from "react";
import { ChevronRight, Search, Plus, MapPin, Trash2, LocateFixed, Loader2 } from "lucide-react";
import { useStore, addAddress, selectAddress, removeAddress, updateAddress } from "../store/appStore.js";
import MapView from "./MapView.jsx";
import { getCurrentLocation, reverseGeocode } from "../utils/geo.js";

/* اختيار موقع التوصيل + إضافة عنوان جديد — كما في التطبيق الأصلي */
export default function AddressPage({ onBack }) {
  const addresses = useStore((s) => s.addresses);
  const selected = useStore((s) => s.selectedAddress);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);   // عند التعديل: معرّف العنوان
  const storeLoc = useStore((s) => s.storeLocation);
  const userPhone = useStore((s) => s.user.phone);
  const [f, setF] = useState({ label: "المنزل", details: "", phone: "" });
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState("");

  const detectLocation = async () => {
    setLocating(true); setLocErr("");
    try {
      const loc = await getCurrentLocation();
      setCoords({ lat: loc.lat, lng: loc.lng });
      const addr = await reverseGeocode(loc.lat, loc.lng);
      setF((prev) => ({ ...prev, details: addr }));
    } catch (e) { setLocErr(e.message); }
    setLocating(false);
  };

  const startEdit = (a) => {
    setEditId(a.id);
    setF({ label: a.label || "المنزل", details: a.details || "", phone: a.phone || "" });
    setCoords(a.lat && a.lng ? { lat: a.lat, lng: a.lng } : null);
    setAdding(true);
  };
  const cancel = () => { setAdding(false); setEditId(null); setF({ label: "المنزل", details: "", phone: "" }); setCoords(null); };
  const save = () => {
    if (!f.details.trim()) return;
    const phone = (f.phone || "").trim() || userPhone || "";   // رقم حسابك تلقائياً إن تُرك فارغاً
    if (editId) {
      updateAddress(editId, { label: f.label || "عنوان", details: f.details.trim(), phone, ...(coords ? { lat: coords.lat, lng: coords.lng } : {}) });
    } else {
      addAddress(f.label || "عنوان", f.details.trim(), phone, coords);
    }
    cancel();
    onBack();
  };

  return (
    <div className="bk-page">
      <div className="bk-phead">
        <div className="bk-back" onClick={onBack}><ChevronRight size={22} strokeWidth={2.5} /></div>
        <div className="ti">اختر موقع التوصيل</div>
      </div>

      <div className="bk-pbody">
        <div className="bk-srch-head" style={{ borderBottom: "none", background: "transparent" }}>
          <div className="bk-srch-in"><Search size={17} color="#8a8a8a" /><input placeholder="ابحث عن منطقة، اسم شارع…" /></div>
        </div>

        {!adding ? (
          <div className="bk-addr-add" onClick={() => { setEditId(null); setF({ label: "المنزل", details: "", phone: "" }); setCoords(null); setAdding(true); }}><Plus size={18} strokeWidth={2.6} /> إضافة عنوان جديد</div>
        ) : (
          <div className="bk-cardbox" style={{ padding: 14 }}>
            <div className={"bk-locbox" + (coords ? " open" : "")}>
              <button className="bk-gps-btn" onClick={detectLocation} disabled={locating}>
                {locating ? <Loader2 size={17} className="spin" /> : <LocateFixed size={17} />}
                {locating ? "جارٍ تحديد موقعك…" : "📍 حدّد موقعي تلقائياً (GPS)"}
              </button>
              {coords && (
                <div className="bk-map-pick">
                  <MapView center={[coords.lat, coords.lng]} zoom={16} height={200} draggablePin
                    markers={[{ lat: coords.lat, lng: coords.lng, type: "home", label: "اسحب الدبّوس لضبط موقعك" }]}
                    onPinMove={async (lat, lng) => { setCoords({ lat, lng }); const addr = await reverseGeocode(lat, lng); setF((prev) => ({ ...prev, details: addr })); }} />
                  <div className="bk-map-hint">🎯 اسحب الدبّوس لضبط موقعك بدقّة</div>
                </div>
              )}
            </div>
            {locErr && <div className="lg-err" style={{ marginBottom: 8 }}>{locErr}</div>}
            <div className="pt-field"><label>تفاصيل العنوان (المنطقة، الشارع، الدار/الطابق)</label>
              <input className="pt-in" placeholder="مثال: الكرادة، شارع 62، بناية 14، ط2" value={f.details}
                onChange={(e) => setF({ ...f, details: e.target.value })} /></div>
            <div className="pt-field"><label>رقم الهاتف</label>
              <input className="pt-in" dir="ltr" placeholder={userPhone || "07xx xxx xxxx"} value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })} />
              {!f.phone && userPhone && <div className="bk-tip-note" style={{ padding: "4px 0 0" }}>سيُستخدم رقم حسابك: {userPhone}</div>}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="pt-btn" style={{ flex: 1 }} onClick={save}>{editId ? "حفظ التعديلات" : "حفظ العنوان"}</button>
              <button className="pt-btn ghost" onClick={cancel}>إلغاء</button>
            </div>
          </div>
        )}

        <div className="bk-srch-sec" style={{ paddingBottom: 6 }}>عناوينك المحفوظة</div>
        <div className="bk-cardbox" style={{ background: "transparent", border: "none", borderRadius: 0, overflow: "visible", boxShadow: "none" }}>
          {addresses.map((a) => (
            <div className={"bk-addr-card" + (selected === a.id ? " sel" : "")} key={a.id} onClick={() => startEdit(a)}>
              <span className="e">{a.label === "العمل" ? "🏢" : "🏠"}</span>
              <div className="inf">
                <b>{a.label} {selected === a.id && <span style={{ color: "#0C831F", fontSize: 10.5 }}>· المحدد ✓</span>}</b>
                <span>{a.details}</span>
                <div className="ph">📞 {a.phone}</div>
              </div>
              <div className="bk-addr-acts">
                {selected !== a.id && (
                  <button className="bk-addr-pick" onClick={(e) => { e.stopPropagation(); selectAddress(a.id); onBack(); }}>تحديد</button>
                )}
                {addresses.length > 1 && (
                  <button className="bk-addr-del" onClick={(e) => { e.stopPropagation(); removeAddress(a.id); }} aria-label="حذف">
                    <Trash2 size={15} strokeWidth={2.2} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="bk-tip-note" style={{ paddingTop: 8 }}><MapPin size={12} style={{ verticalAlign: -2 }} /> اختيارك يُستخدم في حساب زمن التوصيل وظهور العنوان أعلى المتجر.</div>
      </div>
    </div>
  );
}
