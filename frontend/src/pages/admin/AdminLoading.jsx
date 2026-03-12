import "./adminLoading.css";

export default function AdminLoading() {
  return (
    <div className="loading-screen">
      <img src="/letterlogo.png" alt="Loading" className="loading-image" />
      <p className="loading-text">Loading Admin Dashboard...</p>
    </div>
  );
}
