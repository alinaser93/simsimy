import { memo } from "react";
import { ChevronDown, User, TrendingUp } from "lucide-react";
import { hexToRgb, rgb, rgba } from "../utils/color.js";
import { useStore } from "../store/appStore.js";

// معلومات التوصيل أعلى الهيدر — تنطوي عند التمرير
function DeliveryInfo({ theme }) {
  const oh = hexToRgb(theme.onHead);
  const eta = useStore((s) => s.settings.eta);
  const t = useStore((s) => s.texts);
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
        <div className="bk-loc" style={{ color: theme.sub }}>
          <b style={{ color: rgb(oh) }}>{t.addressTitle}</b> - {t.address} <ChevronDown size={16} strokeWidth={2.6} />
        </div>
      </div>
      <div className="bk-headicons">
        <div className="bk-mapw">💳</div>
        <div className="bk-profile"><User size={22} strokeWidth={2} color={rgb(oh)} /></div>
      </div>
    </div>
  );
}
export default memo(DeliveryInfo);
