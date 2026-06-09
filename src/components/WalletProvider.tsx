"use client";

import React, { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShelbyClientProvider } from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { ToastProvider } from "./Toast";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  }), []);

  const shelbyClient = useMemo(() => {
    return new ShelbyClient({ network: Network.SHELBYNET });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AptosWalletAdapterProvider
        autoConnect={true}
        dappConfig={{
          network: Network.SHELBYNET,
        }}
        onError={(err) => {
          console.error("Aptos Wallet Error:", err);
        }}
      >
        <ShelbyClientProvider client={shelbyClient}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ShelbyClientProvider>
      </AptosWalletAdapterProvider>
    </QueryClientProvider>
  );
}
export default WalletProvider;
