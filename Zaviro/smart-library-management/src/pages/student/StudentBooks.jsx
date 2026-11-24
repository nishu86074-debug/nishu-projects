import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  BookMarked,
  CheckCircle2,
  ChevronRight,
  Filter,
  Library,
  RefreshCw,
  Search,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { getBooksFromFirestore } from "../../firebase/bookService";

const DEFAULT_SETTINGS = {
  institutionName: "My College / University",
  libraryName: "Central Library",
  finePerDay: 10,
  maxBooks: 3,
};

const FALLBACK_BOOK_IMAGE =
  "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80";

/* =========================================================
   LOCAL STORAGE HELPERS
========================================================= */

const readStorage = (key, fallback = []) => {
  try {
    const value = localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    const parsed = JSON.parse(value);

    return parsed ?? fallback;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return fallback;
  }
};

const getLibrarySettings = () => {
  try {
    const storedSettings = localStorage.getItem("librarySettings");

    if (!storedSettings) {
      return DEFAULT_SETTINGS;
    }

    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(storedSettings),
    };
  } catch (error) {
    console.error("Error reading library settings:", error);

    return DEFAULT_SETTINGS;
  }
};

/* =========================================================
   BOOK HELPERS
========================================================= */

const getBookMergeKey = (book) => {
  return String(book?.bookId || book?.isbn || book?.id || book?.title || "")
    .trim()
    .toLowerCase();
};

const getBookId = (book) => {
  return book?.bookId || book?.isbn || book?.id || "";
};

const getBookTitle = (book) => {
  return book?.title || book?.name || "Untitled Book";
};

const getBookAuthor = (book) => {
  return book?.author || book?.authors || "Unknown Author";
};

const getBookCategory = (book) => {
  return book?.category || book?.genre || "General";
};

const getBookISBN = (book) => {
  return book?.isbn || book?.ISBN || book?.isbn13 || "";
};

const getBookImage = (book) => {
  return (
    book?.image ||
    book?.coverImage ||
    book?.thumbnail ||
    book?.imageUrl ||
    FALLBACK_BOOK_IMAGE
  );
};

const getTotalQuantity = (book) => {
  const quantity = Number(
    book?.totalQuantity ??
      book?.quantity ??
      book?.totalBooks ??
      book?.copies ??
      1,
  );

  return Number.isFinite(quantity) ? Math.max(quantity, 0) : 0;
};

const getAvailableQuantity = (book) => {
  const explicitAvailable =
    book?.availableQuantity ?? book?.availableCopies ?? book?.availableBooks;

  if (explicitAvailable !== undefined && explicitAvailable !== null) {
    const value = Number(explicitAvailable);

    return Number.isFinite(value) ? Math.max(value, 0) : 0;
  }

  const total = getTotalQuantity(book);

  const issued = Number(
    book?.issuedQuantity ?? book?.issuedCopies ?? book?.issuedBooks ?? 0,
  );

  if (!Number.isFinite(issued)) {
    return total;
  }

  return Math.max(total - issued, 0);
};

const isBookAvailable = (book) => {
  return getAvailableQuantity(book) > 0;
};

/* =========================================================
   MERGE LOCAL + FIREBASE
========================================================= */

const mergeBooks = (localBooks, firebaseBooks) => {
  const merged = [...localBooks];

  firebaseBooks.forEach((firebaseBook) => {
    const firebaseKey = getBookMergeKey(firebaseBook);

    if (!firebaseKey) {
      return;
    }

    const existingIndex = merged.findIndex(
      (localBook) => getBookMergeKey(localBook) === firebaseKey,
    );

    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...firebaseBook,

        firestoreId: firebaseBook.id || merged[existingIndex].firestoreId || "",

        firebaseId: firebaseBook.id || merged[existingIndex].firebaseId || "",
      };
    } else {
      merged.push({
        ...firebaseBook,

        firestoreId: firebaseBook.id || "",

        firebaseId: firebaseBook.id || "",
      });
    }
  });

  return merged;
};

/* =========================================================
   STUDENT HELPERS
========================================================= */

const getStudentName = (student) => {
  if (!student) {
    return "Student";
  }

  return (
    student.name ||
    student.fullName ||
    student.studentName ||
    `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
    "Student"
  );
};

const getStudentLibraryId = (student) => {
  return (
    student?.libraryId ||
    student?.libraryID ||
    student?.studentId ||
    student?.id ||
    ""
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const StudentBooks = () => {
  const navigate = useNavigate();

  /* -------------------------------------------------------
     INITIAL STATE
  ------------------------------------------------------- */

  const [student] = useState(() => readStorage("studentUser", null));

  const [books, setBooks] = useState(() => readStorage("books", []));

  const [librarySettings, setLibrarySettings] = useState(() =>
    getLibrarySettings(),
  );

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("All");

  const [availabilityFilter, setAvailabilityFilter] = useState("All");

  const [showFilters, setShowFilters] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /* =======================================================
     FIREBASE BOOK SYNC
  ======================================================= */

  const syncBooksFromFirebase = async () => {
    setError("");

    try {
      const firebaseBooks = await getBooksFromFirestore();

      const localBooks = readStorage("books", []);

      const mergedBooks = mergeBooks(localBooks, firebaseBooks);

      setBooks(mergedBooks);

      localStorage.setItem("books", JSON.stringify(mergedBooks));
    } catch (firebaseError) {
      console.error("Firebase books sync error:", firebaseError);

      /*
       * Firebase fail hone par local books use honge.
       * Isse student page blank nahi hoga.
       */
      const localBooks = readStorage("books", []);

      setBooks(localBooks);

      setError(
        "Latest books could not be loaded from Firebase. Showing saved books.",
      );
    }
  };

  /* =======================================================
     INITIAL FIREBASE LOAD
  ======================================================= */

  useEffect(() => {
    let active = true;

    const loadBooks = async () => {
      /*
       * await ke baad state update hone ki wajah se
       * synchronous setState-in-effect error avoid hota hai.
       */

      setLoading(true);

      try {
        const firebaseBooks = await getBooksFromFirestore();

        if (!active) {
          return;
        }

        const localBooks = readStorage("books", []);

        const mergedBooks = mergeBooks(localBooks, firebaseBooks);

        setBooks(mergedBooks);

        localStorage.setItem("books", JSON.stringify(mergedBooks));

        setError("");
      } catch (firebaseError) {
        console.error("Error loading Firebase books:", firebaseError);

        if (!active) {
          return;
        }

        const localBooks = readStorage("books", []);

        setBooks(localBooks);

        setError("Firebase books could not be loaded. Showing saved books.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadBooks();

    return () => {
      active = false;
    };
  }, []);

  /* =======================================================
     AUTH CHECK
  ======================================================= */

  useEffect(() => {
    if (!student) {
      navigate("/student-login", {
        replace: true,
      });
    }
  }, [student, navigate]);

  /* =======================================================
     LIBRARY SETTINGS EVENTS
  ======================================================= */

  useEffect(() => {
    const handleSettingsUpdate = () => {
      const latestSettings = getLibrarySettings();

      setLibrarySettings(latestSettings);
    };

    window.addEventListener("librarySettingsUpdated", handleSettingsUpdate);

    window.addEventListener("storage", handleSettingsUpdate);

    return () => {
      window.removeEventListener(
        "librarySettingsUpdated",
        handleSettingsUpdate,
      );

      window.removeEventListener("storage", handleSettingsUpdate);
    };
  }, []);

  /* =======================================================
     LIBRARY DATA EVENTS
  ======================================================= */

  useEffect(() => {
    const handleLibraryDataUpdate = () => {
      const latestBooks = readStorage("books", []);

      setBooks(latestBooks);
    };

    window.addEventListener("libraryDataUpdated", handleLibraryDataUpdate);

    window.addEventListener("storage", handleLibraryDataUpdate);

    return () => {
      window.removeEventListener("libraryDataUpdated", handleLibraryDataUpdate);

      window.removeEventListener("storage", handleLibraryDataUpdate);
    };
  }, []);

  /* =======================================================
     CATEGORIES
  ======================================================= */

  const categories = useMemo(() => {
    const categorySet = new Set();

    books.forEach((book) => {
      const category = getBookCategory(book);

      if (category) {
        categorySet.add(category);
      }
    });

    return [
      "All",
      ...Array.from(categorySet).sort((a, b) =>
        String(a).localeCompare(String(b)),
      ),
    ];
  }, [books]);

  /* =======================================================
     FILTERED BOOKS
  ======================================================= */

  const filteredBooks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return books.filter((book) => {
      const title = getBookTitle(book).toLowerCase();

      const author = String(getBookAuthor(book)).toLowerCase();

      const category = String(getBookCategory(book)).toLowerCase();

      const isbn = String(getBookISBN(book)).toLowerCase();

      const bookId = String(getBookId(book)).toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        title.includes(normalizedSearch) ||
        author.includes(normalizedSearch) ||
        category.includes(normalizedSearch) ||
        isbn.includes(normalizedSearch) ||
        bookId.includes(normalizedSearch);

      const matchesCategory =
        selectedCategory === "All" ||
        String(getBookCategory(book)).toLowerCase() ===
          String(selectedCategory).toLowerCase();

      const available = isBookAvailable(book);

      const matchesAvailability =
        availabilityFilter === "All" ||
        (availabilityFilter === "Available" && available) ||
        (availabilityFilter === "Unavailable" && !available);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [books, searchTerm, selectedCategory, availabilityFilter]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics = useMemo(() => {
    const totalBooks = books.length;

    const availableBooks = books.filter((book) => isBookAvailable(book)).length;

    const unavailableBooks = books.filter(
      (book) => !isBookAvailable(book),
    ).length;

    const categoryCount = categories.length > 0 ? categories.length - 1 : 0;

    return {
      totalBooks,
      availableBooks,
      unavailableBooks,
      categoryCount,
    };
  }, [books, categories]);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = async () => {
    setLoading(true);

    await syncBooksFromFirebase();

    setLoading(false);
  };

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setAvailabilityFilter("All");
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedCategory !== "All" ||
    availabilityFilter !== "All";

  /* =======================================================
     AUTH FALLBACK
  ======================================================= */

  if (!student) {
    return null;
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          {/* Logo / Library Name */}

          <Link
            to="/student-dashboard"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Library size={23} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {librarySettings.libraryName}
              </h1>

              <p className="truncate text-xs text-slate-500 sm:text-sm">
                {librarySettings.institutionName}
              </p>
            </div>
          </Link>

          {/* Right Side */}

          <div className="flex items-center gap-2">
            <Link
              to="/student-dashboard"
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:flex"
            >
              <ArrowLeft size={17} />
              Dashboard
            </Link>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <User size={16} />
              </div>

              <div className="hidden max-w-32 sm:block">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {getStudentName(student)}
                </p>

                <p className="truncate text-[11px] text-slate-500">
                  {getStudentLibraryId(student)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================
          MAIN
      =================================================== */}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Page Heading */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <Link
                to="/student-dashboard"
                className="transition hover:text-indigo-600"
              >
                Dashboard
              </Link>

              <ChevronRight size={15} />

              <span className="text-slate-700">Books</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Library Books
            </h2>

            <p className="mt-1 max-w-2xl text-sm text-slate-500 sm:text-base">
              Search and explore books available in the library.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />

            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* =================================================
            FIREBASE / ERROR MESSAGE
        ================================================= */}

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 rounded-md p-1 hover:bg-amber-100"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* =================================================
            STAT CARDS
        ================================================= */}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Total */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <BookOpen size={18} />
              </div>

              <span className="text-xs font-medium text-slate-400">Total</span>
            </div>

            <p className="text-2xl font-bold text-slate-900">
              {statistics.totalBooks}
            </p>

            <p className="mt-1 text-xs text-slate-500">Books</p>
          </div>

          {/* Available */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={18} />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Available
              </span>
            </div>

            <p className="text-2xl font-bold text-emerald-600">
              {statistics.availableBooks}
            </p>

            <p className="mt-1 text-xs text-slate-500">Books</p>
          </div>

          {/* Unavailable */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <BookMarked size={18} />
              </div>

              <span className="text-xs font-medium text-slate-400">Issued</span>
            </div>

            <p className="text-2xl font-bold text-rose-600">
              {statistics.unavailableBooks}
            </p>

            <p className="mt-1 text-xs text-slate-500">Currently unavailable</p>
          </div>

          {/* Categories */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Library size={18} />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Categories
              </span>
            </div>

            <p className="text-2xl font-bold text-violet-600">
              {statistics.categoryCount}
            </p>

            <p className="mt-1 text-xs text-slate-500">Book categories</p>
          </div>
        </div>

        {/* =================================================
            SEARCH + FILTER
        ================================================= */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            {/* Search */}

            <div className="relative flex-1">
              <Search
                size={19}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by title, author, category, ISBN or Book ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                >
                  <X size={17} />
                </button>
              )}
            </div>

            {/* Filter button */}

            <button
              type="button"
              onClick={() => setShowFilters((previous) => !previous)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition ${
                showFilters || hasActiveFilters
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal size={18} />
              Filters
              {hasActiveFilters && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Filters */}

          {showFilters && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Category */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Category
                  </label>

                  <select
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Availability */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Availability
                  </label>

                  <select
                    value={availabilityFilter}
                    onChange={(event) =>
                      setAvailabilityFilter(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                  >
                    <option value="All">All Books</option>

                    <option value="Available">Available</option>

                    <option value="Unavailable">Currently Issued</option>
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <X size={15} />
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================
            RESULT HEADER
        ================================================= */}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {filteredBooks.length}{" "}
              {filteredBooks.length === 1 ? "book" : "books"} found
            </p>

            {hasActiveFilters && (
              <p className="mt-0.5 text-xs text-slate-500">
                Filtered from {books.length} total books
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter size={14} />

            <span>
              Max active books:{" "}
              <strong className="text-slate-700">
                {librarySettings.maxBooks}
              </strong>
            </span>

            <span className="hidden text-slate-300 sm:inline">|</span>

            <span className="hidden sm:inline">
              Fine:{" "}
              <strong className="text-slate-700">
                ₹{librarySettings.finePerDay}
                /day
              </strong>
            </span>
          </div>
        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading && books.length === 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({
              length: 8,
            }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="h-64 animate-pulse bg-slate-200" />

                <div className="space-y-3 p-4">
                  <div className="h-5 animate-pulse rounded bg-slate-200" />

                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />

                  <div className="h-10 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          /* =================================================
             EMPTY STATE
          ================================================= */

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BookOpen size={30} />
            </div>

            <h3 className="text-lg font-bold text-slate-900">No books found</h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {hasActiveFilters
                ? "Try changing your search or filters to find more books."
                : "There are currently no books available in the library."}
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          /* =================================================
             BOOK GRID
          ================================================= */

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBooks.map((book, index) => {
              const bookId = getBookId(book);

              const title = getBookTitle(book);

              const author = getBookAuthor(book);

              const category = getBookCategory(book);

              const isbn = getBookISBN(book);

              const image = getBookImage(book);

              const total = getTotalQuantity(book);

              const available = getAvailableQuantity(book);

              const availableNow = available > 0;

              return (
                <article
                  key={book.firestoreId || book.firebaseId || bookId || index}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-100 hover:shadow-xl"
                >
                  {/* Book Image */}

                  <Link
                    to={`/student-book/${encodeURIComponent(bookId)}`}
                    className="relative block overflow-hidden bg-slate-100"
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={image}
                        alt={title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        onError={(event) => {
                          if (event.currentTarget.src !== FALLBACK_BOOK_IMAGE) {
                            event.currentTarget.src = FALLBACK_BOOK_IMAGE;
                          }
                        }}
                      />
                    </div>

                    {/* Availability Badge */}

                    <div className="absolute left-3 top-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur ${
                          availableNow
                            ? "bg-emerald-100/95 text-emerald-700"
                            : "bg-rose-100/95 text-rose-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            availableNow ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />

                        {availableNow ? "Available" : "Issued"}
                      </span>
                    </div>

                    {/* Category */}

                    <div className="absolute right-3 top-3">
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
                        {category}
                      </span>
                    </div>
                  </Link>

                  {/* Book Details */}

                  <div className="flex flex-1 flex-col p-4">
                    <Link
                      to={`/student-book/${encodeURIComponent(bookId)}`}
                      className="line-clamp-2 text-base font-bold leading-6 text-slate-900 transition hover:text-indigo-600"
                    >
                      {title}
                    </Link>

                    <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                      by {author}
                    </p>

                    {/* Quantity */}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Available
                        </p>

                        <p
                          className={`mt-0.5 text-sm font-bold ${
                            availableNow ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {available}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Total
                        </p>

                        <p className="mt-0.5 text-sm font-bold text-slate-700">
                          {total}
                        </p>
                      </div>
                    </div>

                    {/* ISBN */}

                    {isbn && (
                      <p className="mt-3 truncate text-xs text-slate-400">
                        ISBN: {isbn}
                      </p>
                    )}

                    {/* Action */}

                    <div className="mt-auto pt-4">
                      <Link
                        to={`/student-book/${encodeURIComponent(bookId)}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                      >
                        View Details
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* =================================================
            INFORMATION SECTION
        ================================================= */}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <BookOpen size={19} />
            </div>

            <h3 className="font-bold text-slate-900">Issue Limit</h3>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              You can have up to <strong>{librarySettings.maxBooks}</strong>{" "}
              active books at one time.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <BookMarked size={19} />
            </div>

            <h3 className="font-bold text-slate-900">Late Return Fine</h3>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Late returns may have a fine of{" "}
              <strong>₹{librarySettings.finePerDay}</strong> per day according
              to library settings.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={19} />
            </div>

            <h3 className="font-bold text-slate-900">Need a Book?</h3>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Contact the librarian if you need help finding or issuing a book.
            </p>
          </div>
        </div>
      </main>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-center text-xs text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:text-left">
          <p>
            © {new Date().getFullYear()} {librarySettings.libraryName}
          </p>

          <p>{librarySettings.institutionName}</p>
        </div>
      </footer>
    </div>
  );
};

export default StudentBooks;
