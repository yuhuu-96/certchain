"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useUploadBlobs } from "@shelby-protocol/react";
import { useToast } from "@/components/Toast";
import { ProfileSkeleton, ListSkeleton } from "@/components/LoadingSkeleton";
import {
  aptos,
  MODULE_ADDRESS,
  getProfile,
  getOrganization,
  getCampaigns,
  getCertificates,
  OnChainProfile,
  OnChainOrganization,
  OnChainCampaign,
  OnChainCertificate,
} from "@/utils/aptos";

// Icon Component
const Icon = ({ n, size = 18, style: sx }: { n: string; size?: number; style?: React.CSSProperties }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: `${size}px`, ...sx }} aria-hidden="true" />
);

// Badge Component
const Badge = ({ children, color = "purple", icon }: { children: React.ReactNode; color?: string; icon?: string }) => (
  <span className={`badge badge-${color}`}>
    {icon && <Icon n={icon} size={11} />}
    {children}
  </span>
);

// Button Component
const Btn = ({
  children,
  onClick,
  disabled,
  cls = "btn-primary",
  full,
  size,
  style: sx,
  type,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  cls?: string;
  full?: boolean;
  size?: "sm" | "md";
  style?: React.CSSProperties;
  type?: "button" | "submit" | "reset";
}) => (
  <button
    type={type || "button"}
    onClick={onClick}
    disabled={disabled}
    className={`btn ${cls}${full ? " btn-full" : ""}`}
    style={{ fontSize: size === "sm" ? "13px" : "14px", ...sx }}
  >
    {children}
  </button>
);

// Card Component
const Card = ({ children, style: sx, onClick, hover }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void; hover?: boolean }) => (
  <div className={`card${hover ? " card-hover" : ""}`} onClick={onClick} style={sx}>
    {children}
  </div>
);

// Avatar Component
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

// Form Label
const Lbl = ({ children, req: r }: { children: React.ReactNode; req?: boolean }) => (
  <div className="field-label">
    {children}
    {r && <span className="req"> *</span>}
  </div>
);

// Form Input Field
const Fld = ({
  label,
  value,
  onChange,
  placeholder,
  multi,
  req,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multi?: boolean;
  req?: boolean;
  error?: string;
}) => (
  <div style={{ marginBottom: "14px" }}>
    <Lbl req={req}>{label}</Lbl>
    {multi ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={error ? { borderColor: "var(--color-red)" } : {}}
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={error ? { borderColor: "var(--color-red)" } : {}}
      />
    )}
    {error && <span className="field-error-msg">{error}</span>}
  </div>
);

// Info Box Component
const InfoBox = ({ cls, icon, children }: { cls: string; icon: string; children: React.ReactNode }) => (
  <div className={`info-box info-box-${cls}`} style={{ marginBottom: "12px" }}>
    <Icon n={icon} size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
    <span>{children}</span>
  </div>
);

// Empty State Component
const Empty = ({ icon, title, desc, action }: { icon: string; title: string; desc: string; action?: React.ReactNode }) => (
  <div className="empty-state">
    <div className="empty-icon">
      <Icon n={icon} size={22} style={{ color: "var(--color-text-secondary)" }} />
    </div>
    <p style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>{title}</p>
    <p style={{ fontSize: "13px", marginBottom: action ? "14px" : "0" }}>{desc}</p>
    {action}
  </div>
);

export default function Home() {
  const { connected, account, connect, wallets, disconnect, signAndSubmitTransaction } = useWallet();
  const uploadBlobs = useUploadBlobs({});
  const { showToast } = useToast();

  const [view, setView] = useState<
    "connect" | "create-profile" | "dashboard" | "create-org" | "org-dashboard" | "explore" | "edit-profile"
  >("connect");

  // On-chain Data State
  const [profile, setProfile] = useState<OnChainProfile | null>(null);
  const [organization, setOrganization] = useState<OnChainOrganization | null>(null);
  const [campaigns, setCampaigns] = useState<OnChainCampaign[]>([]);
  const [certificates, setCertificates] = useState<OnChainCertificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<OnChainCertificate | null>(null);

  // Loaders
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [profName, setProfName] = useState("");
  const [profBio, setProfBio] = useState("");
  const [profTwitter, setProfTwitter] = useState("");
  const [profGithub, setProfGithub] = useState("");
  const [profErrors, setProfErrors] = useState<Record<string, string>>({});

  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");
  const [orgWeb, setOrgWeb] = useState("");
  const [orgErrors, setOrgErrors] = useState<Record<string, string>>({});

  const [campName, setCampName] = useState("");
  const [campDesc, setCampDesc] = useState("");
  const [showCreateCamp, setShowCreateCamp] = useState(false);

  const [issueAddrs, setIssueAddrs] = useState("");
  const [activeCampId, setActiveCampId] = useState<string | null>(null);

  // Explorer links
  const getExplorerTxUrl = (hash: string) => `https://explorer.aptoslabs.com/txn/${hash}?network=testnet`;
  const getExplorerAddressUrl = (addr: string) => `https://explorer.aptoslabs.com/account/${addr}?network=testnet`;

  // Fetch current user details
  const fetchUserData = useCallback(async (addr: string) => {
    setLoadingProfile(true);
    setLoadingCerts(true);
    try {
      const prof = await getProfile(addr);
      setProfile(prof);
      
      if (prof) {
        setProfName(prof.name);
        setProfBio(prof.bio);
        setProfTwitter(prof.twitter);
        setProfGithub(prof.github);
        
        // Load certificates
        const certs = await getCertificates(addr);
        setCertificates(certs);
      }
      
      // Load organization owned by user
      const org = await getOrganization(addr);
      setOrganization(org);

      if (org) {
        const camps = await getCampaigns(addr);
        setCampaigns(camps);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to load data from the blockchain", "error");
    } finally {
      setLoadingProfile(false);
      setLoadingCerts(false);
    }
  }, [showToast]);

  // Sync wallet state
  useEffect(() => {
    if (connected && account?.address) {
      fetchUserData(account.address).then(() => {
        // If profile exists, go to dashboard. Else, create profile.
        getProfile(account.address).then((prof) => {
          setView(prof ? "dashboard" : "create-profile");
        });
      });
    } else {
      setView("connect");
      setProfile(null);
      setOrganization(null);
      setCertificates([]);
      setCampaigns([]);
    }
  }, [connected, account?.address, fetchUserData]);

  // Profile Form validation
  const validateProfile = () => {
    const errs: Record<string, string> = {};
    if (!profName.trim()) errs.name = "Full name is required";
    setProfErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Profile creation transaction
  const handleSaveProfile = async () => {
    if (!validateProfile() || !account?.address) return;
    setSubmitting(true);
    try {
      const transaction = {
        data: {
          function: `${MODULE_ADDRESS}::certchain::create_profile` as const,
          functionArguments: [profName, profBio, profTwitter, profGithub],
        },
      };

      const response = await signAndSubmitTransaction(transaction);
      showToast("Waiting for transaction confirmation...", "info");
      await aptos.waitForTransaction({ transactionHash: response.hash });
      showToast("Profile saved on-chain successfully!", "success");
      await fetchUserData(account.address);
      setView("dashboard");
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to save profile", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Profile Transaction
  const handleEditProfile = async () => {
    if (!validateProfile() || !account?.address) return;
    setSubmitting(true);
    try {
      const transaction = {
        data: {
          function: `${MODULE_ADDRESS}::certchain::edit_profile` as const,
          functionArguments: [profName, profBio, profTwitter, profGithub],
        },
      };

      const response = await signAndSubmitTransaction(transaction);
      showToast("Waiting for transaction confirmation...", "info");
      await aptos.waitForTransaction({ transactionHash: response.hash });
      showToast("Profile updated successfully!", "success");
      await fetchUserData(account.address);
      setView("dashboard");
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to update profile", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Organization validation
  const validateOrg = () => {
    const errs: Record<string, string> = {};
    if (!orgName.trim()) errs.name = "Organization name is required";
    setOrgErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Organization registration transaction
  const handleCreateOrg = async () => {
    if (!validateOrg() || !account?.address) return;
    setSubmitting(true);
    try {
      const transaction = {
        data: {
          function: `${MODULE_ADDRESS}::certchain::create_organization` as const,
          functionArguments: [orgName, orgDesc, orgWeb],
        },
      };

      const response = await signAndSubmitTransaction(transaction);
      showToast("Registering organization on-chain...", "info");
      await aptos.waitForTransaction({ transactionHash: response.hash });
      showToast("Organization registered successfully!", "success");
      await fetchUserData(account.address);
      setView("org-dashboard");
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to register organization", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Campaign creation transaction
  const handleCreateCampaign = async () => {
    if (!campName.trim() || !account?.address) return;
    setSubmitting(true);
    try {
      const transaction = {
        data: {
          function: `${MODULE_ADDRESS}::certchain::create_campaign` as const,
          functionArguments: [campName, campDesc],
        },
      };

      const response = await signAndSubmitTransaction(transaction);
      showToast("Creating new campaign...", "info");
      await aptos.waitForTransaction({ transactionHash: response.hash });
      showToast("Campaign created successfully!", "success");
      setCampName("");
      setCampDesc("");
      setShowCreateCamp(false);
      await fetchUserData(account.address);
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to create campaign", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Issue Certificates (Shelby Upload + Aptos Mint SBT)
  const handleIssueCertificates = async (campId: string) => {
    const addresses = issueAddrs
      .split(/[\n,]+/)
      .map((a) => a.trim())
      .filter(Boolean);

    if (addresses.length === 0) {
      showToast("Please enter at least one recipient wallet address", "error");
      return;
    }

    // Address verification
    const invalidAddrs = addresses.filter((addr) => !addr.startsWith("0x") || addr.length < 50);
    if (invalidAddrs.length > 0) {
      showToast(`Invalid address: ${invalidAddrs[0].slice(0, 10)}...`, "error");
      return;
    }

    setSubmitting(true);
    showToast("Uploading JSON metadata to Shelby Protocol...", "info");

    try {
      // 1. Build metadata objects & upload to Shelby
      const activeCamp = campaigns.find((c) => c.id === campId);
      if (!activeCamp) throw new Error("Campaign not found");

      const blobs = await Promise.all(
        addresses.map(async (addr) => {
          const metadata = {
            credentialId: `CERT-${campId}-${addr.slice(-6)}`,
            recipient: addr,
            issuer: account?.address,
            organizationName: organization?.name,
            campaignId: campId,
            campaignName: activeCamp.name,
            campaignDescription: activeCamp.desc,
            issuedAt: Date.now(),
          };
          const encoder = new TextEncoder();
          const blobData = encoder.encode(JSON.stringify(metadata));
          const blobName = `cert-${campId}-${addr.toLowerCase()}.json`;
          return { blobName, blobData };
        })
      );

      // Upload via Shelby SDK react mutation
      await uploadBlobs.mutateAsync({
        signer: {
          account: account as any,
          signAndSubmitTransaction: signAndSubmitTransaction as any,
        },
        blobs,
        expirationMicros: Date.now() * 1000 + 5 * 365 * 24 * 60 * 60 * 1000000,
      });

      showToast("Metadata uploaded to Shelby. Minting SBT...", "info");

      // Generate blobUrls
      const blobUrls = addresses.map((addr) => {
        const blobName = `cert-${campId}-${addr.toLowerCase()}.json`;
        return `https://api.testnet.shelby.xyz/shelby/v1/blobs/${account?.address}/${blobName}`;
      });

      // 2. Call Aptos Move Contract to mint SBT
      const transaction = {
        data: {
          function: `${MODULE_ADDRESS}::certchain::batch_issue_certificates` as const,
          functionArguments: [addresses, campId, blobUrls],
        },
      };

      const response = await signAndSubmitTransaction(transaction);
      showToast("Processing SBT minting transaction...", "info");
      await aptos.waitForTransaction({ transactionHash: response.hash });
      showToast(`Certificates issued successfully to ${addresses.length} addresses!`, "success");
      setIssueAddrs("");
      setActiveCampId(null);
      await fetchUserData(account?.address || "");
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to issue certificates", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Disconnect wallet action
  const handleDisconnect = async () => {
    try {
      await disconnect();
      showToast("Wallet disconnected", "info");
    } catch (e) {
      showToast("Failed to disconnect wallet", "error");
    }
  };

  // Main UI render router
  const renderView = () => {
    if (selectedCert) {
      // Certificate Detail View
      const verifyUrl = typeof window !== "undefined"
        ? `${window.location.origin}/verify?address=${account?.address}&id=${selectedCert.id}`
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
            <Icon n="arrow-left" size={16} /> Back to portfolio
          </button>
          <div className="cert-visual" style={{ marginBottom: "16px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
                position: "relative",
                zIndex: 1,
              }}
            >
              <Icon n="certificate" size={28} style={{ color: "#fff" }} />
            </div>
            <div style={{ fontWeight: 600, fontSize: "18px", color: "var(--color-primary)", marginBottom: "4px", position: "relative", zIndex: 1 }}>
              Certificate of Completion
            </div>
            <div style={{ fontSize: "13px", color: "var(--color-teal)", marginBottom: "10px", position: "relative", zIndex: 1 }}>
              <Icon n="building" size={13} /> {organization?.name || "Verified Organization"}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", position: "relative", zIndex: 1 }}>
              <Badge color="teal" icon="shield-check">Verified On-chain</Badge>
              <Badge color="purple" icon="link">SBT Non-transferable</Badge>
            </div>
          </div>

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
              <p style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "12px", textAlign: "center" }}>
                This QR code references the CertChain Hub dApp public on-chain verification page.
              </p>
            </Card>
          </div>

          <Card>
            {[
              ["Credential ID", `CERT-${String(selectedCert.id).padStart(6, "0")}`, "mono", "id"],
              ["Issue Date", new Date(parseInt(selectedCert.issued_at) * 1000).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }), "text", "calendar"],
              ["Issuer", organization?.name || "Organization", "text", "building"],
              ["Issuer Address", selectedCert.issuer.slice(0, 10) + "..." + selectedCert.issuer.slice(-8), "mono", "wallet"],
              ["Blob URL (Shelby)", selectedCert.blob_url, "mono", "cloud"],
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
              <Btn
                cls="btn-teal"
                size="sm"
                onClick={() => window.open(`https://explorer.aptoslabs.com/account/${account?.address}/resources?network=testnet`, "_blank")}
              >
                <Icon n="external-link" size={14} /> View on Explorer
              </Btn>
              <Btn
                cls="btn-ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`CERT-${String(selectedCert.id).padStart(6, "0")}`);
                  showToast("Credential ID copied to clipboard", "success");
                }}
              >
                <Icon n="copy" size={14} /> Copy ID
              </Btn>
            </div>
          </Card>
        </div>
      );
    }

    switch (view) {
      case "connect":
        return (
          <div className="fade-in" style={{ padding: "32px 20px" }}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "16px",
                  background: "var(--color-primary-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <Icon n="link" size={30} style={{ color: "var(--color-primary)" }} />
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "6px" }}>Connect Wallet</h2>
              <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                CertChain Hub dApp runs on Shelby Network.<br />
                Connect your Shelby/Aptos wallet to continue.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "340px", margin: "0 auto" }}>
              {(wallets || []).map((w) => {
                const isInstalled = w.readyState === "Installed";
                return (
                  <button
                    key={w.name}
                    onClick={() => connect(w.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      background: "var(--color-background-primary)",
                      border: "1px solid var(--color-border-primary)",
                      cursor: "pointer",
                      transition: "all .15s",
                      fontFamily: "inherit",
                      opacity: isInstalled ? 1 : 0.6,
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: "var(--color-primary-light)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {w.icon ? (
                        <img src={w.icon} alt={w.name} style={{ width: "22px", height: "22px" }} />
                      ) : (
                        <Icon n="wallet" size={18} style={{ color: "var(--color-primary)" }} />
                      )}
                    </div>
                    <span style={{ flex: 1, textAlign: "left", fontWeight: 600, fontSize: "14px", color: "var(--color-text-primary)" }}>
                      {w.name} {!isInstalled && <span style={{ fontSize: "11px", fontWeight: 400 }}>(Not Installed)</span>}
                    </span>
                    <Icon n="chevron-right" size={16} style={{ color: "var(--color-text-secondary)" }} />
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: "11px", color: "var(--color-text-secondary)", textAlign: "center", marginTop: "24px" }}>
              @shelby-protocol/react · @aptos-labs/wallet-adapter-react · Testnet
            </p>
          </div>
        );

      case "create-profile":
      case "edit-profile":
        const isEdit = view === "edit-profile";
        return (
          <div className="fade-in" style={{ padding: "0 20px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", paddingTop: "4px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "var(--color-primary-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon n="user-circle" size={22} style={{ color: "var(--color-primary)" }} />
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 600 }}>{isEdit ? "Update Profile" : "Create New Profile"}</h2>
                <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                  Your on-chain portfolio identity on Shelby Network
                </p>
              </div>
            </div>
            <Card>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  background: "var(--color-background-secondary)",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  border: "1px solid var(--color-border-secondary)",
                }}
              >
                <Icon n="lock" size={13} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
                <code style={{ fontSize: "11px", color: "var(--color-text-secondary)", wordBreak: "break-all" }}>
                  {account?.address}
                </code>
              </div>
              <Fld
                label="Full Name"
                value={profName}
                onChange={setProfName}
                placeholder="e.g., Alice Chen"
                req={true}
                error={profErrors.name}
              />
              <Fld
                label="Short Bio"
                value={profBio}
                onChange={setProfBio}
                placeholder="e.g., Web3 Developer & Smart Contract Builder"
                multi={true}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <Lbl><Icon n="brand-twitter" size={13} /> Twitter / X</Lbl>
                  <input
                    type="text"
                    value={profTwitter}
                    onChange={(e) => setProfTwitter(e.target.value)}
                    placeholder="@username"
                    style={{ width: "100%", marginTop: "5px" }}
                  />
                </div>
                <div>
                  <Lbl><Icon n="brand-github" size={13} /> GitHub</Lbl>
                  <input
                    type="text"
                    value={profGithub}
                    onChange={(e) => setProfGithub(e.target.value)}
                    placeholder="username"
                    style={{ width: "100%", marginTop: "5px" }}
                  />
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <Btn
                  onClick={isEdit ? handleEditProfile : handleSaveProfile}
                  disabled={submitting || !profName.trim()}
                  full={true}
                >
                  {submitting ? (
                    <>
                      <Spinner /> Saving to Blockchain...
                    </>
                  ) : (
                    <>
                      <Icon n="check" size={16} /> {isEdit ? "Save Changes" : "Create Profile"}
                    </>
                  )}
                </Btn>
              </div>
            </Card>
          </div>
        );

      case "dashboard":
        if (loadingProfile) return <div style={{ padding: "20px" }}><ProfileSkeleton /></div>;
        return (
          <div className="fade-in" style={{ padding: "0 20px 20px" }}>
            <Card style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "16px" }}>
              <Av name={profile?.name || "?"} size={52} color="purple" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "16px", marginBottom: "3px" }}>{profile?.name}</div>
                <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {profile?.bio || "No bio registered"}
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <Badge color="teal" icon="certificate">
                    {certificates.length} Certificates
                  </Badge>
                  {organization && <Badge color="purple" icon="building">Owner Org</Badge>}
                </div>
              </div>
              <Btn cls="btn-ghost" size="sm" onClick={() => setView("edit-profile")}>
                <Icon n="pencil" size={14} /> Edit
              </Btn>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "20px" }}>
              {[
                ["Certificates", certificates.length, "certificate", "purple"],
                ["Organizations", organization ? 1 : 0, "building", "teal"],
                ["Campaigns", campaigns.length, "target", "coral"],
              ].map(([label, val, icon, color]) => (
                <div key={label as string} className="stat-card">
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background:
                        color === "purple"
                          ? "var(--color-primary-light)"
                          : color === "teal"
                          ? "var(--color-teal-light)"
                          : "var(--color-coral-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 8px",
                    }}
                  >
                    <Icon
                      n={icon as string}
                      size={17}
                      style={{
                        color:
                          color === "purple"
                            ? "var(--color-primary)"
                            : color === "teal"
                            ? "var(--color-teal)"
                            : "var(--color-coral)",
                      }}
                    />
                  </div>
                  <div className="stat-num">{val}</div>
                  <div className="stat-label">{label as string}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div className="section-title" style={{ margin: 0 }}>My Certificates</div>
              <Badge color="teal">{certificates.length} Total</Badge>
            </div>

            {loadingCerts ? (
              <ListSkeleton count={2} />
            ) : certificates.length === 0 ? (
              <Empty
                icon="inbox"
                title="No certificates yet"
                desc="Issuing organizations will send Soulbound certificates directly to your wallet address."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {certificates.map((cert) => (
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
                      <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "3px", color: "var(--color-text-primary)" }}>
                        Certificate of Completion #{cert.id}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
                        <Icon n="building" size={13} /> Issuer: {cert.issuer.slice(0, 8) + "..." + cert.issuer.slice(-4)}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <Badge color="teal" icon="database">On-chain</Badge>
                        <Badge color="purple" icon="cloud">Shelby Blob</Badge>
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

            {!organization && (
              <Card style={{ marginTop: "16px", background: "var(--color-primary-light)", border: "1px solid var(--color-primary-border)" }}>
                <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      background: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon n="building-plus" size={22} style={{ color: "#fff" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-primary)", marginBottom: "3px" }}>
                      Issuing certificates?
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--color-primary)" }}>
                      Create an organization to start issuing credentials.
                    </div>
                  </div>
                  <Btn cls="btn-primary" size="sm" onClick={() => setView("create-org")}>
                    <Icon n="arrow-right" size={14} /> Create
                  </Btn>
                </div>
              </Card>
            )}

            {organization && (
              <Card
                style={{ marginTop: "16px", background: "var(--color-teal-light)", border: "1px solid var(--color-teal)" }}
                hover={true}
                onClick={() => setView("org-dashboard")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Av name={organization.name} size={40} color="teal" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "var(--color-teal)", fontWeight: 600, marginBottom: "2px" }}>
                      Your Organization
                    </div>
                    <div style={{ fontWeight: 600 }}>{organization.name}</div>
                  </div>
                  <Icon n="chevron-right" size={18} style={{ color: "var(--color-teal)" }} />
                </div>
              </Card>
            )}
          </div>
        );

      case "create-org":
        return (
          <div className="fade-in" style={{ padding: "0 20px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", paddingTop: "4px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "var(--color-teal-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon n="building" size={22} style={{ color: "var(--color-teal)" }} />
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Create Organization</h2>
                <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                  Issue digital portfolio certificates on Shelby Network
                </p>
              </div>
            </div>
            <Card>
              <Fld
                label="Organization Name"
                value={orgName}
                onChange={setOrgName}
                placeholder="e.g., Shelby Indonesia Academy"
                req={true}
                error={orgErrors.name}
              />
              <Fld
                label="Description"
                value={orgDesc}
                onChange={setOrgDesc}
                placeholder="We organize Web3 bootcamps and developer certifications"
                multi={true}
              />
              <Fld
                label="Website"
                value={orgWeb}
                onChange={setOrgWeb}
                placeholder="https://example.com"
              />
              <InfoBox cls="amber" icon="info-circle">
                Production Flow: metadata JSON → Upload to Shelby storage → commitment hash saved on Shelby Network via SBT smart contract.
              </InfoBox>
              <Btn onClick={handleCreateOrg} disabled={submitting || !orgName.trim()} full={true}>
                {submitting ? (
                  <>
                    <Spinner /> Uploading to Shelby Network...
                  </>
                ) : (
                  <>
                    <Icon n="cloud-upload" size={16} /> Register Organization
                  </>
                )}
              </Btn>
            </Card>
          </div>
        );

      case "org-dashboard":
        if (!organization) {
          return (
            <div className="fade-in" style={{ padding: "20px" }}>
              <Empty
                icon="building"
                title="No organization found"
                desc="You have not registered an organization. Please create an organization to start issuing certificates."
                action={
                  <Btn onClick={() => setView("create-org")}>
                    <Icon n="plus" size={16} /> Create Organization
                  </Btn>
                }
              />
            </div>
          );
        }

        return (
          <div className="fade-in" style={{ padding: "0 20px 20px" }}>
            <Card style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
              <Av name={organization.name} size={48} color="teal" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "2px" }}>{organization.name}</div>
                <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {organization.desc || "No description registered"}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <Badge color="teal" icon="target">{campaigns.length} Campaign</Badge>
                  {organization.website && (
                    <Badge color="gray" icon="world">
                      {organization.website.replace("https://", "").replace("http://", "").slice(0, 18)}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div className="section-title" style={{ margin: 0 }}>Campaign List</div>
              <Btn cls="btn-primary" size="sm" onClick={() => setShowCreateCamp(true)}>
                <Icon n="plus" size={14} /> New Campaign
              </Btn>
            </div>

            {showCreateCamp && (
              <Card style={{ marginBottom: "12px", border: "1px solid var(--color-primary-border)", background: "var(--color-primary-light)" }}>
                <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "12px", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon n="target" size={16} /> New Campaign
                </div>
                <Fld
                  label="Campaign Name"
                  value={campName}
                  onChange={setCampName}
                  placeholder="e.g., Web3 Bootcamp Batch 1"
                  req={true}
                />
                <Fld
                  label="Description"
                  value={campDesc}
                  onChange={setCampDesc}
                  placeholder="e.g., 6 weeks of intensive Smart Contract training"
                  multi={true}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <Btn onClick={handleCreateCampaign} disabled={submitting || !campName.trim()}>
                    {submitting ? <Spinner /> : <><Icon n="check" size={14} /> Create</>}
                  </Btn>
                  <Btn cls="btn-ghost" onClick={() => setShowCreateCamp(false)}>
                    <Icon n="x" size={14} /> Cancel
                  </Btn>
                </div>
              </Card>
            )}

            {campaigns.length === 0 && !showCreateCamp ? (
              <Empty icon="target" title="No campaigns yet" desc="Create a new campaign to organize certificate issuance." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {campaigns.map((camp) => {
                  const isOpen = activeCampId === camp.id;
                  return (
                    <Card key={camp.id}>
                      <div
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }}
                        onClick={() => setActiveCampId(isOpen ? null : camp.id)}
                      >
                        <div style={{ flex: 1, minWidth: 0, marginRight: "12px" }}>
                          <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "3px" }}>{camp.name}</div>
                          <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {camp.desc || "No description registered"}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end", flexShrink: 0 }}>
                          <Badge color="purple" icon="hash">{camp.id}</Badge>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                            <Icon n={isOpen ? "chevron-up" : "chevron-down"} size={13} />
                            {isOpen ? "Close" : "Issue"}
                          </div>
                        </div>
                      </div>

                      {isOpen && (
                        <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--color-border-tertiary)" }}>
                          <div className="section-title">Issue Certificates</div>
                          <Fld
                            label="Recipient Wallet Address"
                            value={issueAddrs}
                            onChange={setIssueAddrs}
                            placeholder="0xabc123...&#10;0xdef456...&#10;(one address per line or comma-separated)"
                            multi={true}
                            req={true}
                          />
                          <InfoBox cls="teal" icon="route">
                            Certificates will be uploaded to Shelby Storage (decentralized) and minted as non-transferable Soulbound Tokens (SBT) on Shelby Network.
                          </InfoBox>
                          <Btn
                            cls="btn-teal"
                            onClick={() => handleIssueCertificates(camp.id)}
                            disabled={submitting || !issueAddrs.trim()}
                          >
                            {submitting ? (
                              <>
                                <Spinner /> Processing...
                              </>
                            ) : (
                              <>
                                <Icon n="send" size={15} /> Issue to Recipients
                              </>
                            )}
                          </Btn>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "explore":
        // Simulated explore organizations and campaigns to make layout look rich
        const mockOrgs = [
          { addr: MODULE_ADDRESS, name: organization?.name || "Shelby Indonesia Academy", desc: organization?.desc || "Web3 Bootcamp provider", verified: true, count: campaigns.length },
          { addr: "0x1111111111111111111111111111111111111111111111111111111111111111", name: "Aptos Labs Indonesia", desc: "Local Aptos Developer Community", verified: true, count: 2 },
          { addr: "0x2222222222222222222222222222222222222222222222222222222222222222", name: "Pontem Foundation", desc: "Aptos ecosystem dApp developer", verified: false, count: 1 },
        ];

        return (
          <div className="fade-in" style={{ padding: "0 20px 20px" }}>
            <div className="section-title">Explore Registered Organizations</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {mockOrgs.map((o) => (
                <Card key={o.addr}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <Av name={o.name} size={42} color="teal" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "2px" }}>{o.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {o.desc}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end", flexShrink: 0 }}>
                      <Badge color="teal" icon="target">{o.count} Campaign</Badge>
                      {o.verified && <Badge color="green" icon="shield-check">Verified</Badge>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
          <span style={{ fontWeight: 600, fontSize: "15px" }}>CertChain Hub dApp</span>
          <Badge color="amber" icon="test-pipe">Shelby Testnet</Badge>
        </div>

        {connected && account && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--color-text-secondary)", cursor: "pointer" }}
              onClick={() => window.open(getExplorerAddressUrl(account.address), "_blank")}
              title="Click to view on explorer"
            >
              <Icon n="wallet" size={13} />
              <code style={{ fontSize: "11px" }}>
                {account.address.slice(0, 8) + "..." + account.address.slice(-4)}
              </code>
            </div>
            <button
              onClick={handleDisconnect}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--color-red)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
              title="Disconnect Wallet"
            >
              <Icon n="logout" size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Main View Area */}
      <div className="app-content" style={{ paddingTop: "16px" }}>
        {renderView()}
      </div>

      {/* Bottom Nav Bar */}
      {connected && profile && (
        <div className="nav-bar">
          {[
            { id: "dashboard", label: "Portfolio", icon: "layout-dashboard" },
            { id: "org-dashboard", label: "Organization", icon: "building" },
            { id: "explore", label: "Explore", icon: "compass" },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => {
                setSelectedCert(null);
                setView(id as any);
              }}
              className={`nav-item${view === id && !selectedCert ? " active" : ""}`}
            >
              <Icon n={icon} size={20} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Spinner component for loading buttons
function Spinner() {
  return (
    <span
      className="spinner"
      style={{
        width: "12px",
        height: "12px",
        borderWidth: "1.5px",
        marginRight: "6px",
      }}
    />
  );
}
