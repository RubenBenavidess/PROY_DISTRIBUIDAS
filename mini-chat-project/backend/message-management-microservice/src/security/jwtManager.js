import jwt from "jsonwebtoken";
import fs from "fs";

function loadKey(envPathVar) {
  const path = process.env[envPathVar];
  if (path) {
    try {
      return fs.readFileSync(path, "utf8");
    } catch (err) {
      console.error(`Error reading key from ${path}:`, err.message);
      throw err;
    }
  }
  return null;
}

const PUBLIC_KEY = loadKey("PUBLIC_KEY_PATH");

if (!PUBLIC_KEY) {
  console.warn("JWT keys not found in env. Set PUBLIC_KEY_PATH.");
}

export function validateToken(token) {
  if (!PUBLIC_KEY) throw new Error("Public Key Not Found");
  const decoded = jwt.verify(token, PUBLIC_KEY, {
    algorithms: ["ES256"]
  });
  return decoded;
}
