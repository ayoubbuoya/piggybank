import { useAccountStore } from "@massalabs/react-ui-kit";
import { useEffect, useState } from "react";
import {
  approveToken,
  deposit,
  fetchSpotPrice,
  getTokenXAddress,
  getTokenYAddress,
  getVaultTokensDetails,
  TokenDetails,
} from "../lib/liqManager";

export default function ALM() {
  const { connectedAccount } = useAccountStore();
  const [spotPrice, setSpotPrice] = useState<string | null>(null);
  const [tokenXDetails, setTokenXDetails] = useState<TokenDetails | null>(null);
  const [tokenYDetails, setTokenYDetails] = useState<TokenDetails | null>(null);
  const [liqShares, setLiqShares] = useState<string | null>(null);

  const initFetches = async () => {
    if (!connectedAccount) {
      console.error("No connected account");
      return;
    }

    try {
      const price = await fetchSpotPrice(connectedAccount);
      const vaultTokensDetails = await getVaultTokensDetails(connectedAccount);

      if (vaultTokensDetails.length < 2) {
        console.error("Insufficient token details retrieved");
        return;
      }

      setSpotPrice(price);
      setTokenXDetails(vaultTokensDetails[0]);
      setTokenYDetails(vaultTokensDetails[1]);
    } catch (error) {
      console.error("Error fetching spot price:", error);
    }
  };

  const handleDeposit = async () => {
    try {
      console.log("Deposit clicked");
      console.log("Token X Details:", tokenXDetails);
      console.log("Token Y Details:", tokenYDetails);
      if (!connectedAccount || !tokenXDetails || !tokenYDetails) {
        console.error("Missing connected account or token details");
        return;
      }

      const amountX = "1"; // Example amount for Token X
      const amountY = "2"; // Example amount for Token Y

      await approveToken(connectedAccount, tokenXDetails, amountX);

      await approveToken(connectedAccount, tokenYDetails, amountY);
      console.log("Approvals complete, proceeding with deposit...");

      await deposit(
        connectedAccount,
        amountX,
        amountY,
        tokenXDetails.decimals,
        tokenYDetails.decimals
      );
    } catch (error) {
      console.error("Error during deposit:", error);
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
        <div className="mt-4">
          <h3 className="font-semibold">Token X Details:</h3>
          {tokenXDetails ? (
            <div>
              <p>Address: {tokenXDetails.address}</p>
              <p>Decimals: {tokenXDetails.decimals}</p>
              <p>Symbol: {tokenXDetails.symbol}</p>
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </div>
        <div className="mt-4">
          <h3 className="font-semibold">Token Y Details:</h3>
          {tokenYDetails ? (
            <div>
              <p>Address: {tokenYDetails.address}</p>
              <p>Decimals: {tokenYDetails.decimals}</p>
              <p>Symbol: {tokenYDetails.symbol}</p>
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </div>

        <div className="mt-4 flex">
          <button className="brut-btn bg-blue-300 mr-2">Withdraw</button>
          <button onClick={handleDeposit} className="brut-btn bg-lime-300">
            Deposit
          </button>
        </div>
      </div>
    </div>
  );
}
