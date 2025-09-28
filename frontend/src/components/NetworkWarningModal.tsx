import { useEffect, useState } from "react";
import { useAccountStore } from "@massalabs/react-ui-kit/src/lib/ConnectMassaWallets";

interface NetworkWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NetworkWarningModal: React.FC<NetworkWarningModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentWallet } = useAccountStore();
  const [targetNetwork, setTargetNetwork] = useState<string>("BUILDNET");

  useEffect(() => {
    // Get the target network from environment variables
    const networkFromEnv = import.meta.env.VITE_AI_NETWORK || "BUILDNET";
    setTargetNetwork(networkFromEnv.toUpperCase());
  }, []);

  const stopPropagation = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[100] flex justify-center items-center transition-opacity duration-300"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="relative p-8 max-w-[500px] w-full mx-4 bg-white brut-card text-ink-950"
        onClick={stopPropagation}
        role="dialog"
        aria-labelledby="network-warning-title"
        aria-describedby="network-warning-description"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-ink-950 hover:text-accent-primary transition-colors duration-200"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>

        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-yellow-500"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>

        {/* Modal Title */}
        <h2 id="network-warning-title" className="text-2xl font-bold text-ink-950 text-center mb-4">
          Wrong Network Detected
        </h2>

        {/* Modal Content */}
        <div id="network-warning-description" className="text-ink-950/70 text-center mb-6">
          <p className="mb-4">
            You are connected to the wrong network. Please switch to{" "}
            <strong>{targetNetwork}</strong> in your{" "}
            <strong>{currentWallet?.name()}</strong> wallet settings to use this application.
          </p>
          <p className="text-sm">
            The application requires {targetNetwork} network to function properly.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="brut-btn bg-gray-200 text-ink-950 font-bold hover:bg-gray-300 transition-colors"
          >
            I'll Switch Later
          </button>
          <button
            onClick={() => {
              onClose();
            }}
            className="brut-btn bg-accent-primary text-ink-950 font-bold hover:bg-accent-primary/80 transition-colors"
          >
            Open Wallet Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkWarningModal;