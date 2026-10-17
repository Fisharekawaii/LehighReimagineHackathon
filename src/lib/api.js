export async function api(path, method = "GET", body) {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The server could not be reached. Please try again.");
  }
  if (!response.ok)
    throw Object.assign(new Error(data.error || "Something went wrong."), {
      status: response.status,
    });
  return data;
}
