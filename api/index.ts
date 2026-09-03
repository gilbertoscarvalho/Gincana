if (typeof process !== 'undefined' && process.env) {
  process.env.IS_API_HANDLER = 'true';
}
import app from '../server';
import type { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  try {
    // Normalize URL across Vercel rewrite strategies and headers
    const rawUrl = req.url || '';
    const urlObj = rawUrl.includes('?') ? new URL(rawUrl, 'http://localhost') : null;
    const subpath = urlObj?.searchParams.get('__vercel_subpath');

    if (subpath) {
      urlObj?.searchParams.delete('__vercel_subpath');
      const search = urlObj?.searchParams.toString();
      req.url = subpath.startsWith('uploads/') 
        ? `/${subpath}${search ? `?${search}` : ''}`
        : `/api/${subpath}${search ? `?${search}` : ''}`;
    } else {
      const matchedPath =
        (req.headers['x-matched-path'] as string) ||
        (req.headers['x-invoke-path'] as string) ||
        (req.headers['x-vercel-matched-path'] as string) ||
        (req.headers['x-original-url'] as string);

      if (matchedPath && (matchedPath.startsWith('/api') || matchedPath.startsWith('/uploads'))) {
        const searchIdx = rawUrl.indexOf('?');
        const search = searchIdx !== -1 ? rawUrl.substring(searchIdx) : '';
        req.url = matchedPath + search;
      } else if (rawUrl.startsWith('/api/index.js')) {
        req.url = rawUrl.replace('/api/index.js', '/api') || '/api';
      } else if (rawUrl.startsWith('/api/index.ts')) {
        req.url = rawUrl.replace('/api/index.ts', '/api') || '/api';
      } else if (rawUrl.startsWith('/api/index')) {
        req.url = rawUrl.replace('/api/index', '/api') || '/api';
      }
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
