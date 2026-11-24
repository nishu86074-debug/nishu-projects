import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";

import { LibraryDataProvider } from "./context/LibraryDataContext";

import { LibrarySettingsProvider } from "./context/LibrarySettingsProvider";

import "./index.css";
import "./App.css";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <LibrarySettingsProvider>
      <LibraryDataProvider>
        <App />
      </LibraryDataProvider>
    </LibrarySettingsProvider>
  </React.StrictMode>
);