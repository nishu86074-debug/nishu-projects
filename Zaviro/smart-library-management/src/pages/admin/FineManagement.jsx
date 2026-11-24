import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { QRCodeCanvas } from "qrcode.react";

import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  CreditCard,
  IndianRupee,
  Search,
  Smartphone,
  User,
  Wallet,
  X,
} from "lucide-react";

import { markFineAsPaid } from "../../firebase/issueService";

/* =====================================================
   DEFAULT SETTINGS
===================================================== */

const DEFAULT_SETTINGS = {
  finePerDay: 10,
  paymentMode: "Both",
  upiId: "",
  upiName: "Library",
  upiApp: "Other",
  paymentInstructions:
    "After completing the payment, click Confirm Online Payment.",
};

/* =====================================================
   GET LIBRARY SETTINGS
===================================================== */

const getLibrarySettings = () => {
  try {
    const saved = localStorage.getItem("librarySettings");

    if (!saved) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(saved);

    const finePerDay = Number(parsed?.finePerDay);

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      finePerDay:
        Number.isFinite(finePerDay) && finePerDay >= 0
          ? finePerDay
          : DEFAULT_SETTINGS.finePerDay,
      paymentMode: parsed?.paymentMode || DEFAULT_SETTINGS.paymentMode,
      upiId: parsed?.upiId || DEFAULT_SETTINGS.upiId,
      upiName: parsed?.upiName || DEFAULT_SETTINGS.upiName,
      upiApp: parsed?.upiApp || DEFAULT_SETTINGS.upiApp,
      paymentInstructions:
        parsed?.paymentInstructions || DEFAULT_SETTINGS.paymentInstructions,
    };
  } catch (error) {
    console.error("Error loading library settings:", error);

    return DEFAULT_SETTINGS;
  }
};

/* =====================================================
   FORMAT DATE
===================================================== */

const formatDate = (date) => {
  if (!date) {
    return "-";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =====================================================
   CALCULATE OVERDUE DAYS
===================================================== */

const calculateDaysOverdue = (dueDate, returnDate = "") => {
  if (!dueDate) {
    return 0;
  }

  const due = new Date(dueDate);

  const compareDate = returnDate ? new Date(returnDate) : new Date();

  if (Number.isNaN(due.getTime()) || Number.isNaN(compareDate.getTime())) {
    return 0;
  }

  due.setHours(0, 0, 0, 0);
  compareDate.setHours(0, 0, 0, 0);

  const difference = Math.ceil(
    (compareDate.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(0, difference);
};

/* =====================================================
   CALCULATE FINE
===================================================== */

const calculateFine = (issue, finePerDay) => {
  /*
    If ReturnBook has already calculated and saved
    the fine, use that fixed amount.
  */

  if (Number(issue?.fine) > 0) {
    return Number(issue.fine);
  }

  const daysOverdue = calculateDaysOverdue(
    issue?.dueDate,
    issue?.returnDate || "",
  );

  return daysOverdue * Number(finePerDay || 0);
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

const FineManagement = () => {
  const navigate = useNavigate();

  /* ===================================================
     SETTINGS
  =================================================== */

  const [settings, setSettings] = useState(() => getLibrarySettings());

  const finePerDay = Number(settings?.finePerDay || 0);

  const paymentMode = settings?.paymentMode || "Both";

  const upiId = settings?.upiId || "";

  const upiName = settings?.upiName || "Library";

  const upiApp = settings?.upiApp || "Other";

  const paymentInstructions =
    settings?.paymentInstructions || DEFAULT_SETTINGS.paymentInstructions;

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
     ISSUED BOOKS
  =================================================== */

  const [issuedBooks, setIssuedBooks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("issuedBooks") || "[]");
    } catch {
      return [];
    }
  });

  /* ===================================================
     SEARCH
  =================================================== */

  const [search, setSearch] = useState("");

  /* ===================================================
     FILTER
  =================================================== */

  const [filter, setFilter] = useState("All");

  /* ===================================================
     DETAILS MODAL
  =================================================== */

  const [selectedFine, setSelectedFine] = useState(null);

  /* ===================================================
     PAYMENT MODAL
  =================================================== */

  const [paymentModal, setPaymentModal] = useState(null);

  /* ===================================================
     PAYMENT METHOD
  =================================================== */

  const [paymentMethod, setPaymentMethod] = useState("Cash");

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
     REFRESH DATA
  =================================================== */

  useEffect(() => {
    const refreshData = () => {
      try {
        const storedIssues = JSON.parse(
          localStorage.getItem("issuedBooks") || "[]",
        );

        setIssuedBooks(storedIssues);
      } catch {
        setIssuedBooks([]);
      }
    };

    const refreshSettings = () => {
      setSettings(getLibrarySettings());
    };

    window.addEventListener("storage", refreshData);

    window.addEventListener("libraryDataUpdated", refreshData);

    window.addEventListener("librarySettingsUpdated", refreshSettings);

    return () => {
      window.removeEventListener("storage", refreshData);

      window.removeEventListener("libraryDataUpdated", refreshData);

      window.removeEventListener("librarySettingsUpdated", refreshSettings);
    };
  }, []);

  /* ===================================================
     FINE RECORDS
  =================================================== */

  const fineRecords = useMemo(() => {
    return issuedBooks
      .map((issue) => {
        const daysOverdue = calculateDaysOverdue(
          issue?.dueDate,
          issue?.returnDate || "",
        );

        const fine = calculateFine(issue, finePerDay);

        return {
          ...issue,
          calculatedDaysOverdue: daysOverdue,
          calculatedFine: fine,
        };
      })
      .filter((issue) => Number(issue.calculatedFine) > 0);
  }, [issuedBooks, finePerDay]);

  /* ===================================================
     PAID FINE
  =================================================== */

  const paidFine = useMemo(() => {
    return fineRecords
      .filter(
        (issue) =>
          issue?.fineStatus === "Paid" || issue?.paymentStatus === "Paid",
      )
      .reduce((sum, issue) => sum + Number(issue?.calculatedFine || 0), 0);
  }, [fineRecords]);

  /* ===================================================
     UNPAID FINE
  =================================================== */

  const unpaidFine = useMemo(() => {
    return fineRecords
      .filter(
        (issue) =>
          issue?.fineStatus !== "Paid" && issue?.paymentStatus !== "Paid",
      )
      .reduce((sum, issue) => sum + Number(issue?.calculatedFine || 0), 0);
  }, [fineRecords]);

  /* ===================================================
     TOTAL FINE
  =================================================== */

  const totalFine = useMemo(() => {
    return fineRecords.reduce(
      (sum, issue) => sum + Number(issue?.calculatedFine || 0),
      0,
    );
  }, [fineRecords]);

  /* ===================================================
     FILTER RECORDS
  =================================================== */

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return fineRecords.filter((issue) => {
      const studentName = String(issue?.studentName || "").toLowerCase();

      const libraryId = String(
        issue?.studentLibraryId || issue?.studentId || "",
      ).toLowerCase();

      const bookTitle = String(issue?.bookTitle || "").toLowerCase();

      const receiptId = String(
        issue?.receiptId || issue?.issueId || "",
      ).toLowerCase();

      const matchesSearch =
        !query ||
        studentName.includes(query) ||
        libraryId.includes(query) ||
        bookTitle.includes(query) ||
        receiptId.includes(query);

      const isPaid =
        issue?.fineStatus === "Paid" || issue?.paymentStatus === "Paid";

      const matchesFilter =
        filter === "All" ||
        (filter === "Paid" && isPaid) ||
        (filter === "Unpaid" && !isPaid);

      return matchesSearch && matchesFilter;
    });
  }, [fineRecords, search, filter]);

  /* ===================================================
     OPEN PAYMENT MODAL
  =================================================== */

  const openPaymentModal = (issue) => {
    setSelectedFine(null);

    let defaultMethod = "Cash";

    if (paymentMode === "Online") {
      defaultMethod = "Online";
    }

    if (issue?.paymentMethod === "Cash" || issue?.paymentMethod === "Online") {
      defaultMethod = issue.paymentMethod;
    }

    setPaymentMethod(defaultMethod);

    setPaymentModal(issue);
  };

  /* ===================================================
     CLOSE PAYMENT MODAL
  =================================================== */

  const closePaymentModal = () => {
    setPaymentModal(null);
    setPaymentMethod("Cash");
  };

  /* ===================================================
     HANDLE PAYMENT
  =================================================== */

  const handlePayment = async (issue, method) => {
    if (!issue) {
      return;
    }

    /* -----------------------------------------------
       PAYMENT MODE CHECK
    ----------------------------------------------- */

    if (paymentMode === "Cash" && method === "Online") {
      toast.error("Online payment is disabled in Library Settings.");
      return;
    }

    if (paymentMode === "Online" && method === "Cash") {
      toast.error("Cash payment is disabled in Library Settings.");
      return;
    }

    /* -----------------------------------------------
       ONLINE UPI CHECK
    ----------------------------------------------- */

    if (method === "Online" && !upiId) {
      toast.error("Please add the Library UPI ID in Library Settings first.");
      return;
    }

    /* -----------------------------------------------
       ISSUE ID
    ----------------------------------------------- */

    const issueId = issue?.issueId || issue?.id;

    if (!issueId) {
      toast.error("Issue ID not found.");
      return;
    }

    /* -----------------------------------------------
       PAYMENT AMOUNT
    ----------------------------------------------- */

    const paymentAmount = Number(issue?.calculatedFine || issue?.fine || 0);

    if (paymentAmount <= 0) {
      toast.error("Invalid fine amount.");
      return;
    }

    const paymentDate = new Date().toISOString();

    /* -----------------------------------------------
       LOADING
    ----------------------------------------------- */

    const loadingToast = toast.loading(
      method === "Online"
        ? "Saving online payment..."
        : "Saving cash payment...",
    );

    try {
      /* ---------------------------------------------
         FIREBASE
      --------------------------------------------- */

      await markFineAsPaid({
        issueId,
        paymentMethod: method,
        paymentAmount,
      });

      /* ---------------------------------------------
         UPDATE LOCAL ISSUES
      --------------------------------------------- */

      const updatedIssues = issuedBooks.map((item) => {
        const itemId = item?.issueId || item?.id;

        if (String(itemId) !== String(issueId)) {
          return item;
        }

        return {
          ...item,

          fineStatus: "Paid",

          paymentStatus: "Paid",

          paymentMethod: method,

          finePaid: true,

          finePaidAmount: paymentAmount,

          finePaidAt: paymentDate,

          paymentDate,

          paymentUpdatedAt: paymentDate,

          updatedAt: paymentDate,
        };
      });

      setIssuedBooks(updatedIssues);

      localStorage.setItem("issuedBooks", JSON.stringify(updatedIssues));

      /* ---------------------------------------------
         UPDATE RECEIPTS
      --------------------------------------------- */

      try {
        const receipts = JSON.parse(localStorage.getItem("receipts") || "[]");

        const updatedReceipts = receipts.map((receipt) => {
          const receiptIssueId = receipt?.issueId || receipt?.id;

          if (String(receiptIssueId) !== String(issueId)) {
            return receipt;
          }

          return {
            ...receipt,

            fineStatus: "Paid",

            paymentStatus: "Paid",

            paymentMethod: method,

            finePaid: true,

            finePaidAmount: paymentAmount,

            finePaidAt: paymentDate,

            paymentDate,

            updatedAt: paymentDate,
          };
        });

        localStorage.setItem("receipts", JSON.stringify(updatedReceipts));
      } catch (error) {
        console.error("Receipt update failed:", error);
      }

      /* ---------------------------------------------
         CREATE NOTIFICATION
      --------------------------------------------- */

      try {
        const notifications = JSON.parse(
          localStorage.getItem("notifications") || "[]",
        );

        const notification = {
          id: `NOTIF-FINE-${Date.now()}`,

          studentId: issue?.studentLibraryId || issue?.studentId || "",

          libraryId: issue?.studentLibraryId || issue?.studentId || "",

          studentName: issue?.studentName || "Student",

          type: "fine",

          title: "Fine Payment Successful",

          message: `Fine of ₹${paymentAmount} has been paid through ${method}.`,

          bookId: issue?.bookId || "",

          bookTitle: issue?.bookTitle || "",

          issueId: issue?.issueId || issue?.id || "",

          receiptId: issue?.receiptId || issue?.issueId || issue?.id || "",

          fine: paymentAmount,

          paymentMethod: method,

          paymentDate,

          read: false,

          createdAt: paymentDate,
        };

        notifications.unshift(notification);

        localStorage.setItem("notifications", JSON.stringify(notifications));
      } catch (error) {
        console.error("Notification save failed:", error);
      }

      /* ---------------------------------------------
         GLOBAL EVENT
      --------------------------------------------- */

      window.dispatchEvent(new Event("libraryDataUpdated"));

      /* ---------------------------------------------
         CLOSE
      --------------------------------------------- */

      closePaymentModal();

      toast.dismiss(loadingToast);

      toast.success(
        method === "Cash"
          ? "Cash payment saved successfully."
          : "Online payment saved successfully.",
      );
    } catch (error) {
      console.error("Fine payment Firebase error:", error);

      toast.dismiss(loadingToast);

      toast.error("Payment could not be saved to Firebase. Please try again.");
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
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
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
                <CircleDollarSign size={22} className="text-amber-600" />

                <h1 className="text-xl font-bold text-slate-900">
                  Fine Management
                </h1>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Track and manage library fines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
              ₹{finePerDay} / day
            </div>

            <div className="hidden rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 sm:block">
              {paymentMode === "Cash"
                ? "Cash Only"
                : paymentMode === "Online"
                  ? "Online Only"
                  : "Cash + Online"}
            </div>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* =================================================
            STATS
        ================================================= */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Fine</p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              ₹{totalFine}
            </p>

            <p className="mt-1 text-xs text-slate-500">All fine records</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Paid Fine</p>

            <p className="mt-2 text-3xl font-bold text-emerald-600">
              ₹{paidFine}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Successfully collected
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Unpaid Fine</p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              ₹{unpaidFine}
            </p>

            <p className="mt-1 text-xs text-slate-500">Pending collection</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Fine Records</p>

            <p className="mt-2 text-3xl font-bold text-indigo-600">
              {fineRecords.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">Students with fines</p>
          </div>
        </div>

        {/* =================================================
            SEARCH + FILTER
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, Library ID, book or receipt..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex gap-2">
              {["All", "Unpaid", "Paid"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    filter === item
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =================================================
            RECORDS
        ================================================= */}

        <div className="mt-6">
          {filteredRecords.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={30} />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-900">
                No fine records found
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                There are no fines matching the current search or filter.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* =================================================
                  DESKTOP TABLE
              ================================================= */}

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Student
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Book
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Due Date
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Overdue
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Fine
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Payment
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((issue) => {
                      const isPaid =
                        issue?.fineStatus === "Paid" ||
                        issue?.paymentStatus === "Paid";

                      return (
                        <tr
                          key={issue?.issueId || issue?.id}
                          className="transition hover:bg-slate-50"
                        >
                          {/* STUDENT */}

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                <User size={18} />
                              </div>

                              <div>
                                <p className="font-semibold text-slate-900">
                                  {issue?.studentName || "Student"}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {issue?.studentLibraryId ||
                                    issue?.studentId ||
                                    "-"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* BOOK */}

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {issue?.bookTitle || "Book"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {issue?.bookId || "-"}
                            </p>
                          </td>

                          {/* DUE DATE */}

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {formatDate(issue?.dueDate)}
                          </td>

                          {/* OVERDUE */}

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
                              <Clock size={14} />
                              {issue?.calculatedDaysOverdue} day
                              {issue?.calculatedDaysOverdue === 1 ? "" : "s"}
                            </span>
                          </td>

                          {/* FINE */}

                          <td className="px-5 py-4">
                            <p className="font-bold text-red-600">
                              ₹{issue?.calculatedFine}
                            </p>
                          </td>

                          {/* PAYMENT */}

                          <td className="px-5 py-4">
                            {isPaid ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                  <CheckCircle2 size={14} />
                                  Paid
                                </span>

                                <p className="mt-1 text-[11px] text-slate-500">
                                  {issue?.paymentMethod || "Payment"}
                                </p>
                              </div>
                            ) : (
                              <span className="inline-flex rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
                                Unpaid
                              </span>
                            )}
                          </td>

                          {/* ACTION */}

                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedFine(issue)}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                Details
                              </button>

                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={() => openPaymentModal(issue)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                                >
                                  <CreditCard size={14} />
                                  Pay
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* =================================================
                  MOBILE CARDS
              ================================================= */}

              <div className="grid gap-4 p-4 lg:hidden">
                {filteredRecords.map((issue) => {
                  const isPaid =
                    issue?.fineStatus === "Paid" ||
                    issue?.paymentStatus === "Paid";

                  return (
                    <div
                      key={issue?.issueId || issue?.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                            <User size={20} />
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-900">
                              {issue?.studentName || "Student"}
                            </h3>

                            <p className="mt-1 text-xs font-semibold text-indigo-600">
                              {issue?.studentLibraryId ||
                                issue?.studentId ||
                                "-"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </div>

                      <div className="mt-5 rounded-xl bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                          <BookOpen
                            size={18}
                            className="mt-0.5 text-slate-500"
                          />

                          <div>
                            <p className="font-semibold text-slate-800">
                              {issue?.bookTitle || "Book"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {issue?.bookId || "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-slate-50 p-3 text-center">
                          <p className="text-xs text-slate-500">Due</p>

                          <p className="mt-1 text-xs font-bold text-slate-800">
                            {formatDate(issue?.dueDate)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-red-50 p-3 text-center">
                          <p className="text-xs text-red-500">Overdue</p>

                          <p className="mt-1 font-bold text-red-600">
                            {issue?.calculatedDaysOverdue}d
                          </p>
                        </div>

                        <div className="rounded-xl bg-amber-50 p-3 text-center">
                          <p className="text-xs text-amber-600">Fine</p>

                          <p className="mt-1 font-bold text-amber-700">
                            ₹{issue?.calculatedFine}
                          </p>
                        </div>
                      </div>

                      {isPaid && (
                        <div className="mt-4 rounded-xl bg-emerald-50 p-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                            {issue?.paymentMethod === "Online" ? (
                              <Smartphone size={17} />
                            ) : (
                              <Wallet size={17} />
                            )}
                            Paid via {issue?.paymentMethod || "Payment"}
                          </div>

                          {issue?.paymentDate && (
                            <p className="mt-1 text-xs text-emerald-600">
                              {formatDate(issue.paymentDate)}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedFine(issue)}
                          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Details
                        </button>

                        {!isPaid && (
                          <button
                            type="button"
                            onClick={() => openPaymentModal(issue)}
                            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                          >
                            Pay Fine
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* =================================================
            FINE POLICY
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex gap-3">
            <AlertTriangle
              size={21}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>
              <h3 className="font-bold text-amber-900">Library Fine Policy</h3>

              <p className="mt-1 text-sm text-amber-800">
                A fine of ₹{finePerDay} is charged for every overdue day.
              </p>

              <p className="mt-2 text-xs font-semibold text-amber-700">
                Payment Mode: {paymentMode}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* =================================================
          DETAILS MODAL
      ================================================= */}

      {selectedFine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Fine Details
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Library fine transaction
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFine(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENT */}

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Student</p>

                <p className="mt-1 font-bold text-slate-900">
                  {selectedFine?.studentName || "Student"}
                </p>

                <p className="mt-1 text-xs text-indigo-600">
                  {selectedFine?.studentLibraryId ||
                    selectedFine?.studentId ||
                    "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Book</p>

                <p className="mt-1 font-bold text-slate-900">
                  {selectedFine?.bookTitle || "Book"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {selectedFine?.bookId || "-"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Issue Date</p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {formatDate(selectedFine?.issueDate)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Due Date</p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {formatDate(selectedFine?.dueDate)}
                  </p>
                </div>
              </div>

              {selectedFine?.returnDate && (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Return Date</p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {formatDate(selectedFine.returnDate)}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                      <IndianRupee size={20} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-red-900">
                        Total Fine
                      </p>

                      <p className="text-xs text-red-600">
                        {selectedFine?.calculatedDaysOverdue} overdue day
                        {selectedFine?.calculatedDaysOverdue === 1 ? "" : "s"} ×
                        ₹{finePerDay}
                      </p>
                    </div>
                  </div>

                  <p className="text-2xl font-bold text-red-600">
                    ₹{selectedFine?.calculatedFine}
                  </p>
                </div>
              </div>

              {(selectedFine?.fineStatus === "Paid" ||
                selectedFine?.paymentStatus === "Paid") && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-emerald-600" />

                    <div>
                      <p className="font-semibold text-emerald-800">
                        Fine Paid
                      </p>

                      <p className="mt-1 text-xs text-emerald-600">
                        Payment Method:{" "}
                        {selectedFine?.paymentMethod || "Payment"}
                      </p>

                      {selectedFine?.paymentDate && (
                        <p className="mt-1 text-xs text-emerald-600">
                          Payment Date: {formatDate(selectedFine.paymentDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}

            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedFine(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>

              {selectedFine?.fineStatus !== "Paid" &&
                selectedFine?.paymentStatus !== "Paid" && (
                  <button
                    type="button"
                    onClick={() => openPaymentModal(selectedFine)}
                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Pay Fine
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          PAYMENT MODAL
      ================================================= */}

      {paymentModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pay Fine</h2>

                <p className="mt-1 text-xs text-slate-500">
                  Select payment method
                </p>
              </div>

              <button
                type="button"
                onClick={closePaymentModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENT */}

            <div className="space-y-5 px-6 py-6">
              {/* AMOUNT */}

              <div className="rounded-2xl bg-red-50 p-5 text-center">
                <p className="text-sm text-red-600">Fine Amount</p>

                <p className="mt-1 text-4xl font-bold text-red-600">
                  ₹{paymentModal?.calculatedFine}
                </p>

                <p className="mt-1 text-xs text-red-500">
                  {paymentModal?.calculatedDaysOverdue} overdue day
                  {paymentModal?.calculatedDaysOverdue === 1 ? "" : "s"} × ₹
                  {finePerDay}
                </p>
              </div>

              {/* STUDENT */}

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Student</p>

                <p className="mt-1 font-semibold text-slate-900">
                  {paymentModal?.studentName || "Student"}
                </p>

                <p className="mt-1 text-xs text-indigo-600">
                  {paymentModal?.studentLibraryId ||
                    paymentModal?.studentId ||
                    "-"}
                </p>
              </div>

              {/* PAYMENT METHOD */}

              <div>
                <p className="mb-3 text-sm font-bold text-slate-800">
                  Payment Method
                </p>

                <div
                  className={`grid gap-3 ${
                    paymentMode === "Both" ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  {/* CASH */}

                  {(paymentMode === "Cash" || paymentMode === "Both") && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("Cash")}
                      className={`rounded-2xl border-2 p-4 text-left transition ${
                        paymentMethod === "Cash"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          paymentMethod === "Cash"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Wallet size={20} />
                      </div>

                      <p className="mt-3 font-bold text-slate-900">Cash</p>

                      <p className="mt-1 text-xs text-slate-500">
                        Pay at library counter
                      </p>
                    </button>
                  )}

                  {/* ONLINE */}

                  {(paymentMode === "Online" || paymentMode === "Both") && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("Online")}
                      className={`rounded-2xl border-2 p-4 text-left transition ${
                        paymentMethod === "Online"
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          paymentMethod === "Online"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Smartphone size={20} />
                      </div>

                      <p className="mt-3 font-bold text-slate-900">Online</p>

                      <p className="mt-1 text-xs text-slate-500">
                        UPI / QR payment
                      </p>
                    </button>
                  )}
                </div>
              </div>

              {/* CASH INFORMATION */}

              {paymentMethod === "Cash" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex gap-3">
                    <Wallet
                      size={20}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <div>
                      <p className="font-semibold text-emerald-800">
                        Cash Payment
                      </p>

                      <p className="mt-1 text-xs leading-5 text-emerald-700">
                        Librarian receives the fine amount at the library
                        counter and records the payment.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ONLINE PAYMENT */}

              {paymentMethod === "Online" && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
                  <div className="text-center">
                    <p className="font-bold text-indigo-900">
                      Scan to Pay Online
                    </p>

                    <p className="mt-1 text-xs text-indigo-600">
                      Scan this QR using any UPI app
                    </p>

                    {!upiId ? (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-semibold text-red-700">
                          UPI ID is not configured
                        </p>

                        <p className="mt-1 text-xs text-red-600">
                          Go to Library Settings and add the UPI ID first.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mx-auto mt-4 flex w-fit rounded-2xl bg-white p-4 shadow-sm">
                          <QRCodeCanvas
                            value={`upi://pay?pa=${encodeURIComponent(
                              upiId,
                            )}&pn=${encodeURIComponent(
                              upiName,
                            )}&am=${encodeURIComponent(
                              paymentModal?.calculatedFine || 0,
                            )}&cu=INR`}
                            size={180}
                            includeMargin
                          />
                        </div>

                        <div className="mt-4 rounded-xl bg-white p-3 text-left">
                          <div className="flex items-center gap-2">
                            <CreditCard size={17} className="text-indigo-600" />

                            <p className="text-xs font-semibold text-slate-700">
                              UPI ID
                            </p>
                          </div>

                          <p className="mt-1 text-sm font-bold text-indigo-700">
                            {upiId}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {upiName}
                          </p>

                          {upiApp && upiApp !== "Other" && (
                            <p className="mt-1 text-xs text-indigo-500">
                              App: {upiApp}
                            </p>
                          )}
                        </div>

                        <p className="mt-3 text-[11px] leading-5 text-indigo-600">
                          {paymentInstructions}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}

            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closePaymentModal}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              {paymentMethod === "Cash" ? (
                <button
                  type="button"
                  onClick={() => handlePayment(paymentModal, "Cash")}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Confirm Cash Payment
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePayment(paymentModal, "Online")}
                  disabled={!upiId}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirm Online Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FineManagement;
