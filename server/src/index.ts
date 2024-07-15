import express, { Request, Response } from "express";
import multer from "multer";
import https from "https";
import http from "http";
import cors from "cors";
import fs from "fs";

const PORT = 3000 as const;

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Configure Multer to use disk storage
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.use("/uploads", express.static("uploads"));

app.post("/upload", upload.single("file"), (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    return res.status(400).send("No file uploaded");
  }

  res.send(`File uploaded and stored as ${file.filename}`);
});

app.get("/health-check", (req: Request, res: Response) => {
  res.send({ status: "OK", time: Date.now() });
});

try {
  var privateKey = fs.readFileSync("config/server.key", "utf8");
  var certificate = fs.readFileSync("config/server.crt", "utf8");
  var credentials = { key: privateKey, cert: certificate };

  const httpsServers = https.createServer(credentials, app);
  httpsServers.listen(PORT);
} catch (err) {
  console.log(
    "Failed to start https server: Missing server.key and server.crt"
  );
}

const httpServer = http.createServer(app);
httpServer.listen(PORT);
