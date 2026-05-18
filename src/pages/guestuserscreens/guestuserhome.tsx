import React from "react";
import Header from "../../components/layout/header";
import Footer from "../../components/layout/footer";
import { useNavigate } from "react-router-dom";
import userLogo from "../../../assets/Image.png";

const ReBitGuestScreen: React.FC = () => {
  const navigate = useNavigate();
  const handleReturn = () => {
    navigate("/");
  };

  const handleInput = () => {
    navigate("/guest-items-collection");
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-y-auto">
      {/*header */}
      <Header />
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-between px-12 py-16">
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl">
          {/* Image Container - Replace with actual image */}
          <div className="p-20 mb-12 w-full">
            <div className="flex justify-center items-center">
              {/* Placeholder for person recycling image */}
              <img
                src={userLogo}
                alt="Person putting recyclables in bin"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          {/* Text Content */}
          <h1 className="text-5xl font-bold text-[#1e3a52] text-center mb-6">
            ゲストの方は 
            <br/>
            さっそく資源ゴミを入れてみましょう
          </h1>
          <p className="text-2xl text-gray-600 text-center mb-16 leading-relaxed">
            資源ゴミを入れると、ポイントを獲得できます
          </p>

          {/* Buttons */}
          <div className="flex gap-8">
            <button
              onClick={handleReturn}
              className="px-20 py-6 rounded-full border-4 border-[#14b8a6] text-[#14b8a6] text-3xl font-semibold hover:bg-[#14b8a6] hover:text-white transition-all shadow-lg active:scale-95"
            >
              戻る
            </button>
            <button
              onClick={handleInput}
              className="px-20 py-6 rounded-full bg-[#14b8a6] text-white text-3xl font-semibold hover:bg-[#0d9488] transition-all shadow-xl hover:shadow-2xl active:scale-95"
            >
              入れる
            </button>
          </div>
        </div>
      </main>
      {/*Footer*/}
      <Footer />
    </div>
  );
};

export default ReBitGuestScreen;
