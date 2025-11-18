import React, { useState } from "react";
import Header from "../../components/layout/header";
import Footer from "../../components/layout/footer";
import { useNavigate } from "react-router-dom";

const ReBitSuccessScreen: React.FC = () => {
  const [points] = useState(100);
  const navigate = useNavigate();

  const handleDone = () => {
    navigate("/");
  };

  return (
    <div className="w-screen h-screen bg-gray-100 flex flex-col">
      {/*header*/}
      <Header />
      {/* Main Content */}
      <main className="flex-1 px-12 py-10">
        {/* Member Mode Badge and Success Message */}
        <div className="flex items-start gap-6 mb-10">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full border-4 border-[#14b8a6] bg-white flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-bold text-[#1e3a52] leading-tight">
                  Mem
                </div>
                <div className="text-sm font-bold text-[#1e3a52] leading-tight">
                  ber
                </div>
                <div className="text-sm font-bold text-[#1e3a52] leading-tight">
                  mode
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 pt-2">
            <p className="text-xl text-[#1e3a52] font-semibold leading-relaxed">
              Points have been successfully awarded.
              <br />
              Thank you for your patronage.
            </p>
          </div>
        </div>

        {/* Number of Points Section */}
        <div className="mb-8">
          <div className="inline-block bg-[#2c4a5e] text-white px-10 py-4 rounded-full text-2xl font-semibold mb-6">
            Number of Points
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-12 max-w-5xl mb-8">
            <div className="text-center">
              <span className="text-7xl font-bold text-[#1e3a52]">
                {points}
              </span>
              <span className="text-3xl text-gray-600 ml-3">pt</span>
            </div>
          </div>

          {/* Done Button */}
          <div className="flex justify-center">
            <button
              onClick={handleDone}
              className="px-24 py-6 rounded-full bg-[#14b8a6] text-white text-3xl font-semibold hover:bg-[#0d9488] transition-all shadow-xl hover:shadow-2xl active:scale-95"
            >
              Done
            </button>
          </div>
        </div>

        {/* Service Introduction Animation Area */}
        <div className="mt-12">
          <div className="border-4 border-dashed border-gray-400 rounded-2xl p-16 bg-white">
            <div className="flex flex-col items-center justify-center h-96">
              {/* Placeholder for animation/video */}
              <div className="mb-8">
                <img
                  src="/api/placeholder/600/300"
                  alt="Service Introduction Animation"
                  className="max-w-full h-auto rounded-lg"
                />
              </div>

              <div className="text-center text-gray-500 text-lg">
                <p>(Service Introduction Animation)</p>
                <p className="mt-2">※Developed from concept through</p>
                <p>planning at BM Inc.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/*footer*/}
      <Footer />
    </div>
  );
};

export default ReBitSuccessScreen;
