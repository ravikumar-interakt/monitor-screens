import Header from "../../components/layout/header";
import Footer from "../../components/layout/footer";
import { useNavigate, useLocation } from "react-router-dom";

interface QRCodeData {
  claimCode: string;
  qrCodeUrl: string;
  totalPoints: number;
  itemCount: number;
  expiresIn: string;
  message: string;
}

interface LocationState {
  sessionCode: string;
  petBottles: number;
  aluminumCans: number;
  steelCans: number;
  totalPoints: number;
  qrCode?: QRCodeData;
}

const GuestPointsScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  // Redirect if no session data
  if (!state || !state.qrCode) {
    console.error("No session data or QR code available");
    setTimeout(() => navigate("/"), 100);
    return null;
  }

  const { qrCode, petBottles, aluminumCans, steelCans, totalPoints } = state;

  const handleDone = () => {
    navigate("/success-screen", {
      state: {
        totalPoints: totalPoints,
        itemCounts: {
          pet: petBottles,
          aluminum: aluminumCans,
          steel: steelCans,
        },
      },
    });
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
              {qrCode.message}
            </p>
            <p className="text-lg text-gray-600 mt-2">
              This code expires in {qrCode.expiresIn}
            </p>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="mb-8">
          <div className="inline-block bg-[#2c4a5e] text-white px-10 py-4 rounded-full text-2xl font-semibold mb-6">
            Scan to claim points
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-12 max-w-5xl flex flex-col items-center">
            {/* QR Code Image from Backend */}
            <img
              src={qrCode.qrCodeUrl}
              alt="QR Code for claiming points"
              className="w-96 h-96 mb-6"
            />
            
            {/* Claim Code */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Claim Code</p>
              <p className="text-xl font-mono font-bold text-[#1e3a52] bg-gray-100 px-6 py-3 rounded-lg">
                {qrCode.claimCode}
              </p>
            </div>
          </div>
        </div>

        {/* Amount of Points Section */}
        <div className="mb-8">
          <div className="inline-block bg-[#2c4a5e] text-white px-10 py-4 rounded-full text-2xl font-semibold mb-6">
            Number of points
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

        {/* Collection Summary */}
        <div className="mb-8">
          <div className="inline-block bg-[#2c4a5e] text-white px-10 py-4 rounded-full text-2xl font-semibold mb-6">
            Items collected
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-8 max-w-5xl">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-[#1e3a52] mb-2">
                  {petBottles}
                </div>
                <div className="text-lg text-gray-600">PET Bottles</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-[#1e3a52] mb-2">
                  {aluminumCans}
                </div>
                <div className="text-lg text-gray-600">Aluminum Cans</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-[#1e3a52] mb-2">
                  {steelCans}
                </div>
                <div className="text-lg text-gray-600">Steel Cans</div>
              </div>
            </div>
          </div>
        </div>

        {/* Done Button */}
        <div className="flex justify-center mt-10">
          <button
            onClick={handleDone}
            className="px-20 py-6 rounded-full bg-[#14b8a6] text-white text-3xl font-semibold hover:bg-[#0d9488] transition-all shadow-xl hover:shadow-2xl active:scale-95"
          >
            Done
          </button>
        </div>
      </main>
      {/*Footer*/}
      <Footer />
    </div>
  );
};

export default GuestPointsScreen;
