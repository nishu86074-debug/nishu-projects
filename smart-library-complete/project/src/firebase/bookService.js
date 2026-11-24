import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebaseConfig";

const booksCollection = collection(db, "books");

// Get all books
export const getBooksFromFirestore = async () => {
  try {
    const snapshot = await getDocs(booksCollection);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));
  } catch (error) {
    console.error("Error fetching books from Firestore:", error);
    throw error;
  }
};

// Find book by Book ID
export const getBookByBookId = async (bookId) => {
  try {
    const bookQuery = query(booksCollection, where("bookId", "==", bookId));

    const snapshot = await getDocs(bookQuery);

    if (snapshot.empty) {
      return null;
    }

    const bookDoc = snapshot.docs[0];

    return {
      id: bookDoc.id,
      ...bookDoc.data(),
    };
  } catch (error) {
    console.error("Error finding book by Book ID:", error);
    throw error;
  }
};

// Add book
export const addBookToFirestore = async (book) => {
  try {
    const existingBook = await getBookByBookId(book.bookId);

    if (existingBook) {
      return existingBook;
    }

    const docRef = await addDoc(booksCollection, {
      ...book,
      syncedAt: new Date().toISOString(),
    });

    return {
      id: docRef.id,
      ...book,
    };
  } catch (error) {
    console.error("Error adding book to Firestore:", error);
    throw error;
  }
};

// Update book
export const updateBookInFirestore = async (firestoreId, bookData) => {
  try {
    const bookRef = doc(db, "books", firestoreId);

    await updateDoc(bookRef, {
      ...bookData,
      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error updating book in Firestore:", error);
    throw error;
  }
};

// Delete book
export const deleteBookFromFirestore = async (firestoreId) => {
  try {
    await deleteDoc(doc(db, "books", firestoreId));

    return true;
  } catch (error) {
    console.error("Error deleting book from Firestore:", error);
    throw error;
  }
};
