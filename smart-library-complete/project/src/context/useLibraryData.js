import { useContext } from "react";
import LibraryDataContext from "./LibraryDataContext";

const useLibraryData = () => {
  const context = useContext(LibraryDataContext);

  if (!context) {
    throw new Error("useLibraryData must be used inside LibraryDataProvider");
  }

  return context;
};

export { useLibraryData };

export default useLibraryData;
