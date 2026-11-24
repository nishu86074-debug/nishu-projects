import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Download,
  Library,
  Mail,
  Phone,
  Printer,
  UserRound,
} from "lucide-react";
import { toast } from "react-hot-toast";

import { getIssuesFromFirestore } from "../../firebase/issueService";

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

const getSettings = () => {
  try {
    const savedSettings = JSON.parse(
      localStorage.getItem("librarySettings") || "{}",
    );

    return {
      ...DEFAULT_SETTINGS,
      ...savedSettings,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const getStoredData = (key) => {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

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

const formatCurrency = (amount) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
};

const getIssueFine = (issue) => {
  return Number(issue?.fine || 0);
};

const getReceiptType = (issue) => {
  if (issue?.status === "Returned" || issue?.returnDate) {
    return "RETURN";
  }

  return "ISSUE";
};

const getReceiptNumber = (issue) => {
  return (
    issue?.receiptId ||
    issue?.receiptNumber ||
    `REC-${String(issue?.id || issue?.issueId || Date.now()).slice(-8)}`
  );
};

const getStudentLibraryId = (issue) => {
  return (
    issue?.studentLibraryId ||
    issue?.libraryId ||
    issue?.studentId ||
    "Not available"
  );
};

const getIssueKey = (issue) => {
  return (
    issue?.issueId ||
    issue?.id ||
    issue?.receiptId ||
    issue?.receiptNumber ||
    ""
  );
};

const matchesReceipt = (issue, receiptId) => {
  if (!issue || !receiptId) {
    return false;
  }

  const target = String(receiptId).trim().toLowerCase();

  const possibleIds = [
    issue.id,
    issue.issueId,
    issue.receiptId,
    issue.receiptNumber,
    issue.firestoreId,
  ];

  return possibleIds.some(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim().toLowerCase() === target,
  );
};

const mergeIssues = (localIssues, firebaseIssues) => {
  const mergedMap = new Map();

  localIssues.forEach((issue) => {
    const key = getIssueKey(issue);

    if (key) {
      mergedMap.set(String(key), issue);
    }
  });

  firebaseIssues.forEach((issue) => {
    const key =
      issue?.issueId ||
      issue?.id ||
      issue?.receiptId ||
      issue?.receiptNumber ||
      issue?.firestoreId;

    if (!key) {
      return;
    }

    const keyString = String(key);

    const existing = mergedMap.get(keyString);

    mergedMap.set(keyString, {
      ...existing,
      ...issue,
      firestoreId:
        issue?.firestoreId || issue?.id || existing?.firestoreId || "",
    });
  });

  return Array.from(mergedMap.values());
};

const Receipt = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [settings, setSettings] = useState(getSettings);
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseLoading, setFirebaseLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadReceipt = async () => {
      setLoading(true);
      setSettings(getSettings());

      const localIssues = getStoredData("issuedBooks");

      let foundIssue = localIssues.find((item) => matchesReceipt(item, id));

      if (isMounted) {
        setIssue(foundIssue || null);
      }

      try {
        setFirebaseLoading(true);

        const firebaseIssues = await getIssuesFromFirestore();

        if (!isMounted) {
          return;
        }

        const mergedIssues = mergeIssues(localIssues, firebaseIssues || []);

        const firebaseReceipt = mergedIssues.find((item) =>
          matchesReceipt(item, id),
        );

        if (firebaseReceipt) {
          foundIssue = firebaseReceipt;

          setIssue(firebaseReceipt);

          const updatedLocalIssues = localIssues.map((localIssue) => {
            if (matchesReceipt(localIssue, id)) {
              return {
                ...localIssue,
                ...firebaseReceipt,
              };
            }

            return localIssue;
          });

          const existsLocally = localIssues.some((localIssue) =>
            matchesReceipt(localIssue, id),
          );

          if (!existsLocally) {
            updatedLocalIssues.push(firebaseReceipt);
          }

          localStorage.setItem(
            "issuedBooks",
            JSON.stringify(updatedLocalIssues),
          );
        }
      } catch (error) {
        console.error("Receipt Firebase loading error:", error);

        if (!foundIssue && isMounted) {
          toast.error("Unable to load receipt from Firebase.");
        }
      } finally {
        if (isMounted) {
          setFirebaseLoading(false);
          setLoading(false);
        }
      }
    };

    loadReceipt();

    const handleStorageUpdate = () => {
      loadReceipt();
    };

    window.addEventListener("storage", handleStorageUpdate);

    window.addEventListener("libraryDataUpdated", handleStorageUpdate);

    window.addEventListener("librarySettingsUpdated", handleStorageUpdate);

    return () => {
      isMounted = false;

      window.removeEventListener("storage", handleStorageUpdate);

      window.removeEventListener("libraryDataUpdated", handleStorageUpdate);

      window.removeEventListener("librarySettingsUpdated", handleStorageUpdate);
    };
  }, [id]);

  const receiptType = useMemo(() => {
    return getReceiptType(issue);
  }, [issue]);

  const receiptNumber = useMemo(() => {
    return getReceiptNumber(issue);
  }, [issue]);

  const fineAmount = useMemo(() => {
    return getIssueFine(issue);
  }, [issue]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();

    toast.success("Use the print window to save the receipt as PDF");
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4">
        <div className="rounded-2xl bg-white px-6 py-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

          <p className="font-medium text-slate-600">Loading receipt...</p>

          {firebaseLoading && (
            <p className="mt-2 text-xs text-slate-400">
              Syncing with library database...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <BookOpen size={30} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Receipt Not Found
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            The requested receipt could not be found in the library records.
          </p>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <ArrowLeft size={17} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @media print {
            body {
              background: white !important;
            }

            .no-print {
              display: none !important;
            }

            .receipt-wrapper {
              padding: 0 !important;
              background: white !important;
            }

            .receipt-paper {
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: 1px solid #cbd5e1 !important;
            }
          }
        `}
      </style>

      <div className="receipt-wrapper min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
        <div className="no-print mx-auto mb-5 flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
            Back
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Download size={17} />
              Save PDF
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Printer size={17} />
              Print Receipt
            </button>
          </div>
        </div>

        <div className="receipt-paper mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 px-6 py-8 text-white sm:px-10">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                {settings.logo ? (
                  <img
                    src={settings.logo}
                    alt={`${settings.libraryName} logo`}
                    className="h-16 w-16 rounded-2xl bg-white object-contain p-2"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                    <Library size={34} />
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium uppercase tracking-wider text-indigo-100">
                    {settings.institutionName}
                  </p>

                  <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                    {settings.libraryName}
                  </h1>

                  <p className="mt-1 text-sm text-indigo-100">
                    Smart Library Management System
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/15 px-5 py-4 sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100">
                  {receiptType === "RETURN"
                    ? "Book Return Receipt"
                    : "Book Issue Receipt"}
                </p>

                <p className="mt-1 text-lg font-bold">{receiptNumber}</p>

                <p className="mt-1 text-sm text-indigo-100">
                  {formatDate(issue.returnDate || issue.issueDate)}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-10">
            <div className="mb-8 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2
                className="mt-0.5 shrink-0 text-emerald-600"
                size={22}
              />

              <div>
                <h2 className="font-bold text-emerald-800">
                  {receiptType === "RETURN"
                    ? "Book returned successfully"
                    : "Book issued successfully"}
                </h2>

                <p className="mt-1 text-sm leading-6 text-emerald-700">
                  {receiptType === "RETURN"
                    ? "The return transaction has been recorded in the library system."
                    : "The book issue transaction has been recorded in the library system."}
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <UserRound className="text-indigo-600" size={20} />

                  <h2 className="text-lg font-bold text-slate-900">
                    Student Details
                  </h2>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-500">Student Name</p>

                    <p className="font-semibold text-slate-900">
                      {issue.studentName || "Not available"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">Digital Library ID</p>

                    <p className="font-semibold text-slate-900">
                      {getStudentLibraryId(issue)}
                    </p>
                  </div>

                  {issue.studentEmail && (
                    <div className="flex items-start gap-2">
                      <Mail size={16} className="mt-0.5 text-slate-400" />

                      <p className="break-all text-slate-700">
                        {issue.studentEmail}
                      </p>
                    </div>
                  )}

                  {issue.studentPhone && (
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-slate-400" />

                      <p className="text-slate-700">{issue.studentPhone}</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="text-indigo-600" size={20} />

                  <h2 className="text-lg font-bold text-slate-900">
                    Book Details
                  </h2>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-500">Book Title</p>

                    <p className="font-semibold text-slate-900">
                      {issue.bookTitle || issue.title || "Not available"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">Author</p>

                    <p className="font-medium text-slate-700">
                      {issue.bookAuthor || issue.author || "Not available"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">Category</p>

                    <p className="font-medium text-slate-700">
                      {issue.bookCategory || issue.category || "General"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">Book ID</p>

                    <p className="font-medium text-slate-700">
                      {issue.bookId || "Not available"}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-2xl border border-slate-200 p-5">
              <div className="mb-5 flex items-center gap-2">
                <CalendarDays className="text-indigo-600" size={20} />

                <h2 className="text-lg font-bold text-slate-900">
                  Transaction Details
                </h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-slate-500">Issue Date</p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(issue.issueDate)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Due Date</p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(issue.dueDate)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Return Date</p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(issue.returnDate)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Status</p>

                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                      issue.status === "Returned"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {issue.status || "Issued"}
                  </span>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 p-5">
              <h2 className="mb-4 text-lg font-bold text-slate-900">
                Fine Summary
              </h2>

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm text-slate-500">Fine Amount</p>

                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {formatCurrency(fineAmount)}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-sm text-slate-500">Payment Status</p>

                  <p
                    className={`mt-1 font-bold ${
                      fineAmount === 0
                        ? "text-emerald-600"
                        : issue.fineStatus === "Paid" ||
                            issue.paymentStatus === "Paid"
                          ? "text-emerald-600"
                          : "text-amber-600"
                    }`}
                  >
                    {fineAmount === 0
                      ? "No Fine"
                      : issue.fineStatus === "Paid" ||
                          issue.paymentStatus === "Paid"
                        ? "Paid"
                        : "Pending"}
                  </p>
                </div>
              </div>

              {Number(issue.daysOverdue || 0) > 0 && (
                <p className="mt-4 text-sm text-slate-500">
                  Overdue Days:{" "}
                  <span className="font-semibold text-slate-800">
                    {issue.daysOverdue}
                  </span>
                </p>
              )}

              {issue.paymentMethod && (
                <p className="mt-2 text-sm text-slate-500">
                  Payment Method:{" "}
                  <span className="font-semibold text-slate-800">
                    {issue.paymentMethod}
                  </span>
                </p>
              )}

              {issue.finePaidAmount && Number(issue.finePaidAmount) > 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  Paid Amount:{" "}
                  <span className="font-semibold text-emerald-700">
                    {formatCurrency(issue.finePaidAmount)}
                  </span>
                </p>
              )}

              {issue.paymentDate && (
                <p className="mt-2 text-sm text-slate-500">
                  Payment Date:{" "}
                  <span className="font-semibold text-slate-800">
                    {formatDate(issue.paymentDate)}
                  </span>
                </p>
              )}
            </section>

            <div className="mt-8 grid gap-6 border-t border-dashed border-slate-300 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Issued / Processed By</p>

                <p className="mt-1 font-semibold text-slate-900">
                  {issue.librarianName ||
                    issue.issuedByName ||
                    settings.librarianName}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {settings.libraryName}
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-sm text-slate-500">Library Contact</p>

                <p className="mt-1 break-all font-medium text-slate-700">
                  {settings.libraryEmail}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-center text-xs leading-5 text-slate-500">
              This is a system-generated receipt. Please keep it for your
              library records.
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-center sm:px-10">
            <p className="text-sm font-semibold text-slate-700">
              {settings.libraryName}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Smart Library Management System
            </p>
          </div>
        </div>

        <div className="no-print mx-auto mt-6 flex max-w-4xl justify-center">
          <Link
            to="/admin-dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Library size={17} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </>
  );
};

export default Receipt;
