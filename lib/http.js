function send(res, status, body) {
  return res.status(status).json(body);
}

function body(req) {
  return typeof req.body === "object" && req.body ? req.body : {};
}

function method(req, res) {
  if (req.method === "POST") return true;
  send(res, 405, { error: "Method not allowed." });
  return false;
}

function error(res, error, fallback) {
  console.error(error);
  return send(res, 400, { error: error instanceof Error && error.message ? error.message : fallback });
}

module.exports = { body, error, method, send };
