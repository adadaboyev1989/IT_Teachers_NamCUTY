// Minimal stand-in for Supabase's GoTrue auth server, just enough for
// AdminLogin.tsx's `supabase.auth.signInWithPassword` / `signOut` calls to
// work against a local SQLite backend. There is exactly one account (read
// from env vars), no real password hashing or JWT signing — this must never
// be reachable from anywhere but localhost. See README's "Lokal ishlab
// chiqish" section.
import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import crypto from 'node:crypto'

const LOCAL_ADMIN_EMAIL = process.env.LOCAL_ADMIN_EMAIL || 'admin@it-teachers.uz'
const LOCAL_ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD || 'localdev123'
const LOCAL_ADMIN_ID = '00000000-0000-0000-0000-000000000001'

function buildUser() {
  return {
    id: LOCAL_ADMIN_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: LOCAL_ADMIN_EMAIL,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: 'local-dev' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  }
}

function buildSession() {
  const now = Math.floor(Date.now() / 1000)
  return {
    access_token: `local-dev.${crypto.randomBytes(16).toString('hex')}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: `local-dev-refresh.${crypto.randomBytes(16).toString('hex')}`,
    user: buildUser(),
  }
}

export function createAuthRouter(): Router {
  const router = createRouter()

  router.post('/token', (req: Request, res: Response) => {
    const grantType = req.query.grant_type

    if (grantType === 'password') {
      const { email, password } = req.body || {}
      if (email === LOCAL_ADMIN_EMAIL && password === LOCAL_ADMIN_PASSWORD) {
        res.json(buildSession())
      } else {
        res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid login credentials' })
      }
      return
    }

    if (grantType === 'refresh_token') {
      res.json(buildSession())
      return
    }

    res.status(400).json({ error: 'unsupported_grant_type', error_description: `Unsupported grant_type: ${grantType}` })
  })

  router.get('/user', (_req: Request, res: Response) => {
    res.json(buildUser())
  })

  router.post('/logout', (_req: Request, res: Response) => {
    res.status(204).send()
  })

  return router
}
