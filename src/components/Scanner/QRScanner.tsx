import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { SwitchCamera, ScanQrCode, QrCode } from "lucide-react";
import { useDispatch } from "react-redux";
import { addRecept } from "../../slices/receptsSlice";
import { scnnerOff } from "../../slices/scannerMenuSlice";

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [result, setResult] = useState("");
  const codeReaderRef = useRef(new BrowserMultiFormatReader());
  const controlsRef = useRef<IScannerControls | null>(null);
  const dispatch = useDispatch();
  const [urls, setUrls] = useState(() => new Map());

  const addUrl = (key: any, value: any) => {
    setUrls((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.set(key, value);
      return newMap;
    });
  };

  useEffect(() => {
    async function init() {
      try {
        // Ask for permission so labels are available
        await navigator.mediaDevices.getUserMedia({ video: true });

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        setDevices(devices);

        if (devices.length > 0) {
          // Prefer rear/environment camera if available
          const preferredDevice =
            devices.find((d) => /back|rear|environment/i.test(d.label)) ||
            devices[0];
          setSelectedDeviceId(preferredDevice.deviceId);
          startScanning(preferredDevice.deviceId);
        }
      } catch (err) {
        console.error("Error initializing camera:", err);
        setResult(`Error: ${(err as Error).message}`);
      }
    }

    init();

    // Stop scanning when component unmounts
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  async function startScanning(deviceId: string) {
    setResult("Scanning...");
    controlsRef.current?.stop(); // stop previous scanning session

    try {
      const codeReader = codeReaderRef.current;

      const controls = await codeReader.decodeFromVideoDevice(
        deviceId,
        videoRef.current!,
        (res, err) => {
          if (res) {
            // console.error(res)
            const url = res.getText();
            setResult(url);
            dispatch(addRecept(url));
            addUrl(url, url);
            // dispatch(scnnerOff())
            // controlsRef.current?.stop();
            // startScanning(selectedDeviceId);
          } else {
            // console.error('res')
          }
        }
      );

      controlsRef.current = controls;
    } catch (err) {
      console.error("Error starting scan:", err);
      setResult(`Error: ${(err as Error).message}`);
    }
  }

  function handleDeviceChange() {
    const index = devices.findIndex((c) => c.deviceId === selectedDeviceId);
    const nextIndex = index === devices.length - 1 ? 0 : index + 1;
    const nextDeviceId = devices[nextIndex].deviceId;
    setSelectedDeviceId(nextDeviceId);
    startScanning(nextDeviceId);
  }

  return (
    <div>
      <div>
        <video
          ref={videoRef}
          style={{ border: "1px solid #red" }}
          autoPlay
          muted
        />
      </div>
      <div className="flex">
        <button onClick={handleDeviceChange} aria-label="Switch Camera">
          <SwitchCamera
            size={16}
            className="w-6 h-6 text-red-500 hover:text-red-700"
          />
        </button>
        <p>urls count: {urls.size}</p>
        <p>
          <strong>Result:</strong> {result || "No code detected yet"}
        </p>
      </div>
    </div>
  );
}
