import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { BrowserMultiFormatReader } from "@zxing/browser";
import QRScanner from "./components/Scanner/QRScanner";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import Card from "./components/Main/Card";
import SectionHeader from "./components/Main/SectionHeader";
import { List, ScanQrCode } from "lucide-react";
import QRList from "./components/Scanner/QRList";
import { selectScannerMenu } from "./selectors/scannerMenuSelectors";
import { setScannerMenu } from "./slices/scannerMenuSlice";

function App() {
  const scannerMenu = useSelector(selectScannerMenu)
  const dispatch = useDispatch()
  const handleScanModeButton = () => dispatch(setScannerMenu(!scannerMenu))

  return (
    <>
      <div className="min-h-screen flex flex-col bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
        {/* <Header /> */}
        <main className="flex-1 p-4 sm:p-8 space-y-6">
          <div>
            {!scannerMenu && (
              <>
                <button onClick={handleScanModeButton}>
                  <ScanQrCode
                    size={16}
                    className="w-6 h-6 text-red-500 hover:text-red-700"
                  />
                </button>
                <QRList />
              </>
            )}
            {scannerMenu && (
              <>
                <button onClick={handleScanModeButton}>
                  <List
                    size={16}
                    className="w-6 h-6 text-red-500 hover:text-red-700"
                  />
                </button>
                <QRScanner />
              </>
            )}
          </div>
        </main>
        {/* <Footer /> */}
      </div>
    </>
  );
}

export default App;
