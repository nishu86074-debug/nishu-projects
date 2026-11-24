import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  IndianRupee,
  Library,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";

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
    const data = JSON.parse(localStorage.getItem("librarySettings") || "null");

    if (!data) {
      return DEFAULT_LIBRARY_SETTINGS;
    }

    return {
      ...DEFAULT_LIBRARY_SETTINGS,
      ...data,
      finePerDay:
        Number(data?.finePerDay) >= 0
          ? Number(data.finePerDay)
          : DEFAULT_LIBRARY_SETTINGS.finePerDay,
      maxBooks:
        Number(data?.maxBooks) >= 1
          ? Number(data.maxBooks)
          : DEFAULT_LIBRARY_SETTINGS.maxBooks,
      issueDuration:
        Number(data?.issueDuration) >= 1
          ? Number(data.issueDuration)
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
    student?.libraryId || student?.studentId || student?.id || "",
  ).trim();
};

const getIssueStudentId = (issue) => {
  return String(
    issue?.studentLibraryId ||
      issue?.libraryId ||
      issue?.studentId ||
      issue?.student?.libraryId ||
      issue?.student?.studentId ||
      issue?.student?.id ||
      "",
  ).trim();
};

// =====================================================
// BOOK HELPERS
// =====================================================

const getBookTitle = (issue) => {
  return (
    issue?.bookTitle ||
    issue?.bookName ||
    issue?.title ||
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
    issue?.thumbnail ||
    issue?.book?.image ||
    issue?.book?.thumbnail ||
    ""
  );
};

// =====================================================
// ISSUE HELPERS
// =====================================================

const getIssueDate = (issue) => {
  return issue?.issueDate || issue?.issuedAt || issue?.createdAt || "";
};

const getDueDate = (issue) => {
  return issue?.dueDate || "";
};

const getReturnDate = (issue) => {
  return issue?.returnDate || issue?.returnedAt || "";
};

const isReturned = (issue) => {
  const status = String(issue?.status || "").toLowerCase();

  return (
    status === "returned" ||
    status === "return" ||
    status === "completed" ||
    Boolean(issue?.returnDate) ||
    Boolean(issue?.returnedAt)
  );
};

// =====================================================
// OVERDUE
// =====================================================

const isOverdue = (issue) => {
  if (isReturned(issue)) {
    return false;
  }

  const dueDateValue = getDueDate(issue);

  if (!dueDateValue) {
    return false;
  }

  const today = new Date();
  const dueDate = new Date(dueDateValue);

  if (Number.isNaN(today.getTime()) || Number.isNaN(dueDate.getTime())) {
    return false;
  }

  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
};

// =====================================================
// DAYS OVERDUE
// =====================================================

const getDaysOverdue = (issue) => {
  if (isReturned(issue)) {
    return Number(issue?.daysOverdue || 0);
  }

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

const calculateFine = (issue, finePerDay) => {
  const storedFine = Number(issue?.fine || 0);

  if (storedFine > 0) {
    return storedFine;
  }

  if (!isOverdue(issue)) {
    return 0;
  }

  return getDaysOverdue(issue) * Number(finePerDay || 0);
};

// =====================================================
// DATE FORMAT
// =====================================================

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
// FIREBASE ISSUE KEY
// =====================================================

const getIssueKey = (issue) => {
  return String(
    issue?.issueId ||
      issue?.id ||
      issue?.firestoreId ||
      `${getBookId(issue)}-${getIssueDate(issue)}`,
  );
};

// =====================================================
// COMPONENT
// =====================================================

const MyBooks = () => {
  const navigate = useNavigate();

  // ===================================================
  // STUDENT
  // ===================================================

  const [student, setStudent] = useState(loadStudent);

  // ===================================================
  // LOCAL ISSUES
  // ===================================================

  const [issuedBooks, setIssuedBooks] = useState(loadIssuedBooks);

  // ===================================================
  // FIREBASE ISSUES
  // ===================================================

  const [firebaseIssues, setFirebaseIssues] = useState([]);

  // ===================================================
  // SEARCH / FILTER
  // ===================================================

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("All");

  // ===================================================
  // REFRESH KEY
  // ===================================================

  const [refreshKey, setRefreshKey] = useState(0);

  // ===================================================
  // LIBRARY SETTINGS
  // ===================================================

  const [librarySettings, setLibrarySettings] = useState(loadLibrarySettings);

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
  // STORAGE / APP DATA LISTENER
  // ===================================================

  useEffect(() => {
    const refreshLocalData = () => {
      setStudent(loadStudent());
      setIssuedBooks(loadIssuedBooks());
      setLibrarySettings(loadLibrarySettings());
    };

    window.addEventListener("storage", refreshLocalData);

    window.addEventListener("libraryDataUpdated", refreshLocalData);

    window.addEventListener("librarySettingsUpdated", refreshLocalData);

    return () => {
      window.removeEventListener("storage", refreshLocalData);

      window.removeEventListener("libraryDataUpdated", refreshLocalData);

      window.removeEventListener("librarySettingsUpdated", refreshLocalData);
    };
  }, []);

  // ===================================================
  // REFRESH FIREBASE ISSUES
  // ===================================================

  useEffect(() => {
    let cancelled = false;

    const loadFirebaseIssues = async () => {
      const studentId = getStudentId(loadStudent());

      if (!studentId) {
        return;
      }

      try {
        /*
          Firebase se saare issues fetch karke
          current student ke issues filter kar rahe hain.

          Isse getIssuesByStudent ke signature
          par dependency nahi rahegi.
        */

        const allIssues = await getIssuesFromFirestore();

        if (cancelled) {
          return;
        }

        const studentIssues = Array.isArray(allIssues)
          ? allIssues.filter(
              (issue) =>
                String(getIssueStudentId(issue)).toLowerCase() ===
                String(studentId).toLowerCase(),
            )
          : [];

        setFirebaseIssues(studentIssues);
      } catch (error) {
        console.error("Firebase My Books error:", error);

        if (!cancelled) {
          /*
            Firebase fail hone par localStorage
            data normally continue karega.
          */
          setFirebaseIssues([]);
        }
      }
    };

    loadFirebaseIssues();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // ===================================================
  // CURRENT STUDENT ID
  // ===================================================

  const currentStudentId = useMemo(() => getStudentId(student), [student]);

  // ===================================================
  // LOCAL STUDENT BOOKS
  // ===================================================

  const localStudentBooks = useMemo(() => {
    if (!currentStudentId) {
      return [];
    }

    return issuedBooks.filter(
      (issue) =>
        String(getIssueStudentId(issue)).toLowerCase() ===
        String(currentStudentId).toLowerCase(),
    );
  }, [issuedBooks, currentStudentId]);

  // ===================================================
  // MERGE LOCAL + FIREBASE
  // ===================================================

  const studentBooks = useMemo(() => {
    const issueMap = new Map();

    /*
      Pehle localStorage data.
      Isse offline/local data bhi visible rahega.
    */

    localStudentBooks.forEach((issue) => {
      issueMap.set(getIssueKey(issue), issue);
    });

    /*
      Firebase data same issue ko replace /
      update karega.
    */

    firebaseIssues.forEach((issue) => {
      const key = getIssueKey(issue);

      const oldIssue = issueMap.get(key);

      issueMap.set(key, {
        ...oldIssue,
        ...issue,
      });
    });

    return Array.from(issueMap.values());
  }, [localStudentBooks, firebaseIssues]);

  // ===================================================
  // FILTER + SEARCH
  // ===================================================

  const filteredBooks = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return studentBooks.filter((issue) => {
      const title = getBookTitle(issue).toLowerCase();

      const author = getBookAuthor(issue).toLowerCase();

      const category = getBookCategory(issue).toLowerCase();

      const bookId = getBookId(issue).toLowerCase();

      const matchesSearch =
        !searchText ||
        title.includes(searchText) ||
        author.includes(searchText) ||
        category.includes(searchText) ||
        bookId.includes(searchText);

      const status = getStatus(issue);

      const matchesFilter = filter === "All" || filter === status;

      return matchesSearch && matchesFilter;
    });
  }, [studentBooks, search, filter]);

  // ===================================================
  // STATS
  // ===================================================

  const stats = useMemo(() => {
    const active = studentBooks.filter((issue) => !isReturned(issue));

    const returned = studentBooks.filter((issue) => isReturned(issue));

    const overdue = studentBooks.filter((issue) => isOverdue(issue));

    const fine = studentBooks.reduce(
      (total, issue) =>
        total + calculateFine(issue, librarySettings.finePerDay),
      0,
    );

    return {
      total: studentBooks.length,
      active: active.length,
      returned: returned.length,
      overdue: overdue.length,
      fine,
    };
  }, [studentBooks, librarySettings.finePerDay]);

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
  // FALLBACK IMAGE
  // ===================================================

  const getFallbackImage = (title) => {
    const encoded = encodeURIComponent(title || "Library Book");

    return `https://placehold.co/600x800?text=${encoded}`;
  };

  // ===================================================
  // AUTH LOADING
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
              <BookOpen className="h-5 w-5 text-indigo-600" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black text-slate-900">
                My Books
              </h1>

              <p className="hidden text-xs font-medium text-slate-500 sm:block">
                Your library issue history
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />

            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* =================================================
            TITLE
        ================================================= */}

        <section className="mb-8">
          <div className="bg-linear-to-r from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-lg sm:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  <Library className="h-3.5 w-3.5" />
                  Student Library
                </div>

                <h2 className="text-3xl font-black">Books Issued to You</h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                  Track your currently issued books, due dates, returned books
                  and applicable fines.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
                <p className="text-xs font-bold text-indigo-100">
                  Digital Library ID
                </p>

                <p className="mt-1 text-lg font-black">
                  {currentStudentId || "Not Available"}
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
              <BookOpen className="h-5 w-5 text-indigo-600" />
            </div>

            <p className="mt-4 text-3xl font-black text-slate-900">
              {stats.total}
            </p>

            <p className="text-sm font-semibold text-slate-500">Total Issues</p>
          </div>

          {/* ACTIVE */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Clock3 className="h-5 w-5 text-blue-600" />
            </div>

            <p className="mt-4 text-3xl font-black text-slate-900">
              {stats.active}
            </p>

            <p className="text-sm font-semibold text-slate-500">Active Books</p>
          </div>

          {/* RETURNED */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>

            <p className="mt-4 text-3xl font-black text-slate-900">
              {stats.returned}
            </p>

            <p className="text-sm font-semibold text-slate-500">Returned</p>
          </div>

          {/* OVERDUE */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>

            <p className="mt-4 text-3xl font-black text-orange-600">
              {stats.overdue}
            </p>

            <p className="text-sm font-semibold text-slate-500">Overdue</p>
          </div>

          {/* FINE */}

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <IndianRupee className="h-5 w-5 text-red-600" />
            </div>

            <p className="mt-4 text-3xl font-black text-red-600">
              ₹{stats.fine}
            </p>

            <p className="text-sm font-semibold text-slate-500">Fine</p>
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
                placeholder="Search by book title, author, category or ID..."
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
            <span className="text-slate-900">{filteredBooks.length}</span> book
            {filteredBooks.length !== 1 ? "s" : ""}
          </p>

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs font-black text-indigo-600 hover:text-indigo-700"
            >
              Clear Search
            </button>
          )}
        </div>

        {/* =================================================
            BOOK GRID
        ================================================= */}

        {filteredBooks.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <BookOpen className="h-8 w-8 text-slate-400" />
            </div>

            <h3 className="mt-5 text-xl font-black text-slate-900">
              No books found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {studentBooks.length === 0
                ? "You do not have any issued books yet. Books issued by the librarian will appear here."
                : "No books match your current search or filter."}
            </p>

            {studentBooks.length === 0 && (
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
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredBooks.map((issue) => {
              const title = getBookTitle(issue);

              const author = getBookAuthor(issue);

              const category = getBookCategory(issue);

              const bookId = getBookId(issue);

              const image = getBookImage(issue);

              const returned = isReturned(issue);

              const overdue = isOverdue(issue);

              const fine = calculateFine(issue, librarySettings.finePerDay);

              const status = getStatus(issue);

              return (
                <article
                  key={getIssueKey(issue)}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* BOOK IMAGE */}

                  <div className="relative h-56 overflow-hidden bg-slate-100">
                    <img
                      src={image || getFallbackImage(title)}
                      alt={title}
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.src = getFallbackImage(title);
                      }}
                    />

                    {/* STATUS */}

                    <div className="absolute right-3 top-3">
                      {returned ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white shadow-lg">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Returned
                        </span>
                      ) : overdue ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-black text-white shadow-lg">
                          <AlertCircle className="h-3.5 w-3.5" />
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

                  <div className="p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-lg font-black text-slate-900">
                          {title}
                        </h3>

                        <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                          {author}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
                        {category}
                      </span>
                    </div>

                    {/* BOOK ID */}

                    <div className="mb-4 rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Book ID
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-700">
                        {bookId}
                      </p>
                    </div>

                    {/* DATES */}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-indigo-500" />

                          <span className="text-xs font-bold text-slate-500">
                            Issue Date
                          </span>
                        </div>

                        <span className="text-xs font-black text-slate-800">
                          {formatDate(getIssueDate(issue))}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays
                            className={`h-4 w-4 ${
                              overdue ? "text-red-500" : "text-orange-500"
                            }`}
                          />

                          <span className="text-xs font-bold text-slate-500">
                            Due Date
                          </span>
                        </div>

                        <span
                          className={`text-xs font-black ${
                            overdue ? "text-red-600" : "text-slate-800"
                          }`}
                        >
                          {formatDate(getDueDate(issue))}
                        </span>
                      </div>

                      {returned && (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <RotateCcw className="h-4 w-4 text-emerald-500" />

                            <span className="text-xs font-bold text-slate-500">
                              Return Date
                            </span>
                          </div>

                          <span className="text-xs font-black text-slate-800">
                            {formatDate(getReturnDate(issue))}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* FINE */}

                    {fine > 0 && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wide text-red-500">
                              Fine
                            </p>

                            <p className="mt-1 text-sm font-black text-red-700">
                              ₹{fine}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] font-bold text-red-500">
                              {getDaysOverdue(issue)} day
                              {getDaysOverdue(issue) !== 1 ? "s" : ""} overdue
                            </p>

                            <p className="mt-1 text-[10px] font-semibold text-red-400">
                              ₹{librarySettings.finePerDay}
                              /day
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PAYMENT STATUS */}

                    {(issue?.fineStatus === "Paid" ||
                      issue?.paymentStatus === "Paid" ||
                      issue?.finePaid === true) && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />

                          <p className="text-xs font-black text-emerald-700">
                            Fine Paid
                          </p>
                        </div>

                        {issue?.paymentMethod && (
                          <p className="mt-1 text-[10px] font-semibold text-emerald-600">
                            Payment: {issue.paymentMethod}
                          </p>
                        )}
                      </div>
                    )}

                    {/* FOOTER */}

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Status
                        </p>

                        <p
                          className={`mt-1 text-xs font-black ${
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

                      {issue?.receiptId && (
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Receipt
                          </p>

                          <p className="mt-1 text-xs font-black text-slate-700">
                            {issue.receiptId}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* =================================================
            POLICY
        ================================================= */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>

            <div>
              <h3 className="font-black text-slate-900">
                Library Return Policy
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Books must be returned on or before the due date. A fine of{" "}
                <span className="font-black text-slate-800">
                  ₹{librarySettings.finePerDay} per day
                </span>{" "}
                applies after the due date. Only the librarian can issue or
                return books.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="mt-8 border-t border-slate-200 py-6 text-center">
          <p className="text-xs font-semibold text-slate-400">
            {librarySettings.institutionName} • {librarySettings.libraryName} •
            Smart Library Management System
          </p>
        </footer>
      </main>
    </div>
  );
};

export default MyBooks;
