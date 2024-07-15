// libs
import { ReactElement } from "react";

export const VideoThumbnail = ({
  thumbnail,
  onPlay,
}: {
  thumbnail: string;
  onPlay: () => void;
}): ReactElement => (
  <div style={{ position: "relative" }}>
    <img src={thumbnail} width={400} height={300} />
    <div
      style={{
        position: "absolute",
        top: "46%",
        left: "46%",
        fontSize: "32px",
        cursor: "pointer",
      }}
      onClick={onPlay}
    >
      ▶️
    </div>
  </div>
);
