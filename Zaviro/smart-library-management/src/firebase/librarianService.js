import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { db } from "./firebaseConfig";
import { auth } from "./firebaseConfig";

const librariansCollection = collection(db, "librarians");

const DEFAULT_LIBRARIAN = {
  id: "LIBRARIAN-001",
  librarianId: "LIBRARIAN-001",
  name: "Library Administrator",
  email: "library@example.com",
  role: "librarian",
  status: "Active",
};

/* =====================================================
   GET ALL LIBRARIANS
===================================================== */

export const getLibrariansFromFirestore = async () => {
  try {
    const snapshot = await getDocs(librariansCollection);

    return snapshot.docs.map((item) => ({
      id: item.id,
      firestoreId: item.id,
      ...item.data(),
    }));
  } catch (error) {
    console.error(
      "Error fetching librarians from Firestore:",
      error
    );

    throw error;
  }
};

/* =====================================================
   GET LIBRARIAN BY EMAIL
===================================================== */

export const getLibrarianByEmail = async (email) => {
  try {
    if (!email) {
      return null;
    }

    const cleanEmail = email.trim().toLowerCase();

    const librarianQuery = query(
      librariansCollection,
      where("email", "==", cleanEmail)
    );

    const snapshot = await getDocs(librarianQuery);

    if (snapshot.empty) {
      return null;
    }

    const librarianDoc = snapshot.docs[0];

    return {
      id: librarianDoc.id,
      firestoreId: librarianDoc.id,
      ...librarianDoc.data(),
    };
  } catch (error) {
    console.error(
      "Error finding librarian by email:",
      error
    );

    throw error;
  }
};

/* =====================================================
   GET LIBRARIAN BY FIRESTORE ID
===================================================== */

export const getLibrarianById = async (firestoreId) => {
  try {
    if (!firestoreId) {
      return null;
    }

    const librarianRef = doc(
      db,
      "librarians",
      firestoreId
    );

    const librarianSnapshot = await getDoc(
      librarianRef
    );

    if (!librarianSnapshot.exists()) {
      return null;
    }

    return {
      id: librarianSnapshot.id,
      firestoreId: librarianSnapshot.id,
      ...librarianSnapshot.data(),
    };
  } catch (error) {
    console.error(
      "Error fetching librarian:",
      error
    );

    throw error;
  }
};

/* =====================================================
   CREATE LIBRARIAN FIRESTORE PROFILE
===================================================== */

export const createLibrarianProfile = async (
  librarian,
  firestoreId
) => {
  try {
    if (!librarian?.email) {
      throw new Error(
        "Librarian email is required."
      );
    }

    const cleanEmail =
      librarian.email.trim().toLowerCase();

    const profileId =
      firestoreId ||
      librarian.firestoreId ||
      librarian.id ||
      librarian.librarianId ||
      "LIBRARIAN-001";

    const librarianData = {
      librarianId:
        librarian.librarianId ||
        librarian.id ||
        "LIBRARIAN-001",

      name:
        librarian.name ||
        "Library Administrator",

      email: cleanEmail,

      role:
        librarian.role ||
        "librarian",

      status:
        librarian.status ||
        "Active",

      updatedAt:
        new Date().toISOString(),

      createdAt:
        librarian.createdAt ||
        new Date().toISOString(),
    };

    await setDoc(
      doc(db, "librarians", profileId),
      librarianData,
      {
        merge: true,
      }
    );

    return {
      id: profileId,
      firestoreId: profileId,
      ...librarianData,
    };
  } catch (error) {
    console.error(
      "Error creating librarian profile:",
      error
    );

    throw error;
  }
};

/* =====================================================
   UPDATE LIBRARIAN
===================================================== */

export const updateLibrarianInFirestore = async (
  firestoreId,
  librarianData
) => {
  try {
    if (!firestoreId) {
      throw new Error(
        "Firestore librarian ID is required."
      );
    }

    const updateData = {
      ...librarianData,
      updatedAt: new Date().toISOString(),
    };

    delete updateData.password;

    await updateDoc(
      doc(
        db,
        "librarians",
        firestoreId
      ),
      updateData
    );

    return true;
  } catch (error) {
    console.error(
      "Error updating librarian:",
      error
    );

    throw error;
  }
};

/* =====================================================
   CREATE FIREBASE AUTH USER
===================================================== */

export const createLibrarianAuthUser = async (
  email,
  password
) => {
  try {
    if (!email || !password) {
      throw new Error(
        "Email and password are required."
      );
    }

    const cleanEmail =
      email.trim().toLowerCase();

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

    return userCredential.user;
  } catch (error) {
    console.error(
      "Error creating librarian auth user:",
      error
    );

    throw error;
  }
};

/* =====================================================
   LIBRARIAN LOGIN
===================================================== */

export const loginLibrarian = async (
  email,
  password
) => {
  try {
    if (!email || !password) {
      throw new Error(
        "Email and password are required."
      );
    }

    const cleanEmail =
      email.trim().toLowerCase();

    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

    const firebaseUser =
      userCredential.user;

    const librarian =
      await getLibrarianByEmail(
        firebaseUser.email
      );

    if (!librarian) {
      await signOut(auth);

      throw new Error(
        "Librarian profile not found."
      );
    }

    if (
      String(librarian.status).toLowerCase() !==
      "active"
    ) {
      await signOut(auth);

      throw new Error(
        "Librarian account is inactive."
      );
    }

    return {
      ...librarian,
      uid: firebaseUser.uid,
      email:
        firebaseUser.email ||
        librarian.email,
      loginAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      "Librarian login error:",
      error
    );

    throw error;
  }
};

/* =====================================================
   LIBRARIAN LOGOUT
===================================================== */

export const logoutLibrarian = async () => {
  try {
    await signOut(auth);

    return true;
  } catch (error) {
    console.error(
      "Librarian logout error:",
      error
    );

    throw error;
  }
};

/* =====================================================
   DEFAULT LIBRARIAN
===================================================== */

export const getDefaultLibrarian = () => {
  return {
    ...DEFAULT_LIBRARIAN,
  };
};