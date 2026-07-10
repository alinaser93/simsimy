import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* مكوّن خريطة تفاعلي (Leaflet + OpenStreetMap — مجاني).
   props:
   - center: [lat, lng] مركز الخريطة
   - zoom
   - markers: [{ lat, lng, type: "home"|"courier"|"store", label }]
   - route: [[lat,lng], ...] خط المسار (اختياري)
   - draggablePin: إن true، يمكن سحب أول دبّوس (لاختيار الموقع) → onPinMove(lat,lng)
   - onPinMove
*/
const ICONS = {
  home: { emoji: "🏠", color: "#0C831F" },
  courier: { emoji: "🛵", color: "#E23744" },
  store: { emoji: "🏪", color: "#2A6ED9" },
  pin: { emoji: "📍", color: "#E23744" },
};

function makeIcon(type) {
  const c = ICONS[type] || ICONS.pin;
  return L.divIcon({
    className: "bk-mapicon",
    html: `<div class="bk-pin" style="--pc:${c.color}"><span>${c.emoji}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
  });
}

export default function MapView({ center = [33.3152, 44.3661], zoom = 14, markers = [], route = null, draggablePin = false, onPinMove, height = 260 }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ markers: [], route: null });

  // إنشاء الخريطة مرة واحدة
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, { zoomControl: false, attributionControl: false }).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 400);   // بعد استقرار التخطيط (يمنع الفراغ الجانبي)
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => map.invalidateSize()) : null;
    if (ro && elRef.current) ro.observe(elRef.current);
    return () => { if (ro) ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  // تحديث المعالم والمسار
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // امسح القديم
    layersRef.current.markers.forEach((m) => map.removeLayer(m));
    layersRef.current.markers = [];
    if (layersRef.current.route) { map.removeLayer(layersRef.current.route); layersRef.current.route = null; }

    // أضف المعالم
    markers.forEach((mk, i) => {
      const marker = L.marker([mk.lat, mk.lng], { icon: makeIcon(mk.type), draggable: draggablePin && i === 0 }).addTo(map);
      if (mk.label) marker.bindPopup(mk.label);
      if (draggablePin && i === 0 && onPinMove) {
        marker.on("dragend", (e) => { const p = e.target.getLatLng(); onPinMove(p.lat, p.lng); });
      }
      layersRef.current.markers.push(marker);
    });

    // أضف المسار
    if (route && route.length > 1) {
      const line = L.polyline(route, { color: "#0C831F", weight: 4, opacity: 0.75, dashArray: "8 6" }).addTo(map);
      layersRef.current.route = line;
    }

    // اضبط الإطار ليشمل كل المعالم
    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    } else if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], zoom);
    }
  }, [markers, route, draggablePin, onPinMove, zoom]);

  return <div ref={elRef} className="bk-map" style={{ height }} />;
}
