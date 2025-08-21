export function formatAddress(
  address: string,
  length: "short" | "medium" | "long" = "medium",
): string {
  if (!address) return "";

  switch (length) {
    case "short":
      // 0x1234...5678
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    case "medium":
      // 0x12345678...12345678
      return `${address.slice(0, 10)}...${address.slice(-8)}`;
    case "long":
      // Full address
      return address;
    default:
      return address;
  }
}

export function normalizeAddress(address: string): string {
  if (!address) return "";
  return address.toLowerCase();
}

export function isSameAddress(address1: string, address2: string): boolean {
  if (!address1 || !address2) return false;
  return normalizeAddress(address1) === normalizeAddress(address2);
}
