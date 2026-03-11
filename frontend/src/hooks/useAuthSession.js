import { useState } from "react";

import authData from "@/data/auth.json";

const SESSION_AUTH_KEY = "upat_auth";
const SESSION_SCHOOL_KEY = "upat_school_id";

const getStoredAuthState = () => {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, schoolId: "", username: "" };
  }

  const isAuthenticated = window.sessionStorage.getItem(SESSION_AUTH_KEY) === "true";
  const schoolId = window.sessionStorage.getItem(SESSION_SCHOOL_KEY) || "";
  const username = schoolId || "";

  return { isAuthenticated, schoolId, username };
};

export default function useAuthSession() {
  const storedAuth = getStoredAuthState();
  const [isAuthenticated, setIsAuthenticated] = useState(storedAuth.isAuthenticated);
  const [authSchoolId, setAuthSchoolId] = useState(storedAuth.schoolId);
  const [loginUsername, setLoginUsername] = useState(storedAuth.username);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState(null);

  const handleLogin = (event) => {
    event.preventDefault();
    setLoginError(null);

    const matchedUser = authData.users.find(
      (user) =>
        user.username === loginUsername.trim() &&
        user.password === loginPassword &&
        user.username === `school_${user.school_id.split("_")[1]}`
    );

    if (!matchedUser) {
      setLoginError("Invalid username or password.");
      return null;
    }

    window.sessionStorage.setItem(SESSION_AUTH_KEY, "true");
    window.sessionStorage.setItem(SESSION_SCHOOL_KEY, matchedUser.school_id);
    setIsAuthenticated(true);
    setAuthSchoolId(matchedUser.school_id);
    setLoginPassword("");
    return matchedUser.school_id;
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_AUTH_KEY);
    window.sessionStorage.removeItem(SESSION_SCHOOL_KEY);
    setIsAuthenticated(false);
    setAuthSchoolId("");
    setLoginUsername("");
    setLoginPassword("");
    setLoginError(null);
  };

  return {
    isAuthenticated,
    authSchoolId,
    loginUsername,
    loginPassword,
    loginError,
    setLoginUsername,
    setLoginPassword,
    setLoginError,
    handleLogin,
    handleLogout,
  };
}
