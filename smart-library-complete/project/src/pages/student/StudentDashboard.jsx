import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Bell,
  CreditCard,
  Receipt,
  Search,
  LogOut,
  UserRound,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Library,
  ArrowRight,
  RefreshCw,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

// Firebase
import { getStudentByLibraryId } from "../../firebase/studentService";
import { getIssuesFromFirestore } from "../../firebase/issueService";
import { getNotificationsByStudent } from "../../firebase/notificationService";

// =====================================================
// DEFAULT SETTINGS
// =====================================================

const DEFAULT_LIBRARY_SETTINGS = {
  institutionName: "My College / University",
  libraryName: "Central Library",
  libraryEmail: "library@example.com",
  librarianName: "Library Administrator",
  finePerDay: 10,
  maxBooks: 3,
  issueDuration: 14,
  logo: "",
};

// =====================================================
// STORAGE HELPERS
// =====================================================

const loadStudent = () => {
  try {
    return JSON.parse(localStorage.getItem("studentUser") || "null");
  } catch {
    return null;
  }
};

const loadIssues = () => {
  try {
    const data = JSON.parse(localStorage.getItem("issuedBooks") || "[]");

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const loadNotifications = () => {
  try {
    const data = JSON.parse(localStorage.getItem("notifications") || "[]");

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const getLibrarySettings = () => {
  try {
    const saved = localStorage.getItem("librarySettings");

    if (!saved) {
      return DEFAULT_LIBRARY_SETTINGS;
    }

    const parsed = JSON.parse(saved);

    return {
      ...DEFAULT_LIBRARY_SETTINGS,
      ...(parsed || {}),

      finePerDay:
        Number.isFinite(Number(parsed?.finePerDay)) &&
        Number(parsed?.finePerDay) >= 0
          ? Number(parsed.finePerDay)
          : DEFAULT_LIBRARY_SETTINGS.finePerDay,

      maxBooks:
        Number.isFinite(Number(parsed?.maxBooks)) &&
        Number(parsed?.maxBooks) >= 1
          ? Number(parsed.maxBooks)
          : DEFAULT_LIBRARY_SETTINGS.maxBooks,

      issueDuration:
        Number.isFinite(Number(parsed?.issueDuration)) &&
        Number(parsed?.issueDuration) >= 1
          ? Number(parsed.issueDuration)
          : DEFAULT_LIBRARY_SETTINGS.issueDuration,
    };
  } catch (error) {
    console.error("Error loading library settings:", error);

    return DEFAULT_LIBRARY_SETTINGS;
  }
};

// =====================================================
// FIREBASE / LOCAL DATA HELPERS
// =====================================================

const getStudentId = (student) =>
  String(student?.libraryId || student?.studentId || student?.id || "").trim();

const getIssueStudentId = (issue) =>
  String(
    issue?.studentLibraryId ||
      issue?.libraryId ||
      issue?.studentId ||
      issue?.student?.libraryId ||
      issue?.student?.studentId ||
      issue?.student?.id ||
      "",
  ).trim();

const getNotificationStudentId = (notification) =>
  String(
    notification?.studentId ||
      notification?.studentLibraryId ||
      notification?.libraryId ||
      notification?.student?.libraryId ||
      notification?.student?.studentId ||
      notification?.student?.id ||
      "",
  ).trim();

const getBookTitle = (issue) =>
  issue?.bookTitle ||
  issue?.bookName ||
  issue?.book?.title ||
  issue?.book?.name ||
  "Unknown Book";

const getIssueKey = (issue) =>
  String(
    issue?.issueId ||
      issue?.firestoreId ||
      issue?.id ||
      `${getIssueStudentId(issue)}-${issue?.bookId || issue?.book?.id || getBookTitle(issue)}-${issue?.issueDate || issue?.createdAt || ""}`,
  );

const getNotificationKey = (notification) =>
  String(
    notification?.notificationId ||
      notification?.firestoreId ||
      notification?.id ||
      `${notification?.studentId || ""}-${notification?.createdAt || ""}-${notification?.title || ""}`,
  );

// =====================================================
// DASHBOARD DATA MERGE
// =====================================================

const mergeIssues = (localIssues, firebaseIssues) => {
  const mergedMap = new Map();

  localIssues.forEach((issue) => {
    mergedMap.set(getIssueKey(issue), issue);
  });

  firebaseIssues.forEach((issue) => {
    const key = getIssueKey(issue);

    const existing = mergedMap.get(key);

    mergedMap.set(key, {
      ...(existing || {}),
      ...issue,
      firestoreId:
        issue?.firestoreId || issue?.id || existing?.firestoreId || "",
    });
  });

  return Array.from(mergedMap.values());
};

const mergeNotifications = (localNotifications, firebaseNotifications) => {
  const mergedMap = new Map();

  localNotifications.forEach((notification) => {
    mergedMap.set(getNotificationKey(notification), notification);
  });

  firebaseNotifications.forEach((notification) => {
    const key = getNotificationKey(notification);

    const existing = mergedMap.get(key);

    mergedMap.set(key, {
      ...(existing || {}),
      ...notification,
      firestoreId:
        notification?.firestoreId ||
        notification?.id ||
        existing?.firestoreId ||
        "",
    });
  });

  return Array.from(mergedMap.values());
};

// =====================================================
// INITIAL DASHBOARD STATE
// =====================================================

const getInitialState = () => ({
  student: loadStudent(),
  issuedBooks: loadIssues(),
  notifications: loadNotifications(),
  librarySettings: getLibrarySettings(),
});

// =====================================================
// DASHBOARD REDUCER
// =====================================================

const dashboardReducer = (state, action) => {
  switch (action.type) {
    case "SET_DATA":
      return {
        ...state,
        student: action.payload.student || state.student,
        issuedBooks: action.payload.issuedBooks || [],
        notifications: action.payload.notifications || [],
        librarySettings: action.payload.librarySettings || getLibrarySettings(),
      };

    case "REFRESH":
      return {
        student: loadStudent(),
        issuedBooks: loadIssues(),
        notifications: loadNotifications(),
        librarySettings: getLibrarySettings(),
      };

    case "SET_STUDENT":
      return {
        ...state,
        student: action.payload,
      };

    case "LOGOUT":
      return {
        ...state,
        student: null,
      };

    default:
      return state;
  }
};

// =====================================================
// ISSUE HELPERS
// =====================================================

const getDueDate = (issue) => issue?.dueDate || "";

const isReturned = (issue) =>
  issue?.status === "Returned" || Boolean(issue?.returnDate);

const isOverdue = (issue) => {
  if (isReturned(issue)) {
    return false;
  }

  if (!getDueDate(issue)) {
    return false;
  }

  const today = new Date();

  const dueDate = new Date(getDueDate(issue));

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  today.setHours(0, 0, 0, 0);

  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
};

const getDaysOverdue = (issue) => {
  if (!isOverdue(issue)) {
    return 0;
  }

  const today = new Date();

  const dueDate = new Date(getDueDate(issue));

  today.setHours(0, 0, 0, 0);

  dueDate.setHours(0, 0, 0, 0);

  const difference = today.getTime() - dueDate.getTime();

  return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
};

const calculateFine = (issue, finePerDay) => {
  const storedFine = Number(issue?.fine || 0);

  if (storedFine > 0) {
    return storedFine;
  }

  if (!isOverdue(issue)) {
    return 0;
  }

  const daysOverdue = getDaysOverdue(issue);

  return Math.max(0, daysOverdue * Number(finePerDay || 0));
};

// =====================================================
// DATE HELPERS
// =====================================================

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good Morning";
  }

  if (hour < 17) {
    return "Good Afternoon";
  }

  return "Good Evening";
};

// =====================================================
// COMPONENT
// =====================================================

const StudentDashboard = () => {
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(
    dashboardReducer,
    undefined,
    getInitialState,
  );

  const { student, issuedBooks, notifications, librarySettings } = state;

  // =====================================================
  // CURRENT STUDENT ID
  // =====================================================

  const currentStudentId = useMemo(() => getStudentId(student), [student]);

  // =====================================================
  // FIREBASE DATA LOAD
  // =====================================================

  const loadFirebaseData = useCallback(async () => {
    if (!currentStudentId) {
      return;
    }

    try {
      const [firebaseStudent, firebaseIssues, firebaseNotifications] =
        await Promise.all([
          getStudentByLibraryId(currentStudentId),
          getIssuesFromFirestore(),
          getNotificationsByStudent(currentStudentId),
        ]);

      // ---------------------------------------------
      // MERGE STUDENT
      // ---------------------------------------------

      let latestStudent = student;

      if (firebaseStudent) {
        latestStudent = {
          ...(student || {}),
          ...firebaseStudent,

          firestoreId: firebaseStudent?.id || student?.firestoreId || "",

          firebaseId: firebaseStudent?.id || student?.firebaseId || "",

          libraryId: firebaseStudent?.libraryId || currentStudentId,
        };

        localStorage.setItem("studentUser", JSON.stringify(latestStudent));

        const localStudents = (() => {
          try {
            const data = JSON.parse(localStorage.getItem("students") || "[]");

            return Array.isArray(data) ? data : [];
          } catch {
            return [];
          }
        })();

        const studentIndex = localStudents.findIndex(
          (item) => getStudentId(item) === currentStudentId,
        );

        if (studentIndex >= 0) {
          localStudents[studentIndex] = {
            ...localStudents[studentIndex],
            ...latestStudent,
          };
        } else {
          localStudents.push(latestStudent);
        }

        localStorage.setItem("students", JSON.stringify(localStudents));
      }

      // ---------------------------------------------
      // MERGE ISSUES
      // ---------------------------------------------

      const localIssues = loadIssues();

      const safeFirebaseIssues = Array.isArray(firebaseIssues)
        ? firebaseIssues
        : [];

      const mergedIssues = mergeIssues(localIssues, safeFirebaseIssues);

      localStorage.setItem("issuedBooks", JSON.stringify(mergedIssues));

      // ---------------------------------------------
      // MERGE NOTIFICATIONS
      // ---------------------------------------------

      const localNotifications = loadNotifications();

      const safeFirebaseNotifications = Array.isArray(firebaseNotifications)
        ? firebaseNotifications
        : [];

      const mergedNotifications = mergeNotifications(
        localNotifications,
        safeFirebaseNotifications,
      );

      localStorage.setItem(
        "notifications",
        JSON.stringify(mergedNotifications),
      );

      // ---------------------------------------------
      // UPDATE DASHBOARD
      // ---------------------------------------------

      dispatch({
        type: "SET_DATA",
        payload: {
          student: latestStudent,
          issuedBooks: mergedIssues,
          notifications: mergedNotifications,
          librarySettings: getLibrarySettings(),
        },
      });
    } catch (error) {
      console.error("Student dashboard Firebase load error:", error);

      // Firebase fail hone par
      // local data se dashboard chalega.
      dispatch({
        type: "REFRESH",
      });
    }
  }, [currentStudentId, student]);

  // =====================================================
  // AUTH CHECK
  // =====================================================

  useEffect(() => {
    if (!student) {
      navigate("/student-login", {
        replace: true,
      });
    }
  }, [student, navigate]);

  // =====================================================
  // INITIAL FIREBASE LOAD
  // =====================================================

  useEffect(() => {
    if (!student) {
      return;
    }

    loadFirebaseData();
  }, [student, loadFirebaseData]);

  // =====================================================
  // REFRESH LISTENERS
  // =====================================================

  useEffect(() => {
    const refreshData = () => {
      dispatch({
        type: "REFRESH",
      });
    };

    window.addEventListener("storage", refreshData);

    window.addEventListener("libraryDataUpdated", refreshData);

    window.addEventListener("librarySettingsUpdated", refreshData);

    return () => {
      window.removeEventListener("storage", refreshData);

      window.removeEventListener("libraryDataUpdated", refreshData);

      window.removeEventListener("librarySettingsUpdated", refreshData);
    };
  }, []);

  // =====================================================
  // STUDENT ISSUES
  // =====================================================

  const studentIssues = useMemo(() => {
    if (!currentStudentId) {
      return [];
    }

    return issuedBooks.filter(
      (issue) => getIssueStudentId(issue) === currentStudentId,
    );
  }, [issuedBooks, currentStudentId]);

  // =====================================================
  // ACTIVE BOOKS
  // =====================================================

  const activeBooks = useMemo(
    () => studentIssues.filter((issue) => !isReturned(issue)),
    [studentIssues],
  );

  // =====================================================
  // RETURNED BOOKS
  // =====================================================

  const returnedBooks = useMemo(
    () => studentIssues.filter((issue) => isReturned(issue)),
    [studentIssues],
  );

  // =====================================================
  // OVERDUE BOOKS
  // =====================================================

  const overdueBooks = useMemo(
    () => studentIssues.filter((issue) => isOverdue(issue)),
    [studentIssues],
  );

  // =====================================================
  // TOTAL FINE
  // =====================================================

  const totalFine = useMemo(
    () =>
      studentIssues.reduce(
        (total, issue) =>
          total + calculateFine(issue, librarySettings.finePerDay),
        0,
      ),
    [studentIssues, librarySettings.finePerDay],
  );

  // =====================================================
  // UNREAD NOTIFICATIONS
  // =====================================================

  const unreadNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        const notificationStudentId = getNotificationStudentId(notification);

        return (
          notificationStudentId === currentStudentId &&
          !(notification?.read || notification?.isRead)
        );
      }),
    [notifications, currentStudentId],
  );

  // =====================================================
  // RECENT NOTIFICATIONS
  // =====================================================

  const recentNotifications = useMemo(() => {
    return notifications
      .filter((notification) => {
        const notificationStudentId = getNotificationStudentId(notification);

        return (
          notificationStudentId === currentStudentId || !notificationStudentId
        );
      })
      .sort(
        (a, b) =>
          new Date(b?.createdAt || b?.date || 0).getTime() -
          new Date(a?.createdAt || a?.date || 0).getTime(),
      )
      .slice(0, 4);
  }, [notifications, currentStudentId]);

  // =====================================================
  // STUDENT NAME
  // =====================================================

  const studentName =
    student?.name || student?.fullName || student?.firstName || "Student";

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {
    dispatch({
      type: "REFRESH",
    });

    await loadFirebaseData();
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("studentUser");

    localStorage.removeItem("newRegisteredStudent");

    dispatch({
      type: "LOGOUT",
    });

    navigate("/student-login", {
      replace: true,
    });
  };

  // =====================================================
  // LOADING / REDIRECT
  // =====================================================

  if (!student) {
    return null;
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-100">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          {/* BRAND */}

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-100">
              {librarySettings.logo ? (
                <img
                  src={librarySettings.logo}
                  alt={librarySettings.libraryName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Library className="h-6 w-6 text-indigo-600" />
              )}
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black text-slate-900">
                {librarySettings.libraryName}
              </h1>

              <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">
                {librarySettings.institutionName}
              </p>
            </div>
          </div>

          {/* ACTIONS */}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              title="Refresh dashboard"
            >
              <RefreshCw className="h-4 w-4" />

              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white transition hover:bg-slate-800 sm:px-4"
            >
              <LogOut className="h-4 w-4" />

              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* =================================================
            WELCOME
        ================================================= */}

        <section className="mb-8">
          <div className="overflow-hidden rounded-3xl bg-linear-to-r from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  <UserRound className="h-3.5 w-3.5" />
                  Student Portal
                </div>

                <p className="mb-1 text-sm font-semibold text-indigo-200">
                  {getGreeting()}
                </p>

                <h2 className="text-3xl font-black sm:text-4xl">
                  Welcome, {studentName} 👋
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">
                  Manage your books, digital library ID, receipts and
                  notifications from one place.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-bold text-indigo-100">
                  Digital Library ID
                </p>

                <p className="mt-1 text-xl font-black">
                  {currentStudentId || "Not Available"}
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-indigo-100">
                  <ShieldCheck className="h-4 w-4" />

                  {student?.status || "Active Student"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            STATS
        ================================================= */}

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* ACTIVE BOOKS */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
                <BookOpen className="h-5 w-5 text-indigo-600" />
              </div>

              <span className="text-xs font-bold text-slate-400">Active</span>
            </div>

            <p className="mt-4 text-3xl font-black text-slate-900">
              {activeBooks.length}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Current Books
            </p>

            <p className="mt-2 text-xs font-medium text-slate-400">
              Limit: {librarySettings.maxBooks}
            </p>
          </div>

          {/* RETURNED */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>

              <span className="text-xs font-bold text-slate-400">History</span>
            </div>

            <p className="mt-4 text-3xl font-black text-slate-900">
              {returnedBooks.length}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Returned Books
            </p>
          </div>

          {/* OVERDUE */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
                <Clock3 className="h-5 w-5 text-orange-600" />
              </div>

              <span className="text-xs font-bold text-slate-400">
                Attention
              </span>
            </div>

            <p
              className={`mt-4 text-3xl font-black ${
                overdueBooks.length > 0 ? "text-orange-600" : "text-slate-900"
              }`}
            >
              {overdueBooks.length}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Overdue Books
            </p>
          </div>

          {/* FINE */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>

              <span className="text-xs font-bold text-slate-400">Fine</span>
            </div>

            <p
              className={`mt-4 text-3xl font-black ${
                totalFine > 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              ₹{totalFine}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Outstanding Fine
            </p>
          </div>
        </section>

        {/* =================================================
            QUICK ACCESS
        ================================================= */}

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-black text-slate-900">Quick Access</h2>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Access your library services
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* BROWSE BOOKS */}

            <button
              type="button"
              onClick={() => navigate("/student-books")}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
                  <Search className="h-5 w-5 text-indigo-600" />
                </div>

                <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600" />
              </div>

              <h3 className="mt-4 font-black text-slate-900">Browse Books</h3>

              <p className="mt-1 text-sm text-slate-500">
                Explore library catalog
              </p>
            </button>

            {/* MY BOOKS */}

            <button
              type="button"
              onClick={() => navigate("/my-books")}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>

                <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" />
              </div>

              <h3 className="mt-4 font-black text-slate-900">My Books</h3>

              <p className="mt-1 text-sm text-slate-500">View issued books</p>
            </button>

            {/* LIBRARY CARD */}

            <button
              type="button"
              onClick={() => navigate("/library-card")}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100">
                  <CreditCard className="h-5 w-5 text-violet-600" />
                </div>

                <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600" />
              </div>

              <h3 className="mt-4 font-black text-slate-900">
                Digital Library ID
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                View your library card
              </p>
            </button>

            {/* RECEIPTS */}

            <button
              type="button"
              onClick={() => navigate("/my-receipts")}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                </div>

                <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600" />
              </div>

              <h3 className="mt-4 font-black text-slate-900">My Receipts</h3>

              <p className="mt-1 text-sm text-slate-500">
                View issue & return receipts
              </p>
            </button>
          </div>
        </section>

        {/* =================================================
            OVERDUE ALERT
        ================================================= */}

        {overdueBooks.length > 0 && (
          <section className="mb-8 rounded-3xl border border-red-200 bg-red-50 p-5 sm:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>

              <div>
                <h3 className="font-black text-red-900">
                  You have overdue books
                </h3>

                <p className="mt-1 text-sm leading-6 text-red-800">
                  {overdueBooks.length}{" "}
                  {overdueBooks.length === 1 ? "book is" : "books are"} past the
                  due date. A fine of ₹{librarySettings.finePerDay} per overdue
                  day applies.
                </p>

                <p className="mt-1 text-xs font-semibold text-red-700">
                  Current outstanding fine: ₹{totalFine}
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/my-books")}
                  className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
                >
                  View My Books
                </button>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            GOOD STANDING
        ================================================= */}

        {overdueBooks.length === 0 && (
          <section className="mb-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>

              <div>
                <h3 className="font-black text-emerald-900">
                  Your library account is in good standing
                </h3>

                <p className="mt-1 text-sm text-emerald-800">
                  You currently have no overdue books.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            CURRENT BOOKS + NOTIFICATIONS
        ================================================= */}

        <section className="grid gap-6 lg:grid-cols-2">
          {/* CURRENT BOOKS */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-900">Current Books</h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Your currently issued books
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/my-books")}
                className="text-xs font-black text-indigo-600 hover:text-indigo-700"
              >
                View All
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {activeBooks.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-3 text-sm font-bold text-slate-500">
                    No active books
                  </p>

                  <button
                    type="button"
                    onClick={() => navigate("/student-books")}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-black text-indigo-600"
                  >
                    Browse Books
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                activeBooks.slice(0, 4).map((issue) => (
                  <div
                    key={getIssueKey(issue)}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-800">
                        {getBookTitle(issue)}
                      </p>

                      <div className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Due: {formatDate(getDueDate(issue))}
                      </div>
                    </div>

                    {isOverdue(issue) ? (
                      <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black text-red-600">
                        Overdue
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-600">
                        Active
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* NOTIFICATIONS */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-slate-900">Notifications</h2>

                  {unreadNotifications.length > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600">
                      {unreadNotifications.length}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Latest library updates
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/notifications")}
                className="text-xs font-black text-indigo-600 hover:text-indigo-700"
              >
                View All
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {recentNotifications.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center">
                  <Bell className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-3 text-sm font-bold text-slate-500">
                    No notifications
                  </p>
                </div>
              ) : (
                recentNotifications.map((notification) => {
                  const isRead = Boolean(
                    notification?.read || notification?.isRead,
                  );

                  return (
                    <div
                      key={getNotificationKey(notification)}
                      className={`rounded-2xl p-4 ${
                        isRead ? "bg-slate-50" : "bg-indigo-50"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
                          <Bell className="h-4 w-4 text-indigo-600" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-800">
                            {notification?.title || "Library Notification"}
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {notification?.message ||
                              "You have a new library update."}
                          </p>

                          {notification?.createdAt && (
                            <p className="mt-1 text-[10px] font-semibold text-slate-400">
                              {formatDate(notification.createdAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            LIBRARY POLICY
        ================================================= */}

        <section className="mt-8 rounded-3xl bg-slate-900 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-300" />

                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Library Guidelines
                </span>
              </div>

              <h2 className="text-xl font-black">
                Use the library responsibly
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Books are issued only after librarian verification. Students
                cannot issue books directly. The current issue period is{" "}
                {librarySettings.issueDuration} days and the late fine is ₹
                {librarySettings.finePerDay} per overdue day.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                <p className="text-lg font-black">{librarySettings.maxBooks}</p>

                <p className="text-[10px] font-semibold text-slate-400">
                  Max Books
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                <p className="text-lg font-black">
                  {librarySettings.issueDuration}
                </p>

                <p className="text-[10px] font-semibold text-slate-400">Days</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/student-books")}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-100"
            >
              Browse Library
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="mt-8 border-t border-slate-200 py-6 text-center">
          <p className="text-xs font-semibold text-slate-400">
            {librarySettings.institutionName} • {librarySettings.libraryName}
          </p>

          <p className="mt-1 text-[10px] font-medium text-slate-400">
            Smart Library Management System
          </p>
        </footer>
      </main>
    </div>
  );
};

export default StudentDashboard;
