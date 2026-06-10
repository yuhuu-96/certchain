"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getProfile, getCertificates, fetchBlobMetadata, OnChainProfile, OnChainCertificate } from "@/utils/aptos";
import { ProfileSkeleton, ListSkeleton } from "@/components/LoadingSkeleton";
import CertificateVisual from "@/components/CertificateVisual";

const Icon = ({ n, size = 18, style: sx }: { n: string; size?: number; style?: React.CSSProperties }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: `${size}px`, ...sx }} aria-hidden="true" />
);

const Badge = ({ children, color = "purple", icon }: { children: React.ReactNode; color?: string; icon?: string }) => (
  <span className={`badge badge-${color}`}>
    {icon && <Icon n={icon} size={11} />}
    {children}
  </span>
);

const Card = ({ children, style: sx, onClick, hover }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void; hover?: boolean }) => (
  <div className={`card${hover ? " card-hover" : ""}`} onClick={onClick} style={sx}>
    {children}
  </div>
);

const Av = ({ name, size = 40, color = "purple" }: { name: string; size?: number; color?: string }) => {
  const ini = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className={`avatar av-${color}`} style={{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.34}px` }}>
      {ini}
    </div>
  );
};

export default function PublicProfile() {
  const params = useParams();
  const address = params.address as string;

  const [profile, setProfile] = useState<OnChainProfile | null>(null);
  const [certs, setCerts] = useState<OnChainCertificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<OnChainCertificate | null>(null);
  const [selectedCertMetadata, setSelectedCertMetadata] = useState<any>(null);
  const [loadingCertMetadata, setLoadingCertMetadata] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCert) {
      setLoadingCertMetadata(true);
      fetchBlobMetadata(selectedCert.blob_url)
        .then((meta) => {
          setSelectedCertMetadata(meta);
        })
        .catch((e) => {
          console.error("Failed to fetch cert metadata:", e);
        })
        .finally(() => {
          setLoadingCertMetadata(false);
        });
    } else {
      setSelectedCertMetadata(null);
    }
  }, [selectedCert]);

  const loadProfileData = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const p = await getProfile(address);
      setProfile(p);
      if (p) {
        const c = await getCertificates(address);
        setCerts(c);
      }
    } catch (e) {
      console.error("Error loading profile", e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  if (loading) {
    return (
      <div className="app-container" style={{ padding: "20px" }}>
        <ProfileSkeleton />
        <ListSkeleton count={2} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="app-container" style={{ padding: "40px 20px" }}>
        <Card style={{ textAlign: "center" }}>
          <div className="empty-icon" style={{ background: "var(--color-red-light)" }}>
            <Icon n="alert-circle" size={24} style={{ color: "var(--color-red)" }} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px", color: "var(--color-text-primary)" }}>
            Profile Not Found
          </h2>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "16px" }}>
            This wallet address has not registered a profile on CertChain.
          </p>
          <code style={{ fontSize: "11px", display: "block", wordBreak: "break-all", background: "var(--color-background-secondary)", padding: "8px", borderRadius: "6px", color: "var(--color-text-secondary)" }}>
            {address}
          </code>
        </Card>
      </div>
    );
  }

  const renderCertDetail = (cert: OnChainCertificate) => {
    const verifyUrl = typeof window !== "undefined"
      ? `${window.location.origin}/verify?address=${address}&id=${cert.id}`
      : "";
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verifyUrl)}`;

    return (
      <div className="fade-in" style={{ padding: "0 20px 20px" }}>
        <button
          onClick={() => setSelectedCert(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--color-text-secondary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "16px",
            fontFamily: "inherit",
          }}
        >
          <Icon n="arrow-left" size={16} /> Back to list
        </button>
        {loadingCertMetadata ? (
          <div className="certificate-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "260px" }}>
            <div style={{ textAlign: "center" }}>
              <span className="spinner spinner-dark" style={{ width: "26px", height: "26px", borderWidth: "2.5px", margin: "0 auto 12px" }} />
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                Retrieving cryptographically secured metadata...
              </p>
            </div>
          </div>
        ) : (
          <CertificateVisual
            cert={cert}
            metadata={selectedCertMetadata}
            recipientName={profile?.name}
            recipientAddress={address}
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "16px" }}>
          <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "12px", textTransform: "uppercase" }}>
              Scan QR Code to Verify
            </p>
            {verifyUrl && (
              <img
                src={qrCodeUrl}
                alt="Verification QR Code"
                style={{ border: "1px solid var(--color-border-secondary)", borderRadius: "8px", padding: "8px", background: "white" }}
              />
            )}
          </Card>
        </div>

        <Card>
          {[
            ["Credential ID", `CERT-${String(cert.id).padStart(6, "0")}`, "mono", "id"],
            ["Issue Date", new Date(parseInt(cert.issued_at) * 1000).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }), "text", "calendar"],
            ["Issuer", cert.issuer, "mono", "building"],
            ["Blob URL (Shelby)", cert.blob_url, "mono", "cloud"],
          ].map(([k, v, type, icon]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px solid var(--color-border-tertiary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", color: "var(--color-text-secondary)" }}>
                <Icon n={icon} size={14} />
                {k}
              </div>
              <div
                style={{
                  fontSize: type === "mono" ? "11px" : "13px",
                  fontFamily: type === "mono" ? "var(--font-mono)" : "inherit",
                  color: "var(--color-text-primary)",
                  maxWidth: "220px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "right",
                }}
                title={v}
              >
                {v}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
            <button
              className="btn btn-teal btn-full"
              onClick={() => {
                navigator.clipboard.writeText(`CERT-${String(cert.id).padStart(6, "0")}`);
                setCopiedId(cert.id);
                setTimeout(() => setCopiedId(null), 2000);
              }}
            >
              <Icon n="copy" size={14} /> {copiedId === cert.id ? "Copied!" : "Copy Credential ID"}
            </button>
          </div>
        </Card>
      </div>
    );
  };

  if (selectedCert) {
    return <div className="app-container">{renderCertDetail(selectedCert)}</div>;
  }

  return (
    <div className="app-container" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 20px 12px",
          borderBottom: "1px solid var(--color-border-secondary)",
          background: "var(--color-background-primary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon n="certificate" size={17} style={{ color: "#fff" }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: "15px" }}>CertChain</span>
        </div>
        <Badge color="teal" icon="shield">Public Viewer</Badge>
      </div>

      <div style={{ padding: "20px 20px 40px", flex: 1 }}>
        <Card style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "16px" }}>
          <Av name={profile.name} size={52} color="purple" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "16px", marginBottom: "3px" }}>{profile.name}</div>
            <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile.bio || "No bio registered"}
            </div>
            <div style={{ display: "flex", gap: "8px", fontSize: "12px" }}>
              {profile.twitter && (
                <a
                  href={`https://x.com/${profile.twitter.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "3px" }}
                >
                  <Icon n="brand-twitter" size={13} /> {profile.twitter}
                </a>
              )}
              {profile.github && (
                <a
                  href={`https://github.com/${profile.github}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "3px" }}
                >
                  <Icon n="brand-github" size={13} /> {profile.github}
                </a>
              )}
            </div>
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div className="section-title" style={{ margin: 0 }}>Certificate Collection ({certs.length})</div>
          <Badge color="teal">Verified SBT</Badge>
        </div>

        {certs.length === 0 ? (
          <Card style={{ textAlign: "center", padding: "30px" }}>
            <Icon n="inbox" size={32} style={{ color: "var(--color-text-secondary)", marginBottom: "8px" }} />
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>No certificates have been issued for this profile yet.</p>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {certs.map((cert) => (
              <Card key={cert.id} hover={true} onClick={() => setSelectedCert(cert)} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "10px",
                    background: "var(--color-primary-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon n="certificate" size={22} style={{ color: "var(--color-primary)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "3px" }}>
                    Certificate of Completion #{cert.id}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
                    <Icon n="building" size={12} /> Issuer: {cert.issuer.slice(0, 8) + "..." + cert.issuer.slice(-4)}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
                    {new Date(parseInt(cert.issued_at) * 1000).toLocaleDateString("en-US")}
                  </div>
                  <Icon n="chevron-right" size={15} style={{ color: "var(--color-text-secondary)" }} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
