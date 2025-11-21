import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/layout/header";
import Footer from "../../components/layout/footer";
import { useRVM } from "../../contexts/RvmContext"; // ✅ Changed from useRVMControl

interface LocationState {
  user: {
    userId: string;
    name?: string;
    username?: string;
    email?: string;
    sessionCode: string;
  };
}

const ActiveSessionScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = (location.state as LocationState) || {};

  // ✅ Use global RVM context - system is already ready
  const {
    status,
    // ✅ No isReady needed - system guaranteed ready
    itemsProcessed,
    totalWeight,
    totalPoints,
    itemCounts,
    statusMessage,
    error,
    startSession,
    endSession,
  } = useRVM(); // ✅ Changed from useRVMControl()

  const [sessionStarted, setSessionStarted] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // ✅ Start session when component mounts - no isReady check needed
  useEffect(() => {
    if (!user) {
      // If no user data, redirect back to scanning
      navigate("/");
      return;
    }

    // ✅ Simplified - no isReady check needed
    if (!sessionStarted) {
      console.log("🎬 Starting session for:", user.name || user.username);
      startSession(user);
      setSessionStarted(true);
    }
  }, [user, navigate, startSession, sessionStarted]); // ✅ Removed isReady dependency

  // Handle session end
  const handleEndSession = async () => {
    if (!showEndConfirm) {
      setShowEndConfirm(true);
      return;
    }

    console.log("🏁 Ending session");
    const result = await endSession();

    if (result.success) {
      // Navigate to summary screen with session data
      navigate("/summary", {
        state: {
          itemsProcessed: result.summary?.itemCount || itemsProcessed,
          totalWeight: totalWeight,
          points: result.summary?.totalPoints || totalPoints,
          userName: user.name || user.username || "User",
          isMember: true,
        },
      });
    } else {
      console.error("Failed to end session:", result.error);
      // Show error to user
    }
  };

  // Get status icon and styling
  const getStatusDisplay = () => {
    switch (status) {
      case "ready":
        return {
          icon: "🎯",
          title: "Ready for Item",
          subtitle: "Place your bottle in the machine",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-500",
          textColor: "text-blue-700",
        };
      case "processing":
        return {
          icon: "🔄",
          title: "Processing Item",
          subtitle: statusMessage || "Sorting and compacting...",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-500",
          textColor: "text-yellow-700",
          animate: true,
        };
      case "active":
        return {
          icon: "✅",
          title: "Session Active",
          subtitle: "System is ready",
          bgColor: "bg-green-50",
          borderColor: "border-green-500",
          textColor: "text-green-700",
        };
      case "rejecting":
        return {
          icon: "❌",
          title: "Item Rejected",
          subtitle: "Unrecognized material",
          bgColor: "bg-red-50",
          borderColor: "border-red-500",
          textColor: "text-red-700",
        };
      case "error":
        return {
          icon: "⚠️",
          title: "Error",
          subtitle: error || "System error occurred",
          bgColor: "bg-red-50",
          borderColor: "border-red-500",
          textColor: "text-red-700",
        };
      default:
        return {
          icon: "⏳",
          title: "Initializing",
          subtitle: "Please wait...",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-500",
          textColor: "text-gray-700",
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="w-screen h-screen bg-gray-100 flex flex-col overflow-y-auto">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-12 py-8">
        <div className="w-full max-w-6xl">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl shadow-lg p-8 mb-8">
            <h1 className="text-4xl font-bold text-white text-center mb-2">
              Welcome, {user?.name || user?.username || "User"}!
            </h1>
            <p className="text-xl text-white text-center opacity-90">
              Session Active • Recycle as many items as you want
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* PET Bottles */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-8 text-white">
              <div className="text-center">
                <div className="text-6xl font-bold mb-2">{itemCounts.pet}</div>
                <div className="text-lg opacity-90 uppercase tracking-wide">
                  PET Bottles
                </div>
                <div className="text-sm opacity-75 mt-1">Collected recyclable waste</div>
              </div>
            </div>

            {/* Aluminum Cans */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
              <div className="text-center">
                <div className="text-6xl font-bold mb-2">{itemCounts.aluminum}</div>
                <div className="text-lg opacity-90 uppercase tracking-wide">
                  Aluminum Cans
                </div>
                <div className="text-sm opacity-75 mt-1">Collected recyclable waste</div>
              </div>
            </div>

            {/* Total Weight */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
              <div className="text-center">
                <div className="text-6xl font-bold mb-2">{totalWeight}g</div>
                <div className="text-lg opacity-90 uppercase tracking-wide">
                  Total Weight
                </div>
                <div className="text-sm opacity-75 mt-1">Deposited today</div>
              </div>
            </div>
          </div>

          {/* Number of Points */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xl mb-2">Number of points</p>
                <div className="flex items-baseline">
                  <span className="text-7xl font-bold text-[#2c4a5e]">
                    {totalPoints}
                  </span>
                  <span className="text-3xl text-gray-500 ml-3">pt</span>
                </div>
              </div>
              <div className="text-8xl">🎯</div>
            </div>
          </div>

          {/* Status Message */}
          <div
            className={`${statusDisplay.bgColor} border-4 ${statusDisplay.borderColor} rounded-2xl shadow-lg p-10 mb-8`}
          >
            <div className="text-center">
              <div
                className={`text-8xl mb-4 ${
                  statusDisplay.animate ? "animate-bounce" : ""
                }`}
              >
                {statusDisplay.icon}
              </div>
              <h2
                className={`text-4xl font-bold ${statusDisplay.textColor} mb-3`}
              >
                {statusDisplay.title}
              </h2>
              <p className="text-2xl text-gray-600">{statusDisplay.subtitle}</p>
            </div>
          </div>

          {/* End Session Button */}
          {showEndConfirm ? (
            <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-8">
              <p className="text-2xl text-center text-gray-700 mb-6">
                Are you sure you want to end this session?
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleEndSession}
                  className="bg-red-500 hover:bg-red-600 text-white text-2xl font-bold py-4 px-12 rounded-xl shadow-lg transition-all transform hover:scale-105"
                >
                  Yes, End Session
                </button>
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-2xl font-bold py-4 px-12 rounded-xl shadow-lg transition-all transform hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleEndSession}
              className="w-full bg-red-500 hover:bg-red-600 text-white text-3xl font-bold py-6 rounded-xl shadow-lg transition-all transform hover:scale-105"
            >
              Next Completed
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ActiveSessionScreen;