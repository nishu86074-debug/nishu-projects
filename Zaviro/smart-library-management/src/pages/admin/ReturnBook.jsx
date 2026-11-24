import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  IndianRupee,
  RotateCcw,
  Search,
  User,
  X,
} from "lucide-react";

/* =====================================================
   FIREBASE SERVICES
===================================================== */

import { updateIssueByIssueId } from "../../firebase/issueService";

import {
  getBookByBookId,
  updateBookInFirestore,
} from "../../firebase/bookService";

import {
  getStudentByLibraryId,
  updateStudentBookCount,
} from "../../firebase/studentService";

/* =====================================================
   STORAGE HELPERS
===================================================== */

const readStorage = (key, fallback = null) => {
  try {
    const value = localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return fallback;
  }
};

const saveStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
    throw error;
  }
};

/* =====================================================
   DEFAULT SETTINGS
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
   LIBRARY SETTINGS
===================================================== */

const getLibrarySettings = () => {
  try {
    const saved = localStorage.getItem("librarySettings");

    if (!saved) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(saved);

    const finePerDay = Number(parsed?.finePerDay);

    const maxBooks = Number(parsed?.maxBooks);

    const issueDuration = Number(parsed?.issueDuration);

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,

      finePerDay:
        Number.isFinite(finePerDay) && finePerDay >= 0
          ? finePerDay
          : DEFAULT_SETTINGS.finePerDay,

      maxBooks:
        Number.isFinite(maxBooks) && maxBooks >= 1
          ? maxBooks
          : DEFAULT_SETTINGS.maxBooks,

      issueDuration:
        Number.isFinite(issueDuration) && issueDuration >= 1
          ? issueDuration
          : DEFAULT_SETTINGS.issueDuration,
    };
  } catch (error) {
    console.error("Error loading library settings:", error);

    return DEFAULT_SETTINGS;
  }
};

/* =====================================================
   DATE FORMAT
===================================================== */

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =====================================================
   RETURN STATUS
===================================================== */

const isReturned = (issue) => {
  return (
    String(issue?.status || "").toLowerCase() === "returned" ||
    Boolean(issue?.returnDate)
  );
};

/* =====================================================
   STUDENT HELPERS
===================================================== */

const getStudentId = (issue) => {
  return String(
    issue?.studentLibraryId ||
      issue?.libraryId ||
      issue?.studentId ||
      issue?.student?.libraryId ||
      issue?.student?.studentId ||
      issue?.student?.id ||
      "",
  );
};

const getStudentName = (issue) => {
  return (
    issue?.studentName ||
    issue?.student?.name ||
    issue?.student?.fullName ||
    "Unknown Student"
  );
};

const getStudentEmail = (issue) => {
  return issue?.studentEmail || issue?.student?.email || "";
};

const getStudentPhone = (issue) => {
  return issue?.studentPhone || issue?.student?.phone || "";
};

/* =====================================================
   BOOK HELPERS
===================================================== */

const getBookId = (issue) => {
  return String(issue?.bookId || issue?.book?.bookId || issue?.book?.id || "");
};

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
  return issue?.bookAuthor || issue?.book?.author || "Unknown Author";
};

const getBookCategory = (issue) => {
  return (
    issue?.bookCategory || issue?.category || issue?.book?.category || "General"
  );
};

/* =====================================================
   OVERDUE DAYS
===================================================== */

const getDaysOverdue = (issue) => {
  if (!issue?.dueDate || isReturned(issue)) {
    return 0;
  }

  const dueDate = new Date(issue.dueDate);

  const today = new Date();

  if (Number.isNaN(dueDate.getTime()) || Number.isNaN(today.getTime())) {
    return 0;
  }

  dueDate.setHours(0, 0, 0, 0);

  today.setHours(0, 0, 0, 0);

  const difference = today.getTime() - dueDate.getTime();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(difference / (1000 * 60 * 60 * 24));
};

/* =====================================================
   FINE CALCULATION
===================================================== */

const calculateFine = (issue, finePerDay) => {
  const daysOverdue = getDaysOverdue(issue);

  if (daysOverdue <= 0) {
    return 0;
  }

  return daysOverdue * Number(finePerDay || 0);
};

/* =====================================================
   FIRESTORE BOOK ID HELPER
===================================================== */

const getFirestoreBookId = (book) => {
  return book?.firestoreId || book?.firebaseId || book?.firestoreBookId || "";
};

/* =====================================================
   FIRESTORE STUDENT ID HELPER
===================================================== */

const getFirestoreStudentId = (student) => {
  return (
    student?.firestoreId ||
    student?.firebaseId ||
    student?.firestoreStudentId ||
    ""
  );
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

const ReturnBook = () => {
  const navigate = useNavigate();

  /* ===================================================
     LIBRARIAN
  =================================================== */

  const [librarian] = useState(() => readStorage("librarian", null));

  /* ===================================================
     DATA
  =================================================== */

  const [issuedBooks, setIssuedBooks] = useState(() =>
    readStorage("issuedBooks", []),
  );

  const [librarySettings, setLibrarySettings] = useState(getLibrarySettings);

  /* ===================================================
     SEARCH
  =================================================== */

  const [search, setSearch] = useState("");

  /* ===================================================
     SELECTED ISSUE
  =================================================== */

  const [selectedIssue, setSelectedIssue] = useState(null);

  /* ===================================================
     MODAL
  =================================================== */

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  /* ===================================================
     PROCESSING
  =================================================== */

  const [processing, setProcessing] = useState(false);

  /* ===================================================
     AUTH CHECK
  =================================================== */

  useEffect(() => {
    const loggedInLibrarian = readStorage("librarian", null);

    if (!loggedInLibrarian) {
      navigate("/admin-login", {
        replace: true,
      });
    }
  }, [navigate]);

  /* ===================================================
     REFRESH DATA
  =================================================== */

  useEffect(() => {
    const refreshData = () => {
      setIssuedBooks(readStorage("issuedBooks", []));

      setLibrarySettings(getLibrarySettings());
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

  /* ===================================================
     ACTIVE ISSUES
  =================================================== */

  const activeIssues = useMemo(() => {
    return issuedBooks.filter((issue) => !isReturned(issue));
  }, [issuedBooks]);

  /* ===================================================
     SEARCH FILTER
  =================================================== */

  const filteredIssues = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return activeIssues;
    }

    return activeIssues.filter((issue) => {
      const studentId = getStudentId(issue).toLowerCase();

      const studentName = getStudentName(issue).toLowerCase();

      const bookId = getBookId(issue).toLowerCase();

      const bookTitle = getBookTitle(issue).toLowerCase();

      const receiptId = String(issue?.receiptId || "").toLowerCase();

      return (
        studentId.includes(value) ||
        studentName.includes(value) ||
        bookId.includes(value) ||
        bookTitle.includes(value) ||
        receiptId.includes(value)
      );
    });
  }, [activeIssues, search]);

  /* ===================================================
     STATISTICS
  =================================================== */

  const stats = useMemo(() => {
    const overdueIssues = activeIssues.filter(
      (issue) => getDaysOverdue(issue) > 0,
    );

    const totalFine = overdueIssues.reduce(
      (total, issue) =>
        total + calculateFine(issue, librarySettings.finePerDay),
      0,
    );

    return {
      active: activeIssues.length,

      overdue: overdueIssues.length,

      fine: totalFine,
    };
  }, [activeIssues, librarySettings.finePerDay]);

  /* ===================================================
     SELECT ISSUE
  =================================================== */

  const handleSelectIssue = (issue) => {
    setSelectedIssue(issue);

    setShowConfirmModal(true);
  };

  /* ===================================================
     CLOSE MODAL
  =================================================== */

  const closeModal = () => {
    if (processing) {
      return;
    }

    setShowConfirmModal(false);

    setSelectedIssue(null);
  };

  /* ===================================================
     FIREBASE SYNC
  =================================================== */

  const syncReturnToFirebase = async ({
    issue,
    updatedIssue,
    updatedBook,
    updatedStudent,
    bookId,
    studentId,
  }) => {
    const syncErrors = [];

    /* ===============================================
         UPDATE ISSUE IN FIRESTORE
      =============================================== */

    try {
      const issueId = issue?.issueId || issue?.id || "";

      if (issueId) {
        await updateIssueByIssueId(issueId, updatedIssue);

        console.log("Firebase issue updated successfully.");
      }
    } catch (error) {
      console.error("Firebase issue update failed:", error);

      syncErrors.push("issue");
    }

    /* ===============================================
         UPDATE BOOK IN FIRESTORE
      =============================================== */

    try {
      let firestoreBookId = getFirestoreBookId(updatedBook);

      /*
          If localStorage book does not contain
          Firestore document ID, find it by Book ID.
        */

      if (!firestoreBookId && bookId) {
        const firestoreBook = await getBookByBookId(bookId);

        if (firestoreBook?.id) {
          firestoreBookId = firestoreBook.id;
        }
      }

      if (firestoreBookId && updatedBook) {
        await updateBookInFirestore(firestoreBookId, updatedBook);

        console.log("Firebase book updated successfully.");
      }
    } catch (error) {
      console.error("Firebase book update failed:", error);

      syncErrors.push("book");
    }

    /* ===============================================
         UPDATE STUDENT IN FIRESTORE
      =============================================== */

    try {
      let firestoreStudentId = getFirestoreStudentId(updatedStudent);

      /*
          If localStorage student does not have
          Firestore document ID, find it by Library ID.
        */

      if (!firestoreStudentId && studentId) {
        const firestoreStudent = await getStudentByLibraryId(studentId);

        if (firestoreStudent?.id) {
          firestoreStudentId = firestoreStudent.id;
        }
      }

      if (firestoreStudentId) {
        await updateStudentBookCount(
          firestoreStudentId,
          Number(updatedStudent?.issuedBooksCount || 0),
        );

        console.log("Firebase student book count updated successfully.");
      }
    } catch (error) {
      console.error("Firebase student update failed:", error);

      syncErrors.push("student");
    }

    return {
      success: syncErrors.length === 0,

      errors: syncErrors,
    };
  };

  /* ===================================================
     RETURN BOOK
  =================================================== */

  const handleReturnBook = async () => {
    if (!selectedIssue || processing) {
      return;
    }

    setProcessing(true);

    try {
      /* =============================================
           FRESH DATA
        ============================================= */

      const freshIssues = readStorage("issuedBooks", []);

      const freshBooks = readStorage("books", []);

      const freshStudents = readStorage("students", []);

      const currentSettings = getLibrarySettings();

      const finePerDay = Number(currentSettings.finePerDay || 0);

      /* =============================================
           FIND ISSUE
        ============================================= */

      const issueIndex = freshIssues.findIndex(
        (issue) =>
          String(issue?.id) === String(selectedIssue?.id) ||
          String(issue?.issueId) === String(selectedIssue?.issueId),
      );

      if (issueIndex === -1) {
        toast.error("Issue record not found.");

        return;
      }

      const issue = freshIssues[issueIndex];

      /* =============================================
           ALREADY RETURNED
        ============================================= */

      if (isReturned(issue)) {
        toast.error("This book has already been returned.");

        return;
      }

      /* =============================================
           RETURN DATE
        ============================================= */

      const returnDate = new Date().toISOString();

      /* =============================================
           OVERDUE
        ============================================= */

      const daysOverdue = getDaysOverdue(issue);

      const fine = daysOverdue * finePerDay;

      /* =============================================
           UPDATED ISSUE
        ============================================= */

      const updatedIssue = {
        ...issue,

        status: "Returned",

        returnDate,

        daysOverdue,

        fine,

        finePerDay,

        fineStatus: fine > 0 ? "Unpaid" : "No Fine",

        paymentStatus: fine > 0 ? "Pending" : "Not Required",

        updatedAt: returnDate,
      };

      freshIssues[issueIndex] = updatedIssue;

      /* =============================================
           UPDATE BOOK LOCAL DATA
        ============================================= */

      const bookId = getBookId(issue);

      const bookIndex = freshBooks.findIndex(
        (book) => String(book?.bookId || book?.id || "") === String(bookId),
      );

      let updatedBook = null;

      if (bookIndex !== -1) {
        const book = freshBooks[bookIndex];

        const quantity = Math.max(0, Number(book?.quantity || 0));

        const currentAvailable = Math.max(
          0,
          Number(book?.availableQuantity ?? 0),
        );

        const currentIssued = Math.max(0, Number(book?.issuedQuantity || 0));

        const newAvailable = Math.min(quantity, currentAvailable + 1);

        const newIssued = Math.max(0, currentIssued - 1);

        updatedBook = {
          ...book,

          availableQuantity: newAvailable,

          issuedQuantity: newIssued,

          available: newAvailable > 0,

          status: newAvailable > 0 ? "Available" : "Issued",

          updatedAt: returnDate,
        };

        freshBooks[bookIndex] = updatedBook;
      }

      /* =============================================
           UPDATE STUDENT LOCAL DATA
        ============================================= */

      const studentId = getStudentId(issue);

      const studentIndex = freshStudents.findIndex(
        (student) =>
          String(
            student?.libraryId || student?.studentId || student?.id || "",
          ) === String(studentId),
      );

      let updatedStudent = null;

      if (studentIndex !== -1) {
        const student = freshStudents[studentIndex];

        const currentCount = Number(student?.issuedBooksCount || 0);

        updatedStudent = {
          ...student,

          issuedBooksCount: Math.max(0, currentCount - 1),

          updatedAt: returnDate,
        };

        freshStudents[studentIndex] = updatedStudent;
      } else {
        /*
            Student may not exist in localStorage.
            We still create a minimal object so
            Firebase sync can use Library ID.
          */

        updatedStudent = {
          libraryId: studentId,

          issuedBooksCount: 0,

          updatedAt: returnDate,
        };
      }

      /* =============================================
           FIREBASE SYNC
        ============================================= */

      const firebaseResult = await syncReturnToFirebase({
        issue,

        updatedIssue,

        updatedBook,

        updatedStudent,

        bookId,

        studentId,
      });

      /* =============================================
           SAVE LOCAL STORAGE
        ============================================= */

      saveStorage("issuedBooks", freshIssues);

      saveStorage("books", freshBooks);

      saveStorage("students", freshStudents);

      /* =============================================
           RECEIPT
        ============================================= */

      const receiptId = `RETURN-${Date.now()}`;

      const receipt = {
        id: receiptId,

        receiptId,

        type: "RETURN",

        issueId: issue?.issueId || issue?.id || "",

        studentId,

        studentLibraryId: studentId,

        studentName: getStudentName(issue),

        studentEmail: getStudentEmail(issue),

        studentPhone: getStudentPhone(issue),

        bookId,

        bookTitle: getBookTitle(issue),

        bookAuthor: getBookAuthor(issue),

        bookCategory: getBookCategory(issue),

        issueDate: issue?.issueDate || "",

        dueDate: issue?.dueDate || "",

        returnDate,

        daysOverdue,

        fine,

        finePerDay,

        paymentStatus: fine > 0 ? "Pending" : "Not Required",

        fineStatus: fine > 0 ? "Unpaid" : "No Fine",

        status: "Returned",

        returnedBy:
          librarian?.name ||
          librarian?.fullName ||
          librarian?.email ||
          currentSettings.librarianName ||
          "Librarian",

        librarianName:
          librarian?.name ||
          librarian?.fullName ||
          currentSettings.librarianName ||
          "Librarian",

        libraryName: currentSettings.libraryName,

        institutionName: currentSettings.institutionName,

        firebaseSynced: firebaseResult.success,

        createdAt: returnDate,
      };

      const existingReceipts = readStorage("receipts", []);

      existingReceipts.unshift(receipt);

      saveStorage("receipts", existingReceipts);

      /* =============================================
           NOTIFICATION
        ============================================= */

      const notifications = readStorage("notifications", []);

      const notification = {
        id: `NOTIF-${Date.now()}`,

        studentId,

        libraryId: studentId,

        studentName: getStudentName(issue),

        type: "RETURN",

        title: "Book Returned Successfully",

        message:
          fine > 0
            ? `${getBookTitle(
                issue,
              )} has been returned. Fine ₹${fine} is pending.`
            : `${getBookTitle(
                issue,
              )} has been returned successfully. No fine is due.`,

        bookId,

        bookTitle: getBookTitle(issue),

        issueId: issue?.issueId || issue?.id || "",

        receiptId,

        fine,

        daysOverdue,

        fineStatus: fine > 0 ? "Unpaid" : "No Fine",

        paymentStatus: fine > 0 ? "Pending" : "Not Required",

        read: false,

        createdAt: returnDate,
      };

      notifications.unshift(notification);

      saveStorage("notifications", notifications);

      /* =============================================
           UPDATE EVENT
        ============================================= */

      window.dispatchEvent(new Event("libraryDataUpdated"));

      /* =============================================
           FIREBASE WARNING
        ============================================= */

      if (!firebaseResult.success) {
        toast.error(
          `Book returned locally, but Firebase ${firebaseResult.errors.join(
            ", ",
          )} sync failed.`,
        );
      } else if (fine > 0) {
        toast.success(`Book returned. Fine ₹${fine} is pending.`);
      } else {
        toast.success("Book returned successfully.");
      }

      /* =============================================
           CLOSE MODAL
        ============================================= */

      setShowConfirmModal(false);

      setSelectedIssue(null);

      /* =============================================
           RECEIPT PAGE
        ============================================= */

      navigate(`/receipt/${issue?.issueId || issue?.id}`);
    } catch (error) {
      console.error("Return book error:", error);

      toast.error("Book return failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  /* ===================================================
     NOT LOGGED IN
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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin-dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <RotateCcw size={21} className="text-indigo-600" />

                <h1 className="text-xl font-bold text-slate-900">
                  Return Book
                </h1>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Process book returns and calculate fines
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
              ₹{librarySettings.finePerDay}
              {" / "}
              overdue day
            </div>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* =================================================
            STATS
        ================================================= */}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Clock size={20} />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Active Issues
                </p>

                <p className="text-xl font-bold text-slate-900">
                  {stats.active}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <CalendarDays size={20} />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Overdue</p>

                <p className="text-xl font-bold text-slate-900">
                  {stats.overdue}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <IndianRupee size={20} />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Current Fine
                </p>

                <p className="text-xl font-bold text-slate-900">
                  ₹{stats.fine}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            SEARCH
        ================================================= */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by student name, Library ID, book name, book ID or receipt..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={17} />
              </button>
            )}
          </div>
        </section>

        {/* =================================================
            ISSUED BOOKS
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  Books Currently Issued
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select a book to process its return
                </p>
              </div>

              <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600">
                {filteredIssues.length}{" "}
                {filteredIssues.length === 1 ? "Record" : "Records"}
              </span>
            </div>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={28} />
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                No active books found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                {search
                  ? "No issued book matches your search."
                  : "There are currently no books issued to students."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredIssues.map((issue) => {
                const daysOverdue = getDaysOverdue(issue);

                const fine = calculateFine(issue, librarySettings.finePerDay);

                return (
                  <div
                    key={issue?.id || issue?.issueId}
                    className="p-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <BookOpen size={22} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-slate-900">
                              {getBookTitle(issue)}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              {getBookAuthor(issue)}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                {getBookId(issue)}
                              </span>

                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                {getBookCategory(issue)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                          <div className="flex items-center gap-2 text-slate-700">
                            <User size={16} className="text-slate-400" />

                            <span className="font-semibold">
                              {getStudentName(issue)}
                            </span>
                          </div>

                          <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                            {getStudentId(issue)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:w-[390px]">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Issue Date
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatDate(issue?.issueDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Due Date
                          </p>

                          <p
                            className={`mt-1 text-sm font-semibold ${
                              daysOverdue > 0
                                ? "text-red-600"
                                : "text-slate-700"
                            }`}
                          >
                            {formatDate(issue?.dueDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Fine
                          </p>

                          <p
                            className={`mt-1 text-sm font-bold ${
                              fine > 0 ? "text-red-600" : "text-emerald-600"
                            }`}
                          >
                            ₹{fine}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row lg:flex-col">
                        {daysOverdue > 0 && (
                          <span className="rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-bold text-red-600">
                            {daysOverdue} {daysOverdue === 1 ? "day" : "days"}{" "}
                            overdue
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSelectIssue(issue)}
                          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                        >
                          <RotateCcw size={17} />
                          Return Book
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =================================================
            FINE POLICY
        ================================================= */}

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <IndianRupee size={19} className="mt-0.5 shrink-0 text-amber-600" />

            <div>
              <p className="text-sm font-bold text-amber-800">
                Current Fine Policy
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                ₹{librarySettings.finePerDay} fine is calculated for each
                overdue day. This value comes from Library Settings.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* =================================================
          CONFIRM MODAL
      ================================================= */}

      {showConfirmModal && selectedIssue && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <RotateCcw size={20} />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Confirm Book Return
                    </h2>

                    <p className="text-xs text-slate-500">
                      Please verify the details
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={processing}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <BookOpen size={19} className="mt-0.5 text-indigo-600" />

                  <div>
                    <p className="text-xs font-semibold text-slate-400">BOOK</p>

                    <p className="mt-1 font-bold text-slate-900">
                      {getBookTitle(selectedIssue)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {getBookAuthor(selectedIssue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <User size={19} className="mt-0.5 text-blue-600" />

                  <div>
                    <p className="text-xs font-semibold text-slate-400">
                      STUDENT
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {getStudentName(selectedIssue)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {getStudentId(selectedIssue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Due Date
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-700">
                    {formatDate(selectedIssue?.dueDate)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Overdue
                  </p>

                  <p
                    className={`mt-1 text-sm font-bold ${
                      getDaysOverdue(selectedIssue) > 0
                        ? "text-red-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {getDaysOverdue(selectedIssue)}{" "}
                    {getDaysOverdue(selectedIssue) === 1 ? "day" : "days"}
                  </p>
                </div>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  calculateFine(selectedIssue, librarySettings.finePerDay) > 0
                    ? "border-red-200 bg-red-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">
                      Fine Amount
                    </p>

                    <p
                      className={`mt-1 text-2xl font-black ${
                        calculateFine(
                          selectedIssue,
                          librarySettings.finePerDay,
                        ) > 0
                          ? "text-red-600"
                          : "text-emerald-600"
                      }`}
                    >
                      ₹
                      {calculateFine(selectedIssue, librarySettings.finePerDay)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Rate</p>

                    <p className="mt-1 text-sm font-bold text-slate-700">
                      ₹{librarySettings.finePerDay}
                      {" / day"}
                    </p>
                  </div>
                </div>
              </div>

              {calculateFine(selectedIssue, librarySettings.finePerDay) > 0 && (
                <p className="text-xs leading-5 text-red-600">
                  This return will mark the fine as
                  <strong> Unpaid / Pending</strong>. The fine can be handled
                  later from Fine Management.
                </p>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 p-5">
              <button
                type="button"
                onClick={closeModal}
                disabled={processing}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReturnBook}
                disabled={processing}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} />
                    Confirm Return
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnBook;
