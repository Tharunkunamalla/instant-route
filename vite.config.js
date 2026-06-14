import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import osmHandler from "./api/osm.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "osm-proxy",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith("/api/osm")) {
            // Enhance res with Vercel helper properties status and json
            res.status = (statusCode) => {
              res.statusCode = statusCode;
              return res;
            };
            res.json = (body) => {
              if (!res.headersSent) {
                res.setHeader("Content-Type", "application/json");
              }
              res.end(JSON.stringify(body));
              return res;
            };

            const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
            req.query = Object.fromEntries(urlObj.searchParams.entries());

            if (req.method === "POST") {
              let bodyData = "";
              req.on("data", (chunk) => {
                bodyData += chunk;
              });
              req.on("end", async () => {
                req.body = bodyData;
                try {
                  await osmHandler(req, res);
                } catch (err) {
                  console.error("Error in local OSM proxy:", err);
                  if (!res.headersSent) {
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                  }
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } else {
              req.body = null;
              try {
                await osmHandler(req, res);
              } catch (err) {
                console.error("Error in local OSM proxy:", err);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                }
                res.end(JSON.stringify({ error: err.message }));
              }
            }
          } else {
            next();
          }
        });
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
