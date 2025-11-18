import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/header";
import Footer from "../../components/layout/footer";
import Logo from "../../../assets/mobile.png";

interface QRScanningProps {
  onQRScanned: (sessionCode: string) => void;
}

const RegisteredUserScanningScreen: React.FC = () => {
  const navigate = useNavigate();
  const [qrBuffer, setQrBuffer] = useState("");
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanStatus, setScanStatus] = useState("...Scanning in progress...");
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep focus on input
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current && !isProcessing) {
        inputRef.current.focus();
      }
    }, 100);

    return () => clearInterval(focusInterval);
  }, [isProcessing]);

  // Validate QR Code with backend
  const validateQRCode = async (sessionCode: string): Promise<any> => {
    setScanStatus("Validating QR Code...");
    
    try {
      const response = await fetch(
        "https://rebit-api.ceewen.xyz/api/rvm/RVM-3101/qr/validate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionCode }),
          signal: AbortSignal.timeout(10000),
        }
      );

      const data = await response.json();

      if (data.success && data.user) {
        console.log("✅ QR validated:", data.user);
        return { valid: true, user: data.user };
      } else {
        console.error("❌ Validation failed:", data.error);
        return { valid: false, error: data.error || "Invalid QR Code" };
      }
    } catch (error: any) {
      console.error("❌ Validation error:", error);
      return {
        valid: false,
        error: error.name === "TimeoutError" ? "Request timeout" : error.message,
      };
    }
  };

  // Process QR Code
  const processQRCode = async (qrData: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    const cleanCode = qrData.replace("Enter", "").trim();

    // Validate format
    if (cleanCode.length < 5 || cleanCode.length > 50) {
      console.log("❌ Invalid QR code length:", cleanCode.length);
      setScanStatus("Invalid QR code length");
      setTimeout(() => resetForNextScan(), 2000);
      return;
    }

    if (!/^\d+$/.test(cleanCode)) {
      console.log("❌ QR code must be numeric only");
      setScanStatus("QR code must be numeric");
      setTimeout(() => resetForNextScan(), 2000);
      return;
    }

    console.log("📱 QR scanned:", cleanCode);

    // Validate with backend
    const result = await validateQRCode(cleanCode);

    if (result.valid) {
      setScanStatus("✅ Authentication successful!");
      
      // Navigate to session screen with user data
      setTimeout(() => {
        navigate("/session", { state: { user: result.user } });
      }, 1000);
    } else {
      setScanStatus(`❌ ${result.error}`);
      setTimeout(() => resetForNextScan(), 3000);
    }
  };

  // Reset for next scan
  const resetForNextScan = () => {
    setQrBuffer("");
    setIsProcessing(false);
    setScanStatus("...Scanning in progress...");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Handle keyboard input
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isProcessing) {
      event.preventDefault();
      return;
    }

    const currentTime = Date.now();
    const timeDiff = currentTime - lastKeyTime;

    // Reset buffer if too much time passed
    if (timeDiff > 100) {
      setQrBuffer("");
    }

    setLastKeyTime(currentTime);

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }

      if (qrBuffer.length > 0) {
        console.log("📱 QR Scan detected:", qrBuffer);
        processQRCode(qrBuffer);
      }
    } else {
      const newBuffer = qrBuffer + event.key;
      setQrBuffer(newBuffer);

      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }

      // Auto-process after 200ms of no input
      if (newBuffer.length >= 5) {
        scanTimerRef.current = setTimeout(() => {
          if (newBuffer.length > 0 && !isProcessing) {
            console.log("📱 QR Scan completed (timeout):", newBuffer);
            processQRCode(newBuffer);
          }
        }, 200);
      }
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-gray-100 flex flex-col overflow-y-auto">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-between px-12 py-16">
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl">
          {/* Image Container */}
          <div className="bg-white rounded-3xl shadow-lg p-20 mb-12 w-full">
            <div className="flex justify-center items-center h-64">
              <img
                src={Logo}
                alt="Hands holding phone with QR code"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>

          {/* Text Content */}
          <h1 className="text-5xl font-bold text-[#1e3a52] text-center mb-6">
            Members, please scan your QR code
            <br />
            for authentication
          </h1>
          <p className="text-2xl text-gray-600 text-center mb-16 leading-relaxed">
            Please check the instructions on the collection box for
            <br />
            the scanning location.
          </p>

          {/* Scanning Status Bar */}
          <div className="w-full max-w-2xl">
            <div className="bg-[#2c4a5e] text-white text-3xl font-semibold text-center py-7 rounded-lg shadow-lg">
              {scanStatus}
            </div>
          </div>

          {/* Hidden Input for QR Scanner */}
          <input
            ref={inputRef}
            type="text"
            value={qrBuffer}
            onChange={() => {}} // Controlled by keydown
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="absolute opacity-0 w-1 h-1"
            style={{ left: "-9999px" }}
          />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default RegisteredUserScanningScreen;