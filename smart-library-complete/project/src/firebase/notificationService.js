// src/firebase/notificationService.js

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

/* =====================================================
   FIRESTORE COLLECTION
===================================================== */

const notificationsCollection = collection(db, "notifications");

/* =====================================================
   GET ALL NOTIFICATIONS
===================================================== */

export const getNotificationsFromFirestore = async () => {
  try {
    const snapshot = await getDocs(notificationsCollection);

    return snapshot.docs.map((item) => ({
      id: item.id,
      firestoreId: item.id,
      ...item.data(),
    }));
  } catch (error) {
    console.error("Error fetching notifications from Firestore:", error);

    throw error;
  }
};

/* =====================================================
   GET NOTIFICATIONS BY STUDENT LIBRARY ID
===================================================== */

export const getNotificationsByStudent = async (libraryId) => {
  try {
    if (!libraryId) {
      return [];
    }

    const normalizedLibraryId = String(libraryId).trim();

    if (!normalizedLibraryId) {
      return [];
    }

    const notificationQuery = query(
      notificationsCollection,
      where("studentId", "==", normalizedLibraryId),
    );

    const snapshot = await getDocs(notificationQuery);

    return snapshot.docs.map((item) => ({
      id: item.id,
      firestoreId: item.id,
      ...item.data(),
    }));
  } catch (error) {
    console.error("Error fetching student notifications:", error);

    throw error;
  }
};

/* =====================================================
   ADD NOTIFICATION TO FIRESTORE
===================================================== */

export const addNotificationToFirestore = async (notification) => {
  try {
    if (!notification || typeof notification !== "object") {
      throw new Error("Notification data is required.");
    }

    const now = new Date().toISOString();

    const notificationData = {
      ...notification,

      studentId: notification.studentId
        ? String(notification.studentId).trim()
        : "",

      read: notification.read === true,

      isRead: notification.isRead === true || notification.read === true,

      syncedAt: now,

      createdAt: notification.createdAt || now,
    };

    const docRef = await addDoc(notificationsCollection, notificationData);

    return {
      id: docRef.id,
      firestoreId: docRef.id,
      ...notificationData,
    };
  } catch (error) {
    console.error("Error adding notification to Firestore:", error);

    throw error;
  }
};

/* =====================================================
   UPDATE NOTIFICATION
===================================================== */

export const updateNotificationInFirestore = async (
  firestoreId,
  notificationData,
) => {
  try {
    if (!firestoreId) {
      throw new Error("Firestore notification ID is required.");
    }

    if (!notificationData || typeof notificationData !== "object") {
      throw new Error("Notification update data is required.");
    }

    const notificationRef = doc(db, "notifications", firestoreId);

    await updateDoc(notificationRef, {
      ...notificationData,

      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error updating notification in Firestore:", error);

    throw error;
  }
};

/* =====================================================
   MARK NOTIFICATION AS READ
===================================================== */

export const markNotificationAsReadInFirestore = async (firestoreId) => {
  try {
    if (!firestoreId) {
      throw new Error("Firestore notification ID is required.");
    }

    const notificationRef = doc(db, "notifications", firestoreId);

    const now = new Date().toISOString();

    await updateDoc(notificationRef, {
      read: true,

      isRead: true,

      readAt: now,

      updatedAt: now,
    });

    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);

    throw error;
  }
};

/* =====================================================
   MARK NOTIFICATION AS UNREAD
===================================================== */

export const markNotificationAsUnreadInFirestore = async (firestoreId) => {
  try {
    if (!firestoreId) {
      throw new Error("Firestore notification ID is required.");
    }

    const notificationRef = doc(db, "notifications", firestoreId);

    await updateDoc(notificationRef, {
      read: false,

      isRead: false,

      readAt: null,

      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error marking notification as unread:", error);

    throw error;
  }
};

/* =====================================================
   DELETE SINGLE NOTIFICATION
===================================================== */

export const deleteNotificationFromFirestore = async (firestoreId) => {
  try {
    if (!firestoreId) {
      throw new Error("Firestore notification ID is required.");
    }

    await deleteDoc(doc(db, "notifications", firestoreId));

    return true;
  } catch (error) {
    console.error("Error deleting notification from Firestore:", error);

    throw error;
  }
};

/* =====================================================
   DELETE ALL NOTIFICATIONS OF A STUDENT
===================================================== */

export const deleteStudentNotificationsFromFirestore = async (libraryId) => {
  try {
    if (!libraryId) {
      return true;
    }

    const normalizedLibraryId = String(libraryId).trim();

    if (!normalizedLibraryId) {
      return true;
    }

    const notificationQuery = query(
      notificationsCollection,
      where("studentId", "==", normalizedLibraryId),
    );

    const snapshot = await getDocs(notificationQuery);

    const deletePromises = snapshot.docs.map((notificationDoc) =>
      deleteDoc(doc(db, "notifications", notificationDoc.id)),
    );

    await Promise.all(deletePromises);

    return true;
  } catch (error) {
    console.error("Error deleting student notifications:", error);

    throw error;
  }
};

/* =====================================================
   DELETE ALL READ NOTIFICATIONS OF A STUDENT
===================================================== */

export const deleteReadNotificationsFromFirestore = async (libraryId) => {
  try {
    if (!libraryId) {
      return true;
    }

    const normalizedLibraryId = String(libraryId).trim();

    if (!normalizedLibraryId) {
      return true;
    }

    const notificationQuery = query(
      notificationsCollection,
      where("studentId", "==", normalizedLibraryId),
    );

    const snapshot = await getDocs(notificationQuery);

    const readNotifications = snapshot.docs.filter((notificationDoc) => {
      const data = notificationDoc.data();

      return data?.read === true || data?.isRead === true;
    });

    const deletePromises = readNotifications.map((notificationDoc) =>
      deleteDoc(doc(db, "notifications", notificationDoc.id)),
    );

    await Promise.all(deletePromises);

    return true;
  } catch (error) {
    console.error("Error deleting read notifications:", error);

    throw error;
  }
};
