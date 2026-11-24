import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Filter,
  IndianRupee,
  Library,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";

import { getIssuesFromFirestore } from "../../firebase/issueService";

// =====================================================
// DEFAULT LIBRARY SETTINGS
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
// LOCAL STORAGE HELPERS
// =====================================================

const loadStudent = () => {
  try {
    return JSON.parse(localStorage.getItem("studentUser") || "null");
  } catch {
    return null;
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

const loadLibrarySettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("librarySettings") || "null");

    if (!saved) {
      return DEFAULT_LIBRARY_SETTINGS;
    }

    return {
      ...DEFAULT_LIBRARY_SETTINGS,
      ...saved,

      finePerDay:
        Number(saved.finePerDay) >= 0
          ? Number(saved.finePerDay)
          : DEFAULT_LIBRARY_SETTINGS.finePerDay,

      maxBooks:
        Number(saved.maxBooks) > 0
          ? Number(saved.maxBooks)
          : DEFAULT_LIBRARY_SETTINGS.maxBooks,

      issueDuration:
        Number(saved.issueDuration) > 0
          ? Number(saved.issueDuration)
          : DEFAULT_LIBRARY_SETTINGS.issueDuration,
    };
  } catch {
    return DEFAULT_LIBRARY_SETTINGS;
  }
};

// =====================================================
// STUDENT HELPERS
// =====================================================

const getStudentId = (student) => {
  return String(
    student?.libraryId ||
      student?.studentLibraryId ||
      student?.studentId ||
      student?.id ||
      "",
  )
    .trim()
    .toLowerCase();
};

const getIssueStudentId = (issue) => {
  return String(
    issue?.studentLibraryId ||
      issue?.libraryId ||
      issue?.studentId ||
      issue?.student?.libraryId ||
      issue?.student?.studentLibraryId ||
      issue?.student?.studentId ||
      issue?.student?.id ||
      "",
  )
    .trim()
    .toLowerCase();
};

// =====================================================
// BOOK HELPERS
// =====================================================

const getBookTitle = (issue) => {
  return (
    issue?.bookTitle ||
    issue?.bookName ||
    issue?.book?.title ||
    issue?.book?.name ||
    "Unknown Book"
  );
};

const getBookAuthor = (issue) => {
  return (
    issue?.bookAuthor ||
    issue?.author ||
    issue?.book?.author ||
    "Unknown Author"
  );
};

const getBookCategory = (issue) => {
  return (
    issue?.bookCategory || issue?.category || issue?.book?.category || "General"
  );
};

const getBookId = (issue) => {
  return String(
    issue?.bookId || issue?.book?.bookId || issue?.book?.id || "N/A",
  );
};

const getBookImage = (issue) => {
  return (
    issue?.bookImage ||
    issue?.image ||
    issue?.book?.image ||
    issue?.book?.thumbnail ||
    ""
  );
};

// =====================================================
// ISSUE / RECEIPT ID HELPERS
// =====================================================

const getIssueId = (issue) => {
  return String(issue?.issueId || issue?.id || issue?.firestoreId || "").trim();
};

const getReceiptId = (issue) => {
  return String(issue?.receiptId || issue?.issueId || issue?.id || "").trim();
};

// =====================================================
// UNIQUE ISSUE KEY
// =====================================================

const getIssueKey = (issue) => {
  const issueId = getIssueId(issue);

  if (issueId) {
    return `issue-${issueId}`;
  }

  const receiptId = getReceiptId(issue);

  if (receiptId) {
    return `receipt-${receiptId}`;
  }

  return [
    getIssueStudentId(issue),
    getBookId(issue),
    issue?.issueDate || "",
    issue?.dueDate || "",
  ]
    .join("-")
    .toLowerCase();
};

// =====================================================
// DATE HELPERS
// =====================================================

const getIssueDate = (issue) => {
  return issue?.issueDate || "";
};

const getDueDate = (issue) => {
  return issue?.dueDate || "";
};

const getReturnDate = (issue) => {
  return issue?.returnDate || "";
};

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

// =====================================================
// STATUS HELPERS
// =====================================================

const isReturned = (issue) => {
  return (
    String(issue?.status || "").toLowerCase() === "returned" ||
    Boolean(issue?.returnDate)
  );
};

const isOverdue = (issue) => {
  if (isReturned(issue)) {
    return false;
  }

  if (!issue?.dueDate) {
    return false;
  }

  const today = new Date();

  const dueDate = new Date(`${issue.dueDate}T23:59:59`);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
};

const getDaysOverdue = (issue) => {
  if (isReturned(issue)) {
    return Number(issue?.daysOverdue || 0);
  }

  if (!issue?.dueDate) {
    return Number(issue?.daysOverdue || 0);
  }

  const today = new Date();

  const dueDate = new Date(`${issue.dueDate}T00:00:00`);

  if (Number.isNaN(dueDate.getTime())) {
    return Number(issue?.daysOverdue || 0);
  }

  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const difference = today.getTime() - dueDate.getTime();

  return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
};

// =====================================================
// FINE CALCULATION
// =====================================================

const calculateFine = (issue, finePerDay) => {
  const storedFine = Number(issue?.fine || 0);

  // Returned book
  if (isReturned(issue)) {
    return storedFine > 0 ? storedFine : 0;
  }

  // Existing stored fine
  if (storedFine > 0) {
    return storedFine;
  }

  // Not overdue
  if (!isOverdue(issue)) {
    return 0;
  }

  return getDaysOverdue(issue) * Number(finePerDay || 0);
};

// =====================================================
// STATUS
// =====================================================

const getStatus = (issue) => {
  if (isReturned(issue)) {
    return "Returned";
  }

  if (isOverdue(issue)) {
    return "Overdue";
  }

  return "Issued";
};

// =====================================================
// FALLBACK BOOK IMAGE
// =====================================================

const getFallbackImage = (title) => {
  return `https://placehold.co/600x800?text=${encodeURIComponent(
    title || "Library Book",
  )}`;
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const MyReceipts = () => {
  const navigate = useNavigate();

  // ===================================================
  // STATE
  // ===================================================

  const [student, setStudent] = useState(loadStudent);

  const [issuedBooks, setIssuedBooks] = useState(loadIssuedBooks);

  const [firebaseIssues, setFirebaseIssues] = useState([]);

  const [librarySettings, setLibrarySettings] = useState(loadLibrarySettings);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("All");

  const [loadingFirebase, setLoadingFirebase] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  // ===================================================
  // AUTH CHECK
  // ===================================================

  useEffect(() => {
    if (!student) {
      navigate("/student-login", {
        replace: true,
      });
    }
  }, [student, navigate]);

  // ===================================================
  // LOAD FIREBASE ISSUES
  // ===================================================

  useEffect(() => {
    let cancelled = false;

    const loadFirebaseIssues = async () => {
      if (!student) {
        return;
      }

      try {
        setLoadingFirebase(true);

        const data = await getIssuesFromFirestore();

        if (!cancelled) {
          setFirebaseIssues(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error loading Firebase receipts:", error);

        if (!cancelled) {
          setFirebaseIssues([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingFirebase(false);
        }
      }
    };

    loadFirebaseIssues();

    return () => {
      cancelled = true;
    };
  }, [student, refreshKey]);

  // ===================================================
  // REFRESH LOCAL + FIREBASE DATA
  // ===================================================

  useEffect(() => {
    const refreshData = () => {
      setStudent(loadStudent());

      setIssuedBooks(loadIssuedBooks());

      setLibrarySettings(loadLibrarySettings());

      setRefreshKey((value) => value + 1);
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

  // ===================================================
  // SETTINGS
  // ===================================================

  const finePerDay = Number(librarySettings?.finePerDay || 0);

  const currentStudentId = getStudentId(student);

  // ===================================================
  // MERGE LOCAL + FIREBASE ISSUES
  // ===================================================

  const allIssues = useMemo(() => {
    const localData = Array.isArray(issuedBooks) ? issuedBooks : [];

    const firebaseData = Array.isArray(firebaseIssues) ? firebaseIssues : [];

    const mergedMap = new Map();

    // -------------------------------------------------
    // LOCAL DATA FIRST
    // -------------------------------------------------

    localData.forEach((issue) => {
      const key = getIssueKey(issue);

      if (!key) {
        return;
      }

      mergedMap.set(key, {
        ...issue,
      });
    });

    // -------------------------------------------------
    // FIREBASE DATA SECOND
    // Firebase data gets priority
    // -------------------------------------------------

    firebaseData.forEach((issue) => {
      const key = getIssueKey(issue);

      if (!key) {
        return;
      }

      const existing = mergedMap.get(key);

      mergedMap.set(key, {
        ...(existing || {}),
        ...issue,
      });
    });

    return Array.from(mergedMap.values());
  }, [issuedBooks, firebaseIssues]);

  // ===================================================
  // STUDENT RECEIPTS
  // ===================================================

  const studentReceipts = useMemo(() => {
    return allIssues
      .filter((issue) => {
        const issueStudentId = getIssueStudentId(issue);

        return issueStudentId && issueStudentId === currentStudentId;
      })
      .sort((a, b) => {
        const dateA = new Date(a?.createdAt || a?.issueDate || 0).getTime();

        const dateB = new Date(b?.createdAt || b?.issueDate || 0).getTime();

        return dateB - dateA;
      });
  }, [allIssues, currentStudentId]);

  // ===================================================
  // SEARCH + FILTER
  // ===================================================

  const searchText = search.trim().toLowerCase();

  const filteredReceipts = studentReceipts.filter((issue) => {
    const receiptId = String(
      issue?.receiptId || issue?.issueId || issue?.id || "",
    ).toLowerCase();

    const issueId = String(issue?.issueId || issue?.id || "").toLowerCase();

    const title = getBookTitle(issue).toLowerCase();

    const author = getBookAuthor(issue).toLowerCase();

    const bookId = getBookId(issue).toLowerCase();

    const matchesSearch =
      !searchText ||
      receiptId.includes(searchText) ||
      issueId.includes(searchText) ||
      title.includes(searchText) ||
      author.includes(searchText) ||
      bookId.includes(searchText);

    const status = getStatus(issue);

    const matchesFilter = filter === "All" || filter === status;

    return matchesSearch && matchesFilter;
  });

  // ===================================================
  // STATS
  // ===================================================

  const activeIssues = studentReceipts.filter((issue) => !isReturned(issue));

  const returnedIssues = studentReceipts.filter((issue) => isReturned(issue));

  const overdueIssues = studentReceipts.filter((issue) => isOverdue(issue));

  const totalFine = studentReceipts.reduce(
    (total, issue) => total + calculateFine(issue, finePerDay),
    0,
  );

  // ===================================================
  // REFRESH
  // ===================================================

  const handleRefresh = () => {
    setStudent(loadStudent());

    setIssuedBooks(loadIssuedBooks());

    setLibrarySettings(loadLibrarySettings());

    setRefreshKey((value) => value + 1);
  };

  // ===================================================
  // VIEW RECEIPT
  // ===================================================

  const handleViewReceipt = (issue) => {
    const issueId = issue?.issueId || issue?.id || issue?.firestoreId;

    if (!issueId) {
      return;
    }

    navigate(`/receipt/${issueId}`);
  };

  // ===================================================
  // IF LOGGED OUT
  // ===================================================

  if (!student) {
    return null;
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="min-h-screen bg-slate-100">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/student-dashboard")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
              <ReceiptText className="h-5 w-5 text-indigo-600" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black text-slate-900">
                My Receipts
              </h1>

              <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">
                {librarySettings.libraryName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loadingFirebase}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingFirebase ? "animate-spin" : ""}`}
            />

            <span className="hidden sm:inline">
              {loadingFirebase ? "Loading..." : "Refresh"}
            </span>
          </button>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* =================================================
            HERO
        ================================================= */}

        <section className="mb-8">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-700 p-6 text-white shadow-lg sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  <FileText className="h-3.5 w-3.5" />
                  Digital Library Receipts
                </div>

                <h2 className="text-3xl font-black">Your Book Receipts</h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                  View your complete history of books issued and returned
                  through the library.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
                <p className="text-xs font-bold text-indigo-100">
                  Digital Library ID
                </p>

                <p className="mt-1 text-lg font-black">
                  {student?.libraryId ||
                    student?.studentLibraryId ||
                    student?.studentId ||
                    "Not Available"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            STATS
        ================================================= */}

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {/* TOTAL */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <ReceiptText className="h-5 w-5 text-indigo-600" />
            </div>

            <p className="mt-4 text-3xl font-black text-slate-900">
              {studentReceipts.length}
            </p>

            <p className="text-sm font-semibold text-slate-500">
              Total Receipts
            </p>
          </div>

          {/* ACTIVE */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Clock3 className="h-5 w-5 text-blue-600" />
            </div>

            <p className="mt-4 text-3xl font-black text-slate-900">
              {activeIssues.length}
            </p>

            <p className="text-sm font-semibold text-slate-500">
              Active Issues
            </p>
          </div>

          {/* RETURNED */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>

            <p className="mt-4 text-3xl font-black text-slate-900">
              {returnedIssues.length}
            </p>

            <p className="text-sm font-semibold text-slate-500">Returned</p>
          </div>

          {/* OVERDUE */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
              <CalendarDays className="h-5 w-5 text-orange-600" />
            </div>

            <p className="mt-4 text-3xl font-black text-orange-600">
              {overdueIssues.length}
            </p>

            <p className="text-sm font-semibold text-slate-500">Overdue</p>
          </div>

          {/* FINE */}

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <IndianRupee className="h-5 w-5 text-red-600" />
            </div>

            <p className="mt-4 text-3xl font-black text-red-600">
              ₹{totalFine}
            </p>

            <p className="text-sm font-semibold text-slate-500">Total Fine</p>
          </div>
        </section>

        {/* =================================================
            SEARCH + FILTER
        ================================================= */}

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* SEARCH */}

            <div className="relative w-full lg:max-w-xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by receipt ID, book title, author or book ID..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            {/* FILTER */}

            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-1 flex items-center gap-2 text-sm font-bold text-slate-500">
                <Filter className="h-4 w-4" />
                Filter
              </div>

              {["All", "Issued", "Returned", "Overdue"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${
                    filter === item
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================
            RESULTS COUNT
        ================================================= */}

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-500">
            Showing{" "}
            <span className="text-slate-900">{filteredReceipts.length}</span>{" "}
            receipt
            {filteredReceipts.length !== 1 ? "s" : ""}
          </p>

          {(search || filter !== "All") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("All");
              }}
              className="text-xs font-black text-indigo-600 hover:text-indigo-700"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {filteredReceipts.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <ReceiptText className="h-8 w-8 text-slate-400" />
            </div>

            <h3 className="mt-5 text-xl font-black text-slate-900">
              No receipts found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {studentReceipts.length === 0
                ? "Your book issue receipts will appear here after the librarian issues a book to you."
                : "No receipts match your current search or filter."}
            </p>

            {studentReceipts.length === 0 && (
              <button
                type="button"
                onClick={() => navigate("/student-books")}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
              >
                Browse Library
                <BookOpen className="h-4 w-4" />
              </button>
            )}
          </section>
        ) : (
          /* =================================================
             RECEIPTS LIST
          ================================================= */

          <section className="space-y-5">
            {filteredReceipts.map((issue, index) => {
              const title = getBookTitle(issue);

              const author = getBookAuthor(issue);

              const category = getBookCategory(issue);

              const bookId = getBookId(issue);

              const image = getBookImage(issue);

              const returned = isReturned(issue);

              const overdue = isOverdue(issue);

              const fine = calculateFine(issue, finePerDay);

              const daysOverdue = getDaysOverdue(issue);

              const status = getStatus(issue);

              const receiptId =
                issue?.receiptId ||
                issue?.issueId ||
                issue?.id ||
                `RECEIPT-${index + 1}`;

              return (
                <article
                  key={getIssueKey(issue) || `${receiptId}-${index}`}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg"
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* BOOK IMAGE */}

                    <div className="relative h-64 w-full shrink-0 bg-slate-100 sm:h-72 lg:h-auto lg:w-52">
                      <img
                        src={image || getFallbackImage(title)}
                        alt={title}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = getFallbackImage(title);
                        }}
                      />

                      <div className="absolute right-3 top-3">
                        {returned ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white shadow-lg">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Returned
                          </span>
                        ) : overdue ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-black text-white shadow-lg">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-[11px] font-black text-white shadow-lg">
                            <Clock3 className="h-3.5 w-3.5" />
                            Issued
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CONTENT */}

                    <div className="flex-1 p-5 sm:p-6">
                      <div className="flex flex-col gap-5">
                        {/* TOP */}

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-600">
                                <ReceiptText className="h-3 w-3" />
                                {receiptId}
                              </span>

                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
                                {category}
                              </span>
                            </div>

                            <h3 className="text-xl font-black text-slate-900">
                              {title}
                            </h3>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {author}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleViewReceipt(issue)}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
                          >
                            <Eye className="h-4 w-4" />
                            View Receipt
                          </button>
                        </div>

                        {/* DETAILS */}

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {/* BOOK ID */}

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                              Book ID
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-700">
                              {bookId}
                            </p>
                          </div>

                          {/* ISSUE DATE */}

                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-indigo-500" />

                              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                Issue Date
                              </p>
                            </div>

                            <p className="mt-1 text-sm font-black text-slate-700">
                              {formatDate(getIssueDate(issue))}
                            </p>
                          </div>

                          {/* DUE DATE */}

                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="flex items-center gap-2">
                              <CalendarDays
                                className={`h-4 w-4 ${
                                  overdue ? "text-red-500" : "text-orange-500"
                                }`}
                              />

                              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                Due Date
                              </p>
                            </div>

                            <p
                              className={`mt-1 text-sm font-black ${
                                overdue ? "text-red-600" : "text-slate-700"
                              }`}
                            >
                              {formatDate(getDueDate(issue))}
                            </p>
                          </div>

                          {/* RETURN DATE */}

                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="flex items-center gap-2">
                              <RotateCcw className="h-4 w-4 text-emerald-500" />

                              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                Return Date
                              </p>
                            </div>

                            <p className="mt-1 text-sm font-black text-slate-700">
                              {formatDate(getReturnDate(issue))}
                            </p>
                          </div>
                        </div>

                        {/* BOTTOM */}

                        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                              Receipt Status
                            </p>

                            <p
                              className={`mt-1 text-sm font-black ${
                                status === "Returned"
                                  ? "text-emerald-600"
                                  : status === "Overdue"
                                    ? "text-red-600"
                                    : "text-indigo-600"
                              }`}
                            >
                              {status}
                            </p>
                          </div>

                          {/* FINE */}

                          {fine > 0 && (
                            <div className="flex items-center justify-between gap-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 sm:min-w-64">
                              <div className="flex items-center gap-2">
                                <IndianRupee className="h-5 w-5 text-red-600" />

                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-wide text-red-500">
                                    Fine
                                  </p>

                                  <p className="text-sm font-black text-red-700">
                                    ₹{fine}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                <p className="text-[10px] font-bold text-red-500">
                                  {daysOverdue} day
                                  {daysOverdue !== 1 ? "s" : ""} overdue
                                </p>

                                <p className="mt-0.5 text-[10px] font-semibold text-red-400">
                                  ₹{finePerDay}
                                  /day
                                </p>
                              </div>
                            </div>
                          )}

                          {/* NO FINE */}

                          {fine === 0 && status !== "Overdue" && (
                            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />

                              <span className="text-xs font-bold text-emerald-700">
                                No fine
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* =================================================
            LIBRARY INFO
        ================================================= */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
              <Library className="h-5 w-5 text-indigo-600" />
            </div>

            <div>
              <h3 className="font-black text-slate-900">
                About Library Receipts
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Every book issued by the librarian receives a digital receipt.
                You can use the receipt to view the book, issue date, due date,
                return date, transaction details and applicable fine.
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                The current overdue fine is{" "}
                <span className="font-black text-slate-800">
                  ₹{finePerDay} per day
                </span>
                .
              </p>

              <p className="mt-2 text-xs font-semibold text-slate-400">
                {librarySettings.libraryEmail}
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="mt-8 border-t border-slate-200 py-6 text-center">
          <p className="text-xs font-semibold text-slate-400">
            {librarySettings.institutionName} • {librarySettings.libraryName}
          </p>

          <p className="mt-1 text-[11px] font-medium text-slate-400">
            Smart Library Management System
          </p>
        </footer>
      </main>
    </div>
  );
};

export default MyReceipts;
