import React, { useEffect, useState } from "react";
import Header from "../../components/layout/header";
import Footer from "../../components/layout/footer";
import { useNavigate } from "react-router-dom";
import { useRVMControl } from "../../hooks/useRVMControl";
import PlasticBottle from "../../../assets/Plastic bottle.png";
import Can from "../../../assets/Can.png";

const ReBitGuestCollectionScreen: React.FC = () => {
  const navigate = useNavigate();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isSessionEndClicked, setIsSessionEndClicked] = useState(false);

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
  }, [isReady, sessionStarted]);

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

      // if (result.success && result.qrCode) {
        // Navigate to points screen with QR code from backend
        navigate("/guest-points-screen", {
          state: {
            sessionCode: sessionCode,
            // petBottles: itemCounts.pet,
            // aluminumCans: itemCounts.aluminum,
            // steelCans: itemCounts.steel,
            totalPoints: totalPoints,
            qrCode: result.qrCode, // QR code from backend
          },
        });
      // } 
      // else {
      //   console.error("Failed to end session:", result.error);
      // }
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
          <img src="https://2374de0cfadcd9e0873215900598bd47.cdn.bubble.io/f1752046784785x173357834499014530/guest_Mode.svg" />

          <div className="flex-1 pt-2">
            <p className="text-xl text-[#1e3a52] font-semibold leading-relaxed">
              資源ゴミを投入口に入れてください
              <br />
              すべて入れた後、完了ボタンをタッチしてください
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
            回収された資源ゴミ
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-5xl">
            {itemCounts?.map((m) => (
              <div className="bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center transition-all">
                <div className="w-20 h-20 bg-[#14b8a6] rounded-full flex items-center justify-center mb-6">
                  <img
                    alt={m?.materialName}
                    src={
                      m?.materialName === "ペットボトル" ? PlasticBottle : Can
                    }
                    className="w-12 h-12"
                  />
                </div>
                <h3 className="text-2xl font-bold text-[#1e3a52] mb-4">
                  {m?.materialName}
                </h3>
                <div className="text-center">
                  <span className="text-5xl font-bold text-[#1e3a52]">
                    {m?.count}
                  </span>
                  <span className="text-2xl text-gray-600 ml-2">Piece</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Amount of Points Section */}
        <div className="mb-8">
          <div className="inline-block bg-[#2c4a5e] text-white px-10 py-4 rounded-full text-2xl font-semibold mb-6">
            ポイント数
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
            // onClick={handleInputComplete}
            onClick={() => setIsSessionEndClicked(true)}
            disabled={isProcessing || !sessionActive}
            className={`px-20 py-6 rounded-full text-3xl font-semibold transition-all shadow-xl hover:shadow-2xl active:scale-95 ${
              isProcessing || !sessionActive
                ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                : "bg-[#14b8a6] text-white hover:bg-[#0d9488]"
            }`}
          >
            {isProcessing ? "Processing..." : "投入完了"}
          </button>
        </div>
      </main>
      {isSessionEndClicked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-[28px] shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top Accent */}
            <div className="h-2 bg-linear-to-r from-[#14b8a6] to-[#148176]" />

            <div className="p-8">
              {/* Icon */}
              <div className="flex justify-center mb-5">
                <div className="w-20 h-20 rounded-full bg-[#14b8a6]/10 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-[5px] border-[#148176]" />
                </div>
              </div>

              {/* Content */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-[#1e3a52] mb-3">
                  セッション終了
                </h2>

                <p className="text-lg text-gray-600 leading-relaxed">
                  Are you sure you want to end the session?
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-4 mt-8">
                <button
                  className="flex-1 h-14 rounded-2xl border-2 border-[#148176] text-[#148176] font-semibold text-lg transition-all hover:bg-[#148176]/5 active:scale-95"
                  onClick={() => setIsSessionEndClicked(false)}
                >
                  No
                </button>

                <button
                  className="flex-1 h-14 rounded-2xl bg-linear-to-r from-[#14b8a6] to-[#148176] text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
                  onClick={handleInputComplete}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/*Footer*/}
      <Footer />
    </div>
  );
};

export default ReBitGuestCollectionScreen;
