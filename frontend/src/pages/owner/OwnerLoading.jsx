import "./ownerLoading.css";

export default function OwnerLoading() {
  return (
    <div className="loading-screen owner-bg">
      <img src="/letterlogo.png" alt="Loading" className="loading-image" />
      <p className="loading-text">Loading Owner Dashboard...</p>
    </div>
  );
}
