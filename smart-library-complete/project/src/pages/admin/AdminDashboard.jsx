import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookMarked,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  IndianRupee,
  LibraryBig,
  LogOut,
  Menu,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { useLibraryData } from "../../context/useLibraryData";
import { useLibrarySettings } from "../../context/useLibrarySettings";

import { getStudentsFromFirestore } from "../../firebase/studentService";
import { getBooksFromFirestore } from "../../firebase/bookService";
import { getIssuesFromFirestore } from "../../firebase/issueService";

/* =========================================================
   DATE FORMATTER
========================================================= */

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =========================================================
   ISSUE HELPERS
========================================================= */

const isReturned = (issue) => {
  return (
    String(issue?.status || "").toLowerCase() === "returned" ||
    Boolean(issue?.returnDate)
  );
};

const isActiveIssue = (issue) => {
  return !isReturned(issue);
};

const getStudentName = (issue) => {
  return (
    issue?.studentName ||
    issue?.student?.name ||
    issue?.student?.fullName ||
    "Unknown Student"
  );
};

const getBookTitle = (issue) => {
  return (
    issue?.bookTitle ||
    issue?.book?.title ||
    issue?.book?.name ||
    "Unknown Book"
  );
};

/* =========================================================
   DATA KEYS
========================================================= */

const getStudentKey = (student) => {
  return String(
    student?.libraryId ||
      student?.studentId ||
      student?.id ||
      student?.email ||
      "",
  )
    .trim()
    .toLowerCase();
};

const getBookKey = (book) => {
  return String(book?.bookId || book?.isbn || book?.id || book?.title || "")
    .trim()
    .toLowerCase();
};

const getIssueKey = (issue) => {
  return String(
    issue?.issueId ||
      issue?.id ||
      issue?.firestoreId ||
      `${issue?.studentId || ""}-${issue?.bookId || ""}-${issue?.issueDate || ""}`,
  )
    .trim()
    .toLowerCase();
};

/* =========================================================
   MERGE LOCAL + FIREBASE DATA
========================================================= */

const mergeData = (localData = [], firebaseData = [], keyGetter) => {
  const mergedMap = new Map();

  localData.forEach((item) => {
    const key = keyGetter(item);

    if (!key) {
      return;
    }

    mergedMap.set(key, item);
  });

  firebaseData.forEach((item) => {
    const key = keyGetter(item);

    if (!key) {
      return;
    }

    const existingItem = mergedMap.get(key);

    mergedMap.set(key, {
      ...existingItem,
      ...item,

      firestoreId:
        item?.firestoreId || item?.id || existingItem?.firestoreId || "",

      firebaseId:
        item?.firebaseId || item?.id || existingItem?.firebaseId || "",
    });
  });

  return Array.from(mergedMap.values());
};

/* =========================================================
   OVERDUE DAYS
========================================================= */

const getDaysOverdue = (issue) => {
  if (!issue?.dueDate || isReturned(issue)) {
    return 0;
  }

  const dueDate = new Date(issue.dueDate);

  if (Number.isNaN(dueDate.getTime())) {
    return 0;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const difference = today.getTime() - dueDate.getTime();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(difference / (1000 * 60 * 60 * 24));
};

/* =========================================================
   FINE CALCULATOR
========================================================= */

const calculateFine = (issue, finePerDay = 10) => {
  const storedFine = Number(issue?.fine || 0);

  const overdueDays = getDaysOverdue(issue);

  if (overdueDays <= 0) {
    return storedFine;
  }

  return Math.max(storedFine, overdueDays * Number(finePerDay || 0));
};

/* =========================================================
   ACTIVITY DATE
========================================================= */

const getActivityDate = (issue) => {
  return (
    issue?.updatedAt ||
    issue?.returnDate ||
    issue?.issueDate ||
    issue?.createdAt ||
    ""
  );
};

/* =========================================================
   STAT CARD
========================================================= */

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>

          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={23} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-600 transition group-hover:text-indigo-600">
        View details
        <ArrowRight
          size={14}
          className="transition-transform group-hover:translate-x-1"
        />
      </div>
    </button>
  );
};

/* =========================================================
   QUICK ACTION
========================================================= */

const QuickAction = ({ icon: Icon, title, description, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
        <Icon size={21} />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="font-semibold text-slate-900">{title}</h4>

        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>

      <ArrowRight
        size={17}
        className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600"
      />
    </button>
  );
};

/* =========================================================
   MAIN DASHBOARD
========================================================= */

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  /* =======================================================
     CONTEXT DATA
  ======================================================= */

  const {
    students: contextStudents = [],
    books: contextBooks = [],
    issuedBooks: contextIssuedBooks = [],
  } = useLibraryData();

  const { settings: librarySettings = {} } = useLibrarySettings();

  /* =======================================================
     FIREBASE DATA
  ======================================================= */

  const [firebaseStudents, setFirebaseStudents] = useState([]);

  const [firebaseBooks, setFirebaseBooks] = useState([]);

  const [firebaseIssues, setFirebaseIssues] = useState([]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  /* =======================================================
     LIBRARIAN
  ======================================================= */

  const [librarian] = useState(() => {
    try {
      const stored = localStorage.getItem("librarian");

      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Error loading librarian:", error);

      return null;
    }
  });

  /* =======================================================
     SIDEBAR
  ======================================================= */

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* =======================================================
     AUTH CHECK
  ======================================================= */

  useEffect(() => {
    const stored = localStorage.getItem("librarian");

    if (!stored) {
      navigate("/admin-login", {
        replace: true,
      });
    }
  }, [navigate]);

  /* =======================================================
     FIREBASE DASHBOARD DATA
  ======================================================= */

  const loadFirebaseDashboardData = async () => {
    try {
      setIsRefreshing(true);

      const [studentsResult, booksResult, issuesResult] = await Promise.all([
        getStudentsFromFirestore(),
        getBooksFromFirestore(),
        getIssuesFromFirestore(),
      ]);

      const safeStudents = Array.isArray(studentsResult) ? studentsResult : [];

      const safeBooks = Array.isArray(booksResult) ? booksResult : [];

      const safeIssues = Array.isArray(issuesResult) ? issuesResult : [];

      setFirebaseStudents(safeStudents);

      setFirebaseBooks(safeBooks);

      setFirebaseIssues(safeIssues);

      /* =================================================
           LOCAL STORAGE SYNC
        ================================================= */

      try {
        const localStudents = JSON.parse(
          localStorage.getItem("students") || "[]",
        );

        const localBooks = JSON.parse(localStorage.getItem("books") || "[]");

        const localIssues = JSON.parse(
          localStorage.getItem("issuedBooks") || "[]",
        );

        const mergedStudents = mergeData(
          Array.isArray(localStudents) ? localStudents : [],
          safeStudents,
          getStudentKey,
        );

        const mergedBooks = mergeData(
          Array.isArray(localBooks) ? localBooks : [],
          safeBooks,
          getBookKey,
        );

        const mergedIssues = mergeData(
          Array.isArray(localIssues) ? localIssues : [],
          safeIssues,
          getIssueKey,
        );

        localStorage.setItem("students", JSON.stringify(mergedStudents));

        localStorage.setItem("books", JSON.stringify(mergedBooks));

        localStorage.setItem("issuedBooks", JSON.stringify(mergedIssues));

        window.dispatchEvent(new Event("libraryDataUpdated"));
      } catch (storageError) {
        console.error("Error syncing dashboard data:", storageError);
      }
    } catch (error) {
      console.error("Admin dashboard Firebase error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  /* =======================================================
     INITIAL FIREBASE LOAD
     
     Promise.then is used here so state updates happen
     asynchronously and do not trigger the ESLint
     set-state-in-effect warning.
  ======================================================= */

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getStudentsFromFirestore(),
      getBooksFromFirestore(),
      getIssuesFromFirestore(),
    ])
      .then(([studentsResult, booksResult, issuesResult]) => {
        if (!isMounted) {
          return;
        }

        const safeStudents = Array.isArray(studentsResult)
          ? studentsResult
          : [];

        const safeBooks = Array.isArray(booksResult) ? booksResult : [];

        const safeIssues = Array.isArray(issuesResult) ? issuesResult : [];

        setFirebaseStudents(safeStudents);

        setFirebaseBooks(safeBooks);

        setFirebaseIssues(safeIssues);

        /* ===============================================
             LOCAL STORAGE MERGE
          =============================================== */

        try {
          const localStudents = JSON.parse(
            localStorage.getItem("students") || "[]",
          );

          const localBooks = JSON.parse(localStorage.getItem("books") || "[]");

          const localIssues = JSON.parse(
            localStorage.getItem("issuedBooks") || "[]",
          );

          const mergedStudents = mergeData(
            Array.isArray(localStudents) ? localStudents : [],
            safeStudents,
            getStudentKey,
          );

          const mergedBooks = mergeData(
            Array.isArray(localBooks) ? localBooks : [],
            safeBooks,
            getBookKey,
          );

          const mergedIssues = mergeData(
            Array.isArray(localIssues) ? localIssues : [],
            safeIssues,
            getIssueKey,
          );

          localStorage.setItem("students", JSON.stringify(mergedStudents));

          localStorage.setItem("books", JSON.stringify(mergedBooks));

          localStorage.setItem("issuedBooks", JSON.stringify(mergedIssues));
        } catch (storageError) {
          console.error("Dashboard localStorage sync error:", storageError);
        }
      })
      .catch((error) => {
        console.error("Initial Firebase dashboard load error:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /* =======================================================
     DATA UPDATE LISTENER
  ======================================================= */

  useEffect(() => {
    const handleDataUpdate = () => {
      loadFirebaseDashboardData();
    };

    const handleStorageUpdate = () => {
      loadFirebaseDashboardData();
    };

    window.addEventListener("libraryDataUpdated", handleDataUpdate);

    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener("libraryDataUpdated", handleDataUpdate);

      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  /* =======================================================
     FINAL STUDENTS
  ======================================================= */

  const students = useMemo(() => {
    return mergeData(contextStudents, firebaseStudents, getStudentKey);
  }, [contextStudents, firebaseStudents]);

  /* =======================================================
     FINAL BOOKS
  ======================================================= */

  const books = useMemo(() => {
    return mergeData(contextBooks, firebaseBooks, getBookKey);
  }, [contextBooks, firebaseBooks]);

  /* =======================================================
     FINAL ISSUES
  ======================================================= */

  const issuedBooks = useMemo(() => {
    return mergeData(contextIssuedBooks, firebaseIssues, getIssueKey);
  }, [contextIssuedBooks, firebaseIssues]);

  /* =======================================================
     SETTINGS
  ======================================================= */

  const institutionName =
    librarySettings?.institutionName || "My College / University";

  const libraryName = librarySettings?.libraryName || "Central Library";

  const libraryLogo = librarySettings?.logo || "";

  const finePerDay = Number(librarySettings?.finePerDay ?? 10);

  const maxBooks = Number(librarySettings?.maxBooks ?? 3);

  const issueDuration = Number(librarySettings?.issueDuration ?? 14);

  /* =======================================================
     LIBRARIAN NAME
  ======================================================= */

  const librarianName =
    librarian?.name ||
    librarian?.fullName ||
    librarian?.librarianName ||
    librarian?.email?.split("@")[0] ||
    librarySettings?.librarianName ||
    "Librarian";

  /* =======================================================
     DASHBOARD STATS
  ======================================================= */

  const stats = useMemo(() => {
    const activeIssues = issuedBooks.filter(isActiveIssue);

    const overdueIssues = activeIssues.filter(
      (issue) => getDaysOverdue(issue) > 0,
    );

    const totalFine = overdueIssues.reduce(
      (total, issue) => total + calculateFine(issue, finePerDay),
      0,
    );

    const availableBooks = books.reduce((total, book) => {
      const available = Number(book?.availableQuantity ?? book?.quantity ?? 0);

      return total + Math.max(0, available);
    }, 0);

    return {
      totalStudents: students.length,

      totalBooks: books.length,

      availableBooks,

      issuedBooks: activeIssues.length,

      overdueBooks: overdueIssues.length,

      totalFine,
    };
  }, [students, books, issuedBooks, finePerDay]);

  /* =======================================================
     RECENT ACTIVITIES
  ======================================================= */

  const recentActivities = useMemo(() => {
    return [...issuedBooks]
      .sort((first, second) => {
        const firstDate = new Date(getActivityDate(first)).getTime() || 0;

        const secondDate = new Date(getActivityDate(second)).getTime() || 0;

        return secondDate - firstDate;
      })
      .slice(0, 6);
  }, [issuedBooks]);

  /* =======================================================
     OVERDUE BOOKS
  ======================================================= */

  const overdueBooks = useMemo(() => {
    return issuedBooks
      .filter((issue) => isActiveIssue(issue) && getDaysOverdue(issue) > 0)
      .sort((first, second) => getDaysOverdue(second) - getDaysOverdue(first))
      .slice(0, 5);
  }, [issuedBooks]);

  /* =======================================================
     CATEGORY SUMMARY
  ======================================================= */

  const categorySummary = useMemo(() => {
    const categoryMap = {};

    books.forEach((book) => {
      const category = book?.category || "Other";

      categoryMap[category] = (categoryMap[category] || 0) + 1;
    });

    return Object.entries(categoryMap)
      .sort((first, second) => second[1] - first[1])
      .slice(0, 5);
  }, [books]);

  /* =======================================================
     MENU ITEMS
  ======================================================= */

  const menuItems = [
    {
      label: "Dashboard",
      icon: LibraryBig,
      path: "/admin-dashboard",
    },
    {
      label: "Books",
      icon: BookOpen,
      path: "/books",
    },
    {
      label: "Add Book",
      icon: Plus,
      path: "/add-book",
    },
    {
      label: "Student Management",
      icon: Users,
      path: "/student-management",
    },
    {
      label: "Add Student",
      icon: UserPlus,
      path: "/add-student",
    },
    {
      label: "Issue Book",
      icon: BookMarked,
      path: "/book-issue",
    },
    {
      label: "Return Book",
      icon: RotateCcw,
      path: "/return-book",
    },
    {
      label: "Fine Management",
      icon: IndianRupee,
      path: "/fine-management",
    },
    {
      label: "Library Settings",
      icon: Settings,
      path: "/library-settings",
    },
    {
      label: "Reports",
      icon: TrendingUp,
      path: "/reports",
    },
  ];

  /* =======================================================
     MENU NAVIGATION
  ======================================================= */

  const handleMenuClick = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    localStorage.removeItem("librarian");

    navigate("/admin-login", {
      replace: true,
    });
  };

  /* =======================================================
     ACTIVE PATH
  ======================================================= */

  const currentPath = location.pathname;

  /* =======================================================
     BOOK PERCENTAGES
  ======================================================= */

  const totalBookCopies = stats.availableBooks + stats.issuedBooks;

  const availablePercentage =
    totalBookCopies > 0 ? (stats.availableBooks / totalBookCopies) * 100 : 0;

  const issuedPercentage =
    totalBookCopies > 0 ? (stats.issuedBooks / totalBookCopies) * 100 : 0;

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===================================================
          MOBILE TOP BAR
      =================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
          >
            <Menu size={21} />
          </button>

          <div className="min-w-0 px-2 text-center">
            <h1 className="truncate text-sm font-bold text-slate-900">
              Librarian Dashboard
            </h1>

            <p className="truncate text-[11px] text-slate-500">{libraryName}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* SIDEBAR HEADER */}

          <div className="border-b border-slate-200 p-5">
            <div className="flex items-center gap-3">
              {libraryLogo ? (
                <img
                  src={libraryLogo}
                  alt={libraryName}
                  className="h-11 w-11 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <LibraryBig size={23} />
                </div>
              )}

              <div className="min-w-0">
                <h1 className="truncate font-bold text-slate-900">
                  {libraryName}
                </h1>

                <p className="truncate text-xs text-slate-500">
                  {institutionName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* NAVIGATION */}

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Library Management
            </p>

            {menuItems.map((item) => {
              const Icon = item.icon;

              const active = currentPath === item.path;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleMenuClick(item.path)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  <Icon size={19} />

                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* SIDEBAR BOTTOM */}

          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Logged in as</p>

              <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                {librarianName}
              </p>

              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {libraryName}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ===================================================
          MOBILE OVERLAY
      =================================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* ===================================================
          MAIN AREA
      =================================================== */}

      <div className="lg:pl-72">
        {/* DESKTOP HEADER */}

        <header className="hidden border-b border-slate-200 bg-white lg:block">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900">
                Librarian Dashboard
              </h1>

              <p className="truncate text-xs text-slate-500">
                {libraryName} · {institutionName}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <UserCheck size={18} />
              </div>

              <div className="max-w-48">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {librarianName}
                </p>

                <p className="text-[11px] text-slate-500">Librarian</p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="ml-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* =================================================
            MAIN
        ================================================= */}

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* =================================================
              WELCOME
          ================================================= */}

          <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-xl sm:p-8">
            <div className="relative z-10 max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <ShieldCheck size={14} />
                Secure Librarian Access
              </div>

              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome back, {librarianName}!
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">
                Manage books, students, issue and return records, fines and
                library reports from one place.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/book-issue")}
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                >
                  <BookMarked size={17} />
                  Issue Book
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/return-book")}
                  className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                >
                  <RotateCcw size={17} />
                  Return Book
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/library-settings")}
                  className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                >
                  <Settings size={17} />
                  Settings
                </button>
              </div>
            </div>

            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />

            <div className="absolute -bottom-32 right-20 h-72 w-72 rounded-full bg-violet-400/10" />
          </section>

          {/* =================================================
              FIREBASE STATUS
          ================================================= */}

          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  isRefreshing ? "animate-pulse bg-amber-500" : "bg-emerald-500"
                }`}
              />

              <div>
                <p className="text-xs font-semibold text-slate-700">
                  {isRefreshing
                    ? "Syncing library data..."
                    : "Library data synced"}
                </p>

                <p className="text-[11px] text-slate-400">
                  Firebase + local library data
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadFirebaseDashboardData}
              disabled={isRefreshing}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshing ? "Syncing..." : "Refresh"}
            </button>
          </div>

          {/* =================================================
              STATS
          ================================================= */}

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              subtitle="Registered library members"
              icon={Users}
              iconClass="bg-blue-50 text-blue-600"
              onClick={() => navigate("/student-management")}
            />

            <StatCard
              title="Total Books"
              value={stats.totalBooks}
              subtitle={`${stats.availableBooks} copies available`}
              icon={BookOpen}
              iconClass="bg-violet-50 text-violet-600"
              onClick={() => navigate("/books")}
            />

            <StatCard
              title="Books Issued"
              value={stats.issuedBooks}
              subtitle="Currently with students"
              icon={BookMarked}
              iconClass="bg-amber-50 text-amber-600"
              onClick={() => navigate("/book-issue")}
            />

            <StatCard
              title="Overdue Books"
              value={stats.overdueBooks}
              subtitle={`₹${stats.totalFine} current fine`}
              icon={AlertTriangle}
              iconClass="bg-red-50 text-red-600"
              onClick={() => navigate("/fine-management")}
            />
          </section>

          {/* =================================================
              QUICK ACTIONS + OVERVIEW
          ================================================= */}

          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  Quick Actions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Frequently used library operations
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <QuickAction
                  icon={Plus}
                  title="Add New Book"
                  description="Add a book to the library collection"
                  onClick={() => navigate("/add-book")}
                />

                <QuickAction
                  icon={UserPlus}
                  title="Add Student"
                  description="Register a new library student"
                  onClick={() => navigate("/add-student")}
                />

                <QuickAction
                  icon={BookMarked}
                  title="Issue Book"
                  description="Issue a book after verification"
                  onClick={() => navigate("/book-issue")}
                />

                <QuickAction
                  icon={RotateCcw}
                  title="Return Book"
                  description="Process book return and fine"
                  onClick={() => navigate("/return-book")}
                />

                <QuickAction
                  icon={IndianRupee}
                  title="Fine Management"
                  description="View and manage overdue fines"
                  onClick={() => navigate("/fine-management")}
                />

                <QuickAction
                  icon={FileText}
                  title="Reports"
                  description="View library activity reports"
                  onClick={() => navigate("/reports")}
                />
              </div>
            </div>

            {/* LIBRARY OVERVIEW */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp size={20} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">Library Overview</h3>

                  <p className="text-xs text-slate-500">
                    Current collection status
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-slate-600">Available Books</span>

                    <span className="font-semibold text-slate-900">
                      {stats.availableBooks}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${availablePercentage}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-slate-600">Issued Books</span>

                    <span className="font-semibold text-slate-900">
                      {stats.issuedBooks}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{
                        width: `${issuedPercentage}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-red-50 p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={17} className="text-red-600" />

                    <span className="text-sm font-semibold text-red-700">
                      {stats.overdueBooks}{" "}
                      {stats.overdueBooks === 1
                        ? "overdue book"
                        : "overdue books"}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-red-600">
                    Fine policy: ₹{finePerDay} per overdue day
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              OVERDUE + RECENT ACTIVITY
          ================================================= */}

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* OVERDUE */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-bold text-slate-900">Overdue Books</h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Students who need to return books
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/fine-management")}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  View all
                </button>
              </div>

              {overdueBooks.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={24} />
                  </div>

                  <h3 className="mt-3 font-semibold text-slate-900">
                    All clear!
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    There are no overdue books right now.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {overdueBooks.map((issue) => {
                    const days = getDaysOverdue(issue);

                    const fine = calculateFine(issue, finePerDay);

                    return (
                      <div
                        key={issue.id || issue.issueId}
                        className="flex items-center gap-3 p-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                          <Clock size={19} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-semibold text-slate-900">
                            {getBookTitle(issue)}
                          </h4>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {getStudentName(issue)}
                          </p>

                          <p className="mt-1 text-xs text-red-600">
                            {days} {days === 1 ? "day" : "days"} overdue
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-red-600">
                            ₹{fine}
                          </p>

                          <p className="text-[11px] text-slate-400">
                            Due {formatDate(issue.dueDate)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RECENT ACTIVITY */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-bold text-slate-900">Recent Activity</h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Latest issue and return records
                  </p>
                </div>

                <Activity size={19} className="text-slate-400" />
              </div>

              {recentActivities.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Activity size={22} />
                  </div>

                  <h3 className="mt-3 font-semibold text-slate-900">
                    No activity yet
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Issue or return a book to see activity here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentActivities.map((issue) => {
                    const returned = isReturned(issue);

                    return (
                      <div
                        key={issue.id || issue.issueId}
                        className="flex items-center gap-3 p-4"
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            returned
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-indigo-50 text-indigo-600"
                          }`}
                        >
                          {returned ? (
                            <RotateCcw size={18} />
                          ) : (
                            <BookMarked size={18} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-semibold text-slate-900">
                            {getBookTitle(issue)}
                          </h4>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {getStudentName(issue)}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatDate(getActivityDate(issue))}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            returned
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {returned ? "Returned" : "Issued"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              CATEGORY + RULES
          ================================================= */}

          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* CATEGORY */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Book Collection by Category
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Top categories in your library
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/books")}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Manage books
                </button>
              </div>

              {categorySummary.length === 0 ? (
                <div className="py-10 text-center">
                  <BookOpen size={30} className="mx-auto text-slate-300" />

                  <p className="mt-2 text-sm text-slate-500">
                    No books have been added yet.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {categorySummary.map(([category, count]) => {
                    const percentage =
                      stats.totalBooks > 0
                        ? Math.round((count / stats.totalBooks) * 100)
                        : 0;

                    return (
                      <div key={category}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">
                            {category}
                          </span>

                          <span className="text-xs font-semibold text-slate-500">
                            {count} {count === 1 ? "book" : "books"} ·{" "}
                            {percentage}%
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* LIBRARY RULES */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck size={20} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">Library Rules</h3>

                  <p className="text-xs text-slate-500">
                    Current system policy
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                  <BookMarked
                    size={17}
                    className="mt-0.5 shrink-0 text-indigo-600"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Maximum {maxBooks} {maxBooks === 1 ? "Book" : "Books"}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      A student can have up to {maxBooks} active{" "}
                      {maxBooks === 1 ? "book" : "books"}.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                  <IndianRupee
                    size={17}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      ₹{finePerDay} Per Day Fine
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Fine applies after the due date.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                  <CalendarDays
                    size={17}
                    className="mt-0.5 shrink-0 text-blue-600"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {issueDuration} Days Issue Duration
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Books are normally issued for {issueDuration}{" "}
                      {issueDuration === 1 ? "day" : "days"}.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                  <UserCheck
                    size={17}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Librarian Approval
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Books are issued only through librarian verification.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/library-settings")}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100"
              >
                <Settings size={17} />
                Manage Library Settings
              </button>
            </div>
          </section>

          {/* =================================================
              FOOTER
          ================================================= */}

          <footer className="mt-8 border-t border-slate-200 py-6 text-center">
            <p className="text-xs text-slate-500">
              {libraryName} · {institutionName}
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              Librarian Dashboard · Secure Library Operations
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;




























