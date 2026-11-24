import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  IndianRupee,
  Library,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  Users,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getStudentsFromFirestore } from "../../firebase/studentService";
import { getBooksFromFirestore } from "../../firebase/bookService";
import { getIssuesFromFirestore } from "../../firebase/issueService";

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
// SETTINGS HELPER
// =====================================================

const getLibrarySettings = () => {
  try {
    const saved = localStorage.getItem("librarySettings");

    if (!saved) {
      return DEFAULT_LIBRARY_SETTINGS;
    }

    const parsed = JSON.parse(saved);

    const finePerDay = Number(parsed?.finePerDay);
    const maxBooks = Number(parsed?.maxBooks);
    const issueDuration = Number(parsed?.issueDuration);

    return {
      ...DEFAULT_LIBRARY_SETTINGS,
      ...parsed,

      finePerDay:
        Number.isFinite(finePerDay) && finePerDay >= 0
          ? finePerDay
          : DEFAULT_LIBRARY_SETTINGS.finePerDay,

      maxBooks:
        Number.isFinite(maxBooks) && maxBooks >= 1
          ? maxBooks
          : DEFAULT_LIBRARY_SETTINGS.maxBooks,

      issueDuration:
        Number.isFinite(issueDuration) && issueDuration >= 1
          ? issueDuration
          : DEFAULT_LIBRARY_SETTINGS.issueDuration,
    };
  } catch (error) {
    console.error("Error loading library settings:", error);

    return DEFAULT_LIBRARY_SETTINGS;
  }
};

// =====================================================
// STORAGE HELPERS
// =====================================================

const loadStudents = () => {
  try {
    const data = JSON.parse(localStorage.getItem("students") || "[]");

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const loadBooks = () => {
  try {
    const data = JSON.parse(localStorage.getItem("books") || "[]");

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const loadIssuedBooks = () => {
  try {
    const data = JSON.parse(localStorage.getItem("issuedBooks") || "[]");

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

// =====================================================
// MERGE HELPERS
// =====================================================

const getStudentKey = (student) =>
  String(
    student?.libraryId ||
      student?.studentId ||
      student?.id ||
      student?.firestoreId ||
      "",
  ).toLowerCase();

const getBookKey = (book) =>
  String(book?.bookId || book?.id || book?.firestoreId || "").toLowerCase();

const getIssueKey = (issue) =>
  String(issue?.issueId || issue?.id || issue?.firestoreId || "").toLowerCase();

const mergeStudents = (localStudents, firebaseStudents) => {
  const map = new Map();

  [...localStudents, ...firebaseStudents].forEach((student) => {
    const key = getStudentKey(student);

    if (!key) {
      return;
    }

    const existing = map.get(key);

    map.set(key, {
      ...(existing || {}),
      ...student,
    });
  });

  return Array.from(map.values());
};

const mergeBooks = (localBooks, firebaseBooks) => {
  const map = new Map();

  [...localBooks, ...firebaseBooks].forEach((book) => {
    const key = getBookKey(book);

    if (!key) {
      return;
    }

    const existing = map.get(key);

    map.set(key, {
      ...(existing || {}),
      ...book,
    });
  });

  return Array.from(map.values());
};

const mergeIssues = (localIssues, firebaseIssues) => {
  const map = new Map();

  [...localIssues, ...firebaseIssues].forEach((issue) => {
    const key = getIssueKey(issue);

    if (!key) {
      return;
    }

    const existing = map.get(key);

    map.set(key, {
      ...(existing || {}),
      ...issue,
    });
  });

  return Array.from(map.values());
};

// =====================================================
// ISSUE HELPERS
// =====================================================

const getIssueStudentId = (issue) =>
  String(
    issue?.studentLibraryId ||
      issue?.libraryId ||
      issue?.studentId ||
      issue?.student?.libraryId ||
      issue?.student?.studentId ||
      issue?.student?.id ||
      "",
  );

const getIssueStudentName = (issue) =>
  issue?.studentName ||
  issue?.student?.name ||
  issue?.student?.fullName ||
  "Unknown Student";

const getIssueBookId = (issue) =>
  String(issue?.bookId || issue?.book?.bookId || issue?.book?.id || "");

const getIssueBookTitle = (issue) =>
  issue?.bookTitle ||
  issue?.bookName ||
  issue?.book?.title ||
  issue?.book?.name ||
  "Unknown Book";

const getIssueDate = (issue) => issue?.issueDate || "";

const getDueDate = (issue) => issue?.dueDate || "";

const getReturnDate = (issue) => issue?.returnDate || "";

const isReturned = (issue) =>
  issue?.status === "Returned" || Boolean(issue?.returnDate);

// =====================================================
// OVERDUE
// =====================================================

const isOverdue = (issue) => {
  if (isReturned(issue)) {
    return false;
  }

  if (!getDueDate(issue)) {
    return false;
  }

  const today = new Date();
  const dueDate = new Date(getDueDate(issue));

  if (Number.isNaN(today.getTime()) || Number.isNaN(dueDate.getTime())) {
    return false;
  }

  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
};

const getDaysOverdue = (issue) => {
  const storedDays = Number(issue?.daysOverdue || 0);

  if (storedDays > 0) {
    return storedDays;
  }

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

// =====================================================
// FINE
// =====================================================

const getFine = (issue, finePerDay) => {
  const storedFine = Number(issue?.fine || 0);

  if (isReturned(issue)) {
    return storedFine > 0 ? storedFine : 0;
  }

  if (!isOverdue(issue)) {
    return storedFine > 0 ? storedFine : 0;
  }

  return getDaysOverdue(issue) * finePerDay;
};

// =====================================================
// GENERAL HELPERS
// =====================================================

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getActivityDate = (issue) =>
  issue?.updatedAt ||
  issue?.createdAt ||
  issue?.returnDate ||
  issue?.issueDate ||
  "";

const getStudentLibraryId = (student) =>
  String(student?.libraryId || student?.studentId || student?.id || "");

const getBookCategory = (book) => book?.category || "General";

const getBookQuantity = (book) => Number(book?.quantity || 0);

const getBookAvailableQuantity = (book) => {
  if (
    book?.availableQuantity !== undefined &&
    book?.availableQuantity !== null
  ) {
    return Number(book.availableQuantity);
  }

  return Number(book?.quantity || 0);
};

// =====================================================
// EMPTY STATE
// =====================================================

const EmptyState = ({ icon: Icon, title, description }) => {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>

      <h3 className="mt-4 font-black text-slate-800">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const Reports = () => {
  const navigate = useNavigate();

  const [librarySettings, setLibrarySettings] = useState(getLibrarySettings);

  const [students, setStudents] = useState(loadStudents);

  const [books, setBooks] = useState(loadBooks);

  const [issuedBooks, setIssuedBooks] = useState(loadIssuedBooks);

  const [activeTab, setActiveTab] = useState("Overview");

  const [generatedAt, setGeneratedAt] = useState(() =>
    new Date().toISOString(),
  );

  const [firebaseLoading, setFirebaseLoading] = useState(false);

  // ===================================================
  // SETTINGS
  // ===================================================

  const finePerDay = Number(librarySettings?.finePerDay || 0);

  const institutionName =
    librarySettings?.institutionName ||
    DEFAULT_LIBRARY_SETTINGS.institutionName;

  const libraryName =
    librarySettings?.libraryName || DEFAULT_LIBRARY_SETTINGS.libraryName;

  const librarianName =
    librarySettings?.librarianName || DEFAULT_LIBRARY_SETTINGS.librarianName;

  const issueDuration = Number(
    librarySettings?.issueDuration || DEFAULT_LIBRARY_SETTINGS.issueDuration,
  );

  // ===================================================
  // AUTH
  // ===================================================

  useEffect(() => {
    const librarian = localStorage.getItem("librarian");

    if (!librarian) {
      navigate("/admin-login", {
        replace: true,
      });
    }
  }, [navigate]);

  // ===================================================
  // FIREBASE DATA
  // ===================================================

  const loadFirebaseData = async () => {
    setFirebaseLoading(true);

    try {
      const [firebaseStudents, firebaseBooks, firebaseIssues] =
        await Promise.all([
          getStudentsFromFirestore(),
          getBooksFromFirestore(),
          getIssuesFromFirestore(),
        ]);

      const localStudents = loadStudents();

      const localBooks = loadBooks();

      const localIssues = loadIssuedBooks();

      const mergedStudents = mergeStudents(
        localStudents,
        Array.isArray(firebaseStudents) ? firebaseStudents : [],
      );

      const mergedBooks = mergeBooks(
        localBooks,
        Array.isArray(firebaseBooks) ? firebaseBooks : [],
      );

      const mergedIssues = mergeIssues(
        localIssues,
        Array.isArray(firebaseIssues) ? firebaseIssues : [],
      );

      setStudents(mergedStudents);
      setBooks(mergedBooks);
      setIssuedBooks(mergedIssues);

      localStorage.setItem("students", JSON.stringify(mergedStudents));

      localStorage.setItem("books", JSON.stringify(mergedBooks));

      localStorage.setItem("issuedBooks", JSON.stringify(mergedIssues));
    } catch (error) {
      console.error("Reports Firebase loading error:", error);

      setStudents(loadStudents());
      setBooks(loadBooks());
      setIssuedBooks(loadIssuedBooks());
    } finally {
      setFirebaseLoading(false);
    }
  };

  // ===================================================
  // INITIAL DATA LOAD
  // ===================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFirebaseData();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // ===================================================
  // REFRESH
  // ===================================================

  const refreshData = () => {
    setLibrarySettings(getLibrarySettings());

    setStudents(loadStudents());
    setBooks(loadBooks());
    setIssuedBooks(loadIssuedBooks());

    setGeneratedAt(new Date().toISOString());

    loadFirebaseData();
  };

  // ===================================================
  // EVENT SYNC
  // ===================================================

  useEffect(() => {
    const handleStorage = () => {
      setLibrarySettings(getLibrarySettings());

      setStudents(loadStudents());
      setBooks(loadBooks());
      setIssuedBooks(loadIssuedBooks());

      setGeneratedAt(new Date().toISOString());
    };

    const handleLibraryDataUpdated = () => {
      handleStorage();
      loadFirebaseData();
    };

    const handleLibrarySettingsUpdated = () => {
      setLibrarySettings(getLibrarySettings());

      setStudents(loadStudents());
      setBooks(loadBooks());
      setIssuedBooks(loadIssuedBooks());

      setGeneratedAt(new Date().toISOString());
    };

    window.addEventListener("storage", handleStorage);

    window.addEventListener("libraryDataUpdated", handleLibraryDataUpdated);

    window.addEventListener(
      "librarySettingsUpdated",
      handleLibrarySettingsUpdated,
    );

    return () => {
      window.removeEventListener("storage", handleStorage);

      window.removeEventListener(
        "libraryDataUpdated",
        handleLibraryDataUpdated,
      );

      window.removeEventListener(
        "librarySettingsUpdated",
        handleLibrarySettingsUpdated,
      );
    };
  }, []);

  // ===================================================
  // MAIN STATISTICS
  // ===================================================

  const stats = useMemo(() => {
    const totalStudents = students.length;

    const totalBooks = books.length;

    const totalCopies = books.reduce(
      (sum, book) => sum + getBookQuantity(book),
      0,
    );

    const availableCopies = books.reduce(
      (sum, book) => sum + getBookAvailableQuantity(book),
      0,
    );

    const activeIssues = issuedBooks.filter((issue) => !isReturned(issue));

    const returnedIssues = issuedBooks.filter((issue) => isReturned(issue));

    const overdueIssues = activeIssues.filter((issue) => isOverdue(issue));

    const totalFine = issuedBooks.reduce(
      (sum, issue) => sum + getFine(issue, finePerDay),
      0,
    );

    const paidFine = issuedBooks
      .filter(
        (issue) =>
          issue?.fineStatus === "Paid" ||
          issue?.paymentStatus === "Paid" ||
          issue?.finePaid === true,
      )
      .reduce(
        (sum, issue) => sum + Number(issue?.finePaidAmount || issue?.fine || 0),
        0,
      );

    const unpaidFine = Math.max(0, totalFine - paidFine);

    return {
      totalStudents,
      totalBooks,
      totalCopies,
      availableCopies,
      activeIssues: activeIssues.length,
      returnedIssues: returnedIssues.length,
      overdueIssues: overdueIssues.length,
      totalFine,
      paidFine,
      unpaidFine,
    };
  }, [students, books, issuedBooks, finePerDay]);

  // ===================================================
  // CATEGORY REPORT
  // ===================================================

  const categoryReport = useMemo(() => {
    const map = {};

    books.forEach((book) => {
      const category = getBookCategory(book);

      if (!map[category]) {
        map[category] = {
          category,
          titles: 0,
          copies: 0,
          available: 0,
        };
      }

      map[category].titles += 1;

      map[category].copies += getBookQuantity(book);

      map[category].available += getBookAvailableQuantity(book);
    });

    return Object.values(map).sort((a, b) => b.copies - a.copies);
  }, [books]);

  // ===================================================
  // RECENT ACTIVITY
  // ===================================================

  const recentActivity = useMemo(() => {
    return [...issuedBooks]
      .sort((a, b) => {
        const dateA = new Date(getActivityDate(a)).getTime() || 0;

        const dateB = new Date(getActivityDate(b)).getTime() || 0;

        return dateB - dateA;
      })
      .slice(0, 20);
  }, [issuedBooks]);

  // ===================================================
  // STUDENT REPORT
  // ===================================================

  const studentReport = useMemo(() => {
    return students
      .map((student) => {
        const libraryId = getStudentLibraryId(student);

        const issues = issuedBooks.filter(
          (issue) =>
            String(getIssueStudentId(issue)).toLowerCase() ===
            String(libraryId).toLowerCase(),
        );

        const active = issues.filter((issue) => !isReturned(issue));

        const returned = issues.filter((issue) => isReturned(issue));

        const overdue = active.filter((issue) => isOverdue(issue));

        const fine = issues.reduce(
          (sum, issue) => sum + getFine(issue, finePerDay),
          0,
        );

        return {
          id: student?.firestoreId || student?.id || libraryId,

          libraryId,

          name: student?.name || student?.fullName || "Unknown Student",

          email: student?.email || "—",

          active: active.length,

          returned: returned.length,

          overdue: overdue.length,

          fine,
        };
      })
      .sort((a, b) => b.active - a.active);
  }, [students, issuedBooks, finePerDay]);

  // ===================================================
  // OVERDUE REPORT
  // ===================================================

  const overdueReport = useMemo(() => {
    return issuedBooks
      .filter((issue) => isOverdue(issue))
      .sort((a, b) => getDaysOverdue(b) - getDaysOverdue(a));
  }, [issuedBooks]);

  // ===================================================
  // ACTIONS
  // ===================================================

  const handleRefresh = () => {
    refreshData();
  };

  const handlePrint = () => {
    setGeneratedAt(new Date().toISOString());

    setTimeout(() => {
      window.print();
    }, 100);
  };

  const tabs = [
    {
      label: "Overview",
      icon: BarChart3,
    },
    {
      label: "Categories",
      icon: Library,
    },
    {
      label: "Activity",
      icon: Clock3,
    },
    {
      label: "Students",
      icon: Users,
    },
  ];

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="min-h-screen bg-slate-100">
      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur print:static">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin-dashboard")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-100">
              {librarySettings.logo ? (
                <img
                  src={librarySettings.logo}
                  alt={libraryName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <BarChart3 className="h-5 w-5 text-indigo-600" />
              )}
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black text-slate-900">
                Library Reports
              </h1>

              <p className="hidden text-xs font-medium text-slate-500 sm:block">
                {libraryName} • Analytics and performance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {firebaseLoading && (
              <span className="hidden text-xs font-bold text-indigo-600 sm:block">
                Syncing...
              </span>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={firebaseLoading}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${firebaseLoading ? "animate-spin" : ""}`}
              />

              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-black text-white transition hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" />

              <span className="hidden sm:inline">Print Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* HERO */}

        <section className="mb-8">
          <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-700 p-6 text-white shadow-lg sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  <FileText className="h-3.5 w-3.5" />
                  Management Reports
                </div>

                <h2 className="text-3xl font-black">{libraryName}</h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                  Monitor books, students, issues, returns, overdue records and
                  library fines from one place.
                </p>

                <p className="mt-3 text-xs font-bold text-indigo-200">
                  {institutionName}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-bold text-indigo-100">Fine Policy</p>

                <p className="mt-1 text-2xl font-black">₹{finePerDay}/day</p>

                <p className="mt-1 text-xs text-indigo-100">After due date</p>

                <div className="mt-3 border-t border-white/10 pt-3">
                  <p className="text-xs font-bold text-indigo-100">
                    Issue Duration
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {issueDuration} days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TABS */}

        <section className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-2">
            {tabs.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(label)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${
                  activeTab === label
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />

                {label}
              </button>
            ))}
          </div>
        </section>

        {/* OVERVIEW */}

        {activeTab === "Overview" && (
          <div className="space-y-8">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>

                <p className="mt-4 text-3xl font-black text-slate-900">
                  {stats.totalBooks}
                </p>

                <p className="text-sm font-semibold text-slate-500">
                  Book Titles
                </p>

                <p className="mt-2 text-xs font-bold text-blue-600">
                  {stats.totalCopies} total copies
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100">
                  <Users className="h-5 w-5 text-violet-600" />
                </div>

                <p className="mt-4 text-3xl font-black text-slate-900">
                  {stats.totalStudents}
                </p>

                <p className="text-sm font-semibold text-slate-500">
                  Registered Students
                </p>

                <p className="mt-2 text-xs font-bold text-violet-600">
                  Digital Library IDs
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>

                <p className="mt-4 text-3xl font-black text-slate-900">
                  {stats.activeIssues}
                </p>

                <p className="text-sm font-semibold text-slate-500">
                  Active Issues
                </p>

                <p className="mt-2 text-xs font-bold text-emerald-600">
                  Currently issued
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>

                <p className="mt-4 text-3xl font-black text-orange-600">
                  {stats.overdueIssues}
                </p>

                <p className="text-sm font-semibold text-slate-500">
                  Overdue Books
                </p>

                <p className="mt-2 text-xs font-bold text-orange-600">
                  Require attention
                </p>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Available Copies
                </p>

                <p className="mt-2 text-2xl font-black text-emerald-600">
                  {stats.availableCopies}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Returned Books
                </p>

                <p className="mt-2 text-2xl font-black text-blue-600">
                  {stats.returnedIssues}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Total Fine
                </p>

                <p className="mt-2 text-2xl font-black text-red-600">
                  ₹{stats.totalFine}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Unpaid Fine
                </p>

                <p className="mt-2 text-2xl font-black text-orange-600">
                  ₹{stats.unpaidFine}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100">
                    <IndianRupee className="h-5 w-5 text-red-600" />
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900">Fine Summary</h3>

                    <p className="text-xs font-medium text-slate-500">
                      Current library fine collection
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
                    <p className="text-lg font-black text-slate-900">
                      ₹{stats.totalFine}
                    </p>

                    <p className="text-[10px] font-bold text-slate-400">
                      Total
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
                    <p className="text-lg font-black text-emerald-600">
                      ₹{stats.paidFine}
                    </p>

                    <p className="text-[10px] font-bold text-emerald-500">
                      Paid
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 px-4 py-3 text-center">
                    <p className="text-lg font-black text-red-600">
                      ₹{stats.unpaidFine}
                    </p>

                    <p className="text-[10px] font-bold text-red-500">Unpaid</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-black text-slate-900">Overdue Books</h3>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Books that have crossed their due date
                  </p>
                </div>

                <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600">
                  {overdueReport.length}
                </span>
              </div>

              {overdueReport.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No overdue books"
                  description="All currently issued books are within their due dates."
                />
              ) : (
                <div className="space-y-3">
                  {overdueReport.slice(0, 5).map((issue) => {
                    const days = getDaysOverdue(issue);

                    return (
                      <div
                        key={issue?.issueId || issue?.id || issue?.firestoreId}
                        className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-black text-slate-900">
                            {getIssueBookTitle(issue)}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {getIssueStudentName(issue)}
                            {" • "}
                            {getIssueStudentId(issue)}
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-xs font-black text-red-600">
                            {days} day
                            {days !== 1 ? "s" : ""} overdue
                          </p>

                          <p className="mt-1 text-xs font-bold text-red-500">
                            Fine: ₹{getFine(issue, finePerDay)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="font-black text-slate-900">Recent Activity</h3>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Latest book issue and return records
                </p>
              </div>

              {recentActivity.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No activity yet"
                  description="Book issue and return activity will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((issue) => {
                    const returned = isReturned(issue);

                    return (
                      <div
                        key={issue?.issueId || issue?.id || issue?.firestoreId}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              returned ? "bg-emerald-100" : "bg-indigo-100"
                            }`}
                          >
                            {returned ? (
                              <RotateCcw className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <BookOpen className="h-5 w-5 text-indigo-600" />
                            )}
                          </div>

                          <div>
                            <p className="font-black text-slate-900">
                              {getIssueBookTitle(issue)}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {getIssueStudentName(issue)}
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${
                              returned
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {returned ? "Returned" : "Issued"}
                          </span>

                          <p className="mt-1 text-[10px] font-semibold text-slate-400">
                            {formatDateTime(getActivityDate(issue))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* CATEGORIES */}

        {activeTab === "Categories" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">
                Category-wise Report
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Distribution of books across library categories.
              </p>
            </div>

            {categoryReport.length === 0 ? (
              <EmptyState
                icon={Library}
                title="No category data"
                description="Add books to generate category-wise reports."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {categoryReport.map((item) => {
                  const percentage =
                    stats.totalCopies > 0
                      ? Math.round((item.copies / stats.totalCopies) * 100)
                      : 0;

                  return (
                    <div
                      key={item.category}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-black text-slate-900">
                          {item.category}
                        </h3>

                        <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-[10px] font-black text-indigo-600">
                          {percentage}%
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-white p-3 text-center">
                          <p className="text-lg font-black text-slate-900">
                            {item.titles}
                          </p>

                          <p className="text-[10px] font-bold text-slate-400">
                            Titles
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3 text-center">
                          <p className="text-lg font-black text-blue-600">
                            {item.copies}
                          </p>

                          <p className="text-[10px] font-bold text-slate-400">
                            Copies
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3 text-center">
                          <p className="text-lg font-black text-emerald-600">
                            {item.available}
                          </p>

                          <p className="text-[10px] font-bold text-slate-400">
                            Available
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-indigo-600"
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
          </section>
        )}

        {/* ACTIVITY */}

        {activeTab === "Activity" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">
                Issue & Return Activity
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Complete recent activity of library books.
              </p>
            </div>

            {recentActivity.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No activity available"
                description="Activity will appear after books are issued or returned."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Book
                      </th>

                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Student
                      </th>

                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Issue Date
                      </th>

                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Due Date
                      </th>

                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Return Date
                      </th>

                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Status
                      </th>

                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Fine
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentActivity.map((issue) => {
                      const returned = isReturned(issue);

                      const overdue = isOverdue(issue);

                      return (
                        <tr
                          key={
                            issue?.issueId || issue?.id || issue?.firestoreId
                          }
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-4 py-4">
                            <p className="max-w-[220px] truncate text-sm font-black text-slate-800">
                              {getIssueBookTitle(issue)}
                            </p>

                            <p className="mt-1 text-[10px] font-bold text-slate-400">
                              {getIssueBookId(issue)}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <p className="text-sm font-bold text-slate-700">
                              {getIssueStudentName(issue)}
                            </p>

                            <p className="mt-1 text-[10px] font-bold text-slate-400">
                              {getIssueStudentId(issue)}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                            {formatDate(getIssueDate(issue))}
                          </td>

                          <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                            {formatDate(getDueDate(issue))}
                          </td>

                          <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                            {formatDate(getReturnDate(issue))}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                returned
                                  ? "bg-emerald-100 text-emerald-700"
                                  : overdue
                                    ? "bg-red-100 text-red-700"
                                    : "bg-indigo-100 text-indigo-700"
                              }`}
                            >
                              {returned
                                ? "Returned"
                                : overdue
                                  ? "Overdue"
                                  : "Issued"}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`text-sm font-black ${
                                getFine(issue, finePerDay) > 0
                                  ? "text-red-600"
                                  : "text-slate-400"
                              }`}
                            >
                              ₹{getFine(issue, finePerDay)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* STUDENTS */}

        {activeTab === "Students" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">
                Student Activity Report
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Student-wise issue, return, overdue and fine summary.
              </p>
            </div>

            {studentReport.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No student data"
                description="Registered students will appear in this report."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Student
                      </th>

                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Library ID
                      </th>

                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Active
                      </th>

                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Returned
                      </th>

                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Overdue
                      </th>

                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Fine
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {studentReport.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-4 py-4">
                          <p className="text-sm font-black text-slate-800">
                            {item.name}
                          </p>

                          <p className="mt-1 text-[10px] font-semibold text-slate-400">
                            {item.email}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-black text-indigo-600">
                            {item.libraryId}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-black text-blue-600">
                            {item.active}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-black text-emerald-600">
                            {item.returned}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`font-black ${
                              item.overdue > 0
                                ? "text-red-600"
                                : "text-slate-400"
                            }`}
                          >
                            {item.overdue}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`font-black ${
                              item.fine > 0 ? "text-red-600" : "text-slate-400"
                            }`}
                          >
                            ₹{item.fine}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* FOOTER */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-indigo-100">
                {librarySettings.logo ? (
                  <img
                    src={librarySettings.logo}
                    alt={libraryName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Library className="h-5 w-5 text-indigo-600" />
                )}
              </div>

              <div>
                <h3 className="font-black text-slate-900">{libraryName}</h3>

                <p className="text-xs font-medium text-slate-500">
                  {institutionName}
                </p>

                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                  {librarianName}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                Report Generated
              </p>

              <p className="mt-1 text-xs font-bold text-slate-600">
                {formatDateTime(generatedAt)}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* PRINT CSS */}

      <style>
        {`
          @media print {
            body {
              background: white !important;
            }

            header {
              position: static !important;
            }

            header button,
            header a {
              display: none !important;
            }

            main {
              max-width: 100% !important;
              padding: 20px !important;
            }

            section {
              break-inside: avoid;
            }

            button {
              display: none !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Reports;
