import React from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/layout/footer";
import Header from "../components/layout/header";
import UserLogo from "../../assets/Illust.png"

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleYes = () => {
    navigate("/registreduser");
  };

  const handleNo = () => {
    navigate("/guestuser")
  };

  return (
    <div className="w-screen h-screen overflow-auto bg-gray-100 flex flex-col">
      {/* Header */}
     <Header/>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-between px-12 py-16">
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl">
          {/* Image Container - Replace with actual image */}
          <div className="p-20 mb-12 w-full relative">
            <div className="flex justify-center items-center h-64">
              {/* Placeholder for person with phone image */}
             <img src={UserLogo}/>
            </div>
          </div>

          {/* Text Content */}
          <h1 className="text-5xl font-bold text-[#1e3a52] text-center mb-6">
            Are you a ReBit app member?
          </h1>
          <p className="text-2xl text-gray-600 text-center mb-16 leading-relaxed">
            The operation method differs depending on whether
            <br />
            you <span className="inline-block">are a member</span> or
            non-member.
          </p>

          {/* Buttons */}
          <div className="flex gap-8">
            <button
              onClick={handleYes}
              className="px-24 py-6 rounded-full bg-[#14b8a6] text-white text-3xl font-semibold hover:bg-[#0d9488] transition-all shadow-xl hover:shadow-2xl active:scale-95"
            >
              Yes
            </button>
            <button
              onClick={handleNo}
              className="px-24 py-6 rounded-full bg-[#14b8a6] text-white text-3xl font-semibold hover:bg-[#0d9488] transition-all shadow-xl hover:shadow-2xl active:scale-95"
            >
              No
            </button>
          </div>
        </div>
      </main>
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomeScreen;
