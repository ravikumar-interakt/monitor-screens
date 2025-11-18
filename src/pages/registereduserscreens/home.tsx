import React from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/layout/footer";
import Header from "../../components/layout/header";
import Logo from "../../../assets/mobile.png"

const ReBitQRScanScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleReturn = () => {
    navigate("/");
  };

  const handleAuthenticate = () => {
    navigate("/registered-user-scan-qr");
  };

  return (
    <div className="w-screen h-screen bg-gray-100 flex flex-col overflow-y-auto">
      {/* Header */}
      <Header />
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-between px-12 py-16 mb-4">
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl">
          {/* Image Container - Replace with actual image */}
          <div className="p-20 mb-12 w-full relative">
            <div className="flex justify-center items-center h-64">
              {/* Placeholder for hands holding phone image */}
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
            to authenticate.
          </h1>
          <p className="text-2xl text-gray-600 text-center mb-16 leading-relaxed">
            Please check the instructions on the collection box for
            <br />
            the scanning location.
          </p>

          {/* Buttons */}
          <div className="flex gap-8">
            <button
              onClick={handleReturn}
              className="px-20 py-6 rounded-full border-4 border-[#14b8a6] text-[#14b8a6] text-3xl font-semibold hover:bg-[#14b8a6] hover:text-white transition-all shadow-lg active:scale-95"
            >
              Return
            </button>
            <button
              onClick={handleAuthenticate}
              className="px-16 py-6 rounded-full bg-[#14b8a6] text-white text-3xl font-semibold hover:bg-[#0d9488] transition-all shadow-xl hover:shadow-2xl active:scale-95"
            >
              Authenticate
            </button>
          </div>
        </div>
      </main>
      {/*Footer */}
      <Footer />
    </div>
  );
};

export default ReBitQRScanScreen;
