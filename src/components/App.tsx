import AppRoutes from "../routes";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "./Navbar";
import "../styles/App.css";
import "@fortawesome/fontawesome-free/css/all.css";

// Main App component
const App = () => {
  return (
    <AuthProvider>
      <Navbar />
      <div className="app-content">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
};

export default App;
