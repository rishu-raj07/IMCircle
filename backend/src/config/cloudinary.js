import { v2 as cloudinary } from "cloudinary";

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.error("[config] Missing CLOUDINARY_CLOUD_NAME — media uploads will fail.");
}

if (!process.env.CLOUDINARY_API_KEY) {
  console.error("[config] Missing CLOUDINARY_API_KEY — media uploads will fail.");
}

if (!process.env.CLOUDINARY_API_SECRET) {
  console.error("[config] Missing CLOUDINARY_API_SECRET — media uploads will fail.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;