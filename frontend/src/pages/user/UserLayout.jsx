import React, { useState, useEffect } from "react";
import Footer from "./Footer";
import Home from "./Home"; // Homepage WITHOUT any header
import UserLoading from "./UserLoading";

// =======================
// DUMMY USER FOR TESTING
// =======================
const DUMMY_USER = {
  id: 1,
  name: "John",
  email: "test@example.com",
  role: "user",
};

export default function UserLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Quick initialization
    setReady(true);
  }, []);

  if (!ready) return <UserLoading />;

  return (
    <>
      {/* NO HEADER HERE - Home page handles its own hero/top section */}
      
      {/* Main Content - Homepage */}
      <Home user={DUMMY_USER} />

      {/* Footer */}
      <Footer />
    </>
  );
}