import { env } from "process";

export default function apiUrl() {
  if (process.env.NODE_ENV === "production") {
    return "https://hackaton-7i4n.vercel.app/api";
  } else {
    return "http://localhost:3000/api";
  }
}
