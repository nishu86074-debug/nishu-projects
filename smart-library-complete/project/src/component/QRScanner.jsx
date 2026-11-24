import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  ScanLine,
  Camera,
  AlertCircle,
  RefreshCw,
  SwitchCamera,
  ImageUp,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const QRScanner = ({
  onScan,
  onClose,
  mode = "qr",
  title = "Scan Student QR",
  subtitle = "Scan the student's Digital Library ID",
  hint = "Position the QR code inside the square",
  hintDetail = "The student's details will be loaded automatically after scanning.",
}) => {
  const isBarcode = mode === "barcode";
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);

  const [status, setStatus] = useState("starting");
  const [errorMessage, setErrorMessage] = useState("");
  const [facing, setFacing] = useState("environment");
  const [fileError, setFileError] = useState("");

  const scannerId = "library-qr-reader";

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) {
      return;
    }

    try {
      const state = scannerRef.current.getState();

      if (state === 2) {
        await scannerRef.current.stop();
      }

      scannerRef.current.clear();
    } catch (error) {
      console.log("Scanner cleanup error:", error);
    }

    scannerRef.current = null;
    isScanningRef.current = false;
  }, []);

  const handleScan = useCallback(
    async (decodedText) => {
      if (isScanningRef.current) {
        return;
      }

      isScanningRef.current = true;

      setStatus("scanned");

      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();

          if (state === 2) {
            await scannerRef.current.stop();
          }

          scannerRef.current.clear();
        } catch (error) {
          console.log("Scanner stop error:", error);
        }

        scannerRef.current = null;
      }

      onScan(decodedText);
    },
    [onScan],
  );

  const startScanner = useCallback(async () => {
    try {
      setErrorMessage("");

      const existingScanner = scannerRef.current;

      if (existingScanner) {
        try {
          const state = existingScanner.getState();

          if (state === 2) {
            await existingScanner.stop();
          }

          existingScanner.clear();
        } catch (error) {
          console.log("Previous scanner cleanup:", error);
        }

        scannerRef.current = null;
      }

      isScanningRef.current = false;

      const scanner = isBarcode
        ? new Html5Qrcode(scannerId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.QR_CODE,
            ],
            verbose: false,
          })
        : new Html5Qrcode(scannerId);

      scannerRef.current = scanner;

      const config = isBarcode
        ? {
            fps: 10,
            qrbox: { width: 280, height: 140 },
            disableFlip: false,
          }
        : {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
            aspectRatio: 1,
            disableFlip: false,
          };

      /*
       * First try:
       * Rear / environment camera
       */
      try {
        await scanner.start(
          { facingMode: facing },
          config,
          handleScan,
          () => {
            // QR not detected yet
          },
        );

        setStatus("scanning");
        return;
      } catch (environmentError) {
        console.log("Camera (" + facing + ") failed:", environmentError);
      }

      /*
       * Second try:
       * Find available cameras
       */
      const cameras = await Html5Qrcode.getCameras();

      if (!cameras || cameras.length === 0) {
        throw new Error(
          "No camera found. Please check your phone camera and browser permission.",
        );
      }

      const cameraId = cameras[0].id;

      await scanner.start(cameraId, config, handleScan, () => {
        // QR not detected yet
      });

      setStatus("scanning");
    } catch (error) {
      console.error("QR Scanner Error:", error);

      setStatus("error");

      if (error?.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Camera start nahi ho pa raha hai.");
      }
    }
  }, [handleScan, isBarcode, facing]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setFileError("");

    try {
      await stopScanner();

      const fileScanner = new Html5Qrcode("library-file-reader", {
        verbose: false,
      });

      const result = await fileScanner.scanFile(file, false);

      try {
        fileScanner.clear();
      } catch {
        // ignore
      }

      isScanningRef.current = true;
      setStatus("scanned");
      onScan(result);
    } catch (error) {
      console.log("Photo scan failed:", error);
      setFileError(
        "Photo mein code nahi mila. Barcode ko paas se, seedha aur saaf photo kheenchiye.",
      );
      startScanner();
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initializeScanner = async () => {
      /*
       * Small delay prevents React's effect from
       * immediately causing a cascading render warning.
       */
      await Promise.resolve();

      if (cancelled) {
        return;
      }

      await startScanner();
    };

    initializeScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
              <ScanLine className="h-6 w-6 text-indigo-600" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {title}
              </h2>

              <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close scanner"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scanner */}
        <div className="p-5">
          <div className="overflow-hidden rounded-2xl border-2 border-indigo-200 bg-gray-950">
            <div id={scannerId} className="min-h-80 w-full" />
          </div>

          {/* Starting */}
          {status === "starting" && (
            <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-center">
              <Camera className="mx-auto mb-2 h-7 w-7 text-blue-600" />

              <p className="font-semibold text-blue-900">
                Camera start ho raha hai...
              </p>

              <p className="mt-1 text-sm text-blue-700">Please wait...</p>
            </div>
          )}

          {/* Scanning */}
          {status === "scanning" && (
            <div className="mt-4 rounded-2xl bg-green-50 p-4 text-center">
              <ScanLine className="mx-auto mb-2 h-7 w-7 text-green-600" />

              <p className="font-semibold text-green-900">Camera ready hai</p>

              <p className="mt-1 text-sm text-green-700">
                Code ko box ke andar rakhein.
              </p>
            </div>
          )}

          {/* Scanned */}
          {status === "scanned" && (
            <div className="mt-4 rounded-2xl bg-green-50 p-4 text-center">
              <p className="font-semibold text-green-900">
                Scanned successfully!
              </p>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />

                <div className="min-w-0">
                  <p className="font-semibold text-red-900">
                    Camera start nahi hua
                  </p>

                  <p className="mt-1 break-words text-sm text-red-700">
                    {errorMessage}
                  </p>

                  <button
                    type="button"
                    onClick={startScanner}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 rounded-2xl bg-indigo-50 p-4 text-center">
            <p className="font-semibold text-indigo-900">
              {hint}
            </p>

            <p className="mt-1 text-sm text-indigo-700">{hintDetail}</p>
          </div>

          {/* Camera switch + photo scan */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                setFacing((previous) =>
                  previous === "environment" ? "user" : "environment",
                )
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              <SwitchCamera className="h-5 w-5" />
              {facing === "environment" ? "Use Front Camera" : "Use Back Camera"}
            </button>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100">
              <ImageUp className="h-5 w-5" />
              Scan from Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </div>

          {fileError && (
            <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {fileError}
            </p>
          )}

          <div id="library-file-reader" className="hidden" />

          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
