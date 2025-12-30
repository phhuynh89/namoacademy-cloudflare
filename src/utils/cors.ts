export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function handleCorsPreflight(): Response | null {
  return new Response(null, { headers: corsHeaders });
}

export function jsonResponse(data: any, status: number = 200, additionalHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...additionalHeaders },
  });
}

export function errorResponse(message: string, status: number = 500, code?: string): Response {
  return jsonResponse(
    {
      error: message,
      ...(code && { code }),
    },
    status
  );
}

