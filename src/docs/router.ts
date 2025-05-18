import {Hono} from 'hono';
import {join} from 'path';
import {readFileSync} from 'fs';

export const docsRouter = new Hono();

docsRouter.get('/openapi.json', (c) => {
    try {
        const openApiPath = join(__dirname, 'openapi.json');
        const openApiContent = readFileSync(openApiPath, 'utf-8');
        return c.json(JSON.parse(openApiContent));
    } catch (error) {
        console.error('Error serving OpenAPI spec:', error);
        return c.json({error: 'Failed to load API specification'}, 500);
    }
});

docsRouter.get('/', async (c) => {
    try {
        const htmlPath = join(__dirname, 'index.html');
        const content = readFileSync(htmlPath, 'utf-8');
        return c.html(content);
    } catch (error) {
        console.error('Error serving docs HTML:', error);
        return c.text('Documentation unavailable', 500);
    }
});

docsRouter.get('/websocket', async (c) => {
    try {
        const htmlPath = join(__dirname, 'websocket.html');
        const content = readFileSync(htmlPath, 'utf-8');
        return c.html(content);
    } catch (error) {
        console.error('Error serving WebSocket docs HTML:', error);
        return c.text('WebSocket documentation unavailable', 500);
    }
});

docsRouter.get('/swagger', async (c) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nounberg Terminal API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.1.0/swagger-ui.css">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    .topbar {
      display: none;
    }
    .swagger-ui .info a, .swagger-ui .info a:hover {
      color: #3b82f6;
    }
    .swagger-ui .btn.execute {
      background-color: #3b82f6;
      border-color: #3b82f6;
    }
    .swagger-ui .btn.authorize {
      background-color: transparent;
      border-color: #3b82f6;
      color: #3b82f6;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background: #3b82f6;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary {
      border-color: #3b82f6;
    }
    .swagger-ui .opblock.opblock-get {
      background: rgba(59, 130, 246, 0.1);
      border-color: #3b82f6;
    }
    @media (prefers-color-scheme: dark) {
      html {
        background: #0f172a;
      }
      body:before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.5);
        z-index: 100;
        pointer-events: none;
      }
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.1.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/docs/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        docExpansion: 'list',
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        showExtensions: true
      });
    }
  </script>
</body>
</html>
  `;

    return c.html(html);
});

export default docsRouter;