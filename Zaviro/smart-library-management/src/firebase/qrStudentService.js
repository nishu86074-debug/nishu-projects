import { getStudentByLibraryId } from "./studentService";

export const findStudentFromQR = async (decodedText) => {
  try {
    if (!decodedText) {
      return null;
    }

    let parsedData = null;

    try {
      parsedData = JSON.parse(decodedText);
    } catch {
      parsedData = null;
    }

    const libraryId =
      parsedData?.libraryId || parsedData?.studentId || decodedText.trim();

    if (!libraryId) {
      return null;
    }

    const student = await getStudentByLibraryId(libraryId);

    return student;
  } catch (error) {
    console.error("QR student lookup error:", error);

    throw error;
  }
};
