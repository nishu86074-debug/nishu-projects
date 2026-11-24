import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Library,
  Save,
  Tag,
  User,
  Hash,
  Package,
} from "lucide-react";

import { useLibraryData } from "../../context/useLibraryData";
import { useLibrarySettings } from "../../context/useLibrarySettings";

import { addBookToFirestore } from "../../firebase/bookService";

const createBookId = () => {
  return `BOOK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

const AddBook = () => {
  const navigate = useNavigate();

  const { books, setBooks } = useLibraryData();

  const { settings: librarySettings } = useLibrarySettings();

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    category: "",
    isbn: "",
    quantity: 1,
    description: "",
    image: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const title = formData.title.trim();
    const author = formData.author.trim();
    const category = formData.category.trim();
    const isbn = formData.isbn.trim();
    const description = formData.description.trim();
    const image = formData.image.trim();

    const quantity = Number(formData.quantity);

    if (!title) {
      toast.error("Please enter the book title.");
      return;
    }

    if (!author) {
      toast.error("Please enter the author name.");
      return;
    }

    if (!category) {
      toast.error("Please enter the book category.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      toast.error("Book quantity must be at least 1.");
      return;
    }

    if (quantity > 10000) {
      toast.error("Book quantity cannot exceed 10,000.");
      return;
    }

    setIsSaving(true);

    try {
      const bookId = createBookId();

      const newBook = {
        id: bookId,
        bookId,

        title,
        name: title,

        author,
        category,
        isbn,

        quantity,
        availableQuantity: quantity,
        issuedQuantity: 0,

        status: "Available",
        available: true,

        description,
        image,

        createdAt: new Date().toISOString(),
      };

      // Save to Firebase Firestore
      const firestoreBook = await addBookToFirestore(newBook);

      /*
        Firebase document ID alag hota hai.
        App ka Book ID same rahega.
      */

      const finalBook = {
        ...newBook,
        firestoreId: firestoreBook?.id || "",
      };

      // Local context + localStorage
      const updatedBooks = [...books, finalBook];

      setBooks(updatedBooks);

      toast.success("Book added to library successfully.");

      setFormData({
        title: "",
        author: "",
        category: "",
        isbn: "",
        quantity: 1,
        description: "",
        image: "",
      });

      setTimeout(() => {
        navigate("/books");
      }, 500);
    } catch (error) {
      console.error("Add book Firebase error:", error);

      toast.error("Unable to save book. Please check Firebase connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin-dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <BookOpen size={22} className="text-indigo-600" />

                <h1 className="text-xl font-bold text-slate-900">Add Book</h1>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {librarySettings?.libraryName || "Central Library"}
              </p>
            </div>
          </div>

          <Link
            to="/books"
            className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
          >
            <BookOpen size={17} />
            View Books
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <Library size={24} />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Add a New Book
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add book information to your digital library collection.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          {/* Form Header */}
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="mt-0.5 text-indigo-600" />

              <div>
                <h3 className="font-bold text-slate-900">Book Information</h3>

                <p className="mt-1 text-xs text-slate-500">
                  Fields marked with * are required.
                </p>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <div className="space-y-8 px-6 py-7 sm:px-8">
            {/* Basic Details */}
            <section>
              <div className="mb-5 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600" />

                <h4 className="font-bold text-slate-900">Basic Details</h4>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Title */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="title"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Book Title *
                  </label>

                  <div className="relative">
                    <BookOpen
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="title"
                      name="title"
                      type="text"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Enter book title"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* Author */}
                <div>
                  <label
                    htmlFor="author"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Author *
                  </label>

                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="author"
                      name="author"
                      type="text"
                      value={formData.author}
                      onChange={handleChange}
                      placeholder="Enter author name"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label
                    htmlFor="category"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Category *
                  </label>

                  <div className="relative">
                    <Tag
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="category"
                      name="category"
                      type="text"
                      value={formData.category}
                      onChange={handleChange}
                      placeholder="e.g. Programming"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* ISBN */}
                <div>
                  <label
                    htmlFor="isbn"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    ISBN
                  </label>

                  <div className="relative">
                    <Hash
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="isbn"
                      name="isbn"
                      type="text"
                      value={formData.isbn}
                      onChange={handleChange}
                      placeholder="Enter ISBN number"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label
                    htmlFor="quantity"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Quantity *
                  </label>

                  <div className="relative">
                    <Package
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="1"
                      max="10000"
                      value={formData.quantity}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Description
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    rows="5"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter book description..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                {/* Image */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="image"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Book Image URL
                  </label>

                  <div className="relative">
                    <input
                      id="image"
                      name="image"
                      type="url"
                      value={formData.image}
                      onChange={handleChange}
                      placeholder="https://example.com/book.jpg"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Preview */}
            <section className="rounded-2xl bg-slate-50 p-5">
              <h4 className="mb-4 font-bold text-slate-900">Quick Preview</h4>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs text-slate-500">Title</p>

                  <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                    {formData.title.trim() || "Not entered"}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs text-slate-500">Category</p>

                  <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                    {formData.category.trim() || "Not entered"}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs text-slate-500">Copies</p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {Number(formData.quantity) || 0}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-end sm:px-8">
            <button
              type="button"
              onClick={() => navigate("/books")}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Saving Book...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Book
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-col items-center justify-between gap-2 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
          <p>{librarySettings?.libraryName || "Central Library"}</p>

          <p>{librarySettings?.institutionName || "My College / University"}</p>
        </div>
      </main>
    </div>
  );
};

export default AddBook;
