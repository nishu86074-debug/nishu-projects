import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebaseConfig";

const studentsCollection = collection(db, "students");

/* =====================================================
   GET ALL STUDENTS
===================================================== */

export const getStudentsFromFirestore = async () => {
  try {
    const snapshot = await getDocs(studentsCollection);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));
  } catch (error) {
    console.error("Error fetching students from Firestore:", error);

    throw error;
  }
};

/* =====================================================
   FIND STUDENT BY LIBRARY ID
===================================================== */

export const getStudentByLibraryId = async (libraryId) => {
  try {
    if (!libraryId) {
      return null;
    }

    const studentQuery = query(
      studentsCollection,
      where("libraryId", "==", libraryId),
    );

    const snapshot = await getDocs(studentQuery);

    if (snapshot.empty) {
      return null;
    }

    const studentDoc = snapshot.docs[0];

    return {
      id: studentDoc.id,
      ...studentDoc.data(),
    };
  } catch (error) {
    console.error("Error finding student by Library ID:", error);

    throw error;
  }
};

/* =====================================================
   FIND STUDENT BY EMAIL
===================================================== */

export const getStudentByEmail = async (email) => {
  try {
    if (!email) {
      return null;
    }

    const studentQuery = query(
      studentsCollection,
      where("email", "==", email.toLowerCase()),
    );

    const snapshot = await getDocs(studentQuery);

    if (snapshot.empty) {
      return null;
    }

    const studentDoc = snapshot.docs[0];

    return {
      id: studentDoc.id,
      ...studentDoc.data(),
    };
  } catch (error) {
    console.error("Error finding student by email:", error);

    throw error;
  }
};

/* =====================================================
   ADD STUDENT TO FIRESTORE
===================================================== */

export const addStudentToFirestore = async (student) => {
  try {
    const existingStudent = await getStudentByLibraryId(student.libraryId);

    if (existingStudent) {
      return existingStudent;
    }

    // Make a copy so original student object is not changed
    const studentForFirestore = {
      ...student,
    };

    // Do not store password fields in Firestore
    delete studentForFirestore.password;
    delete studentForFirestore.studentPassword;

    const docRef = await addDoc(studentsCollection, {
      ...studentForFirestore,
      syncedAt: new Date().toISOString(),
    });

    return {
      id: docRef.id,
      ...studentForFirestore,
    };
  } catch (error) {
    console.error("Error adding student to Firestore:", error);

    throw error;
  }
};

/* =====================================================
   UPDATE STUDENT IN FIRESTORE
===================================================== */

export const updateStudentInFirestore = async (firestoreId, studentData) => {
  try {
    if (!firestoreId) {
      throw new Error("Firestore student ID is required.");
    }

    const studentForFirestore = {
      ...studentData,
    };

    // Do not store password fields in Firestore
    delete studentForFirestore.password;
    delete studentForFirestore.studentPassword;

    const studentRef = doc(db, "students", firestoreId);

    await updateDoc(studentRef, {
      ...studentForFirestore,
      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error updating student in Firestore:", error);

    throw error;
  }
};

/* =====================================================
   UPDATE STUDENT BY LIBRARY ID
===================================================== */

export const updateStudentByLibraryId = async (libraryId, studentData) => {
  try {
    if (!libraryId) {
      throw new Error("Library ID is required.");
    }

    const student = await getStudentByLibraryId(libraryId);

    if (!student) {
      throw new Error("Student not found in Firestore.");
    }

    const studentForFirestore = {
      ...studentData,
    };

    // Do not store password fields in Firestore
    delete studentForFirestore.password;
    delete studentForFirestore.studentPassword;

    const studentRef = doc(db, "students", student.id);

    await updateDoc(studentRef, {
      ...studentForFirestore,
      updatedAt: new Date().toISOString(),
    });

    return {
      id: student.id,
      ...student,
      ...studentForFirestore,
    };
  } catch (error) {
    console.error("Error updating student by Library ID:", error);

    throw error;
  }
};

/* =====================================================
   UPDATE STUDENT BOOK COUNT
===================================================== */

export const updateStudentBookCount = async (firestoreId, issuedBooksCount) => {
  try {
    if (!firestoreId) {
      throw new Error("Firestore student ID is required.");
    }

    const studentRef = doc(db, "students", firestoreId);

    await updateDoc(studentRef, {
      issuedBooksCount: Math.max(0, Number(issuedBooksCount || 0)),

      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error updating student book count:", error);

    throw error;
  }
};

/* =====================================================
   DELETE STUDENT FROM FIRESTORE
===================================================== */

export const deleteStudentFromFirestore = async (firestoreId) => {
  try {
    if (!firestoreId) {
      throw new Error("Firestore student ID is required.");
    }

    await deleteDoc(doc(db, "students", firestoreId));

    return true;
  } catch (error) {
    console.error("Error deleting student from Firestore:", error);

    throw error;
  }
};
