import Logo from "../../../assets/image_1751568207796.png"

const Header = () => {
  return (
    <header className="bg-[#1e3a52] py-6 px-12">
    <div className="flex items-center gap-2">
      <img src={Logo} className="h-32 w-56" />
    </div>
  </header>
  )
}

export default Header
