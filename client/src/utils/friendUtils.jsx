export function normalizeFriend(user) {
  if (!user.type) {
    throw new Error("normalizeFriend called without explicit type");
  }

  return {
    id: user.id ?? user.user_id ?? null,
    username: user.username ?? "",
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    avatar_url: user.avatar_url ?? "/avatars/default.png",
    type: user.type, // REQUIRED
  };
}