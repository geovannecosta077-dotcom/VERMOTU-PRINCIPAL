import app from "../../api-server/dist/app.mjs";

export default function handler(request, response) {
  const path = Array.isArray(request.query.path)
    ? request.query.path.join("/")
    : request.query.path;

  if (path) {
    const query = new URL(request.url, "http://localhost").searchParams;
    query.delete("path");
    const suffix = query.toString();
    request.url = `/api/${path}${suffix ? `?${suffix}` : ""}`;
  }

  return app(request, response);
}
