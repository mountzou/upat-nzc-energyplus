import { useEffect, useState } from "react";

import LoginView from "@/components/auth/LoginView";
import useAuthSession from "@/hooks/useAuthSession";
import { API_BASE_URL } from "@/lib/api";
import { formatSchoolLabel } from "@/lib/schools";
import OverviewPage from "@/pages/OverviewPage";
import SimulationPage from "@/pages/SimulationPage";

function App() {
  const {
    isAuthenticated,
    authSchoolId,
    loginUsername,
    loginPassword,
    loginError,
    setLoginUsername,
    setLoginPassword,
    handleLogin,
    handleLogout,
  } = useAuthSession();
  const [backendStatus, setBackendStatus] = useState("Checking backend...");
  const [currentPath, setCurrentPath] = useState(window.location.pathname || "/");

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.status))
      .catch(() => setBackendStatus("Backend unreachable"));
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || "/");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      document.title = "Login — SchoolHeroZ Digital Twin";
      return;
    }

    document.title =
      currentPath === "/overview"
        ? "Overview — SchoolHeroZ Digital Twin"
        : "Simulations — SchoolHeroZ Digital Twin";
  }, [currentPath, isAuthenticated]);

  const handleLoginSubmit = (event) => {
    handleLogin(event);
  };

  const handleNavigate = (path) => {
    if (path === currentPath) {
      return;
    }

    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  if (!isAuthenticated) {
    return (
      <LoginView
        username={loginUsername}
        password={loginPassword}
        error={loginError}
        onUsernameChange={setLoginUsername}
        onPasswordChange={setLoginPassword}
        onSubmit={handleLoginSubmit}
      />
    );
  }

  if (currentPath === "/overview") {
    return (
      <OverviewPage
        authSchoolId={authSchoolId}
        backendStatus={backendStatus}
        schoolLabel={formatSchoolLabel(authSchoolId)}
        currentPath={currentPath}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
    );
  }

  return (
    <SimulationPage
      backendStatus={backendStatus}
      authSchoolId={authSchoolId}
      currentPath={currentPath}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
    />
  );
}

export default App;
