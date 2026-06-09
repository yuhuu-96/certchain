import React from "react";

export function ProfileSkeleton() {
  return (
    <div className="card" style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "16px" }}>
      <div className="skeleton skeleton-circle" style={{ width: "52px", height: "52px" }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton skeleton-title" style={{ height: "16px", width: "120px", marginBottom: "8px" }} />
        <div className="skeleton skeleton-text" style={{ height: "12px", width: "180px", marginBottom: "6px" }} />
        <div style={{ display: "flex", gap: "6px" }}>
          <div className="skeleton" style={{ width: "80px", height: "18px", borderRadius: "10px" }} />
          <div className="skeleton" style={{ width: "60px", height: "18px", borderRadius: "10px" }} />
        </div>
      </div>
    </div>
  );
}

export function CertCardSkeleton() {
  return (
    <div className="card" style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "8px" }}>
      <div className="skeleton" style={{ width: "46px", height: "46px", borderRadius: "10px", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton skeleton-title" style={{ height: "14px", width: "140px", marginBottom: "6px" }} />
        <div className="skeleton skeleton-text" style={{ height: "12px", width: "200px", marginBottom: "8px" }} />
        <div style={{ display: "flex", gap: "6px" }}>
          <div className="skeleton" style={{ width: "70px", height: "18px", borderRadius: "10px" }} />
          <div className="skeleton" style={{ width: "70px", height: "18px", borderRadius: "10px" }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
        <div className="skeleton" style={{ width: "60px", height: "12px" }} />
      </div>
    </div>
  );
}

export function CampaignSkeleton() {
  return (
    <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
      <div style={{ flex: 1 }}>
        <div className="skeleton skeleton-title" style={{ height: "14px", width: "160px", marginBottom: "6px" }} />
        <div className="skeleton skeleton-text" style={{ height: "12px", width: "80%", marginBottom: "0" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
        <div className="skeleton" style={{ width: "40px", height: "18px", borderRadius: "10px" }} />
        <div className="skeleton" style={{ width: "60px", height: "18px", borderRadius: "10px" }} />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3, type = "cert" }: { count?: number; type?: "cert" | "campaign" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {Array.from({ length: count }).map((_, i) => (
        type === "cert" ? <CertCardSkeleton key={i} /> : <CampaignSkeleton key={i} />
      ))}
    </div>
  );
}
