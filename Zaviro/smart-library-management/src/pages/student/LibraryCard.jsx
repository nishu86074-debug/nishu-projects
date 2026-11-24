import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Mail,
  Phone,
  Printer,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "react-hot-toast";

import { getStudentByLibraryId } from "../../firebase/studentService";

// =====================================================
// DEFAULT SETTINGS
// =====================================================

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

// =====================================================
// SETTINGS HELPER
// =====================================================

const getSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("librarySettings") || "{}");

    return {
      ...DEFAULT_SETTINGS,
      ...saved,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

// =====================================================
// LOCAL STUDENTS
// =====================================================

const getStudents = () => {
  try {
    const students = JSON.parse(localStorage.getItem("students") || "[]");

    return Array.isArray(students) ? students : [];
  } catch {
    return [];
  }
};

// =====================================================
// CURRENT STUDENT
// =====================================================

const getCurrentStudent = () => {
  try {
    const studentUser = JSON.parse(
      localStorage.getItem("studentUser") || "null",
    );

    if (!studentUser) {
      return null;
    }

    const students = getStudents();

    const studentId =
      studentUser.libraryId || studentUser.studentId || studentUser.id;

    const foundStudent = students.find(
      (student) =>
        String(student.libraryId || "") === String(studentId || "") ||
        String(student.studentId || "") === String(studentId || "") ||
        String(student.id || "") === String(studentId || ""),
    );

    return foundStudent || studentUser;
  } catch {
    return null;
  }
};

// =====================================================
// DATE
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

// =====================================================
// CARD NUMBER
// =====================================================

const generateCardNumber = (student) => {
  const libraryId =
    student?.libraryId || student?.studentId || student?.id || "STUDENT";

  return `CARD-${String(libraryId)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-10)
    .toUpperCase()}`;
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const LibraryCard = () => {
  const [settings, setSettings] = useState(getSettings);

  const [student, setStudent] = useState(getCurrentStudent);

  const [firebaseLoading, setFirebaseLoading] = useState(false);

  // ===================================================
  // LOCAL DATA LISTENERS
  // ===================================================

  useEffect(() => {
    const loadData = () => {
      setSettings(getSettings());
      setStudent(getCurrentStudent());
    };

    loadData();

    window.addEventListener("storage", loadData);

    window.addEventListener("libraryDataUpdated", loadData);

    window.addEventListener("librarySettingsUpdated", loadData);

    return () => {
      window.removeEventListener("storage", loadData);

      window.removeEventListener("libraryDataUpdated", loadData);

      window.removeEventListener("librarySettingsUpdated", loadData);
    };
  }, []);

  // ===================================================
  // FIREBASE STUDENT SYNC
  // ===================================================

  useEffect(() => {
    let cancelled = false;

    const syncStudentFromFirebase = async () => {
      if (!student) {
        return;
      }

      const libraryId = student?.libraryId || student?.studentId || "";

      if (!libraryId) {
        return;
      }

      try {
        setFirebaseLoading(true);

        const firebaseStudent = await getStudentByLibraryId(libraryId);

        if (cancelled || !firebaseStudent) {
          return;
        }

        // Firebase contains the latest
        // student information.
        const mergedStudent = {
          ...student,
          ...firebaseStudent,

          // Keep local identity fields
          // if Firebase does not contain them.
          libraryId: firebaseStudent.libraryId || student.libraryId,

          studentId: firebaseStudent.studentId || student.studentId,

          name: firebaseStudent.name || student.name,

          email: firebaseStudent.email || student.email,
        };

        setStudent(mergedStudent);

        // -------------------------------------------------
        // Update current session
        // -------------------------------------------------

        const currentSession = JSON.parse(
          localStorage.getItem("studentUser") || "null",
        );

        if (currentSession) {
          const updatedSession = {
            ...currentSession,
            ...firebaseStudent,

            firestoreId: firebaseStudent.id || currentSession.firestoreId,

            firebaseId: firebaseStudent.id || currentSession.firebaseId,

            libraryId: firebaseStudent.libraryId || currentSession.libraryId,

            studentId: firebaseStudent.studentId || currentSession.studentId,
          };

          localStorage.setItem("studentUser", JSON.stringify(updatedSession));
        }

        // -------------------------------------------------
        // Update local students list
        // -------------------------------------------------

        const localStudents = getStudents();

        const studentIndex = localStudents.findIndex(
          (item) =>
            String(item?.libraryId || "").toLowerCase() ===
            String(libraryId).toLowerCase(),
        );

        let updatedStudents = [...localStudents];

        if (studentIndex >= 0) {
          updatedStudents[studentIndex] = {
            ...updatedStudents[studentIndex],
            ...firebaseStudent,
          };
        } else {
          updatedStudents.push(mergedStudent);
        }

        localStorage.setItem("students", JSON.stringify(updatedStudents));

        localStorage.setItem(
          "newRegisteredStudent",
          JSON.stringify(mergedStudent),
        );

        window.dispatchEvent(new Event("libraryDataUpdated"));
      } catch (error) {
        console.error("Library card Firebase sync error:", error);

        if (!cancelled) {
          toast.error("Latest student data could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setFirebaseLoading(false);
        }
      }
    };

    syncStudentFromFirebase();

    return () => {
      cancelled = true;
    };
  }, [student?.libraryId, student?.studentId]);

  // ===================================================
  // LIBRARY ID
  // ===================================================

  const libraryId = useMemo(() => {
    return (
      student?.libraryId ||
      student?.studentId ||
      student?.id ||
      "LIB-ID-NOT-AVAILABLE"
    );
  }, [student]);

  // ===================================================
  // STUDENT NAME
  // ===================================================

  const studentName = useMemo(() => {
    return (
      student?.name ||
      student?.fullName ||
      [student?.firstName, student?.lastName].filter(Boolean).join(" ") ||
      "Student Name"
    );
  }, [student]);

  // ===================================================
  // CARD NUMBER
  // ===================================================

  const cardNumber = useMemo(() => {
    return generateCardNumber(student);
  }, [student]);

  // ===================================================
  // REGISTRATION DATE
  // ===================================================

  const registrationDate = useMemo(() => {
    return (
      student?.createdAt ||
      student?.registeredAt ||
      student?.registrationDate ||
      new Date().toISOString()
    );
  }, [student]);

  // ===================================================
  // QR DATA
  // ===================================================

  const qrData = useMemo(() => {
    return JSON.stringify({
      type: "SMART_LIBRARY_STUDENT",

      libraryId,

      studentId: student?.studentId || student?.id || libraryId,

      name: studentName,

      email: student?.email || "",
    });
  }, [libraryId, student, studentName]);

  // ===================================================
  // PRINT
  // ===================================================

  const handlePrint = () => {
    window.print();
  };

  // ===================================================
  // SAVE PDF
  // ===================================================

  const handleSavePdf = () => {
    window.print();

    toast.success("Use the print window to save your library card as PDF");
  };

  // ===================================================
  // NO STUDENT
  // ===================================================

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <UserRound size={30} />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              Student Login Required
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Please log in to your student account to view your Digital Library
              Card.
            </p>

            <Link
              to="/student-login"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              Go to Student Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // RENDER
  // ===================================================

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

            .library-card-page {
              min-height: auto !important;
              padding: 0 !important;
              background: white !important;
            }

            .library-card-container {
              max-width: 100% !important;
              margin: 0 auto !important;
            }

            .library-card {
              box-shadow: none !important;
              break-inside: avoid !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}
      </style>

      <div className="library-card-page min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
        {/* =================================================
            TOP BAR
        ================================================= */}

        <div className="no-print mx-auto mb-6 flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
          <Link
            to="/student-dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {firebaseLoading && (
              <span className="rounded-xl bg-indigo-50 px-3 py-2.5 text-xs font-bold text-indigo-600">
                Syncing latest data...
              </span>
            )}

            <button
              type="button"
              onClick={handleSavePdf}
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
              Print Card
            </button>
          </div>
        </div>

        {/* =================================================
            CARD AREA
        ================================================= */}

        <div className="library-card-container mx-auto w-full max-w-5xl">
          <div className="mb-4 text-center no-print">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Digital Identity
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Digital Library Card
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Keep this card available when using library services.
            </p>
          </div>

          {/* =================================================
              MAIN CARD
          ================================================= */}

          <div className="library-card mx-auto w-full max-w-4xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            {/* HEADER */}

            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 px-6 py-7 text-white sm:px-8">
              <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10" />

              <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-violet-300/10" />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {settings.logo ? (
                    <img
                      src={settings.logo}
                      alt={`${settings.libraryName} logo`}
                      className="h-16 w-16 rounded-2xl bg-white object-contain p-2 shadow-lg"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg">
                      <ShieldCheck size={34} />
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">
                      {settings.institutionName}
                    </p>

                    <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">
                      {settings.libraryName}
                    </h2>

                    <p className="mt-1 text-sm text-indigo-100">
                      Digital Library Identity Card
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">
                    Card Number
                  </p>

                  <p className="mt-1 font-mono text-sm font-bold">
                    {cardNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                CARD BODY
            ================================================= */}

            <div className="p-6 sm:p-8">
              <div className="grid gap-8 lg:grid-cols-[190px_1fr_180px] lg:items-center">
                {/* PHOTO */}

                <div className="flex justify-center lg:justify-start">
                  <div className="relative">
                    <div className="flex h-40 w-32 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-xl ring-1 ring-slate-200">
                      {student.photo ? (
                        <img
                          src={student.photo}
                          alt={studentName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound size={54} className="text-slate-300" />
                      )}
                    </div>

                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                      Active Member
                    </div>
                  </div>
                </div>

                {/* STUDENT INFORMATION */}

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                    Student Information
                  </p>

                  <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                    {studentName}
                  </h3>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {/* LIBRARY ID */}

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Digital Library ID
                      </p>

                      <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                        {libraryId}
                      </p>
                    </div>

                    {/* STUDENT ID */}

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Student ID
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {student.studentId || student.id || libraryId}
                      </p>
                    </div>

                    {/* COURSE */}

                    {student.course && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Course
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {student.course}
                        </p>
                      </div>
                    )}

                    {/* DEPARTMENT */}

                    {student.department && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Department
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {student.department}
                        </p>
                      </div>
                    )}

                    {/* YEAR */}

                    {student.year && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Year
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {student.year}
                        </p>
                      </div>
                    )}

                    {/* EMAIL */}

                    {student.email && (
                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Email
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <Mail
                            size={15}
                            className="shrink-0 text-indigo-500"
                          />

                          <p className="break-all text-sm font-medium text-slate-700">
                            {student.email}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* PHONE */}

                    {student.phone && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Phone
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <Phone size={15} className="text-indigo-500" />

                          <p className="text-sm font-semibold text-slate-800">
                            {student.phone}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* QR CODE */}

                <div className="flex flex-col items-center justify-center">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <QRCode
                      value={qrData}
                      size={142}
                      bgColor="#ffffff"
                      fgColor="#111827"
                      level="M"
                    />
                  </div>

                  <p className="mt-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    Scan to Verify
                  </p>

                  <p className="mt-1 text-center text-[10px] leading-4 text-slate-400">
                    Use the library scanner to identify this student.
                  </p>
                </div>
              </div>

              {/* =================================================
                  DETAILS STRIP
              ================================================= */}

              <div className="mt-8 grid overflow-hidden rounded-2xl border border-slate-200 sm:grid-cols-3">
                {/* MEMBER SINCE */}

                <div className="border-b border-slate-200 p-4 sm:border-b-0 sm:border-r">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={17} className="text-indigo-600" />

                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Member Since
                    </p>
                  </div>

                  <p className="mt-2 text-sm font-bold text-slate-800">
                    {formatDate(registrationDate)}
                  </p>
                </div>

                {/* BORROWING LIMIT */}

                <div className="border-b border-slate-200 p-4 sm:border-b-0 sm:border-r">
                  <div className="flex items-center gap-2">
                    <BookOpenIcon />

                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Borrowing Limit
                    </p>
                  </div>

                  <p className="mt-2 text-sm font-bold text-slate-800">
                    {settings.maxBooks} books
                  </p>
                </div>

                {/* MEMBERSHIP */}

                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={17} className="text-emerald-600" />

                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Membership Status
                    </p>
                  </div>

                  <p className="mt-2 text-sm font-bold text-emerald-600">
                    {student.status === "inactive" ? "Inactive" : "Active"}
                  </p>
                </div>
              </div>

              {/* =================================================
                  CARD FOOTER
              ================================================= */}

              <div className="mt-7 flex flex-col justify-between gap-4 border-t border-dashed border-slate-300 pt-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Issued by
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {settings.librarianName}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold text-slate-500">
                    Library Contact
                  </p>

                  <p className="mt-1 break-all text-sm font-medium text-slate-700">
                    {settings.libraryEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                BOTTOM BAND
            ================================================= */}

            <div className="bg-slate-950 px-6 py-4 text-center sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
                Digital Library Membership
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                This card is generated by the Smart Library Management System.
              </p>
            </div>
          </div>

          {/* =================================================
              INFO BELOW CARD
          ================================================= */}

          <div className="no-print mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <ShieldCheck className="text-indigo-600" size={22} />

              <h3 className="mt-3 font-bold text-slate-900">
                Verified Identity
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Your Digital Library ID uniquely identifies your library
                account.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <QrCodeIcon />

              <h3 className="mt-3 font-bold text-slate-900">QR Verification</h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Librarians can scan your QR code to quickly access your library
                identity.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <BookOpenIcon />

              <h3 className="mt-3 font-bold text-slate-900">Library Access</h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Use your library identity while issuing and returning books.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// =====================================================
// SMALL ICONS
// =====================================================

const BookOpenIcon = () => {
  return <BookIconFallback />;
};

const BookIconFallback = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-indigo-600"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
};

const QrCodeIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-indigo-600"
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M16 16h2v2h-2z" />
      <path d="M20 16h1v5h-5v-1" />
      <path d="M16 20h2" />
      <path d="M20 12h1" />
      <path d="M12 3v2" />
      <path d="M12 8v1" />
      <path d="M8 12h1" />
      <path d="M3 12h2" />
    </svg>
  );
};

export default LibraryCard;
