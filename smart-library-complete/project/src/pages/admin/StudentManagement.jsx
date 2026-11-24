import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  X,
  Library,
  AlertCircle,
} from "lucide-react";

import {
  getStudentsFromFirestore,
  deleteStudentFromFirestore,
} from "../../firebase/studentService";

/* =========================================================
   DEFAULT SETTINGS
========================================================= */

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

/* =========================================================
   STORAGE HELPERS
========================================================= */

const readStorage = (key, fallback = []) => {
  try {
    const saved = localStorage.getItem(key);

    if (!saved) {
      return fallback;
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);

    return fallback;
  }
};

const readObjectStorage = (key, fallback = null) => {
  try {
    const saved = localStorage.getItem(key);

    if (!saved) {
      return fallback;
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error(`Error reading ${key}:`, error);

    return fallback;
  }
};

const getLibrarySettings = () => {
  try {
    const saved = localStorage.getItem("librarySettings");

    if (!saved) {
      return DEFAULT_LIBRARY_SETTINGS;
    }

    const parsed = JSON.parse(saved);

    return {
      ...DEFAULT_LIBRARY_SETTINGS,
      ...parsed,
    };
  } catch (error) {
    console.error("Error loading library settings:", error);

    return DEFAULT_LIBRARY_SETTINGS;
  }
};

/* =========================================================
   STUDENT HELPERS
========================================================= */

const getStudentName = (student) => {
  return student?.name || student?.fullName || "Student";
};

const getStudentLibraryId = (student) => {
  return (
    student?.libraryId ||
    student?.studentLibraryId ||
    student?.studentId ||
    student?.id ||
    "-"
  );
};

const getStudentKey = (student) => {
  return String(
    student?.libraryId ||
      student?.studentLibraryId ||
      student?.studentId ||
      student?.id ||
      "",
  );
};

const getStudentPhoto = (student) => {
  return student?.photo || student?.image || "";
};

const getStudentCourse = (student) => {
  return (
    student?.course ||
    student?.program ||
    student?.department ||
    "Library Student"
  );
};

/* =========================================================
   ISSUE HELPERS
========================================================= */

const isReturnedIssue = (issue) => {
  return (
    String(issue?.status || "").toLowerCase() === "returned" ||
    Boolean(issue?.returnDate)
  );
};

const getIssueStudentId = (issue) => {
  return String(
    issue?.studentLibraryId || issue?.studentId || issue?.libraryId || "",
  );
};

const getDaysOverdue = (issue) => {
  if (!issue?.dueDate || isReturnedIssue(issue)) {
    return 0;
  }

  const dueDate = new Date(`${issue.dueDate}T23:59:59`);

  const today = new Date();

  if (Number.isNaN(dueDate.getTime())) {
    return 0;
  }

  if (today <= dueDate) {
    return 0;
  }

  const difference = today.getTime() - dueDate.getTime();

  return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
};

const getIssueFine = (issue, finePerDay) => {
  const storedFine = Number(issue?.fine || 0);

  if (storedFine > 0) {
    return storedFine;
  }

  if (isReturnedIssue(issue)) {
    return 0;
  }

  const overdueDays = getDaysOverdue(issue);

  if (overdueDays <= 0) {
    return 0;
  }

  return overdueDays * Number(finePerDay || 0);
};

const getStudentActiveBooks = (student, issuedBooks) => {
  const studentId = getStudentKey(student);

  if (!studentId) {
    return [];
  }

  return issuedBooks.filter(
    (issue) =>
      getIssueStudentId(issue) === studentId && !isReturnedIssue(issue),
  );
};

const getStudentReturnedBooks = (student, issuedBooks) => {
  const studentId = getStudentKey(student);

  if (!studentId) {
    return [];
  }

  return issuedBooks.filter(
    (issue) => getIssueStudentId(issue) === studentId && isReturnedIssue(issue),
  );
};

const getStudentFine = (student, issuedBooks, finePerDay) => {
  const studentId = getStudentKey(student);

  if (!studentId) {
    return 0;
  }

  const studentIssues = issuedBooks.filter(
    (issue) => getIssueStudentId(issue) === studentId,
  );

  return studentIssues.reduce((total, issue) => {
    return total + getIssueFine(issue, finePerDay);
  }, 0);
};

/* =========================================================
   MERGE LOCAL + FIREBASE STUDENTS
========================================================= */

const mergeStudents = (localStudents, firebaseStudents) => {
  const studentMap = new Map();

  localStudents.forEach((student) => {
    const key = getStudentKey(student);

    if (!key || key === "-") {
      return;
    }

    studentMap.set(key, {
      ...student,
    });
  });

  firebaseStudents.forEach((student) => {
    const key = getStudentKey(student);

    if (!key || key === "-") {
      return;
    }

    const existing = studentMap.get(key);

    const firestoreId =
      student?.id || student?.firestoreId || existing?.firestoreId || "";

    studentMap.set(key, {
      ...(existing || {}),
      ...student,

      firestoreId,

      firebaseId:
        student?.firebaseId || firestoreId || existing?.firebaseId || "",
    });
  });

  return Array.from(studentMap.values());
};

/* =========================================================
   COMPONENT
========================================================= */

const StudentManagement = () => {
  const navigate = useNavigate();

  const [librarian] = useState(() => readObjectStorage("librarian", null));

  const [students, setStudents] = useState(() => readStorage("students", []));

  const [issuedBooks, setIssuedBooks] = useState(() =>
    readStorage("issuedBooks", []),
  );

  const [librarySettings, setLibrarySettings] = useState(() =>
    getLibrarySettings(),
  );

  const [search, setSearch] = useState("");

  const [selectedStudent, setSelectedStudent] = useState(null);

  /* =======================================================
     FIREBASE LOAD
  ======================================================= */

  const loadFirebaseStudents = async () => {
    try {
      const localStudents = readStorage("students", []);

      const firebaseStudents = await getStudentsFromFirestore();

      const safeFirebaseStudents = Array.isArray(firebaseStudents)
        ? firebaseStudents
        : [];

      const mergedStudents = mergeStudents(localStudents, safeFirebaseStudents);

      setStudents(mergedStudents);

      localStorage.setItem("students", JSON.stringify(mergedStudents));

      return mergedStudents;
    } catch (error) {
      console.error("Firebase student loading error:", error);

      return null;
    }
  };

  /* =======================================================
     INITIAL FIREBASE LOAD
     
     IMPORTANT:
     setTimeout prevents the React
     set-state-in-effect ESLint error.
  ======================================================= */

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFirebaseStudents();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  /* =======================================================
     EVENT LISTENERS
======================================================= */

  useEffect(() => {
    const handleStorageChange = () => {
      const updatedStudents = readStorage("students", []);

      const updatedIssues = readStorage("issuedBooks", []);

      const updatedSettings = getLibrarySettings();

      setStudents(updatedStudents);

      setIssuedBooks(updatedIssues);

      setLibrarySettings(updatedSettings);
    };

    const handleLibraryDataUpdated = () => {
      const updatedStudents = readStorage("students", []);

      const updatedIssues = readStorage("issuedBooks", []);

      setStudents(updatedStudents);

      setIssuedBooks(updatedIssues);

      setTimeout(() => {
        loadFirebaseStudents();
      }, 0);
    };

    const handleSettingsUpdated = () => {
      setLibrarySettings(getLibrarySettings());
    };

    window.addEventListener("storage", handleStorageChange);

    window.addEventListener("libraryDataUpdated", handleLibraryDataUpdated);

    window.addEventListener("librarySettingsUpdated", handleSettingsUpdated);

    return () => {
      window.removeEventListener("storage", handleStorageChange);

      window.removeEventListener(
        "libraryDataUpdated",
        handleLibraryDataUpdated,
      );

      window.removeEventListener(
        "librarySettingsUpdated",
        handleSettingsUpdated,
      );
    };
  }, []);

  /* =======================================================
     AUTH CHECK
======================================================= */

  useEffect(() => {
    if (!librarian) {
      navigate("/admin-login", {
        replace: true,
      });
    }
  }, [librarian, navigate]);

  /* =======================================================
     SETTINGS VALUES
======================================================= */

  const institutionName =
    librarySettings?.institutionName ||
    DEFAULT_LIBRARY_SETTINGS.institutionName;

  const libraryName =
    librarySettings?.libraryName || DEFAULT_LIBRARY_SETTINGS.libraryName;

  const libraryEmail =
    librarySettings?.libraryEmail || DEFAULT_LIBRARY_SETTINGS.libraryEmail;

  const librarianName =
    librarian?.name ||
    librarian?.fullName ||
    librarySettings?.librarianName ||
    DEFAULT_LIBRARY_SETTINGS.librarianName;

  const finePerDay = Number(librarySettings?.finePerDay) || 0;

  const maxBooks =
    Number(librarySettings?.maxBooks) || DEFAULT_LIBRARY_SETTINGS.maxBooks;

  /* =======================================================
     ENRICH STUDENTS
======================================================= */

  const enrichedStudents = useMemo(() => {
    return students.map((student) => {
      const activeBooks = getStudentActiveBooks(student, issuedBooks);

      const returnedBooks = getStudentReturnedBooks(student, issuedBooks);

      const fine = getStudentFine(student, issuedBooks, finePerDay);

      return {
        ...student,

        issuedBooksCount: activeBooks.length,

        returnedBooksCount:
          Number(student?.returnedBooksCount || 0) || returnedBooks.length,

        fine,

        status: student?.status || "Active",
      };
    });
  }, [students, issuedBooks, finePerDay]);

  /* =======================================================
     SEARCH
======================================================= */

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return enrichedStudents;
    }

    return enrichedStudents.filter((student) => {
      const name = getStudentName(student).toLowerCase();

      const email = String(student?.email || "").toLowerCase();

      const phone = String(student?.phone || "").toLowerCase();

      const libraryId = String(getStudentLibraryId(student)).toLowerCase();

      const course = String(getStudentCourse(student)).toLowerCase();

      const department = String(student?.department || "").toLowerCase();

      return (
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        libraryId.includes(query) ||
        course.includes(query) ||
        department.includes(query)
      );
    });
  }, [enrichedStudents, search]);

  /* =======================================================
     STATS
======================================================= */

  const activeStudents = enrichedStudents.filter(
    (student) => String(student?.status || "Active").toLowerCase() === "active",
  ).length;

  const totalIssuedBooks = enrichedStudents.reduce(
    (total, student) => total + Number(student?.issuedBooksCount || 0),
    0,
  );

  const totalFine = enrichedStudents.reduce(
    (total, student) => total + Number(student?.fine || 0),
    0,
  );

  /* =======================================================
     DELETE STUDENT
======================================================= */

  const handleDelete = async (student) => {
    const studentId = getStudentKey(student);

    if (!studentId || studentId === "-") {
      toast.error("Student ID not found.");

      return;
    }

    const activeBooks = getStudentActiveBooks(student, issuedBooks);

    if (activeBooks.length > 0) {
      toast.error(
        "This student has active issued books and cannot be deleted.",
      );

      return;
    }

    const studentName = getStudentName(student);

    const confirmed = window.confirm(
      `Delete ${studentName}?\n\nThis student has no active issued books.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const firestoreId = student?.firestoreId || student?.firebaseId || "";

      if (firestoreId) {
        await deleteStudentFromFirestore(firestoreId);
      }

      const updatedStudents = students.filter(
        (item) => getStudentKey(item) !== studentId,
      );

      setStudents(updatedStudents);

      localStorage.setItem("students", JSON.stringify(updatedStudents));

      if (selectedStudent && getStudentKey(selectedStudent) === studentId) {
        setSelectedStudent(null);
      }

      window.dispatchEvent(new Event("libraryDataUpdated"));

      toast.success("Student deleted successfully.");
    } catch (error) {
      console.error("Student delete error:", error);

      toast.error("Unable to delete student from Firebase.");
    }
  };

  /* =======================================================
     DETAILS
======================================================= */

  const openStudentDetails = (student) => {
    setSelectedStudent(student);
  };

  /* =======================================================
     AUTH
======================================================= */

  if (!librarian) {
    return null;
  }

  /* =======================================================
     UI
======================================================= */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin-dashboard")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Users size={22} className="text-indigo-600" />

                <h1 className="text-xl font-bold text-slate-900">
                  Student Management
                </h1>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {libraryName} • Manage registered students
              </p>
            </div>
          </div>

          <Link
            to="/add-student"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Student
          </Link>
        </div>
      </header>

      {/* MAIN */}

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* LIBRARY INFO */}

        <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                <Library size={20} />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
                  Institution
                </p>

                <p className="font-bold text-indigo-900">{institutionName}</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs text-indigo-500">Librarian</p>

              <p className="text-sm font-semibold text-indigo-900">
                {librarianName}
              </p>
            </div>
          </div>
        </div>

        {/* STATS */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Students</p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {enrichedStudents.length}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <Users size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Students</p>

                <p className="mt-2 text-3xl font-bold text-emerald-600">
                  {activeStudents}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <GraduationCap size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Books</p>

                <p className="mt-2 text-3xl font-bold text-amber-600">
                  {totalIssuedBooks}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <BookOpen size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Current Fine</p>

                <p className="mt-2 text-3xl font-bold text-red-600">
                  ₹{totalFine}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 font-bold text-red-600">
                ₹
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, Library ID, email, phone or course..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {search && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-700">
                  {filteredStudents.length}
                </span>{" "}
                student
                {filteredStudents.length !== 1 ? "s" : ""}
              </p>

              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs font-semibold text-indigo-600"
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        {/* STUDENTS */}

        <div className="mt-6">
          {filteredStudents.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Users size={30} />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-900">
                No students found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                {enrichedStudents.length === 0
                  ? "No students have been registered yet."
                  : "No student matches your search."}
              </p>

              {enrichedStudents.length === 0 && (
                <Link
                  to="/add-student"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  <Plus size={18} />
                  Add First Student
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}

              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Student
                        </th>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Library ID
                        </th>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Contact
                        </th>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Books
                        </th>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Fine
                        </th>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Status
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student) => {
                        const activeCount = getStudentActiveBooks(
                          student,
                          issuedBooks,
                        ).length;

                        const fine = getStudentFine(
                          student,
                          issuedBooks,
                          finePerDay,
                        );

                        const status = student?.status || "Active";

                        return (
                          <tr
                            key={getStudentKey(student)}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-indigo-600">
                                  {getStudentPhoto(student) ? (
                                    <img
                                      src={getStudentPhoto(student)}
                                      alt={getStudentName(student)}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <User size={20} />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900">
                                    {getStudentName(student)}
                                  </p>

                                  <p className="mt-1 truncate text-xs text-slate-500">
                                    {getStudentCourse(student)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                                {getStudentLibraryId(student)}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="max-w-xs space-y-1 text-sm">
                                <p className="flex items-center gap-2 text-slate-700">
                                  <Mail size={14} />

                                  <span className="truncate">
                                    {student?.email || "-"}
                                  </span>
                                </p>

                                <p className="flex items-center gap-2 text-slate-500">
                                  <Phone size={14} />

                                  {student?.phone || "-"}
                                </p>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm">
                              <span className="font-bold text-slate-900">
                                {activeCount}
                              </span>

                              <span className="text-slate-400">
                                /{maxBooks}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={
                                  fine > 0
                                    ? "font-bold text-red-600"
                                    : "font-semibold text-emerald-600"
                                }
                              >
                                ₹{fine}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                                  String(status).toLowerCase() === "active"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {status}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openStudentDetails(student)}
                                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  View
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(student)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOBILE CARDS */}

              <div className="grid gap-4 lg:hidden">
                {filteredStudents.map((student) => {
                  const activeCount = getStudentActiveBooks(
                    student,
                    issuedBooks,
                  ).length;

                  const fine = getStudentFine(student, issuedBooks, finePerDay);

                  const status = student?.status || "Active";

                  return (
                    <div
                      key={getStudentKey(student)}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-indigo-600">
                          {getStudentPhoto(student) ? (
                            <img
                              src={getStudentPhoto(student)}
                              alt={getStudentName(student)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User size={24} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-bold text-slate-900">
                            {getStudentName(student)}
                          </h3>

                          <p className="mt-1 text-xs font-bold text-indigo-600">
                            {getStudentLibraryId(student)}
                          </p>

                          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                            <Mail size={14} />

                            <span className="truncate">
                              {student?.email || "-"}
                            </span>
                          </p>

                          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                            <Phone size={14} />

                            {student?.phone || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-slate-50 p-3 text-center">
                          <p className="text-xs text-slate-500">Books</p>

                          <p className="mt-1 font-bold text-slate-900">
                            {activeCount}
                            <span className="text-xs text-slate-400">
                              /{maxBooks}
                            </span>
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3 text-center">
                          <p className="text-xs text-slate-500">Fine</p>

                          <p
                            className={`mt-1 font-bold ${
                              fine > 0 ? "text-red-600" : "text-emerald-600"
                            }`}
                          >
                            ₹{fine}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3 text-center">
                          <p className="text-xs text-slate-500">Status</p>

                          <p
                            className={`mt-1 text-xs font-bold ${
                              String(status).toLowerCase() === "active"
                                ? "text-emerald-600"
                                : "text-slate-500"
                            }`}
                          >
                            {status}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => openStudentDetails(student)}
                          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View Details
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(student)}
                          className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* DETAILS MODAL */}

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Student Details
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Digital Library Profile
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="px-6 py-6">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-indigo-100 text-indigo-600">
                  {getStudentPhoto(selectedStudent) ? (
                    <img
                      src={getStudentPhoto(selectedStudent)}
                      alt={getStudentName(selectedStudent)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={40} />
                  )}
                </div>

                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  {getStudentName(selectedStudent)}
                </h3>

                <p className="mt-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  {getStudentLibraryId(selectedStudent)}
                </p>

                <span
                  className={`mt-3 rounded-full px-3 py-1 text-xs font-bold ${
                    String(
                      selectedStudent?.status || "Active",
                    ).toLowerCase() === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {selectedStudent?.status || "Active"}
                </span>
              </div>

              {/* SUMMARY */}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-indigo-50 p-4">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <BookOpen size={17} />

                    <span className="text-xs font-semibold">Active Books</span>
                  </div>

                  <p className="mt-2 text-2xl font-bold text-indigo-900">
                    {getStudentActiveBooks(selectedStudent, issuedBooks).length}
                  </p>
                </div>

                <div className="rounded-2xl bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle size={17} />

                    <span className="text-xs font-semibold">Current Fine</span>
                  </div>

                  <p className="mt-2 text-2xl font-bold text-red-700">
                    ₹{getStudentFine(selectedStudent, issuedBooks, finePerDay)}
                  </p>
                </div>
              </div>

              {/* STUDENT INFORMATION */}

              <div className="mt-6 space-y-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Full Name</p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {getStudentName(selectedStudent)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Library ID</p>

                  <p className="mt-1 font-semibold text-indigo-700">
                    {getStudentLibraryId(selectedStudent)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Email</p>

                  <p className="mt-1 break-all font-semibold text-slate-800">
                    {selectedStudent?.email || "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Phone</p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedStudent?.phone || "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Course / Program</p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedStudent?.course || selectedStudent?.program || "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Department</p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedStudent?.department || "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Academic Year</p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedStudent?.year ||
                      selectedStudent?.academicYear ||
                      "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={15} className="text-slate-500" />

                    <p className="text-xs text-slate-500">Registered On</p>
                  </div>

                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedStudent?.createdAt
                      ? new Date(selectedStudent.createdAt).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "-"}
                  </p>
                </div>
              </div>

              {/* ACTIVE BOOKS */}

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Active Books</h3>

                  <span className="text-xs font-semibold text-slate-500">
                    {getStudentActiveBooks(selectedStudent, issuedBooks).length}
                    /{maxBooks}
                  </span>
                </div>

                {getStudentActiveBooks(selectedStudent, issuedBooks).length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                    <BookOpen size={24} className="mx-auto text-slate-400" />

                    <p className="mt-2 text-sm text-slate-500">
                      No active books
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getStudentActiveBooks(selectedStudent, issuedBooks).map(
                      (issue, index) => {
                        const overdue = getDaysOverdue(issue);

                        const issueFine = getIssueFine(issue, finePerDay);

                        return (
                          <div
                            key={
                              issue?.id ||
                              issue?.issueId ||
                              `${issue?.bookId}-${index}`
                            }
                            className="rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">
                                  {issue?.bookTitle ||
                                    issue?.title ||
                                    issue?.bookName ||
                                    "Book"}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {issue?.bookAuthor ||
                                    issue?.author ||
                                    "Unknown Author"}
                                </p>
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                                  overdue > 0
                                    ? "bg-red-100 text-red-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {overdue > 0 ? "Overdue" : "Issued"}
                              </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-lg bg-slate-50 p-2.5">
                                <p className="text-slate-400">Issue Date</p>

                                <p className="mt-1 font-semibold text-slate-700">
                                  {issue?.issueDate || "-"}
                                </p>
                              </div>

                              <div className="rounded-lg bg-slate-50 p-2.5">
                                <p className="text-slate-400">Due Date</p>

                                <p className="mt-1 font-semibold text-slate-700">
                                  {issue?.dueDate || "-"}
                                </p>
                              </div>
                            </div>

                            {overdue > 0 && (
                              <div className="mt-3 rounded-lg bg-red-50 p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-red-600">
                                    {overdue} day
                                    {overdue !== 1 ? "s" : ""} overdue
                                  </span>

                                  <span className="font-bold text-red-700">
                                    ₹{issueFine}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>

              {/* RETURNED BOOKS */}

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Returned Books</h3>

                  <span className="text-xs font-semibold text-slate-500">
                    {
                      getStudentReturnedBooks(selectedStudent, issuedBooks)
                        .length
                    }
                  </span>
                </div>

                {getStudentReturnedBooks(selectedStudent, issuedBooks)
                  .length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                    <BookOpen size={24} className="mx-auto text-slate-400" />

                    <p className="mt-2 text-sm text-slate-500">
                      No returned books
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getStudentReturnedBooks(selectedStudent, issuedBooks)
                      .slice(0, 5)
                      .map((issue, index) => (
                        <div
                          key={
                            issue?.id ||
                            issue?.issueId ||
                            `${issue?.bookId}-${index}`
                          }
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <p className="font-semibold text-slate-800">
                            {issue?.bookTitle ||
                              issue?.title ||
                              issue?.bookName ||
                              "Book"}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                            <span>Issued: {issue?.issueDate || "-"}</span>

                            <span>Returned: {issue?.returnDate || "-"}</span>
                          </div>

                          {Number(issue?.fine || 0) > 0 && (
                            <p className="mt-2 text-xs font-semibold text-red-600">
                              Fine: ₹{issue.fine}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* MODAL BUTTONS */}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(selectedStudent)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  Delete Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left lg:px-8">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {libraryName}
            </p>

            <p className="mt-1 text-xs text-slate-500">{institutionName}</p>
          </div>

          <div>
            <p className="text-xs text-slate-500">{libraryEmail}</p>

            <p className="mt-1 text-xs text-slate-400">
              Fine: ₹{finePerDay} per overdue day
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudentManagement;
