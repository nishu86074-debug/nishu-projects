// Looks up book details from an ISBN using free public APIs
// (Google Books first, Open Library as fallback).

export const cleanIsbn = (value) =>
  String(value || "")
    .replace(/[^0-9Xx]/g, "")
    .toUpperCase();

const fromGoogleBooks = async (isbn) => {
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`,
  );

  if (!response.ok) return null;

  const data = await response.json();
  const info = data?.items?.[0]?.volumeInfo;

  if (!info) return null;

  const image = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;

  return {
    title: [info.title, info.subtitle].filter(Boolean).join(": "),
    author: (info.authors || []).join(", "),
    category: (info.categories || [])[0] || "",
    description: info.description || "",
    image: image ? image.replace("http://", "https://") : "",
  };
};

const fromOpenLibrary = async (isbn) => {
  const response = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  );

  if (!response.ok) return null;

  const data = await response.json();
  const info = data?.[`ISBN:${isbn}`];

  if (!info) return null;

  return {
    title: [info.title, info.subtitle].filter(Boolean).join(": "),
    author: (info.authors || []).map((a) => a.name).join(", "),
    category: (info.subjects || [])[0]?.name || "",
    description: "",
    image: info.cover?.medium || info.cover?.large || "",
  };
};

export const lookupBookByIsbn = async (rawIsbn) => {
  const isbn = cleanIsbn(rawIsbn);

  if (!isbn) return null;

  for (const source of [fromGoogleBooks, fromOpenLibrary]) {
    try {
      const result = await source(isbn);
      if (result && result.title) return result;
    } catch (error) {
      console.log("Book lookup source failed:", error);
    }
  }

  return null;
};
