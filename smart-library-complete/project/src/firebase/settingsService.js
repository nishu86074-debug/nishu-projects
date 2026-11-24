import { doc, getDoc, setDoc } from "firebase/firestore";

import { db } from "./firebaseConfig";

/* =====================================================
   FIRESTORE DOCUMENT
===================================================== */

const settingsRef = doc(db, "librarySettings", "main");

/* =====================================================
   GET LIBRARY SETTINGS
===================================================== */

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
    console.error("Error fetching library settings from Firestore:", error);

    throw error;
  }
};

/* =====================================================
   SAVE LIBRARY SETTINGS
===================================================== */

export const saveLibrarySettingsToFirestore = async (settings) => {
  try {
    if (!settings || typeof settings !== "object") {
      throw new Error("Library settings are required.");
    }

    const settingsData = {
      ...settings,

      finePerDay: Number(settings.finePerDay) || 0,

      maxBooks: Number(settings.maxBooks) || 1,

      issueDuration: Number(settings.issueDuration) || 1,

      libraryEmail: String(settings.libraryEmail || "")
        .trim()
        .toLowerCase(),

      institutionName: String(settings.institutionName || "").trim(),

      libraryName: String(settings.libraryName || "").trim(),

      librarianName: String(settings.librarianName || "").trim(),

      upiId: String(settings.upiId || "").trim(),

      upiName: String(settings.upiName || "").trim(),

      updatedAt: new Date().toISOString(),
    };

    await setDoc(settingsRef, settingsData, {
      merge: true,
    });

    return {
      id: "main",
      ...settingsData,
    };
  } catch (error) {
    console.error("Error saving library settings to Firestore:", error);

    throw error;
  }
};

/* =====================================================
   RESET LIBRARY SETTINGS
===================================================== */

export const resetLibrarySettingsInFirestore = async (defaultSettings) => {
  try {
    return await saveLibrarySettingsToFirestore(defaultSettings);
  } catch (error) {
    console.error("Error resetting library settings in Firestore:", error);

    throw error;
  }
};
