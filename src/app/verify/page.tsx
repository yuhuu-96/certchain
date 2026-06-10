"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getCertificates, fetchBlobMetadata, getProfile, OnChainCertificate, OnChainProfile } from "@/utils/aptos";
import { ProfileSkeleton } from "@/components/LoadingSkeleton";
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

function VerificationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlAddress = searchParams.get("address") || "";
  const urlId = searchParams.get("id") || "";

  // Input states
  const [inputAddress, setInputAddress] = useState(urlAddress);
  const [inputId, setInputId] = useState(urlId);

  // Loaded states
  const [cert, setCert] = useState<OnChainCertificate | null>(null);
  const [recipient, setRecipient] = useState<OnChainProfile | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyCertificate = useCallback(async (addr: string, idStr: string) => {
    setLoading(true);
    setError(null);
    setCert(null);
    setRecipient(null);
    setMetadata(null);

    try {
      // 1. Fetch recipient profile
      const rProfile = await getProfile(addr);
      setRecipient(rProfile);

      // 2. Fetch certificates and find ID
      const certs = await getCertificates(addr);
      const found = certs.find((c) => c.id === idStr);

      if (!found) {
        setError("Certificate not found. Please check the wallet address and certificate ID.");
        setLoading(false);
        return;
      }

      setCert(found);

      // 3. Fetch Shelby blob metadata
      const meta = await fetchBlobMetadata(found.blob_url);
      setMetadata(meta);
    } catch (e: any) {
      console.error(e);
      setError("Failed to process blockchain verification.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlAddress && urlId) {
      verifyCertificate(urlAddress, urlId);
    }
  }, [urlAddress, urlId, verifyCertificate]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAddress.trim() || !inputId.trim()) return;
    router.push(`/verify?address=${inputAddress.trim()}&id=${inputId.trim()}`);
  };

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
          <span style={{ fontWeight: 600, fontSize: "15px" }}>CertChain Verification</span>
        </div>
        <Badge color="green" icon="shield-check">Secure</Badge>
      </div>

      <div style={{ padding: "20px 20px 40px", flex: 1 }}>
        {/* Verification Form if no params or if error */}
        {(!urlAddress || !urlId || error) && (
          <Card style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Icon n="search" size={18} style={{ color: "var(--color-primary)" }} />
              On-chain Credential Verification
            </h2>
            <form onSubmit={handleManualSubmit}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "4px", display: "block" }}>
                  Recipient Wallet Address
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={inputAddress}
                  onChange={(e) => setInputAddress(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "4px", display: "block" }}>
                  Certificate ID (Numeric)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 1"
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full">
                Verify Credential
              </button>
            </form>
          </Card>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <span className="spinner spinner-dark" style={{ width: "30px", height: "30px", borderWidth: "3px" }} />
            <p style={{ marginTop: "14px", fontSize: "14px", color: "var(--color-text-secondary)" }}>
              Performing cryptographic verification on Shelbynet...
            </p>
          </div>
        )}

        {error && (
          <Card style={{ borderLeft: "4px solid var(--color-red)", background: "var(--color-red-light)" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", color: "var(--color-red)", fontWeight: 600, fontSize: "14px" }}>
              <Icon n="circle-x" size={16} /> Verification Failed
            </div>
            <p style={{ fontSize: "13px", color: "var(--color-text-primary)", marginTop: "6px" }}>{error}</p>
          </Card>
        )}

        {cert && !loading && (
          <div className="fade-in">
            <Card style={{ textAlign: "center", marginBottom: "16px", border: "1px solid var(--color-teal)", background: "var(--color-teal-light)" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "var(--color-teal)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Icon n="shield-check" size={24} style={{ color: "#fff" }} />
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-teal)", marginBottom: "4px" }}>
                Authentic & Verified Credential
              </h2>
              <p style={{ fontSize: "12px", color: "var(--color-teal)", fontWeight: 500 }}>
                Record found on Shelby Blockchain & Shelby Storage
              </p>
            </Card>

            <div style={{ marginBottom: "20px" }}>
              <CertificateVisual
                cert={cert}
                metadata={metadata}
                recipientName={recipient?.name}
                recipientAddress={urlAddress}
              />
            </div>

            <Card style={{ marginBottom: "16px" }}>
              <h3 className="section-title">Certificate Details</h3>
              {[
                ["Credential ID", `CERT-${String(cert.id).padStart(6, "0")}`, "mono"],
                ["Recipient (On-chain)", recipient?.name || "Wallet Owner", "text"],
                ["Recipient Wallet", urlAddress.slice(0, 12) + "..." + urlAddress.slice(-8), "mono"],
                ["Issue Date", new Date(parseInt(cert.issued_at) * 1000).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }), "text"],
                ["Issuer", cert.issuer.slice(0, 12) + "..." + cert.issuer.slice(-8), "mono"],
              ].map(([k, v, type]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--color-border-tertiary)",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "var(--color-text-secondary)" }}>{k}</span>
                  <span
                    style={{
                      fontFamily: type === "mono" ? "var(--font-mono)" : "inherit",
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                      textAlign: "right",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </Card>

            {metadata && (
              <Card style={{ marginBottom: "16px" }}>
                <h3 className="section-title">Decrypted Metadata (Shelby Blob)</h3>
                {[
                  ["Program / Event Name", metadata.campaignName || "N/A"],
                  ["Program Description", metadata.campaignDescription || "N/A"],
                  ["Issuer Name", metadata.organizationName || "N/A"],
                  ["Decentralized Storage URI", cert.blob_url],
                ].map(([k, v]) => (
                  <div key={k} style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "2px", fontWeight: 600, textTransform: "uppercase" }}>
                      {k}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--color-text-primary)", wordBreak: "break-all", lineHeight: 1.4 }}>
                      {v}
                    </div>
                  </div>
                ))}
              </Card>
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn btn-teal btn-full"
                onClick={() => window.open(`https://explorer.shelby.xyz/account/${urlAddress}/resources?network=shelbynet`, "_blank")}
              >
                <Icon n="external-link" size={14} /> View Transaction on Explorer
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => router.push(`/verify`)}
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={
      <div className="app-container" style={{ padding: "40px", textAlign: "center" }}>
        <span className="spinner spinner-dark" />
        <p style={{ marginTop: "12px", color: "var(--color-text-secondary)" }}>Loading verification system...</p>
      </div>
    }>
      <VerificationContent />
    </Suspense>
  );
}
