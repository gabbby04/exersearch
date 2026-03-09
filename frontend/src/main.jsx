// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import { AuthProvider } from "./authcon.jsx";
import { ThemeProvider } from "./pages/user/ThemeContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <ThemeProvider> 
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider> 
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
