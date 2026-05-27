function getConfig(name, defaultValue = null) {
  const envObject = typeof window !== "undefined" ? window.ENV : undefined;

  if (envObject && envObject[name] !== undefined) {
    return envObject[name] || defaultValue;
  }

  return import.meta.env[name] || defaultValue;
}

export function getBackendUrl() {
  return (
    getConfig("VITE_BACKEND_URL") ||
    getConfig("REACT_APP_BACKEND_URL") ||
    (typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:8085`
      : "http://localhost:8085")
  );
}

export function getHoursCloseTicketsAuto() {
  return getConfig("VITE_HOURS_CLOSE_TICKETS_AUTO");
}
