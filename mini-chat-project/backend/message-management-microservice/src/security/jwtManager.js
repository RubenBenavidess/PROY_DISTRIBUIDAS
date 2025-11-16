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

const PRIVATE_KEY = loadKey("PRIVATE_KEY_PATH");
const PUBLIC_KEY = loadKey("PUBLIC_KEY_PATH");

if (!PRIVATE_KEY || !PUBLIC_KEY) {
  console.warn("JWT keys not found in env. Set PRIVATE_KEY_PATH and PUBLIC_KEY_PATH.");
}

export function generateToken(payload, options = {}) {
  if (!PRIVATE_KEY) throw new Error("Private Key Not Found");
  const token = jwt.sign(payload, PRIVATE_KEY, {
    expiresIn: options.expiresIn || "1h",
    algorithm: "ES256"
  });
  return token;
}

export function validateToken(token) {
  if (!PUBLIC_KEY) throw new Error("Public Key Not Found");
  const decoded = jwt.verify(token, PUBLIC_KEY, {
    algorithms: ["ES256"]
  });
  return decoded;
}
