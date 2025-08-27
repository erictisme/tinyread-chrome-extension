const fs = require("fs");
const path = require("path");

module.exports = (req, res) => {
  const html = fs.readFileSync(path.join(process.cwd(), "public", "summary.html"), "utf8");
  res.setHeader("Content-Type", "text/html");
  res.send(html);
};