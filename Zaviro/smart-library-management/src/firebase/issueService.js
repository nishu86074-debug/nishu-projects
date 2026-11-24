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

const issuesCollection = collection(db, "issuedBooks");

/* =====================================================
   GET ALL ISSUES
===================================================== */

export const getIssuesFromFirestore = async () => {
  try {
    const snapshot = await getDocs(issuesCollection);

    return snapshot.docs.map((item) => ({
      id: item.id,
      firestoreId: item.id,
      ...item.data(),
    }));
  } catch (error) {
    console.error("Error fetching issued books from Firestore:", error);

    throw error;
  }
};

/* =====================================================
   GET ISSUE BY ISSUE ID
===================================================== */

export const getIssueByIssueId = async (issueId) => {
  try {
    if (!issueId) {
      return null;
    }

    const issueQuery = query(issuesCollection, where("issueId", "==", issueId));

    const snapshot = await getDocs(issueQuery);

    if (snapshot.empty) {
      return null;
    }

    const issueDoc = snapshot.docs[0];

    return {
      id: issueDoc.id,
      firestoreId: issueDoc.id,
      ...issueDoc.data(),
    };
  } catch (error) {
    console.error("Error finding issue by Issue ID:", error);

    throw error;
  }
};

/* =====================================================
   GET ISSUES BY STUDENT
===================================================== */

export const getIssuesByStudent = async (libraryId) => {
  try {
    if (!libraryId) {
      return [];
    }

    const issueQuery = query(
      issuesCollection,
      where("studentLibraryId", "==", libraryId),
    );

    const snapshot = await getDocs(issueQuery);

    return snapshot.docs.map((item) => ({
      id: item.id,
      firestoreId: item.id,
      ...item.data(),
    }));
  } catch (error) {
    console.error("Error fetching student issues:", error);

    throw error;
  }
};

/* =====================================================
   GET ACTIVE ISSUES BY STUDENT
===================================================== */

export const getActiveIssuesByStudent = async (libraryId) => {
  try {
    if (!libraryId) {
      return [];
    }

    const issueQuery = query(
      issuesCollection,
      where("studentLibraryId", "==", libraryId),
      where("status", "==", "Issued"),
    );

    const snapshot = await getDocs(issueQuery);

    return snapshot.docs.map((item) => ({
      id: item.id,
      firestoreId: item.id,
      ...item.data(),
    }));
  } catch (error) {
    console.error("Error fetching active student issues:", error);

    throw error;
  }
};

/* =====================================================
   ADD ISSUE
===================================================== */

export const addIssueToFirestore = async (issue) => {
  try {
    if (!issue) {
      throw new Error("Issue data is required.");
    }

    if (issue?.issueId) {
      const existingIssue = await getIssueByIssueId(issue.issueId);

      if (existingIssue) {
        return existingIssue;
      }
    }

    const issueData = {
      ...issue,
      syncedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(issuesCollection, issueData);

    return {
      id: docRef.id,
      firestoreId: docRef.id,
      ...issueData,
    };
  } catch (error) {
    console.error("Error adding issue to Firestore:", error);

    throw error;
  }
};

/* =====================================================
   UPDATE ISSUE BY FIRESTORE ID
===================================================== */

export const updateIssueInFirestore = async (firestoreId, issueData) => {
  try {
    if (!firestoreId) {
      throw new Error("Firestore issue ID is required.");
    }

    if (!issueData) {
      throw new Error("Issue data is required.");
    }

    const issueRef = doc(db, "issuedBooks", firestoreId);

    await updateDoc(issueRef, {
      ...issueData,

      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error updating issue in Firestore:", error);

    throw error;
  }
};

/* =====================================================
   UPDATE ISSUE BY ISSUE ID
===================================================== */

export const updateIssueByIssueId = async (issueId, issueData) => {
  try {
    if (!issueId) {
      throw new Error("Issue ID is required.");
    }

    if (!issueData) {
      throw new Error("Issue data is required.");
    }

    const existingIssue = await getIssueByIssueId(issueId);

    if (!existingIssue) {
      console.warn("Issue not found in Firestore:", issueId);

      return null;
    }

    const issueRef = doc(db, "issuedBooks", existingIssue.firestoreId);

    const updatedData = {
      ...issueData,

      updatedAt: new Date().toISOString(),
    };

    await updateDoc(issueRef, updatedData);

    return {
      ...existingIssue,
      ...updatedData,
    };
  } catch (error) {
    console.error("Error updating issue by Issue ID:", error);

    throw error;
  }
};

/* =====================================================
   MARK FINE AS PAID
===================================================== */

export const markFineAsPaid = async ({
  issueId,
  paymentMethod,
  paymentAmount,
}) => {
  try {
    if (!issueId) {
      throw new Error("Issue ID is required.");
    }

    const existingIssue = await getIssueByIssueId(issueId);

    if (!existingIssue) {
      throw new Error("Issue not found in Firestore.");
    }

    const paymentDate = new Date().toISOString();

    const paymentData = {
      fineStatus: "Paid",

      paymentStatus: "Paid",

      finePaid: true,

      paymentMethod: paymentMethod || "Cash",

      finePaidAmount: Number(paymentAmount || 0),

      paymentDate,

      finePaidAt: paymentDate,

      updatedAt: paymentDate,
    };

    const issueRef = doc(db, "issuedBooks", existingIssue.firestoreId);

    await updateDoc(issueRef, paymentData);

    return {
      ...existingIssue,
      ...paymentData,
    };
  } catch (error) {
    console.error("Error marking fine as paid:", error);

    throw error;
  }
};

/* =====================================================
   DELETE ISSUE
===================================================== */

export const deleteIssueFromFirestore = async (firestoreId) => {
  try {
    if (!firestoreId) {
      throw new Error("Firestore issue ID is required.");
    }

    await deleteDoc(doc(db, "issuedBooks", firestoreId));

    return true;
  } catch (error) {
    console.error("Error deleting issue from Firestore:", error);

    throw error;
  }
};
