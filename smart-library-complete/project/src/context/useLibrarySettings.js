import { useContext } from "react";

import LibrarySettingsContext from "./LibrarySettingsContext";

const useLibrarySettings = () => {
  const context = useContext(
    LibrarySettingsContext,
  );

  if (!context) {
    throw new Error(
      "useLibrarySettings must be used inside LibrarySettingsProvider.",
    );
  }

  return context;
};

export { useLibrarySettings };

export default useLibrarySettings;