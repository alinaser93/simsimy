/* خدمات الموقع الجغرافي — GPS + تحويل الإحداثيات لعنوان (مجاني عبر OpenStreetMap Nominatim) */

// احصل على موقع المستخدم الحالي عبر GPS المتصفح
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("جهازك لا يدعم تحديد الموقع")); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        const msgs = { 1: "رفضت إذن الوصول للموقع — فعّله من إعدادات المتصفح", 2: "تعذّر تحديد موقعك", 3: "انتهت مهلة تحديد الموقع" };
        reject(new Error(msgs[err.code] || "تعذّر تحديد الموقع"));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// حوّل إحداثيات إلى عنوان نصّي (عربي) عبر Nominatim
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar&zoom=18`, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) throw new Error("geocode failed");
    const data = await res.json();
    const a = data.address || {};
    const city = a.city || a.town || a.village || a.municipality || a.county || a.state_district || "";
    // ابنِ عنوانًا مختصرًا مقروءًا
    const parts = [a.road || a.neighbourhood || a.suburb, a.suburb || a.city_district, a.city || a.town || a.village, a.state]
      .filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i);
    const full = parts.join("، ") || data.display_name || `موقع (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    return { full, city };
  } catch {
    return { full: `موقع محدّد (${lat.toFixed(4)}, ${lng.toFixed(4)})`, city: "" };
  }
}

// مسافة تقريبية بالكيلومتر بين نقطتين (Haversine)
export function distanceKm(a, b) {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// نقطة وسطية على المسار بنسبة t (0→1) — لمحاكاة حركة المندوب
export function lerp(a, b, t) {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}
