import React from "react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Routes, Route, Navigate } from "react-router-dom";

// ─── THEME CONTEXT ───
import { ThemeProvider } from "./pages/user/ThemeContext";

// ─── PAGES ───
import Index from "./pages/index";
import Login from "./pages/auth/login";
import VerifyEmail from "./pages/auth/VerifyEmail";
import Maintenance from "./pages/Maintenance";

import UserLayout from "./pages/user/UserLayout";
import UserHome from "./pages/user/Home";
import Profile from "./pages/user/Profile";
import Onboarding from "./pages/user/Onboarding";
import FindGyms from "./pages/user/FindGyms";
import AllGym from "./pages/user/AllGym";
import GymResultMatching from "./pages/user/GymResultMatching";
import GymDetails from "./pages/user/GymDetails";
import Memberships from "./pages/user/Memberships";
import SavedGyms from "./pages/user/SavedGyms";
import WorkoutWeek from "./pages/user/WorkoutWeek";
import WorkoutDayDetails from "./pages/user/WorkoutDayDetails";
import BecomeOwner from "./pages/user/BecomeOwner";
import OwnerApplication from "./pages/user/OwnerApplication";
import MealPlanGenerator from "./pages/user/MealPlan";
import GymInquiryHistory from "./pages/user/GymInquiryHistory";
import UserFaq from "./pages/user/FAQs";
import AboutUs from "./pages/user/AboutUs";
import Philosophy from "./pages/user/OurPhilosophy";
import Reviews from "./pages/user/Reviews";
import WhyExerSearch from "./pages/user/WhyExersearch";
import HowItWorks from "./pages/user/HowItWorks";
import Contact from "./pages/user/Contact";

import Chatbot from "./pages/user/ChatBot";
import NotFound from "./pages/user/NotFound";

import OwnerLayout from "./pages/owner/OwnerLayout";
import OwnerHome from "./pages/owner/OwnerHome";
import OwnerMembers from "./pages/owner/OwnerMembers";
import OwnerFreeVisits from "./pages/owner/OwnerFreeVisits";
import ViewGym from "./pages/owner/ViewGym";
import EditGym from "./pages/owner/EditGym";
import ViewStats from "./pages/owner/ViewStats";
import OwnerGymApplication from "./pages/owner/OwnerGymApplication";
import OwnerInbox from "./pages/owner/OwnerInbox";
import OwnerProfile from "./pages/owner/OwnerProfile";
import OwnerGymAnnouncements from "./pages/owner/OwnerGymAnnouncements";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminEquipments from "./pages/admin/AdminEquipments";
import AdminAmenities from "./pages/admin/AdminAmenities";
import AdminGyms from "./pages/admin/AdminGyms";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAdmins from "./pages/admin/AdminAdmins";
import AdminPasigGymsMap from "./pages/admin/PasigGymsMap";
import AdminOwnerApplications from "./pages/admin/AdminOwnerApplications";
import AdminGymApplications from "./pages/admin/AdminGymApplications";
import AdminFaqs from "./pages/admin/AdminFaqs";
import AdminProfile from "./pages/admin/Profile";
import GymDetailAdmin from "./pages/admin/GymDetails";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminExercises from "./pages/admin/AdminExercises";
import AdminWorkoutTemplates from "./pages/admin/AdminWorkoutTemplates";
import AdminTemplateDays from "./pages/admin/AdminTemplateDays";
import AdminTemplateItems from "./pages/admin/AdminTemplateItems";
import AdminDatabaseBackup from "./pages/admin/AdminDatabaseBackup";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import OwnerGymsPage from "./pages/owner/OwnerGymsPage";
import AdminActivities from "./pages/admin/AdminInteractions";
import AdminChatHistory from "./pages/admin/AdminChatHistory";
import AdminIngredients from "./pages/admin/AdminIngredients";
import AdminMacroPresets from "./pages/admin/AdminMacroPresets";
import AdminMeals from "./pages/admin/AdminMeals";

import { getUserRole } from "./utils/auth";
import RequireUser from "./utils/RequireUser";

import "leaflet/dist/leaflet.css";

function RoleLanding() {
  const r = getUserRole();

  if (r === "guest") return <Navigate to="/home" replace />;
  if (r === "user") return <Navigate to="/home" replace />;
  if (r === "owner") return <Navigate to="/owner/home" replace />;
  if (r === "superadmin" || r === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Index />;
}

function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const showChatbot =
    !pathname.startsWith("/owner") &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/verify-email") &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/maintenance");

  return (
    <ThemeProvider>
      {showChatbot && <Chatbot />}

      <Routes>
    

        {/* ─── PUBLIC ROUTES (with theme support) ─── */}
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/faqs" element={<UserFaq />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/why-exersearch" element={<WhyExerSearch />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/philosophy" element={<Philosophy />} />

        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/" element={<RoleLanding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/become-an-owner" element={<BecomeOwner />} />
        <Route path="/owner-application" element={<OwnerApplication />} />

        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/404" element={<NotFound />} />

        {/* ─── USER ROUTES ─── */}
        <Route path="/home/*" element={<UserLayout skipAuth={true} />}>
          {/* guest/public allowed */}
          <Route index element={<UserHome />} />
          <Route path="gyms" element={<AllGym />} />
          <Route path="gym/:id" element={<GymDetails />} />

          {/* logged-in real user only */}
          <Route
            path="becomeowner"
            element={
              <RequireUser>
                <BecomeOwner />
              </RequireUser>
            }
          />
          <Route
            path="applyowner"
            element={
              <RequireUser>
                <OwnerApplication />
              </RequireUser>
            }
          />
          <Route
            path="profile"
            element={
              <RequireUser>
                <Profile />
              </RequireUser>
            }
          />
          <Route
            path="find-gyms"
            element={
              <RequireUser>
                <FindGyms />
              </RequireUser>
            }
          />
          <Route
            path="meal-plan"
            element={
              <RequireUser>
                <MealPlanGenerator />
              </RequireUser>
            }
          />
          <Route
            path="memberships"
            element={
              <RequireUser>
                <Memberships />
              </RequireUser>
            }
          />
          <Route
            path="gym-results"
            element={
              <RequireUser>
                <GymResultMatching />
              </RequireUser>
            }
          />
          <Route
            path="saved-gyms"
            element={
              <RequireUser>
                <SavedGyms />
              </RequireUser>
            }
          />
          <Route
            path="workout"
            element={
              <RequireUser>
                <WorkoutWeek />
              </RequireUser>
            }
          />
          <Route
            path="workout/day/:id"
            element={
              <RequireUser>
                <WorkoutDayDetails />
              </RequireUser>
            }
          />
          <Route
            path="inquiries"
            element={
              <RequireUser>
                <GymInquiryHistory />
              </RequireUser>
            }
          />
        </Route>

        {/* ─── OWNER ROUTES (no theme toggle) ─── */}
        <Route path="/owner/*" element={<OwnerLayout />}>
          <Route path="view-gyms" element={<OwnerGymsPage />} />
          <Route path="home" element={<OwnerHome />} />
          <Route path="profile" element={<OwnerProfile />} />
          <Route path="inbox" element={<OwnerInbox />} />
          <Route path="members/:id" element={<OwnerMembers />} />
          <Route path="free-visits/:id" element={<OwnerFreeVisits />} />
          <Route path="view-gym/:id" element={<ViewGym />} />
          <Route path="edit-gym/:id" element={<EditGym />} />
          <Route path="announcements/:id" element={<OwnerGymAnnouncements />} />
          <Route path="view-stats/:id" element={<ViewStats />} />
          <Route path="gym-application" element={<OwnerGymApplication />} />
          <Route index element={<Navigate to="home" replace />} />
        </Route>

        {/* ─── ADMIN ROUTES (no theme toggle) ─── */}
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="equipments" element={<AdminEquipments />} />
          <Route path="amenities" element={<AdminAmenities />} />
          <Route path="activities" element={<AdminActivities />} />
          <Route path="chathistory" element={<AdminChatHistory />} />
          <Route path="ingredients" element={<AdminIngredients />} />
          <Route path="macro" element={<AdminMacroPresets />} />
          <Route path="meals" element={<AdminMeals />} />
          <Route path="gyms" element={<AdminGyms />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="admins" element={<AdminAdmins />} />
          <Route path="map" element={<AdminPasigGymsMap />} />
          <Route path="applications" element={<AdminOwnerApplications />} />
          <Route path="gym-applications" element={<AdminGymApplications />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="gyms/:gymId" element={<GymDetailAdmin />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="exercises" element={<AdminExercises />} />
          <Route path="workout-templates" element={<AdminWorkoutTemplates />} />
          <Route path="template-days" element={<AdminTemplateDays />} />
          <Route path="template-items" element={<AdminTemplateItems />} />
          <Route path="db-backup" element={<AdminDatabaseBackup />} />
          <Route path="faqs" element={<AdminFaqs />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;