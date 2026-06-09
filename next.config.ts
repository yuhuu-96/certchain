import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@aptos-labs/wallet-adapter-react",
    "@aptos-labs/wallet-adapter-core",
    "@aptos-connect/wallet-adapter-plugin",
    "@aptos-labs/wallet-standard"
  ]
};

export default nextConfig;
