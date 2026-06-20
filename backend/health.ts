export function getHealthPayload() {
  return {
    ok: true,
    service: "twin-hub",
    layer: "backend",
    timestamp: new Date().toISOString()
  };
}
