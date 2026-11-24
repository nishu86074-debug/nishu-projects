const BASE_URL = "https://dummyjson.com/products";

export const getProducts = async () => {
  try {
    const response = await fetch(`${BASE_URL}?limit=100`);

    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }

    const data = await response.json();

    return data.products || [];
  } catch (error) {
    console.error("Products API Error:", error);

    // API fail ho to empty array return karega
    return [];
  }
};

export const getSingleProduct = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/${id}`);

    if (!response.ok) {
      throw new Error("Product not found");
    }

    return await response.json();
  } catch (error) {
    console.error("Single Product Error:", error);
    throw error;
  }
};

export const getCategories = async () => {
  try {
    const response = await fetch(`${BASE_URL}/categories`);

    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }

    const data = await response.json();

    return data || [];
  } catch (error) {
    console.error("Categories API Error:", error);

    // API fail hone par app crash nahi hogi
    return [];
  }
};

