const express = require('express');
import { Request, Response } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const app = express();
const PORT = process.env.PORT || 8000;

/**
 * @swagger
 * /:
 *   get:
 *     description: Returns a generic message for the backend service.
 *     responses:
 *       200:
 *         description: A successful response with a placeholder message.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: Backend Service: Node.js/Express.js with Prisma (placeholder)
 */
app.get('/', (req: Request, res: Response) => {
  res.send('Backend Service: Node.js/Express.js with Prisma (placeholder)');
});

// Placeholder for a /test endpoint as per user request in a similar context
/**
 * @swagger
 * /test:
 *   get:
 *     description: Returns a test message to confirm the endpoint is working.
 *     responses:
 *       200:
 *         description: A successful JSON response indicating the endpoint is working.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Backend /test endpoint is working!
 */
app.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Backend /test endpoint is working!' });
});

// Swagger JSDoc configuration
const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend API',
      version: '1.0.0',
      description: 'API documentation for the backend service',
    },
  },
  // Path to the API docs
  // Note: You'll need to create JSDoc comments in your route files for this to work
  apis: ['./src/server.ts'], //  Path to the API files
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
