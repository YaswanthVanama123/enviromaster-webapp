import type { CapturedLocation } from "../backendservice/api/signatureApi";

export type GeolocationOutcome =
  | { status: "captured"; location: CapturedLocation }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "timeout" };

const DEFAULT_TIMEOUT_MS = 12000;

export function captureLocation(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<GeolocationOutcome> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ status: "unavailable" });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          status: "captured",
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          },
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ status: "denied" });
          return;
        }
        if (error.code === error.TIMEOUT) {
          resolve({ status: "timeout" });
          return;
        }
        resolve({ status: "unavailable" });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

export function formatLocationSummary(
  location: { address: string; city: string; region: string; latitude: number | null; longitude: number | null } | null
): string {
  if (!location) return "";
  if (location.address) return location.address;

  const parts = [location.city, location.region].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");

  if (location.latitude !== null && location.longitude !== null) {
    return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
  }
  return "";
}
