const express = require('express');
import { Request, Response } from 'express';
const app = express();
const PORT = process.env.PORT || 8000;

app.get('/', (req: Request, res: Response) => {
  res.send('Backend Service: Node.js/Express.js with Prisma (placeholder)');
});

// Placeholder for a /test endpoint as per user request in a similar context
app.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Backend /test endpoint is working!' });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
