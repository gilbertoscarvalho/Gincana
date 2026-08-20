import app from '../server';
import type { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  try {
    // Normalize URL in case Vercel rewrites path with /api/index.ts
    if (req.url && req.url.startsWith('/api/index.ts')) {
      req.url = req.url.replace('/api/index.ts', '/api') || '/api';
    } else if (req.url && req.url.startsWith('/api/index')) {
      req.url = req.url.replace('/api/index', '/api') || '/api';
    }

    // Ensure CORS headers on all Vercel serverless requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range, X-Admin-Password');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel API handler error]:', err);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({
        error: 'Erro no servidor ao processar requisição: ' + (err?.message || 'Tente novamente.')
      });
    }
  }
}
