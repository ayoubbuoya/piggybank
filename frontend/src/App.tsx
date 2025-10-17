import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Landing from "./pages/Landing.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import CreateVault from "./pages/CreateVault.tsx";
import VaultDetails from "./pages/VaultDetails.tsx";
import Analytics from "./pages/Analytics.tsx";
import About from "./pages/About.tsx";
import Settings from "./pages/Settings.tsx";
import DCA from "./pages/DCA.tsx";
import AppLayout from "./components/AppLayout.tsx";
import NetworkWarningModal from "./components/NetworkWarningModal.tsx";
import useAccountSync from "./hooks/useAccountSync.tsx";
import useNetworkCheck from "./hooks/useNetworkCheck.tsx";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  useAccountSync();
  const { showNetworkWarning, closeNetworkWarning } = useNetworkCheck();

  return (
    <>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dca" element={<DCA />} />
          <Route path="/vault/create" element={<CreateVault />} />
          <Route path="/vault/:id" element={<VaultDetails />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/about" element={<About />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppLayout>
      
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        className="mt-16"
        aria-label="Toast notifications"
      />

      <NetworkWarningModal
        isOpen={showNetworkWarning}
        onClose={closeNetworkWarning}
      />
    </>
  );
}
