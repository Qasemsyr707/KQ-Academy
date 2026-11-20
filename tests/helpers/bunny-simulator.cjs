/* eslint-disable @typescript-eslint/no-require-imports -- Node test helper. */
/**
 * Local simulator of the parts of Bunny Stream the platform uses, for tests only:
 *   - Stream API: create video, get video (status), delete (recorded, never expected);
 *   - TUS resumable upload (creation, HEAD offset, PATCH append) with Bunny's
 *     presigned headers: AuthorizationSignature = SHA256(library + key + expire + videoId).
 * It never stores video bytes: it counts them and hashes them in order, so files
 * larger than 2 GB can be uploaded quickly. Fault injection through `control`.
 * Listens on 127.0.0.1 only.
 */
const http = require('node:http');
const { createHash, randomUUID } = require('node:crypto');

function startBunnySimulator({ libraryId = '123456', apiKey = 'simulated-api-key', processingPolls = 2, port = 0 } = {}) {
  const videos = new Map();     // videoId -> { title, status, polls, deleted }
  const resources = new Map();  // resourceId -> { videoId, length, offset, hash, expire, patchOffsets, active, maxActive, complete }
  const stats = { creates: 0, deletes: 0, authFailures: 0, patches: 0, heads: 0, tusCreates: 0, injectedFailures: 0 };
  const control = {
    failNextPatches: 0,          // answer 500 after reading part of the body
    revokedSignatures: new Set(),// signatures answered with 401
    throttleBytesPerSecond: 0,   // 0 = unlimited
    processingPolls,             // GET video polls in "processing" before ready
    failProcessing: false,
  };

  const signature = (expire, videoId) => createHash('sha256').update(`${libraryId}${apiKey}${expire}${videoId}`).digest('hex');
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, HEAD, PATCH, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'AuthorizationSignature, AuthorizationExpire, VideoId, LibraryId, Tus-Resumable, Upload-Length, Upload-Offset, Upload-Metadata, Content-Type, X-HTTP-Method-Override',
    'Access-Control-Expose-Headers': 'Location, Upload-Offset, Upload-Length, Tus-Resumable, Upload-Expires',
    'Tus-Resumable': '1.0.0',
  };
  const send = (res, status, headers = {}, body) => {
    res.writeHead(status, { ...cors, 'Cache-Control': 'no-store', ...headers });
    res.end(body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body));
  };
  const tusAuth = req => {
    const expire = Number(req.headers.authorizationexpire);
    const videoId = req.headers.videoid;
    const given = req.headers.authorizationsignature;
    const ok = req.headers.libraryid === libraryId && videos.has(videoId) && Number.isInteger(expire)
      && expire > Math.floor(Date.now() / 1000) && given === signature(expire, videoId) && !control.revokedSignatures.has(given);
    if (!ok) stats.authFailures++;
    return ok ? { videoId, expire } : null;
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://simulator');
    const parts = url.pathname.split('/').filter(Boolean);
    // CORS preflight: allow the headers the TUS client asks for (as Bunny's endpoint does).
    if (req.method === 'OPTIONS') {
      return send(res, 204, req.headers['access-control-request-headers']
        ? { 'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] } : {});
    }

    // ----- Stream API -----
    if (parts[0] === 'library') {
      if (parts[1] !== libraryId || req.headers.accesskey !== apiKey) return send(res, 401, { 'Content-Type': 'application/json' }, { message: 'Unauthorized' });
      if (req.method === 'POST' && parts.length === 3 && parts[2] === 'videos') {
        let raw = '';
        req.on('data', chunk => { raw += chunk; });
        req.on('end', () => {
          const guid = randomUUID();
          stats.creates++;
          videos.set(guid, { title: JSON.parse(raw || '{}').title, status: 0, polls: 0, deleted: false });
          send(res, 200, { 'Content-Type': 'application/json' }, { guid, videoLibraryId: Number(libraryId), status: 0 });
        });
        return;
      }
      const video = videos.get(parts[3]);
      if (parts[2] === 'videos' && parts.length === 4 && req.method === 'GET') {
        if (!video || video.deleted) return send(res, 404, { 'Content-Type': 'application/json' }, { message: 'Not found' });
        if (video.status >= 1 && video.status < 4) {
          video.polls++;
          if (video.polls > control.processingPolls) video.status = control.failProcessing ? 5 : 4;
          else video.status = 3;
        }
        return send(res, 200, { 'Content-Type': 'application/json' }, { guid: parts[3], videoLibraryId: Number(libraryId), status: video.status });
      }
      if (parts[2] === 'videos' && parts.length === 4 && req.method === 'DELETE') {
        stats.deletes++;
        if (video) video.deleted = true;
        return send(res, 200, {}, '{}');
      }
      return send(res, 404);
    }

    // ----- TUS -----
    if (parts[0] === 'tusupload') {
      const auth = tusAuth(req);
      // Read the whole request before refusing it: answering mid-upload looks like a reset connection to browsers.
      if (!auth) { req.resume(); req.on('end', () => send(res, 401, {}, 'Unauthorized')); return; }
      if (req.method === 'POST' && parts.length === 1) {
        const length = Number(req.headers['upload-length']);
        if (!Number.isSafeInteger(length) || length <= 0) return send(res, 400);
        const id = randomUUID();
        stats.tusCreates++;
        // Bunny: an incomplete resource lives until its ORIGINAL AuthorizationExpire.
        resources.set(id, { videoId: auth.videoId, length, offset: 0, hash: createHash('sha256'), expire: auth.expire,
          patchOffsets: [], active: 0, maxActive: 0, complete: false, digest: null });
        return send(res, 201, { Location: `/tusupload/${id}`, 'Upload-Offset': '0' });
      }
      const resource = resources.get(parts[1]);
      if (!resource || resource.expire <= Math.floor(Date.now() / 1000) || resource.videoId !== auth.videoId) { req.resume(); return send(res, 404); }
      if (req.method === 'HEAD') {
        stats.heads++;
        return send(res, 200, { 'Upload-Offset': String(resource.offset), 'Upload-Length': String(resource.length) });
      }
      if (req.method === 'PATCH') {
        stats.patches++;
        const offset = Number(req.headers['upload-offset']);
        if (offset !== resource.offset) { req.resume(); return send(res, 409, { 'Upload-Offset': String(resource.offset) }); }
        resource.patchOffsets.push(offset);
        resource.active++;
        resource.maxActive = Math.max(resource.maxActive, resource.active);
        const failThis = control.failNextPatches > 0;
        if (failThis) { control.failNextPatches--; stats.injectedFailures++; }
        let received = 0;
        let finished = false;
        const done = (status) => {
          if (finished) return;
          finished = true;
          resource.active--;
          if (resource.offset === resource.length && !resource.complete) {
            resource.complete = true;
            resource.digest = resource.hash.digest('hex');
            const video = videos.get(resource.videoId);
            if (video && video.status === 0) video.status = 1;
          }
          if (status) send(res, status, { 'Upload-Offset': String(resource.offset) });
        };
        req.on('data', chunk => {
          if (failThis && received > 0) return;              // drop the rest of a failing request
          // Like a real TUS server, bytes received before a disconnect count.
          resource.hash.update(chunk);
          resource.offset += chunk.length;
          received += chunk.length;
          if (control.throttleBytesPerSecond > 0) {
            req.pause();
            setTimeout(() => req.resume(), Math.ceil((chunk.length / control.throttleBytesPerSecond) * 1000));
          }
        });
        req.on('end', () => done(failThis ? 500 : 204));
        req.on('close', () => done(null));                   // client went away (offline, pause)
        return;
      }
      return send(res, 405);
    }
    return send(res, 404);
  });

  return new Promise(resolve => server.listen(port, '127.0.0.1', () => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    resolve({
      origin, libraryId, apiKey, stats, control, videos, resources,
      signature,
      close: () => new Promise(done => { server.closeAllConnections?.(); server.close(() => done()); }),
      /** Resources (TUS sessions) created for a video. */
      resourcesFor: videoId => [...resources.values()].filter(r => r.videoId === videoId),
    });
  }));
}

module.exports = { startBunnySimulator };

// `node tests/helpers/bunny-simulator.cjs <port>` runs it standalone (browser tests) with a control API.
if (require.main === module) {
  startBunnySimulator({ libraryId: process.env.SIM_LIBRARY_ID || '123456', apiKey: process.env.SIM_API_KEY || 'simulated-api-key', port: Number(process.argv[2] || 0) }).then(sim => {
    const controlServer = http.createServer((req, res) => {
      let raw = '';
      req.on('data', c => { raw += c; });
      req.on('end', () => {
        if (req.method === 'POST') {
          const body = JSON.parse(raw || '{}');
          if (body.failNextPatches !== undefined) sim.control.failNextPatches = body.failNextPatches;
          if (body.throttleBytesPerSecond !== undefined) sim.control.throttleBytesPerSecond = body.throttleBytesPerSecond;
          if (body.revokeAllSignatures) for (const r of sim.resources.values()) { /* revoke by expiry-bound signatures in use */ sim.control.revokedSignatures.add(sim.signature(r.expire, r.videoId)); }
          if (body.revokeSignature) sim.control.revokedSignatures.add(body.revokeSignature);
          if (body.expireAllResources) for (const r of sim.resources.values()) r.expire = 0;
        }
        const resources = [...sim.resources.entries()].map(([id, r]) => ({ id, videoId: r.videoId, length: r.length, offset: r.offset,
          complete: r.complete, digest: r.digest, patchOffsets: r.patchOffsets, maxActive: r.maxActive }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ origin: sim.origin, stats: sim.stats, videos: [...sim.videos.entries()].map(([id, v]) => ({ id, ...v })), resources }));
      });
    });
    controlServer.listen(Number(process.argv[3] || 0), '127.0.0.1', () => {
      console.log(JSON.stringify({ origin: sim.origin, control: `http://127.0.0.1:${controlServer.address().port}` }));
    });
  });
}
