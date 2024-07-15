// libs
import axios from "axios";

export const useMediaUploader = () => {
  const uploadMedia = async (blob: Blob) => {
    const formData = new FormData();
    formData.append("file", blob, `recording.mp4`);

    try {
      const response = await axios.post(
        "https://localhost:3000/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      console.log(response.data);
    } catch (error) {
      console.error("Error uploading the file", error);
    }
  };

  return { uploadMedia };
};
