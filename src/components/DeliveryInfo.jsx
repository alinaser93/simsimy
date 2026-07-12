import { memo } from "react";
import { ChevronDown, User, TrendingUp, Wallet } from "lucide-react";
import { hexToRgb, rgb, rgba } from "../utils/color.js";
import { useStore } from "../store/appStore.js";

// معلومات التوصيل أعلى الهيدر — تنطوي عند التمرير
function DeliveryInfo({ theme }) {
  const oh = hexToRgb(theme.onHead);
  const eta = useStore((s) => s.settings.eta);
  const t = useStore((s) => s.texts);
  const points = useStore((s) => s.user.points || 0);
  const addresses = useStore((s) => s.addresses);
  const selectedAddress = useStore((s) => s.selectedAddress);
  // اعرض العنوان المحدد فعلياً من دفتر العناوين (لا نصاً ثابتاً)
  const addr = addresses.find((a) => a.id === selectedAddress) || addresses[0];
  const addrTitle = addr?.label || t.addressTitle;
  const fullText = addr?.details || t.address;
  // اعرض اسم المنطقة/المكان بلا المحافظة أو الدولة (اختصاراً للهيدر)
  const placeOnly = (txt) => {
    if (!txt) return "";
    const parts = txt.split("،").map((p) => p.trim()).filter(Boolean)
      .filter((p) => !/^محافظة|^العراق|^الع?راق|^iraq/i.test(p));   // احذف المحافظة والدولة فقط
    if (!parts.length) return txt;
    // المنطقة + المدينة إن وُجدا (أول جزأين)، بلا المحافظة
    return parts.slice(0, 2).join("، ");
  };
  const addrText = placeOnly(fullText);
  return (
    <div className="bk-deliv">
      <div>
        <div className="lbl" style={{ color: rgba(oh, 0.9) }}>التوصيل خلال</div>
        <div className="min" style={{ color: rgb(oh) }}>
          {eta ?? theme.eta} دقيقة
          {theme.surge
            ? <span className="bk-surge"><TrendingUp size={12} strokeWidth={2.6} />أسعار الذروة</span>
            : <span className="bk-247" style={{ color: theme.badge, borderColor: theme.badgeBorder }}>على مدار الساعة</span>}
        </div>
        <div className="bk-loc" style={{ color: theme.sub, cursor: "pointer" }} onClick={() => window.dispatchEvent(new CustomEvent("bk:openAddress"))}>
          <b style={{ color: rgb(oh) }}>{addrTitle}</b> - {addrText} <ChevronDown size={16} strokeWidth={2.6} />
        </div>
      </div>
      <div className="bk-headicons">
        <div className="bk-wallet" onClick={() => window.dispatchEvent(new CustomEvent("bk:openProfile"))} title="محفظتي · نقاطي">
          <Wallet size={16} strokeWidth={2.3} color="#fff" />
          <span className="wn">{points}</span>
          <span className="wl">نقطة</span>
        </div>
        <div className="bk-profile" onClick={() => window.dispatchEvent(new CustomEvent("bk:openProfile"))}><User size={22} strokeWidth={2} color={rgb(oh)} /></div>
      </div>
    </div>
  );
}
export default memo(DeliveryInfo);
