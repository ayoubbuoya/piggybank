import { useAccountStore } from "@massalabs/react-ui-kit";
import { useEffect, useState } from "react";
import {
  fetchSpotPrice,
  getTokenXAddress,
  getTokenYAddress,
} from "../lib/liqManager";

export default function ALM() {
  const { connectedAccount } = useAccountStore();
  const [spotPrice, setSpotPrice] = useState<string | null>(null);
  const [tokenXAddress, setTokenXAddress] = useState<string | null>(null);
  const [tokenYAddress, setTokenYAddress] = useState<string | null>(null);

  const initFetches = async () => {
    if (!connectedAccount) {
      console.error("No connected account");
      return;
    }

    try {
      const price = await fetchSpotPrice(connectedAccount);
      const tokenX = await getTokenXAddress(connectedAccount);
      const tokenY = await getTokenYAddress(connectedAccount);
      setSpotPrice(price);
      setTokenXAddress(tokenX);
      setTokenYAddress(tokenY);
    } catch (error) {
      console.error("Error fetching spot price:", error);
    }
  };

  useEffect(() => {
    initFetches();
  }, []);

  if (!connectedAccount) {
    return (
      <div className="space-y-6">
        <div className="brut-card bg-yellow-100 p-6 text-center">
          <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-700">
            Please connect your Massa wallet to view and manage your vaults.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="brut-card bg-white p-6">
        <h2 className="text-xl font-bold mb-2">ALM</h2>
        <p className="text-gray-700">ALM page</p>
        <p className="text-gray-700">Spot Price: {spotPrice ?? "Loading..."}</p>
        <p className="text-gray-700">
          Token X Address: {tokenXAddress ?? "Loading..."}
        </p>
        <p className="text-gray-700">
          Token Y Address: {tokenYAddress ?? "Loading..."}
        </p>
      </div>
    </div>
  );
}
