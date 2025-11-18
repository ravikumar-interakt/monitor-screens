import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomeScreen from "./pages/homescreen";
import ReBitQRScanScreen from "./pages/registereduserscreens/home";
import RegisteredUserScanningScreen from "./pages/registereduserscreens/scanningscreen";
// import ReBitCollectionScreen from "./pages/registereduserscreens/itempointsscreen";
import ReBitSuccessScreen from "./pages/registereduserscreens/successscreen";
import ReBitGuestScreen from "./pages/guestuserscreens/guestuserhome";
import ReBitGuestCollectionScreen from "./pages/guestuserscreens/guestcollectionscreen";
import GuestPointsScreen from "./pages/guestuserscreens/guestpointsscreen";
import ActiveSessionScreen from "./pages/registereduserscreens/ActiveSessionScreen";
import SessionSummaryScreen from "./pages/registereduserscreens/SessionSummaryScreen";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/registreduser" element={<ReBitQRScanScreen />} />
        <Route
          path="/registered-user-scan-qr"
          element={<RegisteredUserScanningScreen />}
        />
        {/* Active Session Screen */}
        <Route path="/session" element={<ActiveSessionScreen />} />

        {/* Summary Screen */}
        <Route path="/summary" element={<SessionSummaryScreen />} />
        {/* <Route
          path="/registered-user-item-points"
          element={<ReBitCollectionScreen />}
        /> */}
        <Route path="/success-screen" element={<ReBitSuccessScreen />} />
        <Route path="/guestuser" element={<ReBitGuestScreen />} />
        <Route
          path="/guest-items-collection"
          element={<ReBitGuestCollectionScreen />}
        />
        <Route path="/guest-points-screen" element={<GuestPointsScreen />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
