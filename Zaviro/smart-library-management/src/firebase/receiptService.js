// src/firebase/receiptService.js

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

const receiptsCollection = collection(db, "receipts");

/* =====================================================
   GET ALL RECEIPTS
===================================================== */

export const getReceiptsFromFirestore = async () => {
  try {
    const snapshot = await getDocs(receiptsCollection);

    return snapshot.docs.map((item) => ({
      id: item.id,
      firestoreId: item.id,
      firebaseId: item.id,
      ...item.data(),
    }));
  } catch (error) {
    console.error("Error fetching receipts from Firestore:", error);

    throw error;
  }
};

/* =====================================================
   GET RECEIPT BY RECEIPT ID
===================================================== */

export const getReceiptByReceiptId = async (receiptId) => {
  try {
    if (!receiptId) {
      return null;
    }

    const receiptQuery = query(
      receiptsCollection,
      where("receiptId", "==", receiptId),
    );

    const snapshot = await getDocs(receiptQuery);

    if (snapshot.empty) {
      return null;
    }

    const receiptDoc = snapshot.docs[0];

    return {
      id: receiptDoc.id,
      firestoreId: receiptDoc.id,
      firebaseId: receiptDoc.id,
      ...receiptDoc.data(),
    };
  } catch (error) {
    console.error("Error finding receipt by Receipt ID:", error);

    throw error;
  }
};

/* =====================================================
   ADD RECEIPT
===================================================== */

export const addReceiptToFirestore = async (receipt) => {
  try {
    if (!receipt) {
      throw new Error("Receipt data is required.");
    }

    if (receipt.receiptId) {
      const existingReceipt = await getReceiptByReceiptId(receipt.receiptId);

      if (existingReceipt) {
        return existingReceipt;
      }
    }

    const now = new Date().toISOString();

    const receiptData = {
      ...receipt,
      syncedAt: now,
      createdAt: receipt.createdAt || now,
    };

    const docRef = await addDoc(receiptsCollection, receiptData);

    return {
      id: docRef.id,
      firestoreId: docRef.id,
      firebaseId: docRef.id,
      ...receiptData,
    };
  } catch (error) {
    console.error("Error adding receipt to Firestore:", error);

    throw error;
  }
};

/* =====================================================
   UPDATE RECEIPT
===================================================== */

export const updateReceiptInFirestore = async (firestoreId, receiptData) => {
  try {
    if (!firestoreId) {
      throw new Error("Firestore receipt ID is required.");
    }

    if (!receiptData) {
      throw new Error("Receipt data is required.");
    }

    await updateDoc(doc(db, "receipts", firestoreId), {
      ...receiptData,
      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error updating receipt in Firestore:", error);

    throw error;
  }
};

/* =====================================================
   DELETE RECEIPT
===================================================== */

export const deleteReceiptFromFirestore = async (firestoreId) => {
  try {
    if (!firestoreId) {
      throw new Error("Firestore receipt ID is required.");
    }

    await deleteDoc(doc(db, "receipts", firestoreId));

    return true;
  } catch (error) {
    console.error("Error deleting receipt from Firestore:", error);

    throw error;
  }
};
