import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getCache, setCache, flushCache, isRedisActive } from './utils/cache.js';
import { getRepositoryEcosystem } from './utils/github.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Core Route: Get parsed visual schema for owner/repo
app.get('/api/repo/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  
  if (!owner || !repo) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Both Owner and Repository name are requested in route parameters.'
    });
  }

  const cacheKey = `repo:ecosystem:${owner.toLowerCase()}:${repo.toLowerCase()}`;

  try {
    // 1. Try to read from cache layers
    const cachedProduct = await getCache(cacheKey);
    if (cachedProduct) {
      console.log(`[Cache Hit] Serving cached developer ecosystem maps for ${owner}/${repo}`);
      return res.json({ ...cachedProduct, cached: true });
    }

    // 2. Fetch original parsed resource
    console.log(`[Cache Miss] Resolving GraphQL metrics node schema for ${owner}/${repo}...`);
    const ecosystemPayload = await getRepositoryEcosystem(owner, repo);

    // 3. Keep cached records alive in Redis/Memory for 6 hours
    await setCache(cacheKey, ecosystemPayload, 21600);

    return res.json({ ...ecosystemPayload, cached: false });
  } catch (error) {
    console.error(`[Server API Error] Error resolving ${owner}/${repo}:`, error.message);

    // Gracefully handle specific GitHub API response issues
    if (error.message.includes('Could not resolve to a Repository') || error.message.includes('NOT_FOUND')) {
      return res.status(404).json({
        error: 'REPO_NOT_FOUND',
        message: `The repository '${owner}/${repo}' does not exist or matches private scoping bounds.`
      });
    }

    if (error.message === 'GITHUB_PAT_MISSING') {
      return res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'A GITHUB_PAT authentication token has not been environment-configured.'
      });
    }

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An error occurred during repository ecosystem processing.'
    });
  }
});

// Administration Route: flush system cache database
app.post('/api/cache/flush', async (req, res) => {
  try {
    await flushCache();
    return res.json({
      success: true,
      message: 'Visualizer cached databases cleared successfully.'
    });
  } catch (e) {
    return res.status(500).json({
      error: 'FLUSH_ERROR',
      message: e.message
    });
  }
});

// App Health details
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    cacheDriver: isRedisActive() ? 'REDIS_CLIENT' : 'LOCAL_IN_MEMORY_MAP_FALLBACK',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`===============================================================`);
  console.log(`🚀 Repositories visualizer backend server listening on PORT: ${PORT}`);
  console.log(`🔗 API base endpoint: http://localhost:${PORT}/api/repo/:owner/:repo`);
  console.log(`🛡️  Current Cache Driver mode: ${isRedisActive() ? 'REDIS' : 'LOCAL MEMORY FALLBACK'}`);
  console.log(`===============================================================`);
});
