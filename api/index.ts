import app from '../server';
import type { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  // Normalize URL in case Vercel rewrites path with /api/index.ts
  if (req.url && req.url.startsWith('/api/index.ts')) {
    req.url = req.url.replace('/api/index.ts', '/api') || '/api';
  } else if (req.url && req.url.startsWith('/api/index')) {
    req.url = req.url.replace('/api/index', '/api') || '/api';
  }

  // Ensure CORS headers on all Vercel serverless requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range, X-Admin-Password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return app(req, res);
}
