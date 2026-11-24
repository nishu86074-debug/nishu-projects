import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Library,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import app from "../../firebase/firebaseConfig";

// =====================================================
// FIREBASE AUTH
// =====================================================

const auth = getAuth(app);

// =====================================================
// DEFAULT SETTINGS
// =====================================================

const DEFAULT_SETTINGS = {
  institutionName: "My College / University",
  libraryName: "Central Library",
  libraryEmail: "library@example.com",
  librarianName: "Library Administrator",
  logo: "",
};

// =====================================================
// GET LIBRARY SETTINGS
// =====================================================

const getLibrarySettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("librarySettings") || "null");

    return {
      ...DEFAULT_SETTINGS,
      ...(saved || {}),
    };
  } catch (error) {
    console.error("Error reading library settings:", error);

    return DEFAULT_SETTINGS;
  }
};

// =====================================================
// ADMIN LOGIN
// =====================================================

const AdminLogin = () => {
  const navigate = useNavigate();

  const [settings, setSettings] = useState(getLibrarySettings());

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  // ===================================================
  // CHECK EXISTING FIREBASE SESSION
  // ===================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        return;
      }

      const existingLibrarian = localStorage.getItem("librarian");

      if (existingLibrarian) {
        navigate("/admin-dashboard", {
          replace: true,
        });
      }
    });

    // =================================================
    // UPDATE LIBRARY SETTINGS
    // =================================================

    const updateSettings = () => {
      setSettings(getLibrarySettings());
    };

    window.addEventListener("librarySettingsUpdated", updateSettings);

    window.addEventListener("storage", updateSettings);

    return () => {
      unsubscribe();

      window.removeEventListener("librarySettingsUpdated", updateSettings);

      window.removeEventListener("storage", updateSettings);
    };
  }, [navigate]);

  // ===================================================
  // HANDLE LOGIN
  // ===================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    // =================================================
    // VALIDATION
    // =================================================

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");

      return;
    }

    setLoading(true);

    try {
      // ================================================
      // FIREBASE AUTHENTICATION
      // ================================================

      const userCredential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password,
      );

      const firebaseUser = userCredential.user;

      // ================================================
      // LIBRARY EMAIL RESTRICTION
      // ================================================

      const configuredEmail = String(settings.libraryEmail || "")
        .trim()
        .toLowerCase();

      /*
        If a real library email is configured in settings,
        only that email can use the librarian portal.

        "library@example.com" is treated as the default
        placeholder and therefore does not restrict login.
      */

      if (
        configuredEmail &&
        configuredEmail !== "library@example.com" &&
        configuredEmail !== cleanEmail
      ) {
        await signOut(auth);

        setError(
          "This account is not registered as the library administrator.",
        );

        return;
      }

      // ================================================
      // CREATE LIBRARIAN SESSION
      // ================================================

      const librarian = {
        id: firebaseUser.uid || "LIBRARIAN-001",

        librarianId: firebaseUser.uid || "LIBRARIAN-001",

        firebaseUid: firebaseUser.uid || "",

        name: settings.librarianName || "Library Administrator",

        email: firebaseUser.email || cleanEmail,

        emailVerified: firebaseUser.emailVerified || false,

        loginAt: new Date().toISOString(),
      };

      // ================================================
      // SAVE LOCAL SESSION
      // ================================================

      localStorage.setItem("librarian", JSON.stringify(librarian));

      // ================================================
      // UPDATE APPLICATION
      // ================================================

      window.dispatchEvent(new Event("libraryDataUpdated"));

      window.dispatchEvent(new Event("adminAuthUpdated"));

      // ================================================
      // GO TO ADMIN DASHBOARD
      // ================================================

      navigate("/admin-dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error("Firebase admin login error:", error);

      // ================================================
      // FIREBASE ERROR HANDLING
      // ================================================

      switch (error?.code) {
        case "auth/invalid-credential":
          setError("Invalid email or password.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;

        case "auth/user-not-found":
          setError("No librarian account was found with this email.");
          break;

        case "auth/wrong-password":
          setError("Incorrect password.");
          break;

        case "auth/too-many-requests":
          setError("Too many login attempts. Please try again later.");
          break;

        case "auth/network-request-failed":
          setError("Network error. Please check your internet connection.");
          break;

        case "auth/user-disabled":
          setError("This librarian account has been disabled.");
          break;

        case "auth/operation-not-allowed":
          setError("Email/password authentication is not enabled in Firebase.");
          break;

        default:
          setError(
            "Unable to sign in. Please check your Firebase account details.",
          );
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // UI
  // ===================================================

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <div className="hidden w-1/2 bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            {/* LIBRARY BRAND */}

            <div className="flex items-center gap-3">
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt={settings.libraryName}
                  className="h-12 w-12 rounded-xl bg-white object-contain p-1"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
                  <Library className="h-6 w-6" />
                </div>
              )}

              <div>
                <p className="text-lg font-black">{settings.libraryName}</p>

                <p className="text-xs text-slate-400">
                  {settings.institutionName}
                </p>
              </div>
            </div>

            {/* PORTAL INTRO */}

            <div className="mt-24 max-w-lg">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600">
                <ShieldCheck className="h-8 w-8" />
              </div>

              <h1 className="text-4xl font-black leading-tight">
                Librarian Portal
              </h1>

              <p className="mt-5 text-base leading-7 text-slate-400">
                Manage books, students, book issues, returns, fines, receipts
                and library activities from one place.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Smart Library Management System
          </div>
        </div>

        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <div className="flex w-full items-center justify-center px-5 py-10 lg:w-1/2">
          <div className="w-full max-w-md">
            {/* MOBILE HEADER */}

            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                <Library className="h-7 w-7" />
              </div>

              <h1 className="mt-4 text-2xl font-black text-slate-900">
                {settings.libraryName}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {settings.institutionName}
              </p>
            </div>

            {/* LOGIN CARD */}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
              {/* TITLE */}

              <div className="mb-7">
                <h2 className="text-2xl font-black text-slate-900">
                  Librarian Login
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Sign in to access the library management dashboard.
                </p>
              </div>

              {/* ERROR */}

              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                  <p className="text-sm font-semibold text-red-700">{error}</p>
                </div>
              )}

              {/* FORM */}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* EMAIL */}

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);

                        setError("");
                      }}
                      placeholder="Enter librarian email"
                      autoComplete="email"
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* PASSWORD */}

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);

                        setError("");
                      }}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      disabled={loading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* LOGIN BUTTON */}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign In"}

                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              {/* FIREBASE INFO */}

              <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs font-black text-indigo-900">
                  Librarian Authentication
                </p>

                <p className="mt-1 text-xs leading-5 text-indigo-700">
                  This login is secured using Firebase Authentication.
                </p>

                <p className="mt-1 text-xs leading-5 text-indigo-700">
                  Use the librarian email and password created in Firebase
                  Authentication.
                </p>
              </div>
            </div>

            {/* FOOTER */}

            <p className="mt-6 text-center text-xs font-medium text-slate-400">
              {settings.institutionName} • {settings.libraryName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
