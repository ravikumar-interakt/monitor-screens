import React, { useState } from 'react';
import Header from '../../components/layout/header';
import Footer from '../../components/layout/footer';
import { useNavigate } from 'react-router-dom';

const ReBitCollectionScreen: React.FC = () => {
  const [petBottles, setPetBottles] = useState(0);
  const [aluminumCans, setAluminumCans] = useState(0);
  const [steelCans, setSteelCans] = useState(0);
  const navigate=useNavigate();

  // Calculate total points (example: 1 point per item)
  const totalPoints = petBottles + aluminumCans + steelCans;

  const handleInputComplete = () => {
     navigate("/success-screen")
  };

  return (
    <div className="w-screen h-screen bg-gray-100 flex flex-col overflow-y-auto">
      {/*header*/}
      <Header/>
      {/* Main Content */}
      <main className="flex-1 px-12 py-10">
        {/* Member Mode Badge and Instructions */}
        <div className="flex items-start gap-6 mb-10">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full border-4 border-[#14b8a6] bg-white flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-bold text-[#1e3a52] leading-tight">Mem</div>
                <div className="text-sm font-bold text-[#1e3a52] leading-tight">ber</div>
                <div className="text-sm font-bold text-[#1e3a52] leading-tight">Mode</div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 pt-2">
            <p className="text-xl text-[#1e3a52] font-semibold leading-relaxed">
              Please place recyclable waste into the disposal chute.<br />
              After placing all items, press the input complete button.
            </p>
          </div>
        </div>

        {/* Collected Recyclable Waste Section */}
        <div className="mb-10">
          <div className="inline-block bg-[#2c4a5e] text-white px-10 py-4 rounded-full text-2xl font-semibold mb-8">
            Collected recyclable waste
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-5xl">
            {/* Pet Bottle Card */}
            <div className="bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center">
              <div className="w-20 h-20 bg-[#14b8a6] rounded-full flex items-center justify-center mb-6">
                {/* Placeholder for Pet Bottle Icon */}
                <img 
                  src="/api/placeholder/48/48" 
                  alt="Pet Bottle"
                  className="w-12 h-12"
                />
              </div>
              <h3 className="text-2xl font-bold text-[#1e3a52] mb-4">Pet Bottle</h3>
              <div className="text-center">
                <span className="text-5xl font-bold text-[#1e3a52]">{petBottles}</span>
                <span className="text-2xl text-gray-600 ml-2">piece</span>
              </div>
            </div>

            {/* Aluminum Cans Card */}
            <div className="bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center">
              <div className="w-20 h-20 bg-[#14b8a6] rounded-full flex items-center justify-center mb-6">
                {/* Placeholder for Aluminum Can Icon */}
                <img 
                  src="/api/placeholder/48/48" 
                  alt="Aluminum Can"
                  className="w-12 h-12"
                />
              </div>
              <h3 className="text-2xl font-bold text-[#1e3a52] mb-4">Aluminum cans</h3>
              <div className="text-center">
                <span className="text-5xl font-bold text-[#1e3a52]">{aluminumCans}</span>
                <span className="text-2xl text-gray-600 ml-2">piece</span>
              </div>
            </div>

            {/* Steel Cans Card */}
            <div className="bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center">
              <div className="w-20 h-20 bg-[#14b8a6] rounded-full flex items-center justify-center mb-6">
                {/* Placeholder for Steel Can Icon */}
                <img 
                  src="/api/placeholder/48/48" 
                  alt="Steel Can"
                  className="w-12 h-12"
                />
              </div>
              <h3 className="text-2xl font-bold text-[#1e3a52] mb-4">Steel cans</h3>
              <div className="text-center">
                <span className="text-5xl font-bold text-[#1e3a52]">{steelCans}</span>
                <span className="text-2xl text-gray-600 ml-2">piece</span>
              </div>
            </div>
          </div>
        </div>

        {/* Number of Points Section */}
        <div className="mb-8">
          <div className="inline-block bg-[#2c4a5e] text-white px-10 py-4 rounded-full text-2xl font-semibold mb-6">
            Number of points
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-12 max-w-5xl">
            <div className="text-center">
              <span className="text-7xl font-bold text-[#1e3a52]">{totalPoints}</span>
              <span className="text-3xl text-gray-600 ml-3">pt</span>
            </div>
          </div>
        </div>

        {/* Input Complete Button */}
        <div className="flex justify-center mt-10">
          <button 
            onClick={handleInputComplete}
            className="px-20 py-6 rounded-full bg-[#14b8a6] text-white text-3xl font-semibold hover:bg-[#0d9488] transition-all shadow-xl hover:shadow-2xl active:scale-95"
          >
            Input completed
          </button>
        </div>
      </main>

      {/*Footer*/}
      <Footer/>
    </div>
  );
};

export default ReBitCollectionScreen;