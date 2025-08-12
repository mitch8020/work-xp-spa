import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distDir = path.join(__dirname, "dist");
app.use(express.static(distDir));

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
