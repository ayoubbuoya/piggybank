import { useEffect, useState } from "react";
import { useAccountStore } from "@massalabs/react-ui-kit/src/lib/ConnectMassaWallets";

const useNetworkCheck = () => {
  const { connectedAccount, currentWallet } = useAccountStore();
  const [showNetworkWarning, setShowNetworkWarning] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null);
  const [targetNetwork, setTargetNetwork] = useState<string>("BUILDNET");

  useEffect(() => {
    // Get the target network from environment variables
    const networkFromEnv = import.meta.env.VITE_AI_NETWORK || "BUILDNET";
    setTargetNetwork(networkFromEnv.toUpperCase());
  }, []);

  const checkNetwork = async () => {
    if (connectedAccount && currentWallet) {
      try {
        const networkInfo = await currentWallet.networkInfos();
        const networkName = networkInfo?.name ?? null;
        setCurrentNetwork(networkName);

        console.log("Current network:", networkName);
        console.log("Target network:", targetNetwork);

        if (networkName && networkName.toUpperCase() !== targetNetwork.toUpperCase()) {
          setShowNetworkWarning(true);
        } else {
          setShowNetworkWarning(false);
        }
      } catch (error) {
        console.error("Error fetching network info:", error);
        setCurrentNetwork(null);
        setShowNetworkWarning(false);
      }
    } else {
      setCurrentNetwork(null);
      setShowNetworkWarning(false);
    }
  };

  useEffect(() => {
    checkNetwork();

    // Set up network change listener if wallet supports it
    const handleNetworkChange = async () => {
      await checkNetwork();
    };

    if (currentWallet && typeof currentWallet.listenNetworkChanges === 'function') {
      currentWallet.listenNetworkChanges(handleNetworkChange);
    }

  
    return () => {
     
    };
  }, [connectedAccount, currentWallet, targetNetwork]);

  const closeNetworkWarning = () => {
    setShowNetworkWarning(false);
  };

  return {
    showNetworkWarning,
    currentNetwork,
    targetNetwork,
    closeNetworkWarning,
    checkNetwork
  };
};

export default useNetworkCheck;