import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import bcrypt from 'bcrypt';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { calculateReturn } from '../src/lib/return-calculator.mjs';

const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
const port = Number(process.env.API_PORT || 4000);
const apiUrl = process.env.API_PUBLIC_URL || `http://localhost:${port}`;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4028';
const cookieSecure = process.env.NODE_ENV === 'production';
const sessionCookie = 'tn_session';
const oauthCookie = 'tn_oauth';
const jwtSecret = process.env.JWT_SECRET;
const encryptionKey = Buffer.from(process.env.DATA_ENCRYPTION_KEY || '', 'base64');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Set it in .env.local before starting the API.');
}
if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
  throw new Error(
    'JWT_SECRET must contain at least 32 bytes. Generate one with: openssl rand -hex 32'
  );
}
if (encryptionKey.length !== 32) {
  throw new Error(
    'DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key. Generate one with: openssl rand -base64 32'
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const cookieOptions = (maxAge, pathName = '/') =>
  `Path=${pathName}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${cookieSecure ? '; Secure' : ''}`;

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true');
app.use(helmet());
app.use(
  cors({
    origin: siteUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
app.use('/auth', authLimiter);

function seal(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

function unseal(value) {
  const ciphertext = Buffer.from(value, 'base64');
  if (ciphertext.length < 29) throw new Error('Encrypted value is invalid.');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    ciphertext.subarray(0, 12)
  );
  decipher.setAuthTag(ciphertext.subarray(12, 28));
  const plaintext = Buffer.concat([decipher.update(ciphertext.subarray(28)), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function readCookie(request, name) {
  const header = request.headers.cookie || '';
  const item = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
}

function setCookie(response, name, value, maxAge, pathName = '/') {
  response.append(
    'Set-Cookie',
    `${name}=${encodeURIComponent(value)}; ${cookieOptions(maxAge, pathName)}`
  );
}

function clearCookie(response, name, pathName = '/') {
  response.append('Set-Cookie', `${name}=; ${cookieOptions(0, pathName)}`);
}

function createSession(response, userId, rememberMe = true) {
  const maxAge = rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60;
  const token = jwt.sign({ userId }, jwtSecret, { expiresIn: maxAge });
  setCookie(response, sessionCookie, token, maxAge);
}

function requireAuth(request, response, next) {
  const token = readCookie(request, sessionCookie);
  if (!token) return response.status(401).json({ message: 'Please sign in to continue.' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (typeof payload === 'string' || typeof payload.userId !== 'string') {
      return response.status(401).json({ message: 'Please sign in to continue.' });
    }
    request.userId = payload.userId;
    return next();
  } catch {
    return response
      .status(401)
      .json({ message: 'Your session has expired. Please sign in again.' });
  }
}

function validEmail(value) {
  return (
    typeof value === 'string' && value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function validateInterview(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return 'Enter your interview answers.';
  if (!['single', 'mfj', 'mfs', 'hoh', 'qss'].includes(value.filingStatus)) {
    return 'Choose a supported filing status.';
  }
  for (const field of ['firstName', 'lastName']) {
    if (typeof value[field] !== 'string' || !value[field].trim() || value[field].length > 100) {
      return 'Enter a valid first and last name.';
    }
  }
  if (typeof value.dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.dob)) {
    return 'Enter a valid date of birth.';
  }
  const dob = new Date(`${value.dob}T00:00:00Z`);
  if (
    Number.isNaN(dob.getTime()) ||
    dob.toISOString().slice(0, 10) !== value.dob ||
    dob > new Date()
  ) {
    return 'Enter a valid date of birth.';
  }
  if (!validSsn(value.ssn)) return 'Enter a valid 9-digit Social Security number.';
  if (['mfj', 'mfs'].includes(value.filingStatus)) {
    for (const field of ['spouseFirstName', 'spouseLastName']) {
      if (typeof value[field] !== 'string' || !value[field].trim() || value[field].length > 100) {
        return 'Enter your spouse’s first and last name.';
      }
    }
    if (value.filingStatus === 'mfj') {
      if (typeof value.spouseDob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.spouseDob)) {
        return 'Enter a valid spouse date of birth.';
      }
      const spouseDob = new Date(`${value.spouseDob}T00:00:00Z`);
      if (
        Number.isNaN(spouseDob.getTime()) ||
        spouseDob.toISOString().slice(0, 10) !== value.spouseDob ||
        spouseDob > new Date()
      ) {
        return 'Enter a valid spouse date of birth.';
      }
    }
    if (!validSsn(value.spouseSsn)) return 'Enter a valid 9-digit spouse Social Security number.';
  }
  if (value.filingStatus === 'mfs' && !['yes', 'no'].includes(value.spouseItemizes)) {
    return 'Tell us whether your spouse will itemize deductions.';
  }
  if (!['yes', 'no'].includes(value.hasDependents) || !['yes', 'no'].includes(value.hasW2)) {
    return 'Complete the dependent and income questions.';
  }
  if (
    value.hasDependents === 'yes' &&
    (!Number.isInteger(Number(value.dependentCount)) ||
      Number(value.dependentCount) < 1 ||
      Number(value.dependentCount) > 10)
  ) {
    return 'Enter a dependent count from 1 to 10.';
  }
  if (
    ['hoh', 'qss'].includes(value.filingStatus) &&
    (value.hasDependents !== 'yes' ||
      !Number.isInteger(Number(value.dependentCount)) ||
      Number(value.dependentCount) < 1)
  ) {
    return 'Head of household and qualifying surviving spouse status require a qualifying dependent.';
  }
  if (!Array.isArray(value.w2s) || value.w2s.length > 20) return 'Enter valid W-2 details.';
  if (
    value.hasW2 === 'yes' &&
    (value.w2s.length === 0 ||
      value.w2s.some(
        (w2) =>
          !w2 ||
          typeof w2.employer !== 'string' ||
          !w2.employer.trim() ||
          !validAmount(w2.wages) ||
          !validAmount(w2.withheld)
      ))
  ) {
    return 'Enter an employer name and valid W-2 amounts for each employer.';
  }
  for (const field of ['interest', 'dividends', 'studentLoanInterest', 'hsa', 'ira']) {
    if (!validAmount(value[field] ?? '')) return 'Enter amounts using whole dollars only.';
  }
  return null;
}

function validSsn(value) {
  const ssn = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  return (
    ssn.length === 9 &&
    !ssn.startsWith('000') &&
    !ssn.startsWith('666') &&
    Number(ssn.slice(0, 3)) < 900 &&
    ssn.slice(3, 5) !== '00' &&
    ssn.slice(5) !== '0000'
  );
}

function validAmount(value) {
  return typeof value === 'string' && /^\d{0,9}$/.test(value);
}

function validateFiling(value, needsBankDetails) {
  if (!value || typeof value !== 'object') return 'Enter your filing details.';
  if (typeof value.priorAgi !== 'string' || !/^\d{1,9}$/.test(value.priorAgi)) {
    return 'Enter last year’s income in whole dollars.';
  }
  if (typeof value.pin !== 'string' || !/^\d{5}$/.test(value.pin))
    return 'Enter a 5-digit signature PIN.';
  if (value.agreeDisclosure !== true) return 'Accept the declaration to save filing details.';
  if (needsBankDetails) {
    if (typeof value.routingNumber !== 'string' || !/^\d{9}$/.test(value.routingNumber)) {
      return 'Enter a 9-digit bank routing number.';
    }
    const digits = value.routingNumber.split('').map(Number);
    if (
      (3 * (digits[0] + digits[3] + digits[6]) +
        7 * (digits[1] + digits[4] + digits[7]) +
        digits[2] +
        digits[5] +
        digits[8]) %
        10 !==
      0
    ) {
      return 'Enter a valid bank routing number.';
    }
    if (typeof value.accountNumber !== 'string' || !/^\d{4,34}$/.test(value.accountNumber)) {
      return 'Enter a valid bank account number.';
    }
    if (!['checking', 'savings'].includes(value.accountType)) return 'Choose an account type.';
  }
  return null;
}

function providerSettings(provider) {
  const callbackUrl = `${apiUrl}/auth/${provider}/callback`;
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return {
      clientId,
      clientSecret,
      callbackUrl,
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      scope: 'openid email profile',
    };
  }
  if (provider === 'apple') {
    const clientId = process.env.APPLE_CLIENT_ID;
    const teamId = process.env.APPLE_TEAM_ID;
    const keyId = process.env.APPLE_KEY_ID;
    const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!clientId || !teamId || !keyId || !privateKey) return null;
    const clientSecret = jwt.sign({}, privateKey, {
      algorithm: 'ES256',
      keyid: keyId,
      issuer: teamId,
      audience: 'https://appleid.apple.com',
      subject: clientId,
      expiresIn: '5m',
    });
    return {
      clientId,
      clientSecret,
      callbackUrl,
      authorizeUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      jwksUrl: 'https://appleid.apple.com/auth/keys',
      issuer: 'https://appleid.apple.com',
      scope: 'openid email',
    };
  }
  return null;
}

app.get('/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch {
    response.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.post('/auth/register', async (request, response) => {
  const { email, password, firstName, lastName } = request.body ?? {};
  if (
    !validEmail(email) ||
    typeof firstName !== 'string' ||
    !firstName.trim() ||
    firstName.length > 100 ||
    typeof lastName !== 'string' ||
    !lastName.trim() ||
    lastName.length > 100 ||
    typeof password !== 'string' ||
    password.length < 12 ||
    password.length > 128 ||
    !/[0-9]/.test(password) ||
    !/[!@#$%^&*]/.test(password)
  ) {
    return response
      .status(400)
      .json({ message: 'Check your name, email and password requirements.' });
  }
  try {
    const emailAddress = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, first_name, last_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name AS "firstName", last_name AS "lastName"`,
      [emailAddress, firstName.trim(), lastName.trim(), passwordHash]
    );
    createSession(response, result.rows[0].id);
    return response.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (error?.code === '23505')
      return response
        .status(409)
        .json({ message: 'That email is already registered. Sign in instead.' });
    console.error('Account registration failed.');
    return response
      .status(500)
      .json({ message: 'We could not create your account. Please try again.' });
  }
});

app.post('/auth/login', async (request, response) => {
  const { email, password, rememberMe } = request.body ?? {};
  if (!validEmail(email) || typeof password !== 'string' || password.length > 128) {
    return response.status(400).json({ message: 'Enter a valid email address and password.' });
  }
  try {
    const result = await pool.query(
      `SELECT id, email, first_name AS "firstName", last_name AS "lastName", password_hash
       FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );
    const user = result.rows[0];
    if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return response.status(401).json({ message: 'Invalid email or password.' });
    }
    const savedReturn = await pool.query(
      'SELECT id FROM tax_returns WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [user.id]
    );
    createSession(response, user.id, rememberMe === true);
    delete user.password_hash;
    return response.json({ user, mfaRequired: false, returnId: savedReturn.rows[0]?.id });
  } catch {
    console.error('Account sign-in failed.');
    return response.status(500).json({ message: 'We could not sign you in. Please try again.' });
  }
});

app.post('/auth/logout', (_request, response) => {
  clearCookie(response, sessionCookie);
  response.status(204).end();
});

app.get('/auth/me', requireAuth, async (request, response) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name AS "firstName", last_name AS "lastName" FROM users WHERE id = $1',
      [request.userId]
    );
    if (!result.rows[0])
      return response.status(401).json({ message: 'Please sign in to continue.' });
    return response.json({ user: result.rows[0] });
  } catch {
    return response.status(500).json({ message: 'We could not load your account.' });
  }
});

app.get('/auth/:provider', (request, response) => {
  const { provider } = request.params;
  let settings;
  try {
    settings = providerSettings(provider);
  } catch {
    settings = null;
  }
  if (!settings) {
    const name = provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'This';
    const message = `${name} sign-in is not configured. Add the provider credentials to .env.local.`;
    return response.redirect(`${siteUrl}/?oauth_error=${encodeURIComponent(message)}`);
  }
  const state = crypto.randomBytes(32).toString('base64url');
  const nonce = crypto.randomBytes(32).toString('base64url');
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const stateToken = jwt.sign({ state, nonce, verifier, provider }, jwtSecret, {
    expiresIn: '10m',
  });
  setCookie(response, oauthCookie, stateToken, 600, '/auth');

  const url = new URL(settings.authorizeUrl);
  url.searchParams.set('client_id', settings.clientId);
  url.searchParams.set('redirect_uri', settings.callbackUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', settings.scope);
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  if (provider === 'apple') url.searchParams.set('response_mode', 'query');
  if (provider === 'google') url.searchParams.set('prompt', 'select_account');
  response.redirect(url.toString());
});

app.get('/auth/:provider/callback', async (request, response) => {
  const { provider } = request.params;
  const stateToken = readCookie(request, oauthCookie);
  clearCookie(response, oauthCookie, '/auth');
  const state = typeof request.query.state === 'string' ? request.query.state : '';
  const code = typeof request.query.code === 'string' ? request.query.code : '';
  if (!stateToken || !state || !code)
    return response.redirect(
      `${siteUrl}/?oauth_error=The+sign-in+request+expired.+Please+try+again.`
    );

  try {
    const pending = jwt.verify(stateToken, jwtSecret);
    if (typeof pending === 'string' || pending.provider !== provider || pending.state !== state) {
      return response.redirect(
        `${siteUrl}/?oauth_error=Sign-in+could+not+be+verified.+Please+try+again.`
      );
    }
    const settings = providerSettings(provider);
    if (!settings)
      return response.redirect(`${siteUrl}/?oauth_error=This+sign-in+provider+is+not+configured.`);

    const tokenResponse = await fetch(settings.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: settings.callbackUrl,
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        code_verifier: pending.verifier,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || typeof tokenData.id_token !== 'string')
      throw new Error('Provider token exchange failed.');

    const decoded = jwt.decode(tokenData.id_token, { complete: true });
    if (!decoded?.header?.kid) throw new Error('Provider token is invalid.');
    const jwksResponse = await fetch(settings.jwksUrl);
    if (!jwksResponse.ok) throw new Error('Provider signing keys are unavailable.');
    const jwks = await jwksResponse.json();
    const jwk = jwks.keys?.find((key) => key.kid === decoded.header.kid);
    if (!jwk) throw new Error('Provider signing key was not found.');
    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const claims = jwt.verify(tokenData.id_token, publicKey, {
      algorithms: [provider === 'apple' ? 'ES256' : 'RS256'],
      audience: settings.clientId,
      issuer: settings.issuer,
    });
    if (
      typeof claims === 'string' ||
      claims.nonce !== pending.nonce ||
      typeof claims.email !== 'string' ||
      (claims.email_verified !== true && claims.email_verified !== 'true')
    ) {
      throw new Error('Provider account could not be verified.');
    }

    const email = claims.email.toLowerCase();
    const providerColumn = provider === 'google' ? 'google_id' : 'apple_id';
    const profileName = email.split('@')[0];
    const firstName = typeof claims.given_name === 'string' ? claims.given_name : profileName;
    const lastName = typeof claims.family_name === 'string' ? claims.family_name : '';
    const existing = await pool.query(
      `SELECT id FROM users WHERE ${providerColumn} = $1 OR email = $2 ORDER BY (${providerColumn} = $1) DESC LIMIT 1`,
      [claims.sub, email]
    );
    let userId;
    if (existing.rows[0]) {
      userId = existing.rows[0].id;
      await pool.query(
        `UPDATE users SET ${providerColumn} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [claims.sub, userId]
      );
    } else {
      const created = await pool.query(
        `INSERT INTO users (email, first_name, last_name, ${providerColumn})
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [email, firstName.slice(0, 100), lastName.slice(0, 100), claims.sub]
      );
      userId = created.rows[0].id;
    }
    const savedReturn = await pool.query(
      'SELECT id FROM tax_returns WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );
    createSession(response, userId);
    const destination = savedReturn.rows[0]
      ? `/return-review-filing?id=${encodeURIComponent(savedReturn.rows[0].id)}`
      : '/tax-interview';
    return response.redirect(`${siteUrl}${destination}`);
  } catch (error) {
    if (error?.code === '23505') {
      return response.redirect(
        `${siteUrl}/?oauth_error=This+provider+account+is+already+linked+to+another+user.`
      );
    }
    console.error('OAuth sign-in failed.');
    return response.redirect(
      `${siteUrl}/?oauth_error=Sign-in+failed.+Check+provider+configuration+and+try+again.`
    );
  }
});

app.post('/returns', requireAuth, async (request, response) => {
  const answers = request.body?.answers;
  const validationError = validateInterview(answers);
  if (validationError) return response.status(400).json({ message: validationError });
  try {
    const calculated = calculateReturn(answers);
    const result = await pool.query(
      `INSERT INTO tax_returns (user_id, encrypted_interview_data, calculated_data, status)
       VALUES ($1, $2, $3, 'REVIEW')
       RETURNING id, calculated_data AS data, status`,
      [request.userId, seal(answers), calculated]
    );
    return response.status(201).json(result.rows[0]);
  } catch {
    console.error('Tax return could not be saved.');
    return response
      .status(500)
      .json({ message: 'We could not save your return. Please try again.' });
  }
});

app.get('/returns/latest', requireAuth, async (request, response) => {
  try {
    const result = await pool.query(
      `SELECT id, calculated_data AS data, status,
              encrypted_filing_data IS NOT NULL AS "filingDetailsSaved"
       FROM tax_returns WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [request.userId]
    );
    return response.json({ return: result.rows[0] ?? null });
  } catch {
    return response.status(500).json({ message: 'We could not load your saved returns.' });
  }
});

app.get('/returns/:id/interview', requireAuth, async (request, response) => {
  if (!isUuid(request.params.id))
    return response.status(400).json({ message: 'Return not found.' });
  try {
    const result = await pool.query(
      'SELECT encrypted_interview_data FROM tax_returns WHERE id = $1 AND user_id = $2',
      [request.params.id, request.userId]
    );
    if (!result.rows[0]) return response.status(404).json({ message: 'Return not found.' });
    return response.json({ answers: unseal(result.rows[0].encrypted_interview_data) });
  } catch {
    return response.status(500).json({ message: 'We could not load your saved interview.' });
  }
});

app.put('/returns/:id', requireAuth, async (request, response) => {
  if (!isUuid(request.params.id))
    return response.status(400).json({ message: 'Return not found.' });
  const answers = request.body?.answers;
  const validationError = validateInterview(answers);
  if (validationError) return response.status(400).json({ message: validationError });
  try {
    const calculated = calculateReturn(answers);
    const result = await pool.query(
      `UPDATE tax_returns
       SET encrypted_interview_data = $1, calculated_data = $2,
           encrypted_filing_data = NULL, status = 'REVIEW', updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
       RETURNING id, calculated_data AS data, status`,
      [seal(answers), calculated, request.params.id, request.userId]
    );
    if (!result.rows[0]) return response.status(404).json({ message: 'Return not found.' });
    return response.json(result.rows[0]);
  } catch {
    console.error('Tax return could not be updated.');
    return response
      .status(500)
      .json({ message: 'We could not update your return. Please try again.' });
  }
});

app.get('/returns/:id', requireAuth, async (request, response) => {
  if (!isUuid(request.params.id)) {
    return response.status(400).json({ message: 'Return not found.' });
  }
  try {
    const result = await pool.query(
      `SELECT id, calculated_data AS data, status, encrypted_filing_data IS NOT NULL AS "filingDetailsSaved"
       FROM tax_returns WHERE id = $1 AND user_id = $2`,
      [request.params.id, request.userId]
    );
    if (!result.rows[0]) return response.status(404).json({ message: 'Return not found.' });
    return response.json(result.rows[0]);
  } catch {
    return response.status(500).json({ message: 'We could not load your return.' });
  }
});

app.post('/returns/:id/filing', requireAuth, async (request, response) => {
  if (!isUuid(request.params.id)) {
    return response.status(400).json({ message: 'Return not found.' });
  }
  try {
    const returnResult = await pool.query(
      'SELECT id, calculated_data FROM tax_returns WHERE id = $1 AND user_id = $2',
      [request.params.id, request.userId]
    );
    if (!returnResult.rows[0]) return response.status(404).json({ message: 'Return not found.' });
    const needsBankDetails = returnResult.rows[0].calculated_data.balance > 0;
    const validationError = validateFiling(request.body, needsBankDetails);
    if (validationError) return response.status(400).json({ message: validationError });

    await pool.query(
      `UPDATE tax_returns
       SET encrypted_filing_data = $1, status = 'FILING_DETAILS_SAVED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3`,
      [seal(request.body), request.params.id, request.userId]
    );
    return response.json({ status: 'FILING_DETAILS_SAVED', submissionEnabled: false });
  } catch {
    console.error('Filing details could not be saved.');
    return response
      .status(500)
      .json({ message: 'We could not save your filing details. Please try again.' });
  }
});

app.use((error, _request, response, _next) => {
  if (error?.type === 'entity.parse.failed') {
    return response.status(400).json({ message: 'Request must contain valid JSON.' });
  }
  if (error?.type === 'entity.too.large') {
    return response.status(413).json({ message: 'Request is too large.' });
  }
  console.error('Unhandled API request error.');
  return response.status(500).json({ message: 'Something went wrong. Please try again.' });
});

async function start() {
  const schema = await fs.readFile(path.join(root, 'schema.sql'), 'utf8');
  await pool.query(schema);
  app.listen(port, '0.0.0.0', () => {
    console.log(`True North API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('True North API could not start. Check DATABASE_URL and PostgreSQL availability.');
  if (process.env.NODE_ENV !== 'production') console.error(error.message);
  process.exitCode = 1;
});
