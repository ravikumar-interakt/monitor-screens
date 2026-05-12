import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/layout/footer";
import Header from "../components/layout/header";
import UserLogo from "../../assets/Illust.png";
import { useRVMVideos } from "../context/rvmvideoscontext";
import { keys } from "../config";
import getDeviceId from "../hooks/getDeviceId";
import { useRVMControl } from "../hooks/useRVMControl";

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [waitingScreenVideo, setWaitingScreenVideo] = useState("");
  const [showScreen, setShowScreen] = useState(false);
  const {itemCounts}=useRVMControl();

  const handleYes = () => {
    navigate("/registreduser");
  };

  const handleNo = () => {
    navigate("/guestuser");
  };

  const { handleAddVideos } = useRVMVideos();
  // const deviceId=getDeviceId();

  useEffect(() => {
    const fetchRVMVideos = async () => {
      try {
        const response = await fetch(
          `${keys?.base_url}/api/rvm/RVM-3103/monitor/videos`
        );
        const data = await response.json();
        setWaitingScreenVideo(data?.data?.waitingScreenVideo);
        handleAddVideos(data?.data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchRVMVideos();
  }, []);

  return (
    <div className="w-screen h-screen overflow-auto bg-gray-100 flex flex-col">
      <Header />
      {waitingScreenVideo && !showScreen ? (
        <div className="w-full" onClick={() => setShowScreen(true)}>
          <video
            src={waitingScreenVideo}
            className="w-full h-full"
            autoPlay
            muted
            playsInline
            loop
          />
        </div>
      ) : (
        <>
          <main className="flex-1 flex flex-col items-center justify-between px-12 py-16">
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl">
              {/* Image Container - Replace with actual image */}
              <div className="p-20 mb-12 w-full relative">
                <div className="flex justify-center items-center h-64">
                  {/* Placeholder for person with phone image */}
                  <img src={UserLogo} />
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
          <Footer />
        </>
      )}
    </div>
  );
};

export default HomeScreen;
