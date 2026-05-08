import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./home";
import Rooms from "./Rooms";
import Reservation from "./Reservation"
import SignUp from "./SignUp";
import ServicesSection from "./ServicesSection"
import Login from "./Login"
import OwnerDashboard from "./OwnerDashboard";
import OwnerHome from "./OwnerHome";
import OwnerStats from "./OwnerStats";
import OwnerHotelInfo from "./OwnerHotelInfo";

function OwnerRoute({ children }) {
  let role = null;
  try {
    const raw = localStorage.getItem("mock_auth_user");
    const parsed = raw ? JSON.parse(raw) : null;
    role = parsed?.user?.role || localStorage.getItem("mock_auth_role");
  } catch (error) {
    role = localStorage.getItem("mock_auth_role");
  }

  if (role !== "hotel_owner") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/about" element={<Home />} />
      <Route path="/owner" element={<Navigate to="/ownerhome" replace />} />
      <Route path="/ownerhome" element={<OwnerRoute><OwnerHome /></OwnerRoute>} />
      <Route path="/rooms" element={<Rooms />} />
      <Route path="/reservation" element={<Reservation />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/servicessection" element={<ServicesSection/> }/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/owner/dashboard" element={<OwnerRoute><OwnerDashboard/></OwnerRoute>} />
      <Route path="/owner/stats" element={<OwnerRoute><OwnerStats /></OwnerRoute>} />
      <Route path="/owner/hotel-info" element={<OwnerRoute><OwnerHotelInfo /></OwnerRoute>} />
    </Routes>
  );
}
