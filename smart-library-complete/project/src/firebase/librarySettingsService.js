import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebaseConfig";

export const DEFAULT_LIBRARY_SETTINGS = {
  institutionName: "My College / University",
  libraryName: "Central Library",
  libraryEmail: "library@example.com",
  librarianName: "Library Administrator",
  finePerDay: 10,
  maxBooks: 3,
  issueDuration: 14,
  logo: "",
  paymentMode: "Both",
  upiId: "",
  upiName: "",
  paymentApp: "Other",
  paymentInstructions:
    "Please complete the payment using the library UPI ID and keep the payment confirmation for verification.",
};

const settingsRef = doc(db, "librarySettings", "main");

export const getLibrarySettingsFromFirestore = async () => {
  try {
    const snapshot = await getDoc(settingsRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  } catch (error) {
    console.error("Error loading library settings:", error);
    throw error;
  }
};

export const saveLibrarySettingsToFirestore = async (settings) => {
  try {
    const settingsToSave = {
      ...DEFAULT_LIBRARY_SETTINGS,
      ...settings,
      finePerDay: Math.max(0, Number(settings.finePerDay) || 0),
      maxBooks: Math.max(1, Number(settings.maxBooks) || 1),
      issueDuration: Math.max(1, Number(settings.issueDuration) || 1),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(
      settingsRef,
      {
        ...settingsToSave,
        firestoreUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      id: "main",
      ...settingsToSave,
    };
  } catch (error) {
    console.error("Error saving library settings:", error);
    throw error;
  }
};

export const resetLibrarySettingsInFirestore = async (defaults = DEFAULT_LIBRARY_SETTINGS) => {
  try {
    const resetSettings = {
      ...DEFAULT_LIBRARY_SETTINGS,
      ...defaults,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(
      settingsRef,
      {
        ...resetSettings,
        firestoreUpdatedAt: serverTimestamp(),
      }
    );

    return {
      id: "main",
      ...resetSettings,
    };
  } catch (error) {
    console.error("Error resetting library settings:", error);
    throw error;
  }
};