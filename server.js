const express = require("express");
const path = require("path");

const app = express();
const distDir = path.join(__dirname, "dist");
app.use(express.static(distDir));

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
