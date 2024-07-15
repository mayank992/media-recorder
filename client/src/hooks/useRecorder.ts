// libs
import { useState, useRef, useEffect } from "react";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

export enum Status {
  IDLE = "IDLE",
  LOADING = "LOADING",
  ACQUIRING_MEDIA_STREAM = "ACQUIRING_MEDIA_STREAM",
  RECORDING = "RECORDING",
  PROCESSING = "PROCESSING",
  PAUSED = "PAUSED",
  STOPPED = "STOPPED",
}

enum MediaRecorderState {
  RECORDING = "recording",
  INACTIVE = "inactive",
  PAUSED = "paused",
}

type UseRecorderProps = {
  audio: boolean;
  video: boolean;
  onStop: (blob: Blob) => void;
};

export const useRecorder = ({
  audio = true,
  video = true,
  onStop,
}: UseRecorderProps) => {
  const mediaChunks = useRef<Blob[]>([]);
  const mediaStream = useRef<MediaStream>();
  const mediaRecorder = useRef<MediaRecorder>();

  const ffmpegRef = useRef<FFmpeg>(new FFmpeg());

  const [progress, setProgress] = useState<number>();
  const [status, setStatus] = useState<Status>(Status.LOADING);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string>();

  const load = async () => {
    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

      ffmpeg.on("log", ({ message }) => {
        console.log("FFMPEG: ", message);
      });

      ffmpeg.on("progress", ({ progress }) => {
        setProgress(Math.floor(progress * 100));
      });

      // toBlobURL is used to bypass CORS issue, urls with the same
      // domain can be used directly.
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });

      setStatus(Status.IDLE);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRecordingData = (e: BlobEvent) => {
    if (e.data.size === 0) return;
    mediaChunks.current.push(e.data);
  };

  const onRecordingStop = async () => {
    const options = { type: "video/mp4" };
    const preBlob = new Blob(mediaChunks.current, options);

    try {
      setStatus(Status.PROCESSING);

      const ffmpeg = ffmpegRef.current;
      await ffmpeg.writeFile("recording.mp4", await fetchFile(preBlob));
      await ffmpeg.exec([
        "-i",
        "recording.mp4",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "recording-transpiled.mp4",
      ]);

      const fileData = await ffmpeg.readFile("recording-transpiled.mp4");
      const blob = new Blob([(fileData as any).buffer], { type: "video/mp4" });

      setMediaBlobUrl(URL.createObjectURL(blob));
      setStatus(Status.STOPPED);
      onStop(blob);
    } catch (err) {
      setStatus(Status.STOPPED);
      console.error(err);
    }
  };

  const onRecordingError = () => {
    setStatus(Status.IDLE);
  };

  const startRecording = async () => {
    try {
      setStatus(Status.ACQUIRING_MEDIA_STREAM);

      const stream = await window.navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      mediaStream.current = stream;
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: "video/mp4;codecs=avc1,mp4a.40.2",
      });

      mediaRecorder.current.ondataavailable = onRecordingData;
      mediaRecorder.current.onstop = onRecordingStop;
      mediaRecorder.current.onerror = onRecordingError;

      mediaRecorder.current.start();
      setStatus(Status.RECORDING);
    } catch (err) {
      console.error("Unable to start recording: ", err);
    }
  };

  const stopRecording = () => {
    if (
      !mediaRecorder.current ||
      mediaRecorder.current.state === MediaRecorderState.INACTIVE
    ) {
      return;
    }

    mediaChunks.current = [];
    mediaRecorder.current.stop();
    mediaStream.current?.getTracks().forEach((track) => track.stop());
  };

  const muteAudio = (mute: boolean) => {
    if (!mediaStream.current) return;

    setIsAudioMuted(mute);
    mediaStream.current
      .getAudioTracks()
      .forEach((audioTrack) => (audioTrack.enabled = !mute));
  };

  const pauseRecording = () => {
    if (
      mediaRecorder.current &&
      mediaRecorder.current.state === MediaRecorderState.RECORDING
    ) {
      mediaRecorder.current.pause();
      setStatus(Status.PAUSED);
    }
  };

  const resumeRecording = () => {
    if (
      mediaRecorder.current &&
      mediaRecorder.current.state === MediaRecorderState.PAUSED
    ) {
      mediaRecorder.current.resume();
      setStatus(Status.RECORDING);
    }
  };

  const videoTracks = mediaStream.current?.getVideoTracks();
  const previewStream = videoTracks ? new MediaStream(videoTracks) : undefined;

  return {
    status,
    progress,
    isAudioMuted,

    mediaBlobUrl,
    previewStream,

    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,

    muteAudio: () => muteAudio(true),
    unMuteAudio: () => muteAudio(false),
  };
};
