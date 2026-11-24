// ============================================================
// SMART LIBRARY MANAGEMENT SYSTEM
// Firebase Authentication Utility
// ============================================================

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  getStudentByEmail,
  getStudentByLibraryId,
} from "../firebase/studentService";

import app from "../firebase/firebaseConfig";

import { getAuth } from "firebase/auth";

// ============================================================
// FIREBASE AUTH
// ============================================================

const firebaseAuth = getAuth(app);

// ============================================================
// CONSTANTS
// ============================================================

const LIBRARIAN_STORAGE_KEY = "librarian";
const STUDENT_STORAGE_KEY = "studentUser";
const STUDENTS_STORAGE_KEY = "students";

// ============================================================
// SAFE JSON PARSER
// ============================================================

const readJSON = (key, fallback = null) => {
  try {
    const value = localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error(`Failed to read ${key}:`, error);

    return fallback;
  }
};

// ============================================================
// SAVE JSON
// ============================================================

const saveJSON = (key, value) => {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);

    return false;
  }
};

// ============================================================
// REMOVE JSON
// ============================================================

const removeJSON = (key) => {
  try {
    localStorage.removeItem(key);

    return true;
  } catch (error) {
    console.error(`Failed to remove ${key}:`, error);

    return false;
  }
};

// ============================================================
// AUTH ERROR MESSAGE
// ============================================================

export const getAuthErrorMessage = (error) => {
  const code = error?.code || "";

  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/user-disabled":
      return "This account has been disabled.";

    case "auth/user-not-found":
      return "No account was found with this email.";

    case "auth/wrong-password":
      return "Incorrect password.";

    case "auth/invalid-credential":
      return "Invalid email or password.";

    case "auth/email-already-in-use":
      return "This email is already registered.";

    case "auth/weak-password":
      return "Password should be at least 6 characters.";

    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";

    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";

    case "auth/operation-not-allowed":
      return "Email and password authentication is not enabled in Firebase.";

    default:
      return (
        error?.message ||
        "Authentication failed. Please try again."
      );
  }
};

// ============================================================
// FIREBASE CURRENT USER
// ============================================================

export const getFirebaseUser = () => {
  return firebaseAuth.currentUser;
};

// ============================================================
// FIREBASE AUTH STATE LISTENER
// ============================================================

export const onAuthChange = (callback) => {
  if (typeof callback !== "function") {
    return () => {};
  }

  return onAuthStateChanged(
    firebaseAuth,
    callback
  );
};

// ============================================================
// LIBRARIAN AUTH
// ============================================================

/**
 * Get currently logged-in librarian.
 */
export const getLibrarian = () => {
  return readJSON(
    LIBRARIAN_STORAGE_KEY,
    null
  );
};

/**
 * Check whether librarian is logged in.
 */
export const isLibrarianLoggedIn = () => {
  const librarian = getLibrarian();

  return Boolean(
    librarian &&
      typeof librarian === "object" &&
      (
        librarian.uid ||
        librarian.email ||
        librarian.id ||
        librarian.name
      )
  );
};

/**
 * Login librarian using Firebase Authentication.
 *
 * Returns:
 * {
 *   success: true,
 *   user: ...
 * }
 *
 * or:
 *
 * {
 *   success: false,
 *   error: ...
 * }
 */
export const loginLibrarian = async (
  email,
  password,
  librarianData = {}
) => {
  try {
    const cleanEmail = String(
      email || ""
    )
      .trim()
      .toLowerCase();

    if (!cleanEmail || !password) {
      return {
        success: false,
        error: "Please enter your email and password.",
      };
    }

    const credential =
      await signInWithEmailAndPassword(
        firebaseAuth,
        cleanEmail,
        password
      );

    const firebaseUser = credential.user;

    const librarian = {
      ...librarianData,

      uid: firebaseUser.uid,

      id:
        librarianData.id ||
        firebaseUser.uid,

      librarianId:
        librarianData.librarianId ||
        `LIBRARIAN-${firebaseUser.uid.slice(0, 8).toUpperCase()}`,

      name:
        librarianData.name ||
        firebaseUser.displayName ||
        "Library Administrator",

      email:
        firebaseUser.email ||
        cleanEmail,

      role: "librarian",

      loginAt:
        new Date().toISOString(),
    };

    const saved = saveJSON(
      LIBRARIAN_STORAGE_KEY,
      librarian
    );

    if (!saved) {
      return {
        success: false,
        error:
          "Login successful, but session could not be saved.",
      };
    }

    // Make sure another student session is not active.
    removeJSON(STUDENT_STORAGE_KEY);

    window.dispatchEvent(
      new Event("libraryDataUpdated")
    );

    return {
      success: true,
      user: librarian,
      firebaseUser,
    };
  } catch (error) {
    console.error(
      "Librarian Firebase login error:",
      error
    );

    return {
      success: false,
      error: getAuthErrorMessage(error),
      firebaseError: error,
    };
  }
};

/**
 * Logout librarian.
 */
export const logoutLibrarian = async () => {
  try {
    await signOut(firebaseAuth);
  } catch (error) {
    console.error(
      "Firebase librarian logout error:",
      error
    );
  } finally {
    removeJSON(
      LIBRARIAN_STORAGE_KEY
    );

    window.dispatchEvent(
      new Event("libraryDataUpdated")
    );
  }
};

// ============================================================
// ADMIN ALIASES
// ============================================================

export const getAdmin = () => {
  return getLibrarian();
};

export const isAdminLoggedIn = () => {
  return isLibrarianLoggedIn();
};

export const loginAdmin = async (
  email,
  password,
  adminData = {}
) => {
  return loginLibrarian(
    email,
    password,
    adminData
  );
};

export const logoutAdmin = async () => {
  return logoutLibrarian();
};

// ============================================================
// STUDENT FIREBASE AUTH REGISTRATION
// ============================================================

/**
 * Create Firebase Authentication account for student.
 *
 * Firestore student data should still be stored through
 * studentService.js.
 */
export const registerStudentAuth = async (
  email,
  password
) => {
  try {
    const cleanEmail = String(
      email || ""
    )
      .trim()
      .toLowerCase();

    if (!cleanEmail || !password) {
      return {
        success: false,
        error:
          "Email and password are required.",
      };
    }

    const credential =
      await createUserWithEmailAndPassword(
        firebaseAuth,
        cleanEmail,
        password
      );

    return {
      success: true,
      user: credential.user,
      uid: credential.user.uid,
    };
  } catch (error) {
    console.error(
      "Student Firebase registration error:",
      error
    );

    return {
      success: false,
      error: getAuthErrorMessage(error),
      firebaseError: error,
    };
  }
};

// ============================================================
// STUDENT AUTH
// ============================================================

/**
 * Get currently logged-in student.
 */
export const getStudent = () => {
  return readJSON(
    STUDENT_STORAGE_KEY,
    null
  );
};

/**
 * Check whether student is logged in.
 */
export const isStudentLoggedIn = () => {
  const student = getStudent();

  return Boolean(
    student &&
      typeof student === "object" &&
      (
        student.uid ||
        student.libraryId ||
        student.studentId ||
        student.id ||
        student.email
      )
  );
};

/**
 * Login student using Firebase Authentication.
 *
 * Student profile is then loaded from Firestore.
 */
export const loginStudent = async (
  email,
  password,
  studentData = {}
) => {
  try {
    const cleanEmail = String(
      email || ""
    )
      .trim()
      .toLowerCase();

    if (!cleanEmail || !password) {
      return {
        success: false,
        error:
          "Please enter your email and password.",
      };
    }

    const credential =
      await signInWithEmailAndPassword(
        firebaseAuth,
        cleanEmail,
        password
      );

    const firebaseUser =
      credential.user;

    let firestoreStudent = null;

    try {
      firestoreStudent =
        await getStudentByEmail(
          cleanEmail
        );
    } catch (firestoreError) {
      console.error(
        "Student Firestore profile lookup error:",
        firestoreError
      );
    }

    const student = {
      ...studentData,
      ...(firestoreStudent || {}),

      uid: firebaseUser.uid,

      email:
        firestoreStudent?.email ||
        firebaseUser.email ||
        cleanEmail,

      role: "student",

      loginAt:
        new Date().toISOString(),
    };

    const saved = saveJSON(
      STUDENT_STORAGE_KEY,
      student
    );

    if (!saved) {
      return {
        success: false,
        error:
          "Login successful, but session could not be saved.",
      };
    }

    // Make sure librarian session is not active.
    removeJSON(
      LIBRARIAN_STORAGE_KEY
    );

    window.dispatchEvent(
      new Event("libraryDataUpdated")
    );

    return {
      success: true,
      user: student,
      firebaseUser,
    };
  } catch (error) {
    console.error(
      "Student Firebase login error:",
      error
    );

    return {
      success: false,
      error: getAuthErrorMessage(error),
      firebaseError: error,
    };
  }
};

/**
 * Logout student.
 */
export const logoutStudent = async () => {
  try {
    await signOut(firebaseAuth);
  } catch (error) {
    console.error(
      "Firebase student logout error:",
      error
    );
  } finally {
    removeJSON(
      STUDENT_STORAGE_KEY
    );

    window.dispatchEvent(
      new Event("libraryDataUpdated")
    );
  }
};

// ============================================================
// STUDENT LOOKUP - LOCAL STORAGE
// ============================================================

/**
 * Get all locally registered students.
 */
export const getStudents = () => {
  const students = readJSON(
    STUDENTS_STORAGE_KEY,
    []
  );

  return Array.isArray(students)
    ? students
    : [];
};

/**
 * Find student using Library ID locally.
 */
export const findStudentByLibraryId = (
  libraryId
) => {
  if (!libraryId) {
    return null;
  }

  const students = getStudents();

  const searchId = String(
    libraryId
  )
    .trim()
    .toLowerCase();

  return (
    students.find((student) => {
      const studentLibraryId =
        String(
          student?.libraryId ||
            student?.studentId ||
            student?.id ||
            ""
        )
          .trim()
          .toLowerCase();

      return (
        studentLibraryId === searchId
      );
    }) || null
  );
};

/**
 * Find student using email locally.
 */
export const findStudentByEmail = (
  email
) => {
  if (!email) {
    return null;
  }

  const students = getStudents();

  const searchEmail = String(
    email
  )
    .trim()
    .toLowerCase();

  return (
    students.find(
      (student) =>
        String(
          student?.email || ""
        )
          .trim()
          .toLowerCase() ===
        searchEmail
    ) || null
  );
};

/**
 * Find student using ID, email,
 * phone or name locally.
 */
export const findStudent = (
  value
) => {
  if (!value) {
    return null;
  }

  const students = getStudents();

  const searchValue = String(
    value
  )
    .trim()
    .toLowerCase();

  return (
    students.find((student) => {
      const libraryId =
        String(
          student?.libraryId ||
            student?.studentId ||
            student?.id ||
            ""
        )
          .trim()
          .toLowerCase();

      const email =
        String(
          student?.email || ""
        )
          .trim()
          .toLowerCase();

      const phone =
        String(
          student?.phone ||
            student?.mobile ||
            student?.phoneNumber ||
            ""
        )
          .trim()
          .toLowerCase();

      const name =
        String(
          student?.name ||
            `${student?.firstName || ""} ${
              student?.lastName || ""
            }`
        )
          .trim()
          .toLowerCase();

      return (
        libraryId === searchValue ||
        email === searchValue ||
        phone === searchValue ||
        name === searchValue
      );
    }) || null
  );
};

// ============================================================
// STUDENT LOOKUP - FIRESTORE
// ============================================================

/**
 * Find student by Library ID from Firestore.
 */
export const findStudentByLibraryIdFromFirebase =
  async (libraryId) => {
    try {
      if (!libraryId) {
        return null;
      }

      return await getStudentByLibraryId(
        libraryId
      );
    } catch (error) {
      console.error(
        "Firebase Library ID lookup error:",
        error
      );

      return null;
    }
  };

/**
 * Find student by email from Firestore.
 */
export const findStudentByEmailFromFirebase =
  async (email) => {
    try {
      if (!email) {
        return null;
      }

      return await getStudentByEmail(
        String(email)
          .trim()
          .toLowerCase()
      );
    } catch (error) {
      console.error(
        "Firebase email lookup error:",
        error
      );

      return null;
    }
  };

// ============================================================
// UNIVERSAL STUDENT FINDER
// ============================================================

/**
 * Find student locally first and then Firebase.
 *
 * This is useful for librarian features such as:
 * - Book Issue
 * - QR Scan
 * - Student search
 */
export const findStudentAnywhere =
  async (value) => {
    if (!value) {
      return null;
    }

    const localStudent =
      findStudent(value);

    if (localStudent) {
      return localStudent;
    }

    const searchValue = String(
      value
    ).trim();

    // Try Library ID.
    const firebaseByLibraryId =
      await findStudentByLibraryIdFromFirebase(
        searchValue
      );

    if (firebaseByLibraryId) {
      return firebaseByLibraryId;
    }

    // Try Email.
    const firebaseByEmail =
      await findStudentByEmailFromFirebase(
        searchValue
      );

    if (firebaseByEmail) {
      return firebaseByEmail;
    }

    return null;
  };

// ============================================================
// CURRENT USER
// ============================================================

/**
 * Return currently logged-in user
 * from local application session.
 */
export const getCurrentUser = () => {
  const librarian =
    getLibrarian();

  if (librarian) {
    return {
      ...librarian,
      role: "librarian",
    };
  }

  const student =
    getStudent();

  if (student) {
    return {
      ...student,
      role: "student",
    };
  }

  return null;
};

// ============================================================
// FIREBASE CURRENT USER + LOCAL ROLE
// ============================================================

export const getAuthenticatedUser =
  () => {
    const firebaseUser =
      getFirebaseUser();

    const currentUser =
      getCurrentUser();

    if (!firebaseUser) {
      return currentUser;
    }

    return {
      ...(currentUser || {}),

      uid:
        currentUser?.uid ||
        firebaseUser.uid,

      email:
        currentUser?.email ||
        firebaseUser.email ||
        "",

      firebaseUser,

      role:
        currentUser?.role ||
        null,
    };
  };

// ============================================================
// AUTHENTICATION CHECK
// ============================================================

export const isAuthenticated = () => {
  return (
    isLibrarianLoggedIn() ||
    isStudentLoggedIn()
  );
};

// ============================================================
// ROLE CHECK
// ============================================================

export const isLibrarian = () => {
  return isLibrarianLoggedIn();
};

export const isStudent = () => {
  return isStudentLoggedIn();
};

// ============================================================
// LOGOUT ALL
// ============================================================

export const logoutAll = async () => {
  try {
    await signOut(firebaseAuth);
  } catch (error) {
    console.error(
      "Firebase logout error:",
      error
    );
  } finally {
    removeJSON(
      LIBRARIAN_STORAGE_KEY
    );

    removeJSON(
      STUDENT_STORAGE_KEY
    );

    window.dispatchEvent(
      new Event("libraryDataUpdated")
    );
  }
};

// ============================================================
// GET FIREBASE ID TOKEN
// ============================================================

/**
 * Get Firebase ID token for the
 * currently authenticated Firebase user.
 *
 * Useful later when backend/API security
 * is added.
 */
export const getFirebaseIdToken =
  async () => {
    try {
      const user =
        getFirebaseUser();

      if (!user) {
        return null;
      }

      return await user.getIdToken();
    } catch (error) {
      console.error(
        "Error getting Firebase ID token:",
        error
      );

      return null;
    }
  };

// ============================================================
// AUTH OBJECT
// ============================================================

const auth = {
  // Firebase
  getFirebaseUser,
  onAuthChange,
  getFirebaseIdToken,
  getAuthenticatedUser,
  getAuthErrorMessage,

  // Librarian
  getLibrarian,
  isLibrarianLoggedIn,
  loginLibrarian,
  logoutLibrarian,

  // Admin aliases
  getAdmin,
  isAdminLoggedIn,
  loginAdmin,
  logoutAdmin,

  // Student
  getStudent,
  isStudentLoggedIn,
  registerStudentAuth,
  loginStudent,
  logoutStudent,

  // Student lookup
  getStudents,
  findStudentByLibraryId,
  findStudentByEmail,
  findStudent,

  // Firebase lookup
  findStudentByLibraryIdFromFirebase,
  findStudentByEmailFromFirebase,
  findStudentAnywhere,

  // Current user
  getCurrentUser,
  isAuthenticated,

  // Roles
  isLibrarian,
  isStudent,

  // Logout
  logoutAll,
};

export default auth;