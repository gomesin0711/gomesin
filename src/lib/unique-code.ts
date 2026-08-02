// Deterministic 3-digit unique code for payment identification.
// Same userId + same month = same code. Works client-side & server-side.
// No DB or API call needed — pure math.

export function generateUniqueCode(userId: string): number {
  const now = new Date();
  const monthKey = `${userId}-${now.getFullYear()}-${now.getMonth()}`;
  let hash = 5381;
  for (let i = 0; i < monthKey.length; i++) {
    hash = ((hash << 5) + hash + monthKey.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 999) + 1;
}
