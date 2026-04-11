// netlify/functions/calendar-proxy.js
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  const icsUrl = event.queryStringParameters?.url;
  if (!icsUrl) {
    return {
      statusCode: 400,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing url parameter" })
    };
  }
  try {
    console.log("Fetching calendar:", icsUrl);
    const response = await fetch(icsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AtelierStElme/1.0)",
        "Accept": "text/calendar, text/plain, */*"
      }
    });
    if (!response.ok) {
      console.error("Calendar fetch failed:", response.status, response.statusText);
      return {
        statusCode: response.status,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: `HTTP ${response.status}: ${response.statusText}` })
      };
    }
    const data = await response.text();
    console.log("Calendar fetched, length:", data.length);
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "text/calendar; charset=utf-8" },
      body: data
    };
  } catch (error) {
    console.error("Calendar proxy error:", error);
    return {
      statusCode: 500,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message })
    };
  }
};
//# sourceMappingURL=calendar-proxy.js.map
