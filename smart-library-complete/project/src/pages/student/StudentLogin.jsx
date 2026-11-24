import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import {
  ArrowLeft,
  BookOpen,
  Eye,
  EyeOff,
  Library,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import {
  getStudentByLibraryId,
} from "../../firebase/studentService";

import {
  loginStudent,
} from "../../utils/auth";

// =====================================================
// STUDENT LOGIN
// =====================================================

const StudentLogin = () => {
  const navigate = useNavigate();

  const [libraryId, setLibraryId] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // =====================================================
  // CHECK EXISTING SESSION
  // =====================================================

  useEffect(() => {
    try {
      const existingStudent = JSON.parse(
        localStorage.getItem("studentUser") || "null",
      );

      if (existingStudent) {
        navigate("/student-dashboard", {
          replace: true,
        });
      }
    } catch (error) {
      console.error(
        "Student session check error:",
        error,
      );
    }
  }, [navigate]);

  // =====================================================
  // HANDLE LOGIN
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const enteredLibraryId = libraryId.trim();
    const enteredPassword = password;

    // ===================================================
    // VALIDATION
    // ===================================================

    if (!enteredLibraryId) {
      toast.error(
        "Please enter your Digital Library ID.",
      );
      return;
    }

    if (!enteredPassword) {
      toast.error(
        "Please enter your password.",
      );
      return;
    }

    setLoading(true);

    try {
      // =================================================
      // STEP 1
      // FIND STUDENT IN FIRESTORE USING LIBRARY ID
      // =================================================

      const firestoreStudent =
        await getStudentByLibraryId(
          enteredLibraryId,
        );

      if (!firestoreStudent) {
        toast.error(
          "Student account was not found in the library database.",
        );

        setLoading(false);
        return;
      }

      // =================================================
      // STEP 2
      // CHECK ACCOUNT STATUS
      // =================================================

      const accountStatus = String(
        firestoreStudent?.status || "Active",
      )
        .trim()
        .toLowerCase();

      if (accountStatus !== "active") {
        toast.error(
          "Your library account is currently inactive.",
        );

        setLoading(false);
        return;
      }

      // =================================================
      // STEP 3
      // GET STUDENT EMAIL
      // =================================================

      const studentEmail = String(
        firestoreStudent?.email || "",
      )
        .trim()
        .toLowerCase();

      if (!studentEmail) {
        toast.error(
          "Your student account does not have a registered email address.",
        );

        setLoading(false);
        return;
      }

      // =================================================
      // STEP 4
      // FIREBASE AUTHENTICATION
      //
      // Password is now checked by Firebase Authentication.
      // We do NOT check password from localStorage.
      // =================================================

      const authResult = await loginStudent(
        studentEmail,
        enteredPassword,
        {
          // Firebase Firestore document ID
          firestoreId:
            firestoreStudent?.id || "",

          firebaseId:
            firestoreStudent?.id || "",

          // Student identity
          id:
            firestoreStudent?.libraryId ||
            enteredLibraryId,

          libraryId:
            firestoreStudent?.libraryId ||
            enteredLibraryId,

          studentId:
            firestoreStudent?.studentId ||
            firestoreStudent?.libraryId ||
            enteredLibraryId,

          // Student information
          name:
            firestoreStudent?.name ||
            firestoreStudent?.fullName ||
            "Student",

          fullName:
            firestoreStudent?.fullName ||
            firestoreStudent?.name ||
            "Student",

          email: studentEmail,

          phone:
            firestoreStudent?.phone || "",

          photo:
            firestoreStudent?.photo || "",

          // Library information
          status:
            firestoreStudent?.status ||
            "Active",

          issuedBooksCount: Number(
            firestoreStudent?.issuedBooksCount ?? 0,
          ),

          returnedBooksCount: Number(
            firestoreStudent?.returnedBooksCount ?? 0,
          ),

          fine: Number(
            firestoreStudent?.fine ?? 0,
          ),

          createdAt:
            firestoreStudent?.createdAt || "",

          updatedAt:
            firestoreStudent?.updatedAt || "",
        },
      );

      // =================================================
      // STEP 5
      // FIREBASE AUTH FAILED
      // =================================================

      if (!authResult?.success) {
        toast.error(
          authResult?.error ||
            "Invalid Digital Library ID or password.",
        );

        setLoading(false);
        return;
      }

      // =================================================
      // STEP 6
      // GET FINAL SESSION USER
      // =================================================

      const authenticatedStudent =
        authResult?.user || {};

      const firebaseUser =
        authResult?.firebaseUser || {};

      const studentSession = {
        ...authenticatedStudent,

        // Firebase Authentication UID
        uid:
          authenticatedStudent?.uid ||
          firebaseUser?.uid ||
          "",

        // Firestore document ID
        firestoreId:
          firestoreStudent?.id || "",

        firebaseId:
          firestoreStudent?.id || "",

        // Library identity
        id:
          firestoreStudent?.libraryId ||
          enteredLibraryId,

        libraryId:
          firestoreStudent?.libraryId ||
          enteredLibraryId,

        studentId:
          firestoreStudent?.studentId ||
          firestoreStudent?.libraryId ||
          enteredLibraryId,

        // Student information
        name:
          firestoreStudent?.name ||
          firestoreStudent?.fullName ||
          "Student",

        fullName:
          firestoreStudent?.fullName ||
          firestoreStudent?.name ||
          "Student",

        email:
          firestoreStudent?.email ||
          firebaseUser?.email ||
          studentEmail,

        phone:
          firestoreStudent?.phone || "",

        photo:
          firestoreStudent?.photo || "",

        // Account
        status:
          firestoreStudent?.status ||
          "Active",

        role: "student",

        // Library data
        issuedBooksCount: Number(
          firestoreStudent?.issuedBooksCount ?? 0,
        ),

        returnedBooksCount: Number(
          firestoreStudent?.returnedBooksCount ?? 0,
        ),

        fine: Number(
          firestoreStudent?.fine ?? 0,
        ),

        createdAt:
          firestoreStudent?.createdAt || "",

        updatedAt:
          firestoreStudent?.updatedAt || "",

        // Login time
        loginAt:
          new Date().toISOString(),
      };

      // =================================================
      // STEP 7
      // SAVE FINAL LOCAL SESSION
      // =================================================

      localStorage.setItem(
        "studentUser",
        JSON.stringify(studentSession),
      );

      localStorage.setItem(
        "newRegisteredStudent",
        JSON.stringify(studentSession),
      );

      // =================================================
      // STEP 8
      // UPDATE LOCAL STUDENT CACHE
      //
      // Password is NOT added here.
      // Firebase Authentication handles the password.
      // =================================================

      try {
        const savedStudents = JSON.parse(
          localStorage.getItem("students") ||
            "[]",
        );

        const localStudents = Array.isArray(
          savedStudents,
        )
          ? savedStudents
          : [];

        const studentIndex =
          localStudents.findIndex(
            (student) => {
              const savedLibraryId =
                String(
                  student?.libraryId ||
                    student?.studentId ||
                    student?.id ||
                    "",
                )
                  .trim()
                  .toLowerCase();

              return (
                savedLibraryId ===
                enteredLibraryId
                  .toLowerCase()
              );
            },
          );

        if (studentIndex >= 0) {
          localStudents[studentIndex] = {
            ...localStudents[studentIndex],
            ...studentSession,

            // Do not store or overwrite password.
            password: undefined,
            studentPassword: undefined,
          };

          delete localStudents[studentIndex]
            .password;

          delete localStudents[studentIndex]
            .studentPassword;

          localStorage.setItem(
            "students",
            JSON.stringify(localStudents),
          );
        }
      } catch (localStorageError) {
        console.error(
          "Unable to update local student cache:",
          localStorageError,
        );
      }

      // =================================================
      // STEP 9
      // REFRESH APPLICATION DATA
      // =================================================

      try {
        window.dispatchEvent(
          new Event("libraryDataUpdated"),
        );
      } catch (eventError) {
        console.error(
          "Library update event error:",
          eventError,
        );
      }

      // =================================================
      // SUCCESS
      // =================================================

      toast.success(
        `Welcome back, ${studentSession.name}!`,
      );

      setTimeout(() => {
        navigate("/student-dashboard", {
          replace: true,
        });
      }, 400);
    } catch (error) {
      console.error(
        "Student login error:",
        error,
      );

      const errorCode =
        error?.code || "";

      if (
        errorCode ===
        "auth/invalid-credential"
      ) {
        toast.error(
          "Invalid Digital Library ID or password.",
        );
      } else if (
        errorCode ===
        "auth/user-not-found"
      ) {
        toast.error(
          "No Firebase account was found for this student.",
        );
      } else if (
        errorCode ===
        "auth/wrong-password"
      ) {
        toast.error(
          "Incorrect password.",
        );
      } else if (
        errorCode ===
        "auth/too-many-requests"
      ) {
        toast.error(
          "Too many login attempts. Please try again later.",
        );
      } else if (
        errorCode ===
        "auth/network-request-failed"
      ) {
        toast.error(
          "Network error. Please check your internet connection.",
        );
      } else {
        toast.error(
          error?.message ||
            "Something went wrong. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-100">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="group flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm transition group-hover:scale-105">
              <Library size={21} />
            </div>

            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                Digital Library
              </h1>

              <p className="text-xs text-slate-500">
                Smart Library Management System
              </p>
            </div>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={17} />

            <span className="hidden sm:inline">
              Back to Home
            </span>
          </Link>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
          {/* =================================================
              LEFT PANEL
          ================================================= */}

          <div className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

            <div className="relative z-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                <BookOpen size={27} />
              </div>

              <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <Sparkles size={13} />
                Student Portal
              </p>

              <h2 className="mt-5 max-w-md text-3xl font-bold leading-tight xl:text-4xl">
                Your library,
                <span className="block text-indigo-400">
                  always within reach.
                </span>
              </h2>

              <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
                Access your borrowed books, digital
                library card, receipts and important
                library notifications from one secure
                student portal.
              </p>
            </div>

            <div className="relative z-10 mt-12 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Secure student access
                  </p>

                  <p className="text-xs text-slate-500">
                    Your library account stays protected.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-400">
                  <BookOpen size={18} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Manage your books
                  </p>

                  <p className="text-xs text-slate-500">
                    View active and returned books.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
                  <Library size={18} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Digital Library ID
                  </p>

                  <p className="text-xs text-slate-500">
                    Your unique library identity in one place.
                  </p>
                </div>
              </div>
            </div>

            <p className="relative z-10 mt-10 text-xs text-slate-600">
              Smart Library Management System
            </p>
          </div>

          {/* =================================================
              RIGHT LOGIN PANEL
          ================================================= */}

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <UserRound size={27} />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Welcome back
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Sign in with your Digital Library ID
                to access your student account.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* =================================================
                  LIBRARY ID
              ================================================= */}

              <div>
                <label
                  htmlFor="libraryId"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Digital Library ID
                </label>

                <div className="relative">
                  <BookOpen
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="libraryId"
                    type="text"
                    value={libraryId}
                    onChange={(event) => {
                      setLibraryId(
                        event.target.value,
                      );
                    }}
                    placeholder="LIB-2026-0001"
                    autoComplete="username"
                    autoCapitalize="characters"
                    spellCheck={false}
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-semibold uppercase tracking-wide text-slate-900 outline-none transition placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Enter the ID generated when your
                  library account was created.
                </p>
              </div>

              {/* =================================================
                  PASSWORD
              ================================================= */}

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) => {
                      setPassword(
                        event.target.value,
                      );
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (previous) =>
                          !previous,
                      )
                    }
                    disabled={loading}
                    className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* =================================================
                  INFO
              ================================================= */}

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <ShieldCheck size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-indigo-900">
                      Secure student portal
                    </p>

                    <p className="mt-1 text-xs leading-5 text-indigo-700">
                      Your password is securely
                      verified by Firebase Authentication.
                      Your library profile is loaded from
                      the library database.
                    </p>
                  </div>
                </div>
              </div>

              {/* =================================================
                  LOGIN BUTTON
              ================================================= */}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />

                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* =================================================
                REGISTER
            ================================================= */}

            <div className="mt-7 border-t border-slate-100 pt-6 text-center">
              <p className="text-sm text-slate-500">
                Don't have a library account?
              </p>

              <Link
                to="/student-register"
                className="mt-2 inline-flex items-center gap-1 font-bold text-indigo-600 transition hover:text-indigo-700"
              >
                Create Student Account

                <span aria-hidden="true">
                  →
                </span>
              </Link>
            </div>

            {/* =================================================
                FOOTER
            ================================================= */}

            <p className="mt-8 text-center text-xs text-slate-400">
              Digital Library Management System
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentLogin;