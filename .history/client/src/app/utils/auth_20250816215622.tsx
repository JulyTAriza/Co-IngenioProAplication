// utils/auth.ts
export function getUserFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      username: payload.username,
    };
  } catch {
    return null;
  }
}
