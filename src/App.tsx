import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RVMProvider } from "./contexts/RvmContext"; // ✅ Import RVMProvider
import HomeScreen from "./pages/homescreen";
import ReBitQRScanScreen from "./pages/registereduserscreens/home";
import RegisteredUserScanningScreen from "./pages/registereduserscreens/scanningscreen";
import ReBitSuccessScreen from "./pages/registereduserscreens/successscreen";
import ReBitGuestScreen from "./pages/guestuserscreens/guestuserhome";
import ReBitGuestCollectionScreen from "./pages/guestuserscreens/guestcollectionscreen";
import GuestPointsScreen from "./pages/guestuserscreens/guestpointsscreen";
import ActiveSessionScreen from "./pages/registereduserscreens/ActiveSessionScreen";
import SessionSummaryScreen from "./pages/registereduserscreens/SessionSummaryScreen";

const App = () => {
  return (
    <BrowserRouter>
      {/* 
        ✅ RVMProvider wraps everything
        - Initializes WebSocket IMMEDIATELY when app starts
        - Requests Module ID IMMEDIATELY
        - Shows splash screen until ready
        - Then shows your routes
      */}
      <RVMProvider>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/registreduser" element={<ReBitQRScanScreen />} />
          <Route
            path="/registered-user-scan-qr"
            element={<RegisteredUserScanningScreen />}
          />
          <Route path="/session" element={<ActiveSessionScreen />} />
          <Route path="/summary" element={<SessionSummaryScreen />} />
          <Route path="/success-screen" element={<ReBitSuccessScreen />} />
          <Route path="/guestuser" element={<ReBitGuestScreen />} />
          <Route
            path="/guest-items-collection"
            element={<ReBitGuestCollectionScreen />}
          />
          <Route path="/guest-points-screen" element={<GuestPointsScreen />} />
        </Routes>
      </RVMProvider>
    </BrowserRouter>
  );
};

export default App;