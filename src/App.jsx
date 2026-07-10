import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import QRScanner from "./components/Scanner/QRScanner";
import QRList from "./components/Scanner/QRList";
import { List, ScanQrCode, CloudUpload } from "lucide-react";
import { selectScannerMenu } from "./selectors/scannerMenuSelectors";
import { setScannerMenu } from "./slices/scannerMenuSlice";
import { syncPendingReceiptsRequested } from "./slices/receptsSlice";

function App() {
  const scannerMenu = useSelector(selectScannerMenu);
  const saveStatus = useSelector((state) => state.saveStatus);
  const dispatch = useDispatch();

  const handleScanModeButton = () => dispatch(setScannerMenu(!scannerMenu));
  const handleSyncReceipts = () => dispatch(syncPendingReceiptsRequested());

  useEffect(() => {
    const onOnline = () => {
      dispatch(syncPendingReceiptsRequested());
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [dispatch]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
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
          {saveStatus?.message && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {saveStatus.message}
            </div>
          )}
        </div>

        <div>
          {!scannerMenu ? <QRList /> : <QRScanner />}
        </div>
      </main>
    </div>
  );
}

export default App;
