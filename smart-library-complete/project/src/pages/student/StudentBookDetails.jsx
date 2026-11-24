import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Hash,
  Library,
  Mail,
  UserRound,
  AlertCircle,
  BookMarked,
  Info,
  RefreshCw,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getBookByBookId } from "../../firebase/bookService";

/* =====================================================
   DEFAULT LIBRARY SETTINGS
===================================================== */

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

/* =====================================================
   GET LIBRARY SETTINGS
===================================================== */

const getLibrarySettings = () => {
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
  } catch (error) {
    console.error("Error reading library settings:", error);

    return DEFAULT_LIBRARY_SETTINGS;
  }
};

/* =====================================================
   GET LOCAL BOOKS
===================================================== */

const getBooks = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("books") || "[]");

    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error("Error reading local books:", error);

    return [];
  }
};

/* =====================================================
   GET STUDENT USER
===================================================== */

const getStudentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("studentUser") || "null");
  } catch (error) {
    console.error("Error reading student user:", error);

    return null;
  }
};

/* =====================================================
   BOOK ID HELPERS
===================================================== */

const getBookId = (book) => {
  return String(book?.bookId || book?.id || book?.isbn || "");
};

/* =====================================================
   GET AVAILABLE QUANTITY
===================================================== */

const getAvailableQuantity = (book) => {
  if (
    book?.availableQuantity !== undefined &&
    book?.availableQuantity !== null
  ) {
    return Math.max(0, Number(book.availableQuantity) || 0);
  }

  if (book?.availableCopies !== undefined && book?.availableCopies !== null) {
    return Math.max(0, Number(book.availableCopies) || 0);
  }

  if (book?.quantity !== undefined && book?.issuedQuantity !== undefined) {
    return Math.max(
      0,
      Number(book.quantity || 0) - Number(book.issuedQuantity || 0),
    );
  }

  if (book?.totalQuantity !== undefined && book?.issuedQuantity !== undefined) {
    return Math.max(
      0,
      Number(book.totalQuantity || 0) - Number(book.issuedQuantity || 0),
    );
  }

  if (book?.quantity !== undefined) {
    return Math.max(0, Number(book.quantity) || 0);
  }

  if (book?.totalQuantity !== undefined) {
    return Math.max(0, Number(book.totalQuantity) || 0);
  }

  if (book?.available === true) {
    return 1;
  }

  return 0;
};

/* =====================================================
   FIND LOCAL BOOK
===================================================== */

const findLocalBook = (books, routeBookId) => {
  if (!Array.isArray(books)) {
    return null;
  }

  return (
    books.find((item) => {
      const itemId = getBookId(item);

      return String(itemId) === String(routeBookId);
    }) || null
  );
};

/* =====================================================
   MERGE FIREBASE BOOK WITH LOCAL BOOK
===================================================== */

const mergeBookData = (localBook, firebaseBook) => {
  if (!firebaseBook) {
    return localBook;
  }

  return {
    ...(localBook || {}),
    ...firebaseBook,

    firestoreId: firebaseBook.id || localBook?.firestoreId || "",

    firebaseId: firebaseBook.id || localBook?.firebaseId || "",
  };
};

/* =====================================================
   COMPONENT
===================================================== */

const StudentBookDetails = () => {
  const navigate = useNavigate();
  const params = useParams();

  const routeBookId = params.bookId || params.id || params.bookID || "";

  /* ===================================================
     STATE
  =================================================== */

  const [settings, setSettings] = useState(() => getLibrarySettings());

  const [books, setBooks] = useState(() => getBooks());

  const [student] = useState(() => getStudentUser());

  const [firebaseLoading, setFirebaseLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [firebaseError, setFirebaseError] = useState("");

  /* ===================================================
     LOGIN CHECK
  =================================================== */

  useEffect(() => {
    const currentStudent = getStudentUser();

    if (!currentStudent) {
      navigate("/student-login", {
        replace: true,
      });
    }
  }, [navigate]);

  /* ===================================================
     LOAD BOOK FROM FIREBASE
  =================================================== */

  useEffect(() => {
    let cancelled = false;

    const loadFirebaseBook = async () => {
      if (!routeBookId) {
        return;
      }

      try {
        const firebaseBook = await getBookByBookId(routeBookId);

        if (cancelled) {
          return;
        }

        if (firebaseBook) {
          const localBooks = getBooks();

          const localBook = findLocalBook(localBooks, routeBookId);

          const mergedBook = mergeBookData(localBook, firebaseBook);

          const updatedBooks = localBooks.map((item) => {
            if (String(getBookId(item)) === String(routeBookId)) {
              return mergedBook;
            }

            return item;
          });

          const existsLocally = localBooks.some(
            (item) => String(getBookId(item)) === String(routeBookId),
          );

          if (!existsLocally) {
            updatedBooks.push(mergedBook);
          }

          setBooks(updatedBooks);

          localStorage.setItem("books", JSON.stringify(updatedBooks));

          setFirebaseError("");
        } else {
          /*
           * Firebase mein book nahi mili.
           * Local book agar available hai to use karenge.
           */
          const localBooks = getBooks();

          setBooks(localBooks);

          const localBook = findLocalBook(localBooks, routeBookId);

          if (!localBook) {
            setFirebaseError(
              "This book was not found in the Firebase library database.",
            );
          }
        }
      } catch (error) {
        console.error("Firebase book details error:", error);

        if (cancelled) {
          return;
        }

        /*
         * Firebase fail hone par
         * localStorage fallback.
         */
        setBooks(getBooks());

        setFirebaseError(
          "Unable to load the latest book information from Firebase. Showing saved library data.",
        );
      }
    };

    loadFirebaseBook();

    return () => {
      cancelled = true;
    };
  }, [routeBookId]);

  /* ===================================================
     SETTINGS + LOCAL DATA EVENTS
  =================================================== */

  useEffect(() => {
    const handleDataUpdate = () => {
      setSettings(getLibrarySettings());

      setBooks(getBooks());
    };

    const handleSettingsUpdate = () => {
      setSettings(getLibrarySettings());
    };

    const handleBooksUpdate = () => {
      setBooks(getBooks());
    };

    window.addEventListener("storage", handleDataUpdate);

    window.addEventListener("libraryDataUpdated", handleBooksUpdate);

    window.addEventListener("librarySettingsUpdated", handleSettingsUpdate);

    return () => {
      window.removeEventListener("storage", handleDataUpdate);

      window.removeEventListener("libraryDataUpdated", handleBooksUpdate);

      window.removeEventListener(
        "librarySettingsUpdated",
        handleSettingsUpdate,
      );
    };
  }, []);

  /* ===================================================
     FIND CURRENT BOOK
  =================================================== */

  const book = findLocalBook(books, routeBookId);

  /* ===================================================
     REFRESH BUTTON
  =================================================== */

  const handleRefresh = async () => {
    setRefreshing(true);
    setFirebaseLoading(true);
    setFirebaseError("");

    try {
      const latestSettings = getLibrarySettings();

      setSettings(latestSettings);

      const firebaseBook = await getBookByBookId(routeBookId);

      if (firebaseBook) {
        const localBooks = getBooks();

        const localBook = findLocalBook(localBooks, routeBookId);

        const mergedBook = mergeBookData(localBook, firebaseBook);

        const updatedBooks = localBooks.map((item) => {
          if (String(getBookId(item)) === String(routeBookId)) {
            return mergedBook;
          }

          return item;
        });

        const exists = localBooks.some(
          (item) => String(getBookId(item)) === String(routeBookId),
        );

        if (!exists) {
          updatedBooks.push(mergedBook);
        }

        setBooks(updatedBooks);

        localStorage.setItem("books", JSON.stringify(updatedBooks));
      } else {
        setBooks(getBooks());

        setFirebaseError("This book was not found in Firebase.");
      }
    } catch (error) {
      console.error("Refresh book error:", error);

      setBooks(getBooks());

      setFirebaseError("Could not refresh book information from Firebase.");
    } finally {
      setFirebaseLoading(false);

      window.setTimeout(() => {
        setRefreshing(false);
      }, 400);
    }
  };

  /* ===================================================
     BOOK NOT FOUND
  =================================================== */

  if (!book) {
    return (
      <div className="min-h-screen bg-slate-100">
        {/* HEADER */}

        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => navigate("/student-books")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <BookOpen className="h-5 w-5 text-indigo-600" />
            </div>

            <div>
              <h1 className="font-black text-slate-900">Book Details</h1>

              <p className="text-xs text-slate-500">{settings.libraryName}</p>
            </div>
          </div>
        </header>

        {/* MAIN */}

        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              Book Not Found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              The selected book could not be found in the current library
              records.
            </p>

            {firebaseLoading && (
              <p className="mt-3 text-xs font-semibold text-indigo-600">
                Checking Firebase library...
              </p>
            )}

            {firebaseError && (
              <div className="mx-auto mt-4 max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs leading-5 text-amber-800">
                {firebaseError}
              </div>
            )}

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing || firebaseLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />

                {firebaseLoading ? "Checking..." : "Refresh"}
              </button>

              <Link
                to="/student-books"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700"
              >
                Back to Books
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ===================================================
     BOOK DATA
  =================================================== */

  const title = book?.title || book?.name || "Untitled Book";

  const author = book?.author || "Author information unavailable";

  const category = book?.category || "General";

  const isbn = book?.isbn || "Not available";

  const description =
    book?.description || "No description has been added for this book yet.";

  const bookId = getBookId(book);

  const availableQuantity = getAvailableQuantity(book);

  const totalQuantity = Math.max(
    Number(book?.quantity || book?.totalQuantity || availableQuantity) || 0,
    availableQuantity,
  );

  const issuedQuantity = Math.max(0, totalQuantity - availableQuantity);

  const isAvailable = availableQuantity > 0;

  const image =
    book?.image ||
    book?.thumbnail ||
    book?.cover ||
    book?.coverImage ||
    book?.imageUrl ||
    "";

  /* ===================================================
     STATUS
  =================================================== */

  let statusText = "Unavailable";

  let statusClasses = "bg-red-100 text-red-700";

  if (isAvailable) {
    statusText = "Available";

    statusClasses = "bg-emerald-100 text-emerald-700";
  }

  /* ===================================================
     STUDENT INFO
  =================================================== */

  const studentName =
    student?.name || student?.fullName || student?.studentName || "Student";

  const studentLibraryId =
    student?.libraryId ||
    student?.studentLibraryId ||
    student?.studentId ||
    student?.id ||
    "—";

  /* ===================================================
     RENDER
  =================================================== */

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
              onClick={() => navigate("/student-books")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              title="Back to books"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
              <BookOpen className="h-5 w-5 text-indigo-600" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black text-slate-900">
                Book Details
              </h1>

              <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">
                {settings.libraryName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Firebase Status */}

            {firebaseLoading && (
              <span className="hidden items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-600 sm:flex">
                <RefreshCw size={13} className="animate-spin" />
                Syncing
              </span>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || firebaseLoading}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              title="Refresh book"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>

            <Link
              to="/student-books"
              className="hidden rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700 sm:block"
            >
              Browse Books
            </Link>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* =================================================
            FIREBASE ERROR
        ================================================= */}

        {firebaseError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <p className="leading-6">{firebaseError}</p>
          </div>
        )}

        {/* =================================================
            BREADCRUMB
        ================================================= */}

        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
          <Link to="/student-dashboard" className="hover:text-indigo-600">
            Dashboard
          </Link>

          <span>/</span>

          <Link to="/student-books" className="hover:text-indigo-600">
            Books
          </Link>

          <span>/</span>

          <span className="max-w-[220px] truncate text-slate-600">{title}</span>
        </div>

        {/* =================================================
            BOOK HERO
        ================================================= */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[380px_1fr]">
            {/* =================================================
                BOOK IMAGE
            ================================================= */}

            <div className="flex min-h-[360px] items-center justify-center bg-slate-100 p-6 sm:p-8 lg:min-h-[520px]">
              {image ? (
                <img
                  src={image}
                  alt={title}
                  className="max-h-[430px] w-full max-w-[310px] rounded-2xl object-contain shadow-lg"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";

                    const fallback =
                      event.currentTarget.parentElement?.querySelector(
                        "[data-book-fallback]",
                      );

                    if (fallback) {
                      fallback.classList.remove("hidden");
                    }
                  }}
                />
              ) : null}

              <div
                data-book-fallback
                className={`${
                  image ? "hidden" : "flex"
                } h-[360px] w-full max-w-[300px] flex-col items-center justify-center rounded-2xl bg-white shadow-lg`}
              >
                <BookOpen className="h-20 w-20 text-indigo-300" />

                <p className="mt-4 px-6 text-center text-sm font-black text-slate-500">
                  {title}
                </p>
              </div>
            </div>

            {/* =================================================
                BOOK INFORMATION
            ================================================= */}

            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${statusClasses}`}
                >
                  {statusText}
                </span>

                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">
                  {category}
                </span>

                {/* Firebase badge */}

                {book?.firestoreId || book?.firebaseId ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                    Firebase Synced
                  </span>
                ) : null}
              </div>

              <h2 className="mt-5 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                {title}
              </h2>

              <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-500">
                <UserRound className="h-4 w-4 text-indigo-500" />

                <span>
                  Written by <span className="text-slate-800">{author}</span>
                </span>
              </div>

              {/* Description */}

              <div className="mt-7 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">
                  About this book
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {description}
                </p>
              </div>

              {/* =================================================
                  BOOK META
              ================================================= */}

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-indigo-500" />

                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Book ID
                    </span>
                  </div>

                  <p className="mt-2 break-all text-sm font-black text-slate-800">
                    {bookId || "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-4 w-4 text-indigo-500" />

                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      ISBN
                    </span>
                  </div>

                  <p className="mt-2 break-all text-sm font-black text-slate-800">
                    {isbn}
                  </p>
                </div>
              </div>

              {/* =================================================
                  AVAILABILITY
              ================================================= */}

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                    Available
                  </p>

                  <p className="mt-1 text-2xl font-black text-emerald-700">
                    {availableQuantity}
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                    Issued
                  </p>

                  <p className="mt-1 text-2xl font-black text-orange-700">
                    {issuedQuantity}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Total Copies
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-800">
                    {totalQuantity}
                  </p>
                </div>
              </div>

              {/* =================================================
                  ISSUE INFORMATION
              ================================================= */}

              <div
                className={`mt-6 rounded-2xl border p-5 ${
                  isAvailable
                    ? "border-indigo-100 bg-indigo-50"
                    : "border-red-100 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {isAvailable ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  )}

                  <div>
                    <h3
                      className={`text-sm font-black ${
                        isAvailable ? "text-indigo-900" : "text-red-900"
                      }`}
                    >
                      {isAvailable
                        ? "This book is currently available"
                        : "This book is currently unavailable"}
                    </h3>

                    <p
                      className={`mt-1 text-xs leading-6 ${
                        isAvailable ? "text-indigo-700" : "text-red-700"
                      }`}
                    >
                      {isAvailable
                        ? `A librarian can issue this book to you. The standard issue duration is ${settings.issueDuration} days.`
                        : "All available copies are currently issued. Please check again later or contact the library."}
                    </p>
                  </div>
                </div>
              </div>

              {/* =================================================
                  STUDENT INFO
              ================================================= */}

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <UserRound className="h-5 w-5 text-slate-600" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Logged in as
                    </p>

                    <p className="mt-1 truncate text-sm font-black text-slate-900">
                      {studentName}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Library ID: {studentLibraryId}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            LIBRARY RULES
        ================================================= */}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {/* Issue Duration */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100">
              <CalendarDays className="h-5 w-5 text-indigo-600" />
            </div>

            <h3 className="mt-4 font-black text-slate-900">Issue Duration</h3>

            <p className="mt-1 text-sm text-slate-500">
              Books can normally be issued for
              <span className="font-black text-slate-800">
                {" "}
                {settings.issueDuration} days
              </span>
              .
            </p>
          </div>

          {/* Fine */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100">
              <Clock3 className="h-5 w-5 text-orange-600" />
            </div>

            <h3 className="mt-4 font-black text-slate-900">Late Return</h3>

            <p className="mt-1 text-sm text-slate-500">
              Late returns may be charged{" "}
              <span className="font-black text-slate-800">
                ₹{settings.finePerDay}
                /day
              </span>
              .
            </p>
          </div>

          {/* Limit */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100">
              <BookOpen className="h-5 w-5 text-emerald-600" />
            </div>

            <h3 className="mt-4 font-black text-slate-900">Borrowing Limit</h3>

            <p className="mt-1 text-sm text-slate-500">
              Maximum active books allowed:
              <span className="font-black text-slate-800">
                {" "}
                {settings.maxBooks}
              </span>
              .
            </p>
          </div>
        </section>

        {/* =================================================
            IMPORTANT NOTE
        ================================================= */}

        <section className="mt-6 rounded-3xl border border-indigo-100 bg-indigo-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

            <div>
              <h3 className="text-sm font-black text-indigo-900">Important</h3>

              <p className="mt-1 text-sm leading-6 text-indigo-700">
                Students cannot directly issue books from this page. The
                librarian must verify the student and confirm the book issue
                from the librarian dashboard.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            CONTACT LIBRARY
        ================================================= */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100">
                <Library className="h-6 w-6 text-indigo-600" />
              </div>

              <div>
                <h3 className="font-black text-slate-900">
                  {settings.libraryName}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {settings.institutionName}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Librarian:{" "}
                  <span className="font-bold text-slate-600">
                    {settings.librarianName}
                  </span>
                </p>
              </div>
            </div>

            <a
              href={`mailto:${settings.libraryEmail}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              <Mail className="h-4 w-4" />
              Contact Library
            </a>
          </div>
        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="py-8 text-center">
          <p className="text-xs font-semibold text-slate-400">
            {settings.institutionName} • {settings.libraryName}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Smart Library Management System
          </p>

          <p className="mt-1 text-[10px] text-slate-400">
            Book details are synced with the library database
          </p>
        </footer>
      </main>
    </div>
  );
};

export default StudentBookDetails;
