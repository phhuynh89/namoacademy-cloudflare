/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787 to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  // D1 Database binding
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint
      if (path === "/" || path === "/health") {
        return new Response(
          JSON.stringify({ 
            status: "ok", 
            message: "Cloudflare Worker with D1 Database and Account Creator is running",
            endpoints: {
              health: "GET /health",
              saveAccount: "POST /api/accounts/save",
              getAccounts: "GET /api/accounts",
              items: "GET /api/items"
            }
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Save account to D1 database (called by local Puppeteer script)
      if (path === "/api/accounts/save" && request.method === "POST") {
        const accountData = await request.json() as {
          email: string;
          password: string;
          createdAt: string;
          status: 'created' | 'failed';
          error?: string;
        };
        
        try {
          await env.DB.prepare(
            `INSERT INTO felo_accounts (email, password, created_at, status, error)
             VALUES (?, ?, ?, ?, ?)`
          )
            .bind(
              accountData.email,
              accountData.password,
              accountData.createdAt,
              accountData.status,
              accountData.error || null
            )
            .run();
          
          return new Response(
            JSON.stringify({ success: true, message: 'Account saved successfully' }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        } catch (error) {
          console.error('Failed to save account:', error);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
            }
          );
        }
      }
      
      // Get all accounts
      if (path === "/api/accounts" && request.method === "GET") {
        const result = await env.DB.prepare("SELECT id, email, created_at, status FROM felo_accounts ORDER BY id DESC").all();
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all items
      if (path === "/api/items" && request.method === "GET") {
        const result = await env.DB.prepare("SELECT * FROM items ORDER BY id DESC").all();
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get single item by ID
      if (path.startsWith("/api/items/") && request.method === "GET") {
        const id = path.split("/").pop();
        const result = await env.DB.prepare("SELECT * FROM items WHERE id = ?").bind(id).first();
        
        if (!result) {
          return new Response(JSON.stringify({ error: "Item not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create new item
      if (path === "/api/items" && request.method === "POST") {
        const body = await request.json() as { name?: string; description?: string };
        
        if (!body.name) {
          return new Response(JSON.stringify({ error: "Name is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const result = await env.DB.prepare(
          "INSERT INTO items (name, description) VALUES (?, ?) RETURNING *"
        )
          .bind(body.name, body.description || null)
          .first();

        return new Response(JSON.stringify(result), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update item
      if (path.startsWith("/api/items/") && request.method === "PUT") {
        const id = path.split("/").pop();
        const body = await request.json() as { name?: string; description?: string };

        const result = await env.DB.prepare(
          "UPDATE items SET name = ?, description = ? WHERE id = ? RETURNING *"
        )
          .bind(body.name, body.description || null, id)
          .first();

        if (!result) {
          return new Response(JSON.stringify({ error: "Item not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete item
      if (path.startsWith("/api/items/") && request.method === "DELETE") {
        const id = path.split("/").pop();
        const result = await env.DB.prepare("DELETE FROM items WHERE id = ? RETURNING *")
          .bind(id)
          .first();

        if (!result) {
          return new Response(JSON.stringify({ error: "Item not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ message: "Item deleted", item: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error", message: error instanceof Error ? error.message : String(error) }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};

