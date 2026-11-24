import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock3,
  LibraryBig,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import QRScanner from "../../component/QRScanner";
import { findStudentFromQR } from "../../firebase/qrStudentService";
import { addIssueToFirestore } from "../../firebase/issueService";
import { updateBookInFirestore } from "../../firebase/bookService";

/* =====================================================
   DEFAULT LIBRARY SETTINGS
===================================================== */

const DEFAULT_SETTINGS = {
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
   READ LIBRARY SETTINGS
===================================================== */

const getLibrarySettings = () => {
  try {
    const savedSettings = localStorage.getItem("librarySettings");

    if (!savedSettings) {
      return DEFAULT_SETTINGS;
    }

    const parsedSettings = JSON.parse(savedSettings);

    return {
      ...DEFAULT_SETTINGS,
      ...parsedSettings,

      finePerDay:
        Number(parsedSettings?.finePerDay) >= 0
          ? Number(parsedSettings.finePerDay)
          : DEFAULT_SETTINGS.finePerDay,

      maxBooks:
        Number(parsedSettings?.maxBooks) >= 1
          ? Number(parsedSettings.maxBooks)
          : DEFAULT_SETTINGS.maxBooks,

      issueDuration:
        Number(parsedSettings?.issueDuration) >= 1
          ? Number(parsedSettings.issueDuration)
          : DEFAULT_SETTINGS.issueDuration,
    };
  } catch (error) {
    console.error("Error loading library settings:", error);

    return DEFAULT_SETTINGS;
  }
};

/* =====================================================
   DATE HELPERS
===================================================== */

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

const getDueDate = (issueDate, duration) => {
  const date = new Date(issueDate);

  if (Number.isNaN(date.getTime())) {
    return getToday();
  }

  date.setDate(date.getDate() + Number(duration || 14));

  return date.toISOString().split("T")[0];
};

const formatDate = (date) => {
  if (!date) return "N/A";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =====================================================
   LOCAL STORAGE
===================================================== */

const readStorage = (key) => {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

/* =====================================================
   STUDENT HELPERS
===================================================== */

const getStudentLibraryId = (student) => {
  return student?.libraryId || student?.studentId || student?.id || "";
};

const getIssueStudentId = (issue) => {
  return (
    issue?.studentLibraryId ||
    issue?.libraryId ||
    issue?.studentId ||
    issue?.student?.libraryId ||
    issue?.student?.studentId ||
    issue?.student?.id ||
    ""
  );
};

const getStudentName = (student) => {
  return (
    student?.name ||
    student?.fullName ||
    student?.studentName ||
    "Unknown Student"
  );
};

/* =====================================================
   BOOK HELPERS
===================================================== */

const getBookId = (book) => {
  return book?.bookId || book?.id || "";
};

const getIssueBookId = (issue) => {
  return issue?.bookId || issue?.book?.bookId || issue?.book?.id || "";
};

const getBookTitle = (book) => {
  return book?.title || book?.name || "Untitled Book";
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

const BookIssue = () => {
  const navigate = useNavigate();

  /* ===================================================
     LIBRARIAN
  =================================================== */

  const librarian = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("librarian") || "null");
    } catch {
      return null;
    }
  }, []);

  /* ===================================================
     LIBRARY SETTINGS
  =================================================== */

  const [librarySettings, setLibrarySettings] = useState(getLibrarySettings);

  const maxBooks = Number(librarySettings?.maxBooks || 3);

  const issueDuration = Number(librarySettings?.issueDuration || 14);

  const institutionName =
    librarySettings?.institutionName || "My College / University";

  const libraryName = librarySettings?.libraryName || "Central Library";

  /* ===================================================
     DATA
  =================================================== */

  const [students, setStudents] = useState(() => readStorage("students"));

  const [books, setBooks] = useState(() => readStorage("books"));

  const [issuedBooks, setIssuedBooks] = useState(() =>
    readStorage("issuedBooks"),
  );

  /* ===================================================
     SEARCH
  =================================================== */

  const [studentSearch, setStudentSearch] = useState("");

  const [bookSearch, setBookSearch] = useState("");

  /* ===================================================
     SELECTED DATA
  =================================================== */

  const [selectedStudent, setSelectedStudent] = useState(null);

  const [selectedBook, setSelectedBook] = useState(null);

  /* ===================================================
     DATES
  =================================================== */

  const [issueDate, setIssueDate] = useState(getToday());

  const [dueDate, setDueDate] = useState(() =>
    getDueDate(getToday(), issueDuration),
  );

  /* ===================================================
     UI STATES
  =================================================== */

  const [showStudentResults, setShowStudentResults] = useState(false);

  const [showBookResults, setShowBookResults] = useState(false);

  const [showScanner, setShowScanner] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [isIssuing, setIsIssuing] = useState(false);

  /* ===================================================
     AUTH CHECK
  =================================================== */

  useEffect(() => {
    if (!librarian) {
      navigate("/admin-login", {
        replace: true,
      });
    }
  }, [librarian, navigate]);

  /* ===================================================
     SETTINGS UPDATE
  =================================================== */

  useEffect(() => {
    const refreshSettings = () => {
      const settings = getLibrarySettings();

      setLibrarySettings(settings);

      setDueDate(getDueDate(issueDate, settings.issueDuration));
    };

    window.addEventListener("librarySettingsUpdated", refreshSettings);

    window.addEventListener("storage", refreshSettings);

    return () => {
      window.removeEventListener("librarySettingsUpdated", refreshSettings);

      window.removeEventListener("storage", refreshSettings);
    };
  }, [issueDate]);

  /* ===================================================
     REFRESH DATA
  =================================================== */

  useEffect(() => {
    const refreshData = () => {
      setStudents(readStorage("students"));
      setBooks(readStorage("books"));
      setIssuedBooks(readStorage("issuedBooks"));
    };

    window.addEventListener("storage", refreshData);

    window.addEventListener("libraryDataUpdated", refreshData);

    return () => {
      window.removeEventListener("storage", refreshData);

      window.removeEventListener("libraryDataUpdated", refreshData);
    };
  }, []);

  /* ===================================================
     ACTIVE ISSUES
  =================================================== */

  const activeIssues = useMemo(() => {
    return issuedBooks.filter((issue) => {
      const status = String(issue?.status || "").toLowerCase();

      return (
        status !== "returned" && status !== "return" && status !== "completed"
      );
    });
  }, [issuedBooks]);

  /* ===================================================
     STUDENT SEARCH
  =================================================== */

  const studentResults = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

    if (!query || selectedStudent) {
      return [];
    }

    return students
      .filter((student) => {
        const name = getStudentName(student).toLowerCase();

        const libraryId = String(getStudentLibraryId(student)).toLowerCase();

        const email = String(student?.email || "").toLowerCase();

        const phone = String(student?.phone || "").toLowerCase();

        return (
          name.includes(query) ||
          libraryId.includes(query) ||
          email.includes(query) ||
          phone.includes(query)
        );
      })
      .slice(0, 8);
  }, [students, studentSearch, selectedStudent]);

  /* ===================================================
     AVAILABLE BOOKS
  =================================================== */

  const availableBooks = useMemo(() => {
    return books.filter((book) => {
      const quantity = Number(book?.availableQuantity ?? book?.quantity ?? 0);

      return (
        book?.status !== "Unavailable" &&
        book?.available !== false &&
        quantity > 0
      );
    });
  }, [books]);

  /* ===================================================
     BOOK SEARCH
  =================================================== */

  const bookResults = useMemo(() => {
    const query = bookSearch.trim().toLowerCase();

    if (!query || selectedBook) {
      return [];
    }

    return availableBooks
      .filter((book) => {
        const title = getBookTitle(book).toLowerCase();

        const author = String(book?.author || "").toLowerCase();

        const id = String(getBookId(book)).toLowerCase();

        const category = String(book?.category || "").toLowerCase();

        return (
          title.includes(query) ||
          author.includes(query) ||
          id.includes(query) ||
          category.includes(query)
        );
      })
      .slice(0, 8);
  }, [availableBooks, bookSearch, selectedBook]);

  /* ===================================================
     SELECTED STUDENT ACTIVE BOOKS
  =================================================== */

  const selectedStudentActiveBooks = useMemo(() => {
    if (!selectedStudent) {
      return [];
    }

    const studentId = String(getStudentLibraryId(selectedStudent));

    return activeIssues.filter(
      (issue) => String(getIssueStudentId(issue)) === studentId,
    );
  }, [selectedStudent, activeIssues]);

  /* ===================================================
     DUPLICATE BOOK CHECK
  =================================================== */

  const alreadyHasSelectedBook = useMemo(() => {
    if (!selectedStudent || !selectedBook) {
      return false;
    }

    const studentId = String(getStudentLibraryId(selectedStudent));

    const bookId = String(getBookId(selectedBook));

    return activeIssues.some(
      (issue) =>
        String(getIssueStudentId(issue)) === studentId &&
        String(getIssueBookId(issue)) === bookId,
    );
  }, [selectedStudent, selectedBook, activeIssues]);

  /* ===================================================
     STUDENT SELECT
  =================================================== */

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);

    setStudentSearch(getStudentLibraryId(student));

    setShowStudentResults(false);
  };

  /* ===================================================
     BOOK SELECT
  =================================================== */

  const handleBookSelect = (book) => {
    setSelectedBook(book);

    setBookSearch(getBookTitle(book));

    setShowBookResults(false);
  };

  /* ===================================================
     CLEAR STUDENT
  =================================================== */

  const clearStudent = () => {
    setSelectedStudent(null);
    setStudentSearch("");
  };

  /* ===================================================
     CLEAR BOOK
  =================================================== */

  const clearBook = () => {
    setSelectedBook(null);
    setBookSearch("");
  };

  /* ===================================================
     ISSUE DATE CHANGE
  =================================================== */

  const handleIssueDateChange = (value) => {
    setIssueDate(value);

    setDueDate(getDueDate(value, issueDuration));
  };

  /* ===================================================
     QR SCAN
  =================================================== */

  const handleQRScan = async (decodedText) => {
    setShowScanner(false);

    if (!decodedText) {
      toast.error("QR code could not be read.");
      return;
    }

    try {
      toast.loading("Finding student...", {
        id: "qr-student-loading",
      });

      const firestoreStudent = await findStudentFromQR(decodedText);

      toast.dismiss("qr-student-loading");

      if (!firestoreStudent) {
        toast.error("Student not found in the library database.");
        return;
      }

      const currentStudents = readStorage("students");
      const libraryId = getStudentLibraryId(firestoreStudent);
      const existingIndex = currentStudents.findIndex(
        (student) =>
          String(getStudentLibraryId(student)).toLowerCase() ===
          String(libraryId).toLowerCase(),
      );

      const updatedStudents = [...currentStudents];

      if (existingIndex >= 0) {
        updatedStudents[existingIndex] = {
          ...updatedStudents[existingIndex],
          ...firestoreStudent,
        };
      } else {
        updatedStudents.push(firestoreStudent);
      }

      localStorage.setItem("students", JSON.stringify(updatedStudents));
      setStudents(updatedStudents);
      handleStudentSelect(firestoreStudent);

      toast.success(
        `${getStudentName(firestoreStudent)} selected successfully.`,
      );
    } catch (error) {
      console.error("QR student lookup error:", error);
      toast.dismiss("qr-student-loading");
      toast.error("Unable to find student. Please try again.");
    }
  };

  /* ===================================================
     OPEN CONFIRMATION
  =================================================== */

  const openConfirmation = () => {
    if (!selectedStudent) {
      toast.error("Please select a student.");

      return;
    }

    if (!selectedBook) {
      toast.error("Please select a book.");

      return;
    }

    if (selectedStudentActiveBooks.length >= maxBooks) {
      toast.error(`A student can have maximum ${maxBooks} active books.`);

      return;
    }

    if (alreadyHasSelectedBook) {
      toast.error("This student already has this book issued.");

      return;
    }

    if (!issueDate || !dueDate) {
      toast.error("Please select issue and due dates.");

      return;
    }

    if (new Date(dueDate) <= new Date(issueDate)) {
      toast.error("Due date must be after issue date.");

      return;
    }

    const availableQuantity = Number(
      selectedBook?.availableQuantity ?? selectedBook?.quantity ?? 0,
    );

    if (availableQuantity <= 0) {
      toast.error("This book is currently unavailable.");

      return;
    }

    setShowConfirmModal(true);
  };

  /* ===================================================
     CONFIRM ISSUE
  =================================================== */

  const handleConfirmIssue = async () => {
    if (isIssuing) {
      return;
    }

    setIsIssuing(true);

    try {
      const freshStudents = readStorage("students");

      const freshBooks = readStorage("books");

      const freshIssuedBooks = readStorage("issuedBooks");

      const studentId = String(getStudentLibraryId(selectedStudent));

      const bookId = String(getBookId(selectedBook));

      /* -----------------------------------------------
         FIND STUDENT
      ----------------------------------------------- */

      const studentIndex = freshStudents.findIndex(
        (student) => String(getStudentLibraryId(student)) === studentId,
      );

      if (studentIndex === -1) {
        toast.error("Student record could not be found.");

        setIsIssuing(false);

        return;
      }

      /* -----------------------------------------------
         FIND BOOK
      ----------------------------------------------- */

      const bookIndex = freshBooks.findIndex(
        (book) => String(getBookId(book)) === bookId,
      );

      if (bookIndex === -1) {
        toast.error("Book record could not be found.");

        setIsIssuing(false);

        return;
      }

      const currentBook = freshBooks[bookIndex];

      const availableQuantity = Number(
        currentBook?.availableQuantity ?? currentBook?.quantity ?? 0,
      );

      if (availableQuantity <= 0) {
        toast.error("Book is no longer available.");

        setShowConfirmModal(false);
        setIsIssuing(false);

        return;
      }

      /* -----------------------------------------------
         FRESH ACTIVE ISSUES
      ----------------------------------------------- */

      const currentActiveIssues = freshIssuedBooks.filter((issue) => {
        const status = String(issue?.status || "").toLowerCase();

        return (
          String(getIssueStudentId(issue)) === studentId &&
          status !== "returned" &&
          status !== "return" &&
          status !== "completed"
        );
      });

      /* -----------------------------------------------
         MAX BOOK CHECK
      ----------------------------------------------- */

      if (currentActiveIssues.length >= maxBooks) {
        toast.error(`Student already has ${maxBooks} active books.`);

        setShowConfirmModal(false);
        setIsIssuing(false);

        return;
      }

      /* -----------------------------------------------
         DUPLICATE CHECK
      ----------------------------------------------- */

      const duplicateIssue = currentActiveIssues.some(
        (issue) => String(getIssueBookId(issue)) === bookId,
      );

      if (duplicateIssue) {
        toast.error("This student already has this book issued.");

        setShowConfirmModal(false);
        setIsIssuing(false);

        return;
      }

      /* -----------------------------------------------
         IDs
      ----------------------------------------------- */

      const timestamp = Date.now();

      const now = new Date().toISOString();

      const issueId = `ISSUE-${timestamp}`;

      const receiptId = `REC-${timestamp}`;

      /* -----------------------------------------------
         LIBRARIAN
      ----------------------------------------------- */

      const librarianId =
        librarian?.librarianId ||
        librarian?.id ||
        librarian?.email ||
        "LIBRARIAN";

      const librarianName =
        librarian?.name ||
        librarian?.fullName ||
        librarian?.email ||
        "Librarian";

      /* -----------------------------------------------
         ISSUE RECORD
      ----------------------------------------------- */

      const issueRecord = {
        id: issueId,

        issueId,

        receiptId,

        studentId:
          selectedStudent?.studentId ||
          selectedStudent?.id ||
          selectedStudent?.libraryId,

        studentLibraryId:
          selectedStudent?.libraryId ||
          selectedStudent?.studentId ||
          selectedStudent?.id,

        studentName: getStudentName(selectedStudent),

        studentEmail: selectedStudent?.email || "",

        studentPhone: selectedStudent?.phone || "",

        bookId: currentBook?.bookId || currentBook?.id,

        bookTitle: getBookTitle(currentBook),

        bookAuthor: currentBook?.author || "",

        bookCategory: currentBook?.category || "",

        issueDate,

        dueDate,

        returnDate: "",

        status: "Issued",

        fine: 0,

        daysOverdue: 0,

        issuedBy: librarianId,

        issuedByName: librarianName,

        librarianId,

        librarianName,

        createdAt: now,

        updatedAt: now,
      };

      /* -----------------------------------------------
         UPDATE ISSUES
      ----------------------------------------------- */

      const updatedIssuedBooks = [...freshIssuedBooks, issueRecord];

      /* -----------------------------------------------
         UPDATE BOOK
      ----------------------------------------------- */

      const updatedBook = {
        ...currentBook,

        availableQuantity: Math.max(0, availableQuantity - 1),

        issuedQuantity: Number(currentBook?.issuedQuantity || 0) + 1,

        status: availableQuantity - 1 > 0 ? "Available" : "Unavailable",

        available: availableQuantity - 1 > 0,

        updatedAt: now,
      };

      const updatedBooks = [...freshBooks];

      updatedBooks[bookIndex] = updatedBook;

      /* -----------------------------------------------
         UPDATE STUDENT
      ----------------------------------------------- */

      const currentStudent = freshStudents[studentIndex];

      const updatedStudent = {
        ...currentStudent,

        issuedBooksCount: Number(currentStudent?.issuedBooksCount || 0) + 1,

        status: currentStudent?.status || "Active",

        updatedAt: now,
      };

      const updatedStudents = [...freshStudents];

      updatedStudents[studentIndex] = updatedStudent;

      /* -----------------------------------------------
         NOTIFICATION
      ----------------------------------------------- */

      const notifications = readStorage("notifications");

      const notification = {
        id: `NOTIF-${timestamp}`,

        studentId:
          selectedStudent?.libraryId ||
          selectedStudent?.studentId ||
          selectedStudent?.id,

        type: "issue",

        title: "Book Issued Successfully",

        message: `${getBookTitle(currentBook)} has been issued to you.`,

        bookId: currentBook?.bookId || currentBook?.id,

        issueId,

        receiptId,

        dueDate,

        read: false,

        createdAt: now,
      };

      const updatedNotifications = [notification, ...notifications];

      /* -----------------------------------------------
         SAVE EVERYTHING
      ----------------------------------------------- */

      localStorage.setItem("issuedBooks", JSON.stringify(updatedIssuedBooks));

      localStorage.setItem("books", JSON.stringify(updatedBooks));

      localStorage.setItem("students", JSON.stringify(updatedStudents));

      localStorage.setItem(
        "notifications",
        JSON.stringify(updatedNotifications),
      );

      /* -----------------------------------------------
         UPDATE UI
      ----------------------------------------------- */

      setIssuedBooks(updatedIssuedBooks);

      setBooks(updatedBooks);

      setStudents(updatedStudents);

      setShowConfirmModal(false);

      toast.success("Book issued successfully!");

      /* -----------------------------------------------
         FIREBASE SYNC
      ----------------------------------------------- */

      try {
        await addIssueToFirestore(issueRecord);

        const firestoreBookId =
          currentBook?.firestoreId ||
          currentBook?.firebaseId ||
          (currentBook?.id && !String(currentBook.id).startsWith("BOOK-")
            ? currentBook.id
            : "");

        if (firestoreBookId) {
          await updateBookInFirestore(firestoreBookId, updatedBook);
        }
      } catch (firebaseError) {
        console.error("Firebase sync error:", firebaseError);
        toast.error("Book issued, but Firebase sync failed.");
      }

      /* -----------------------------------------------
         REFRESH OTHER PAGES
      ----------------------------------------------- */

      window.dispatchEvent(new Event("libraryDataUpdated"));

      /* -----------------------------------------------
         GO TO RECEIPT
      ----------------------------------------------- */

      setTimeout(() => {
        navigate(`/receipt/${issueId}`);
      }, 500);
    } catch (error) {
      console.error("Book issue error:", error);

      toast.error("Unable to issue the book. Please try again.");

      setIsIssuing(false);
    }
  };

  /* ===================================================
     AUTH LOADING
  =================================================== */

  if (!librarian) {
    return null;
  }

  /* ===================================================
     UI
  =================================================== */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/admin-dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              {librarySettings?.logo ? (
                <img
                  src={librarySettings.logo}
                  alt={libraryName}
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <LibraryBig size={22} />
              )}
            </div>

            <div>
              <h1 className="text-sm font-extrabold text-slate-900 sm:text-base">
                {institutionName}
              </h1>

              <p className="text-xs text-slate-500">{libraryName}</p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 text-sm text-slate-600 sm:flex">
            <ShieldCheck size={18} className="text-emerald-600" />

            <span className="font-semibold">
              Librarian:{" "}
              {librarian?.name || librarian?.fullName || librarian?.email}
            </span>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* BACK */}

        <Link
          to="/admin-dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-600"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        {/* PAGE HEADING */}

        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <BookOpen size={25} />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Issue Book
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Verify the student and issue a book from the librarian
                dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            SECURITY BANNER
        ================================================= */}

        <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={21}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div>
              <p className="text-sm font-bold text-slate-900">
                Librarian-authorized issue
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                Students cannot issue books directly. Every book issue is
                recorded under the currently logged-in librarian.
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            CURRENT RULES
        ================================================= */}

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600">
                <BookOpen size={20} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-500">
                  Active Book Limit
                </p>

                <p className="mt-1 text-lg font-black text-indigo-900">
                  {maxBooks} Books
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600">
                <Clock3 size={20} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                  Issue Duration
                </p>

                <p className="mt-1 text-lg font-black text-blue-900">
                  {issueDuration} Days
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            GRID
        ================================================= */}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* =================================================
              LEFT
          ================================================= */}

          <div className="space-y-6">
            {/* =================================================
                STUDENT
            ================================================= */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    1. Select Student
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Scan the student's Digital Library ID or search manually.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700"
                >
                  <Search size={16} />
                  Scan QR
                </button>
              </div>

              {/* SEARCH */}

              <div className="relative">
                <Search
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={studentSearch}
                  onChange={(event) => {
                    setStudentSearch(event.target.value);

                    setSelectedStudent(null);

                    setShowStudentResults(true);
                  }}
                  onFocus={() => {
                    if (studentSearch) {
                      setShowStudentResults(true);
                    }
                  }}
                  placeholder="Search by Library ID, name, email or phone"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />

                {studentSearch && (
                  <button
                    type="button"
                    onClick={clearStudent}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={18} />
                  </button>
                )}

                {showStudentResults && studentResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {studentResults.map((student) => (
                      <button
                        key={getStudentLibraryId(student)}
                        type="button"
                        onClick={() => handleStudentSelect(student)}
                        className="flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition last:border-0 hover:bg-indigo-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-100 text-indigo-600">
                          {student?.photo || student?.image ? (
                            <img
                              src={student.photo || student.image}
                              alt={getStudentName(student)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User size={19} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {getStudentName(student)}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {getStudentLibraryId(student)}
                          </p>
                        </div>

                        <ChevronRight size={17} className="text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* SELECTED STUDENT */}

              {selectedStudent && (
                <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
                      {selectedStudent.photo || selectedStudent.image ? (
                        <img
                          src={selectedStudent.photo || selectedStudent.image}
                          alt={getStudentName(selectedStudent)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User size={25} className="text-indigo-600" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-extrabold text-slate-900">
                          {getStudentName(selectedStudent)}
                        </h4>

                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                          {selectedStudent.status || "Active"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-semibold text-indigo-700">
                        Library ID: {getStudentLibraryId(selectedStudent)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {selectedStudent.email || "No email"}
                      </p>

                      <p className="text-xs text-slate-500">
                        Active books:{" "}
                        <span className="font-bold">
                          {selectedStudentActiveBooks.length}
                        </span>{" "}
                        / {maxBooks}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={clearStudent}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {selectedStudentActiveBooks.length >= maxBooks && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <AlertTriangle
                        size={17}
                        className="mt-0.5 shrink-0 text-amber-600"
                      />

                      <p className="text-xs leading-5 text-amber-800">
                        This student has reached the maximum limit of {maxBooks}{" "}
                        active books.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* =================================================
                BOOK
            ================================================= */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5">
                <h3 className="text-lg font-extrabold text-slate-900">
                  2. Select Book
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Search by book title, author, category or Book ID.
                </p>
              </div>

              <div className="relative">
                <Search
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={bookSearch}
                  onChange={(event) => {
                    setBookSearch(event.target.value);

                    setSelectedBook(null);

                    setShowBookResults(true);
                  }}
                  onFocus={() => {
                    if (bookSearch) {
                      setShowBookResults(true);
                    }
                  }}
                  placeholder="Search available books..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />

                {bookSearch && (
                  <button
                    type="button"
                    onClick={clearBook}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={18} />
                  </button>
                )}

                {showBookResults && bookResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {bookResults.map((book) => {
                      const available = Number(
                        book?.availableQuantity ?? book?.quantity ?? 0,
                      );

                      return (
                        <button
                          key={getBookId(book)}
                          type="button"
                          onClick={() => handleBookSelect(book)}
                          className="flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition last:border-0 hover:bg-indigo-50"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                            <BookOpen size={20} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {getBookTitle(book)}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {book?.author || "Unknown Author"}
                            </p>

                            <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                              {available} available
                            </p>
                          </div>

                          <ChevronRight size={17} className="text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SELECTED BOOK */}

              {selectedBook && (
                <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
                      <BookOpen size={26} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-slate-900">
                        {getBookTitle(selectedBook)}
                      </h4>

                      <p className="mt-1 text-xs text-slate-500">
                        Author: {selectedBook.author || "Unknown"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Category: {selectedBook.category || "General"}
                      </p>

                      <p className="mt-1 text-xs font-bold text-emerald-600">
                        Available Copies:{" "}
                        {selectedBook.availableQuantity ??
                          selectedBook.quantity ??
                          0}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={clearBook}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {alreadyHasSelectedBook && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                      This student already has this book issued.
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* =================================================
                DATES
            ================================================= */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5">
                <h3 className="text-lg font-extrabold text-slate-900">
                  3. Issue Details
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Due date is automatically calculated from Library Settings.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* ISSUE DATE */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Issue Date
                  </label>

                  <div className="relative">
                    <CalendarDays
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="date"
                      value={issueDate}
                      onChange={(event) =>
                        handleIssueDateChange(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* DUE DATE */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Due Date
                  </label>

                  <div className="relative">
                    <CalendarDays
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      min={issueDate}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <Clock3 size={19} className="mt-0.5 shrink-0 text-blue-600" />

                <div>
                  <p className="text-sm font-bold text-blue-900">
                    Current issue duration: {issueDuration} days
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    This value comes from Library Settings. You can change it
                    from the Library Settings page.
                  </p>
                </div>
              </div>
            </section>

            {/* =================================================
                ISSUE BUTTON
            ================================================= */}

            <button
              type="button"
              onClick={openConfirmation}
              disabled={isIssuing || !selectedStudent || !selectedBook}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <CheckCircle size={20} />

              {isIssuing ? "Issuing Book..." : "Confirm & Issue Book"}
            </button>
          </div>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div className="space-y-6">
            {/* SUMMARY */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <ShieldCheck size={21} />
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900">
                    Issue Summary
                  </h3>

                  <p className="text-xs text-slate-500">
                    Verify before issuing
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Student
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {selectedStudent
                      ? getStudentName(selectedStudent)
                      : "Not selected"}
                  </p>

                  {selectedStudent && (
                    <p className="mt-1 text-xs text-indigo-600">
                      {getStudentLibraryId(selectedStudent)}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Book
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {selectedBook ? getBookTitle(selectedBook) : "Not selected"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Issue Date
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {formatDate(issueDate)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Due Date
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {formatDate(dueDate)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* RULES */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <ShieldCheck size={21} />
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900">
                    Current Library Rules
                  </h3>

                  <p className="text-xs text-slate-500">
                    From Library Settings
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <BookOpen size={18} className="mt-0.5 text-indigo-600" />

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Maximum {maxBooks} Active Books
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      A student can currently have up to {maxBooks} active
                      books.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <CalendarDays size={18} className="mt-0.5 text-blue-600" />

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {issueDuration} Days Issue Duration
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Due date is calculated automatically.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <ShieldCheck size={18} className="mt-0.5 text-emerald-600" />

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Librarian Approval
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Students cannot issue books directly.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* =================================================
          QR SCANNER
      ================================================= */}

      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* =================================================
          CONFIRMATION MODAL
      ================================================= */}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <CheckCircle size={22} />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Confirm Book Issue
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Please verify these details before issuing.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isIssuing}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Student
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {selectedStudent && getStudentName(selectedStudent)}
                </p>

                <p className="mt-1 text-xs text-indigo-600">
                  {selectedStudent && getStudentLibraryId(selectedStudent)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Book
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {selectedBook && getBookTitle(selectedBook)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {selectedBook?.author || "Unknown Author"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Issue Date
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {formatDate(issueDate)}
                  </p>
                </div>

                <div className="rounded-2xl bg-indigo-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-400">
                    Due Date
                  </p>

                  <p className="mt-1 text-sm font-bold text-indigo-800">
                    {formatDate(dueDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs leading-5 text-amber-800">
                By confirming, the book quantity, student record, issue record
                and notification will be updated.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isIssuing}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmIssue}
                disabled={isIssuing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <CheckCircle size={18} />

                {isIssuing ? "Issuing..." : "Confirm & Issue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookIssue;
