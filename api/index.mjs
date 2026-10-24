// Vercel entry point: the Angular SSR server that `npm run build` produces (Express, the BFF under /api and the
// renderer), served as one function. Static files (the browser build) are served by Vercel's CDN before it.
// `vercel.json` sends every other request here; see ADR 0021.
import { reqHandler } from '../dist/onerpm-tracks/server/server.mjs';

export default reqHandler;
