"use client";

import React, { useRef } from "react";
import { OnChainCertificate } from "@/utils/aptos";

interface CertificateVisualProps {
  cert: OnChainCertificate;
  metadata?: {
    campaignName?: string;
    campaignDescription?: string;
    organizationName?: string;
    credentialId?: string;
    issuedAt?: number;
  } | null;
  recipientName?: string | null;
  recipientAddress: string;
}

export default function CertificateVisual({
  cert,
  metadata,
  recipientName,
  recipientAddress,
}: CertificateVisualProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const displayRecipient = recipientName || `${recipientAddress.slice(0, 10)}...${recipientAddress.slice(-8)}`;
  const displayCampaignName = metadata?.campaignName || "Decentralized Certificate Contribution";
  const displayOrgName = metadata?.organizationName || `Org (${cert.issuer.slice(0, 8)})`;
  const credentialId = metadata?.credentialId || `CERT-${String(cert.id).padStart(6, "0")}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      {/* Visual Certificate Container */}
      <div 
        ref={printRef}
        className="certificate-container print-cert-only"
      >
        {/* Background Watermark */}
        <div className="cert-watermark">SECURED</div>

        {/* Certificate Content */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="cert-header">Certificate of Achievement</div>
          <div className="cert-subheader">Soulbound Token (SBT) Credential</div>
          
          <div className="cert-recipient-label">This is proudly presented to</div>
          <div className="cert-recipient-name">{displayRecipient}</div>
          
          <div className="cert-course-label">for successful completion of</div>
          <div className="cert-course-name">{displayCampaignName}</div>
          
          <p style={{ 
            fontSize: "12px", 
            color: "var(--color-text-secondary)", 
            maxWidth: "460px", 
            margin: "0 auto 20px", 
            lineHeight: 1.5 
          }}>
            {metadata?.campaignDescription || "Demonstrated outstanding contribution and verifiable competency registered on-chain."}
          </p>

          <div className="cert-footer-layout">
            {/* Signature Side */}
            <div className="cert-signature-box">
              <div className="cert-signature-img">{displayOrgName}</div>
              <div className="cert-signature-line" />
              <div className="cert-signature-title">Authorized Issuer</div>
              <code style={{ fontSize: "9px", color: "var(--color-text-secondary)", display: "block", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
                {cert.issuer.slice(0, 10)}...
              </code>
            </div>

            {/* Cryptographic Seal Side */}
            <div className="cert-seal-box">
              <div className="cert-gold-seal">
                <i className="ti ti-shield-check" style={{ fontSize: "24px", color: "#000" }} />
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-teal)", fontFamily: "var(--font-mono)", letterSpacing: "0.5px" }}>
                VERIFIED STATUS
              </div>
              <code style={{ fontSize: "9px", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>
                ID: {credentialId}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "10px", width: "100%", justifyContent: "center" }}>
        <button
          className="btn btn-teal btn-full"
          onClick={handlePrint}
          style={{ flex: 1 }}
        >
          <i className="ti ti-printer" style={{ fontSize: "16px" }} /> Print or Save PDF
        </button>
      </div>
    </div>
  );
}
