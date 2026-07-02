import { Routes, Route } from "react-router-dom";
import Storefront from "./pages/Storefront.jsx";
import AdminApp from "./pages/AdminApp.jsx";
import MerchantApp from "./pages/MerchantApp.jsx";
import CourierApp from "./pages/CourierApp.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Storefront />} />
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/merchant/*" element={<MerchantApp />} />
      <Route path="/courier/*" element={<CourierApp />} />
      <Route path="*" element={<Storefront />} />
    </Routes>
  );
}
