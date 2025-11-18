import Imageone from "../../../assets/footerimage1.png"
import ImageTwo from "../../../assets/footerimage2.png"
import ImageThree from "../../../assets/footerimage3.png"

const Footer = () => {
  return (
    <div className="mt-16 bg-[#EFE9E1] py-4">
    <div className="flex items-start justify-between max-w-6xl mx-auto">
      {/* Logo and Tagline */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-[#1e3a52] font-bold text-4xl leading-none">
            <div className="flex flex-col">
              <span>ReBit</span>
              <div className="flex items-center gap-1">
                <span>b</span>
                <div className="w-9 h-9 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-sm"></div>
                <span>x</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-8">
          by Beetle Management
        </p>
        <p className="text-xl text-[#1e3a52] font-semibold leading-relaxed">
          Collect recyclable
          <br />
          resources for recycling.
          <br />
          Earn points.
        </p>
      </div>

      {/* Images */}
      <div className="flex gap-6 items-center">
        <div className="w-44 h-44 rounded-full overflow-hidden shadow-xl">
          {/* Replace with actual image of hands holding plant */}
          <img
            src={Imageone}
            alt="Hands holding plant"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-36 h-36 rounded-full overflow-hidden shadow-xl">
          {/* Replace with actual image of plastic bottles */}
          <img
            src={ImageTwo}
            alt="Plastic bottles"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-36 h-36 rounded-full overflow-hidden shadow-xl">
          {/* Replace with actual image of hand with bottle */}
          <img
            src={ImageThree}
            alt="Hand holding bottle"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  </div>
  )
}

export default Footer
