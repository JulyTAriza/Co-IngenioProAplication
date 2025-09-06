interface UserPayload {
  username: string;
}

export function getUserFromToken(): UserPayload | null {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payload: UserPayload = JSON.parse(atob(token.split(".")[1]));
    return { username: payload.username };
  } catch {
    return null;
  }
}

