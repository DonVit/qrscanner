import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import QRScanner from "./components/Scanner/QRScanner";
import QRList from "./components/Scanner/QRList";
import Header from "./components/Header/Header";
import StatsPage from "./components/Stats/StatsPage";
import { List, ScanQrCode, CloudUpload } from "lucide-react";
import { selectScannerMenu } from "./selectors/scannerMenuSelectors";
import { setScannerMenu } from "./slices/scannerMenuSlice";
import { syncPendingReceiptsRequested } from "./slices/receptsSlice";

function App() {
  const scannerMenu = useSelector(selectScannerMenu);
  const saveStatus = useSelector((state) => state.saveStatus);
  const auth = useSelector((state) => state.auth);
  const receipts = useSelector((state) => state.recepts);
  const dispatch = useDispatch();
  const [showStats, setShowStats] = useState(window.location.hash === "#stats");

  const receiptEntries = Object.entries(receipts || {})
    .filter(([key]) => key !== "_persist")
    .map(([, receipt]) => receipt)
    .filter((receipt) => receipt && typeof receipt === "object");
  const uploadedCount = receiptEntries.filter((receipt) => receipt?.uploaded).length;
  const pendingCount = receiptEntries.length - uploadedCount;

  const handleScanModeButton = () => dispatch(setScannerMenu(!scannerMenu));
  const handleSyncReceipts = () => dispatch(syncPendingReceiptsRequested());

  useEffect(() => {
    const onOnline = () => {
      dispatch(syncPendingReceiptsRequested());
    };

    const onHashChange = () => {
      setShowStats(window.location.hash === "#stats");
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [dispatch]);

  const shouldShowSaveStatus = Boolean(
    saveStatus?.message &&
      !(saveStatus.message === "Sign in to save scans on the backend." && auth?.user && auth?.token)
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
      <Header />
      <main className="flex-1 p-4 sm:p-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={handleScanModeButton} className="p-2 rounded-lg border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-gray-800">
              {scannerMenu ? (
                <List size={18} />
              ) : (
                <ScanQrCode size={18} />
              )}
            </button>
            <button onClick={handleSyncReceipts} className="p-2 rounded-lg border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-800 flex items-center gap-2">
              <CloudUpload size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              Uploaded: {uploadedCount}
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              Pending: {pendingCount}
            </div>
            {shouldShowSaveStatus && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {saveStatus.message}
              </div>
            )}
          </div>
        </div>

        <div>
          {showStats ? <StatsPage /> : (!scannerMenu ? <QRList /> : <QRScanner />)}
        </div>
      </main>
    </div>
  );
}

export default App;
