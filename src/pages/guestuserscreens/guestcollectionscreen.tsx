import React, { useEffect, useState } from "react";
import Header from "../../components/layout/header";
import Footer from "../../components/layout/footer";
import { useNavigate } from "react-router-dom";
import { useRVMControl } from "../../hooks/useRVMControl";

const ReBitGuestCollectionScreen: React.FC = () => {
  const navigate = useNavigate();
  const [sessionStarted, setSessionStarted] = useState(false);

  const {
    status,
    error,
    setError,
    itemCounts,
    totalPoints,
    isProcessing,
    sessionActive,
    sessionCode,
    isReady,
    startGuestSession,
    endSession,
  } = useRVMControl();

  // Start session when component mounts
  useEffect(() => {
    if (isReady && !sessionStarted) {
      startGuestSessionFlow();
    }

    return () => {
      // Cleanup if user navigates away without completing
      if (sessionActive && sessionCode) {
        console.log("Component unmounting, session still active");
      }
    };
  }, [isReady,sessionStarted]);

  const startGuestSessionFlow = async () => {
    try {
      const result = await startGuestSession();
      if (result.success && result.sessionCode) {
        setSessionStarted(true);
        console.log("✅ Guest session started:", result.sessionCode);
      } else {
        console.error("Failed to start guest session:", result.error);
        setError(result.error);
      }
    } catch (err) {
      console.error("Error starting session:", err);
    }
  };

  const handleInputComplete = async () => {
    if (!sessionCode) {
      console.error("No session code available");
      return;
    }

    try {
      // End the session and get backend response with QR code
      const result = await endSession();
      
      if (result.success && result.qrCode) {
        // Navigate to points screen with QR code from backend
        navigate("/guest-points-screen", {
          state: {
            sessionCode: sessionCode,
            petBottles: itemCounts.pet,
            aluminumCans: itemCounts.aluminum,
            steelCans: itemCounts.steel,
            totalPoints: totalPoints,
            qrCode: result.qrCode, // QR code from backend
          },
        });
      } else {
        console.error("Failed to end session:", result.error);
      }
    } catch (err) {
      console.error("Error ending session:", err);
    }
  };

  return (
    <div className="w-screen h-screen bg-gray-100 flex flex-col overflow-y-auto">
      {/*Header*/}
      <Header />
      {/* Main Content */}
      <main className="flex-1 px-12 py-10">
        {/* Guest Mode Badge and Instructions */}
        <div className="flex items-start gap-6 mb-10">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full border-4 border-[#14b8a6] bg-white flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-bold text-[#1e3a52] leading-tight">
                  Guest
                </div>
                <div className="text-sm font-bold text-[#1e3a52] leading-tight">
                  Mode
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 pt-2">
            <p className="text-xl text-[#1e3a52] font-semibold leading-relaxed">
              Please place recyclable waste into the disposal chute.
              <br />
              After placing all items, press the input complete button.
            </p>
            
            {/* Status Indicator */}
            {isProcessing && (
              <div className="mt-4 flex items-center gap-2 text-[#14b8a6]">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#14b8a6]"></div>
                <span className="text-lg font-medium">{status}</span>
              </div>
            )}
            
            {error && (
              <div className="mt-4 px-4 py-2 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Collected Recyclable Waste Section */}
        <div className="mb-10">
          <div className="inline-block bg-[#2c4a5e] text-white px-10 py-4 rounded-full text-2xl font-semibold mb-8">
            Collected recyclable waste
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-5xl">
            {/* PET Bottles Card */}
            <div className={`bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center transition-all ${
              itemCounts.pet > 0 ? 'ring-4 ring-[#14b8a6] ring-opacity-50 scale-105' : ''
            }`}>
              <div className="w-20 h-20 bg-[#14b8a6] rounded-full flex items-center justify-center mb-6">
                <img
                  src="/api/placeholder/48/48"
                  alt="Pet Bottle"
                  className="w-12 h-12"
                />
              </div>
              <h3 className="text-2xl font-bold text-[#1e3a52] mb-4">
                PET Bottles
              </h3>
              <div className="text-center">
                <span className="text-5xl font-bold text-[#1e3a52]">
                  {itemCounts.pet}
                </span>
                <span className="text-2xl text-gray-600 ml-2">Piece</span>
              </div>
            </div>

            {/* Aluminum Cans Card */}
            <div className={`bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center transition-all ${
              itemCounts.aluminum > 0 ? 'ring-4 ring-[#14b8a6] ring-opacity-50 scale-105' : ''
            }`}>
              <div className="w-20 h-20 bg-[#14b8a6] rounded-full flex items-center justify-center mb-6">
                <img
                  src="/api/placeholder/48/48"
                  alt="Aluminum Can"
                  className="w-12 h-12"
                />
              </div>
              <h3 className="text-2xl font-bold text-[#1e3a52] mb-4">
                Aluminum cans
              </h3>
              <div className="text-center">
                <span className="text-5xl font-bold text-[#1e3a52]">
                  {itemCounts.aluminum}
                </span>
                <span className="text-2xl text-gray-600 ml-2">Piece</span>
              </div>
            </div>

            {/* Steel Cans Card */}
            <div className={`bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center transition-all ${
              itemCounts.steel > 0 ? 'ring-4 ring-[#14b8a6] ring-opacity-50 scale-105' : ''
            }`}>
              <div className="w-20 h-20 bg-[#14b8a6] rounded-full flex items-center justify-center mb-6">
                <img
                  src="/api/placeholder/48/48"
                  alt="Steel Can"
                  className="w-12 h-12"
                />
              </div>
              <h3 className="text-2xl font-bold text-[#1e3a52] mb-4">
                Steel cans
              </h3>
              <div className="text-center">
                <span className="text-5xl font-bold text-[#1e3a52]">
                  {itemCounts.steel}
                </span>
                <span className="text-2xl text-gray-600 ml-2">Piece</span>
              </div>
            </div>
          </div>
        </div>

        {/* Amount of Points Section */}
        <div className="mb-8">
          <div className="inline-block bg-[#2c4a5e] text-white px-10 py-4 rounded-full text-2xl font-semibold mb-6">
            Amount of points
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-12 max-w-5xl">
            <div className="text-center">
              <span className="text-7xl font-bold text-[#1e3a52]">
                {totalPoints}
              </span>
              <span className="text-3xl text-gray-600 ml-3">pt</span>
            </div>
          </div>
        </div>

        {/* Input Complete Button */}
        <div className="flex justify-center mt-10">
          <button
            onClick={handleInputComplete}
            disabled={isProcessing || !sessionActive}
            className={`px-20 py-6 rounded-full text-3xl font-semibold transition-all shadow-xl hover:shadow-2xl active:scale-95 ${
              isProcessing || !sessionActive
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-[#14b8a6] text-white hover:bg-[#0d9488]'
            }`}
          >
            {isProcessing ? 'Processing...' : 'Input Complete'}
          </button>
        </div>
      </main>
      {/*Footer*/}
      <Footer />
    </div>
  );
};

export default ReBitGuestCollectionScreen;