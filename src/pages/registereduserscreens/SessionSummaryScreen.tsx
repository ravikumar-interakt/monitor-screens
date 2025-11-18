import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/layout/header";
import Footer from "../../components/layout/footer";

interface LocationState {
  itemsProcessed: number;
  totalWeight: number;
  points: number;
  userName: string;
}

const SessionSummaryScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { itemsProcessed, totalWeight, points, userName } =
    (location.state as LocationState) || {
      itemsProcessed: 0,
      totalWeight: 0,
      points: 0,
      userName: "User",
    };

  const handleDone = () => {
    // Return to home/scanning screen
    navigate("/");
  };

  return (
    <div className="w-screen h-screen bg-gray-100 flex flex-col overflow-y-auto">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-12 py-16">
        <div className="w-full max-w-4xl">
          {/* Success Icon */}
          <div className="text-center mb-8 animate-bounce">
            <div className="text-9xl mb-6">🎉</div>
          </div>

          {/* Success Title */}
          <h1 className="text-6xl font-bold text-green-600 text-center mb-4">
            Great Work, {userName}!
          </h1>
          <p className="text-3xl text-gray-600 text-center mb-16">
            Thank you for recycling with ReBit
          </p>

          {/* Summary Stats */}
          <div className="bg-white rounded-3xl shadow-xl p-12 mb-12">
            {/* Items Recycled */}
            <div className="flex justify-between items-center py-6 border-b-4 border-gray-200">
              <span className="text-3xl text-gray-600 font-medium">
                Items Recycled:
              </span>
              <span className="text-4xl font-bold text-gray-900">
                {itemsProcessed}
              </span>
            </div>

            {/* Total Weight */}
            <div className="flex justify-between items-center py-6 border-b-4 border-gray-200">
              <span className="text-3xl text-gray-600 font-medium">
                Total Weight:
              </span>
              <span className="text-4xl font-bold text-gray-900">
                {totalWeight}g
              </span>
            </div>

            {/* Points Earned */}
            <div className="flex justify-between items-center py-6">
              <span className="text-3xl text-gray-600 font-medium">
                Points Earned:
              </span>
              <span className="text-4xl font-bold text-green-600">
                {points} pt
              </span>
            </div>
          </div>

          {/* Environmental Impact Message */}
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl shadow-lg p-8 mb-12">
            <div className="text-center text-white">
              <p className="text-2xl font-semibold mb-2">
                🌍 Environmental Impact
              </p>
              <p className="text-xl opacity-90">
                You've helped save approximately{" "}
                <span className="font-bold">{Math.round(totalWeight / 10)}</span>{" "}
                liters of water and reduced CO₂ emissions!
              </p>
            </div>
          </div>

          {/* Done Button */}
          <button
            onClick={handleDone}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-4xl font-bold py-8 rounded-2xl shadow-lg transition-all transform hover:scale-105"
          >
            Done
          </button>

          {/* Additional Info */}
          <div className="text-center mt-8">
            <p className="text-xl text-gray-500">
              Your points have been added to your account
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default SessionSummaryScreen;