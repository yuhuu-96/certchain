import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Fallback address represents our deployed contract address.
// Developers can overwrite this using the NEXT_PUBLIC_MODULE_ADDRESS environment variable.
export const MODULE_ADDRESS = 
  process.env.NEXT_PUBLIC_MODULE_ADDRESS || 
  "0x0b9680e56aa9447c71b59a7aed1a5bd543d2aead539f151715e559da0cd1ed39";

const config = new AptosConfig({ network: Network.SHELBYNET });
export const aptos = new Aptos(config);

export interface OnChainProfile {
  name: string;
  bio: string;
  twitter: string;
  github: string;
  created_at: string;
}

export interface OnChainOrganization {
  name: string;
  desc: string;
  website: string;
  owner: string;
  created_at: string;
}

export interface OnChainCampaign {
  id: string;
  name: string;
  desc: string;
  created_at: string;
}

export interface OnChainCertificate {
  id: string;
  campaign_id: string;
  issuer: string;
  blob_url: string;
  issued_at: string;
}

/**
 * Fetch a user's registered profile on-chain.
 */
export async function getProfile(address: string): Promise<OnChainProfile | null> {
  try {
    const resource = await aptos.getAccountResource({
      accountAddress: address,
      resourceType: `${MODULE_ADDRESS}::certchain::Profile`,
    });
    return resource as unknown as OnChainProfile;
  } catch (error) {
    // Returns null if user profile is not registered on-chain
    return null;
  }
}

/**
 * Fetch organization registered by a specific wallet address.
 */
export async function getOrganization(address: string): Promise<OnChainOrganization | null> {
  try {
    const resource = await aptos.getAccountResource({
      accountAddress: address,
      resourceType: `${MODULE_ADDRESS}::certchain::Organization`,
    });
    return resource as unknown as OnChainOrganization;
  } catch (error) {
    return null;
  }
}

/**
 * Fetch all campaigns created by an organization.
 */
export async function getCampaigns(address: string): Promise<OnChainCampaign[]> {
  try {
    const resource = await aptos.getAccountResource({
      accountAddress: address,
      resourceType: `${MODULE_ADDRESS}::certchain::CampaignRegistry`,
    });
    return (resource as any).campaigns || [];
  } catch (error) {
    return [];
  }
}

/**
 * Fetch all certificates issued to a recipient address.
 */
export async function getCertificates(address: string): Promise<OnChainCertificate[]> {
  try {
    const resource = await aptos.getAccountResource({
      accountAddress: address,
      resourceType: `${MODULE_ADDRESS}::certchain::UserCertificates`,
    });
    return (resource as any).certs || [];
  } catch (error) {
    return [];
  }
}

/**
 * Fetch JSON content from a Shelby blob URL
 */
export async function fetchBlobMetadata(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch blob");
    return await response.json();
  } catch (error) {
    console.error("Error fetching blob metadata:", error);
    return null;
  }
}
