import { handleEdgeOneRequest } from '../../../src/handler.js';

export async function onRequest({ request, env }) {
  return handleEdgeOneRequest(request, env);
}
