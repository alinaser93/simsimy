import { initSync } from "./store/sync.js";
import { setOrderChangeHook } from "./store/appStore.js";
import { pushOrder } from "./store/sync.js";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/global.css";
import "./styles/portal.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// فعّل المزامنة الحيّة عبر Supabase (إن كانت متاحة)
setOrderChangeHook(pushOrder);
initSync();
