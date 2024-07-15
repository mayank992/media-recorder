// libs
import { ReactElement, useMemo, useState } from "react";

// components
import { VideoPreview } from "./components/VideoPreview";
import { VideoThumbnail } from "./components/VideoThumbnail";

// hooks
import { useMediaUploader } from "./hooks/useUploader";
import { useRecorder, Status } from "./hooks/useRecorder";

// styles
import "./styles.css";

const App = (): ReactElement => {
  const [blob, setBlob] = useState<Blob>();
  const [thumbnail, setThumbnail] = useState<string>();
  const [play, setPlay] = useState<boolean>(false);

  const { uploadMedia } = useMediaUploader();

  const generateThumbnail = (blob: Blob) => {
    if (!mediaBlobUrl) return;

    const video = document.createElement("video");
    video.src = URL.createObjectURL(blob);

    video.onloadeddata = () => {
      // Ensure the video is loaded and can play through
      video.currentTime = 2; // Capture the thumbnail at 2 seconds

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((thumbnailBlob) => {
          if (!thumbnailBlob) return;
          const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
          setThumbnail(thumbnailUrl);
        });
      };
    };
  };

  const handleStop = (blob: Blob) => {
    generateThumbnail(blob);
    setBlob(blob);
  };

  const {
    status,
    progress,
    mediaBlobUrl,
    previewStream,
    startRecording,
    stopRecording,
    resumeRecording,
    pauseRecording,
  } = useRecorder({
    video: true,
    audio: true,
    onStop: handleStop,
  });

  const isRecording = status === Status.RECORDING;
  const isPaused = status === Status.PAUSED;

  const handleStartRecording = () => {
    setPlay(false);
    setBlob(undefined);
    startRecording();
  };

  useMemo(() => console.log("Status: ", status), [status]);
  useMemo(() => console.log("Thumbnail: ", thumbnail), [thumbnail]);

  if (status === Status.LOADING) {
    return <>Loading...</>;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}
    >
      {isRecording ? (
        <VideoPreview stream={previewStream!} />
      ) : !play ? (
        <VideoThumbnail
          thumbnail={thumbnail ?? ""}
          onPlay={() => setPlay(true)}
        />
      ) : (
        <video src={mediaBlobUrl} width={400} height={300} controls autoPlay />
      )}
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={isRecording ? stopRecording : handleStartRecording}>
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
        {isRecording || isPaused ? (
          <button onClick={isPaused ? resumeRecording : pauseRecording}>
            {isPaused ? "Resume Recording" : "Pause Recording"}
          </button>
        ) : null}
        {blob ? (
          <button onClick={() => uploadMedia(blob!)}>Upload</button>
        ) : null}
      </div>
      {status}
      {status === Status.PROCESSING ? ` ${progress}%` : null}
    </div>
  );
};

export default App;
