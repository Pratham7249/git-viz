import dotenv from 'dotenv';

dotenv.config();

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

const REPO_QUERY = `
  query GetRepoFullData($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      name
      owner {
        login
      }
      description
      stargazerCount
      forkCount
      watchers {
        totalCount
      }
      primaryLanguage {
        name
        color
      }
      languages(first: 8, orderBy: {field: SIZE, direction: DESC}) {
        edges {
          size
          node {
            name
            color
          }
        }
      }
      issues(states: OPEN) {
        totalCount
      }
      pullRequests(states: OPEN) {
        totalCount
      }
      defaultBranchRef {
        name
        target {
          ... on Commit {
            history(first: 100) {
              nodes {
                oid
                messageHeadline
                committedDate
                additions
                deletions
                author {
                  user {
                    login
                    name
                    avatarUrl
                    company
                    bio
                  }
                }
              }
            }
          }
        }
      }
      recentPRs: pullRequests(first: 40, states: [OPEN, MERGED]) {
        nodes {
          title
          number
          state
          author {
            login
            avatarUrl
            ... on User {
              name
              company
            }
          }
          reviews(first: 10) {
            nodes {
              author {
                login
                avatarUrl
                ... on User {
                  name
                }
              }
              state
            }
          }
        }
      }
    }
  }
`;

/**
 * Executes a GitHub GraphQL query with process.env.GITHUB_PAT
 * @param {string} query 
 * @param {object} variables 
 */
async function queryGitHubAPI(query, variables) {
  const token = process.env.GITHUB_PAT?.trim();
  
  if (!token) {
    throw new Error('GITHUB_PAT_MISSING');
  }

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Interactive-Repository-Visualizer'
    },
    body: JSON.stringify({ query, variables })
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`GitHub API Network Error: ${response.status} ${response.statusText}`);
  }

  if (body.errors) {
    const errMsg = body.errors.map(e => e.message).join(', ');
    throw new Error(`GitHub GraphQL Error: ${errMsg}`);
  }

  return body.data;
}

/**
 * Formats Raw Github API GraphQL structure to Interactive Graph Visual structure
 * @param {object} rawData 
 */
function parseGitHubResponse(rawData) {
  const repository = rawData.repository;
  if (!repository) {
    throw new Error('Repository details not found');
  }

  // 1. Language summary array
  const languages = (repository.languages?.edges || []).map(edge => ({
    name: edge.node.name,
    color: edge.node.color || '#cccccc',
    size: edge.size
  }));

  // Map to hold developers and count their activities
  const developers = new Map();
  // Map to track PR review collaborations
  const collaborations = new Map(); // key: "userA--userB", val: weight

  // 2. Parse Default Branch Commit History (aggregates developer activity)
  const commits = repository.defaultBranchRef?.target?.history?.nodes || [];
  commits.forEach(commit => {
    const authorUser = commit.author?.user;
    if (!authorUser) return; // Ignore anonymous/non-github users

    const username = authorUser.login;
    if (!developers.has(username)) {
      developers.set(username, {
        id: `user:${username}`,
        label: authorUser.name || username,
        username,
        type: 'developer',
        avatarUrl: authorUser.avatarUrl,
        company: authorUser.company || 'Independent',
        bio: authorUser.bio || '',
        commitsCount: 0,
        prsCount: 0,
        reviewsCount: 0,
        additions: 0,
        deletions: 0
      });
    }

    const dev = developers.get(username);
    dev.commitsCount += 1;
    dev.additions += commit.additions || 0;
    dev.deletions += commit.deletions || 0;
  });

  // 3. Parse Pull Requests (prsCount and code reviews)
  const prs = repository.recentPRs?.nodes || [];
  prs.forEach(pr => {
    const authorUser = pr.author;
    if (!authorUser || !authorUser.login) return;

    const username = authorUser.login;
    if (!developers.has(username)) {
      developers.set(username, {
        id: `user:${username}`,
        label: authorUser.name || username,
        username,
        type: 'developer',
        avatarUrl: authorUser.avatarUrl,
        company: authorUser.company || 'Open Source',
        bio: '',
        commitsCount: 0,
        prsCount: 0,
        reviewsCount: 0,
        additions: 0,
        deletions: 0
      });
    }

    const dev = developers.get(username);
    dev.prsCount += 1;

    // Process reviewers for collaboration connections
    const reviews = pr.reviews?.nodes || [];
    reviews.forEach(review => {
      const reviewer = review.author?.login;
      if (!reviewer || reviewer === username) return;

      if (!developers.has(reviewer)) {
        developers.set(reviewer, {
          id: `user:${reviewer}`,
          label: review.author.name || reviewer,
          username: reviewer,
          type: 'developer',
          avatarUrl: review.author.avatarUrl,
          company: 'Contributor',
          bio: '',
          commitsCount: 0,
          prsCount: 0,
          reviewsCount: 0,
          additions: 0,
          deletions: 0
        });
      }

      developers.get(reviewer).reviewsCount += 1;

      // Log collaboration link (order names alphabetically to make double links uniform)
      const pair = [username, reviewer].sort().join('--');
      collaborations.set(pair, (collaborations.get(pair) || 0) + 1);
    });
  });

  // Calculate Node Size/Value mapping - visual weight
  const nodes = [];
  const links = [];

  // Add Repository Central Hub Node
  const repoId = `repo:${repository.owner.login}/${repository.name}`;
  nodes.push({
    id: repoId,
    label: `${repository.owner.login}/${repository.name}`,
    type: 'repository',
    val: 45, // static main hub size
    avatarUrl: null
  });

  // Add Developer Nodes
  developers.forEach((dev) => {
    // Metric formula for size scaling: (commits * 1.2) + (PRs * 2.5) + (reviews * 1.5) + base size
    const sizeWeight = Math.min(
      (dev.commitsCount * 0.8) + (dev.prsCount * 2.0) + (dev.reviewsCount * 1.2) + 6,
      35 // Max capped visual node size
    );
    
    nodes.push({
      ...dev,
      val: sizeWeight
    });

    // Add link from developer to core repository
    links.push({
      source: dev.id,
      target: repoId,
      value: Math.min((dev.commitsCount + dev.prsCount), 8) + 1,
      type: 'contribution'
    });
  });

  // Add Collaboration Links between dev nodes
  collaborations.forEach((weight, pair) => {
    const [userA, userB] = pair.split('--');
    links.push({
      source: `user:${userA}`,
      target: `user:${userB}`,
      value: weight,
      type: 'collaboration'
    });
  });

  return {
    repository: {
      name: repository.name,
      owner: repository.owner.login,
      description: repository.description || 'No description provided.',
      stars: repository.stargazerCount,
      forks: repository.forkCount,
      watchers: repository.watchers.totalCount,
      primaryLanguage: repository.primaryLanguage?.name || 'Markdown',
      primaryLanguageColor: repository.primaryLanguage?.color || '#888888',
      openIssues: repository.issues.totalCount,
      openPRs: repository.pullRequests.totalCount
    },
    languages,
    graph: {
      nodes,
      links
    }
  };
}

/**
 * Sandbox visual data generator. Enables immediate frontend viewing if no access key is present.
 */
export function generateMockRepositoryData(owner, name) {
  const normalizedOwner = owner.toLowerCase();
  const normalizedName = name.toLowerCase();

  // Languages distribution
  const languages = [
    { name: 'TypeScript', size: 1402948, color: '#3178c6' },
    { name: 'JavaScript', size: 859384, color: '#f1e05a' },
    { name: 'Rust', size: 340298, color: '#dea584' },
    { name: 'CSS', size: 153094, color: '#563d7c' },
    { name: 'HTML', size: 92834, color: '#e34c26' }
  ];

  // Top Developers mock pool
  const mockDevs = [
    { login: 'acdlite', name: 'Andrew Clark', company: 'Vercel', bio: 'React core team alumnus.', commits: 42, prs: 6, reviews: 14, additions: 4500, deletions: 1200, avatarUrl: 'https://github.com/acdlite.png' },
    { login: 'gaearon', name: 'Dan Abramov', company: 'Bluesky', bio: 'Co-author of Redux and Create React App.', commits: 38, prs: 4, reviews: 20, additions: 2300, deletions: 800, avatarUrl: 'https://github.com/gaearon.png' },
    { login: 'sebmarkbage', name: 'Sebastian Markbåge', company: 'Cody', bio: 'Architect of React Server Components.', commits: 25, prs: 8, reviews: 12, additions: 6000, deletions: 4000, avatarUrl: 'https://github.com/sebmarkbage.png' },
    { login: 'sophiebits', name: 'Sophie Alpert', company: 'Independent', bio: 'React core developer.', commits: 18, prs: 3, reviews: 15, additions: 1200, deletions: 300, avatarUrl: 'https://github.com/sophiebits.png' },
    { login: 'bvaughn', name: 'Brian Vaughn', company: 'Meta', bio: 'React DevTools maintainer.', commits: 31, prs: 5, reviews: 8, additions: 3500, deletions: 1400, avatarUrl: 'https://github.com/bvaughn.png' },
    { login: 'leerob', name: 'Lee Robinson', company: 'Vercel', bio: 'VP of Developer Experience.', commits: 15, prs: 12, reviews: 22, additions: 1800, deletions: 900, avatarUrl: 'https://github.com/leerob.png' },
    { login: 'timneutkens', name: 'Tim Neutkens', company: 'Vercel', bio: 'Next.js co-creator.', commits: 29, prs: 9, reviews: 19, additions: 5100, deletions: 3200, avatarUrl: 'https://github.com/timneutkens.png' },
    { login: 'shuding_', name: 'Shu Ding', company: 'Vercel', bio: 'Design engineer building SWR and site.', commits: 12, prs: 7, reviews: 10, additions: 800, deletions: 200, avatarUrl: 'https://github.com/shuding.png' }
  ];

  const repoId = `repo:${owner}/${name}`;
  const nodes = [
    {
      id: repoId,
      label: `${owner}/${name}`,
      type: 'repository',
      val: 45,
      avatarUrl: null
    }
  ];

  const links = [];

  // Filter developers based on repo flavor
  let activeDevs = mockDevs;
  if (normalizedName === 'react') {
    activeDevs = mockDevs.slice(0, 5);
  } else if (normalizedName === 'next.js' || normalizedName === 'nextjs') {
    activeDevs = mockDevs.slice(4, 8);
  }

  activeDevs.forEach(dev => {
    const sizeWeight = (dev.commits * 0.8) + (dev.prs * 2.0) + (dev.reviews * 1.2) + 6;
    
    nodes.push({
      id: `user:${dev.login}`,
      label: dev.name,
      username: dev.login,
      type: 'developer',
      avatarUrl: dev.avatarUrl,
      company: dev.company,
      bio: dev.bio,
      commitsCount: dev.commits,
      prsCount: dev.prs,
      reviewsCount: dev.reviews,
      additions: dev.additions,
      deletions: dev.deletions,
      val: Math.min(sizeWeight, 35)
    });

    links.push({
      source: `user:${dev.login}`,
      target: repoId,
      value: Math.min(dev.commits, 8) + 1,
      type: 'contribution'
    });
  });

  // Synthesize developer relationships
  for (let i = 1; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      // Connect sequential nodes with random review collaboration
      if (Math.random() > 0.4) {
        links.push({
          source: nodes[i].id,
          target: nodes[j].id,
          value: Math.floor(Math.random() * 4) + 1,
          type: 'collaboration'
        });
      }
    }
  }

  const mockEntries = getMockDirectoryEntries(name);
  const directoryTree = buildTreeFromPaths(mockEntries);

  return {
    repository: {
      name,
      owner,
      description: `[Mock Server Sandbox] ${name} visual data generated for demonstration purposes. Provide a GITHUB_PAT in env to load live records.`,
      stars: normalizedName === 'react' ? 222934 : (normalizedName.includes('next') ? 122948 : 50400),
      forks: normalizedName === 'react' ? 44929 : (normalizedName.includes('next') ? 25932 : 1290),
      watchers: normalizedName === 'react' ? 6890 : 1827,
      primaryLanguage: languages[0].name,
      primaryLanguageColor: languages[0].color,
      openIssues: 820,
      openPRs: 231
    },
    languages,
    graph: {
      nodes,
      links
    },
    directoryTree
  };
}

/**
 * Helper to compute mock/seed-based change heat for a file
 */
function getFileHeat(fileName, size) {
  const ext = fileName.split('.').pop().toLowerCase();
  let baseHeat = 0.2;
  
  if (['js', 'jsx', 'ts', 'tsx', 'rs', 'go', 'py', 'java', 'cpp', 'c', 'cs', 'rb', 'php'].includes(ext)) {
    baseHeat = 0.7;
  } else if (['css', 'scss', 'html', 'json', 'yml', 'yaml'].includes(ext)) {
    baseHeat = 0.45;
  } else if (['md', 'txt', 'png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) {
    baseHeat = 0.15;
  }
  
  let hash = 0;
  for (let i = 0; i < fileName.length; i++) {
    hash = fileName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const variance = ((Math.abs(hash) % 100) / 100) * 0.3 - 0.15;
  
  return Math.max(0.05, Math.min(1.0, baseHeat + variance));
}

/**
 * Builds a hierarchical children tree structure from flat file paths
 */
function buildTreeFromPaths(entries) {
  const root = { name: 'root', children: [], isDirectory: true };
  
  entries.forEach(entry => {
    if (entry.path.includes('node_modules') || entry.path.startsWith('.git/')) {
      return;
    }
    const parts = entry.path.split('/');
    let current = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      
      let existing = current.children.find(c => c.name === part);
      
      if (!existing) {
        if (isLast && entry.type === 'blob') {
          const size = entry.size || 1000;
          const heat = getFileHeat(part, size);
          existing = {
            name: part,
            path: entry.path,
            size: size,
            heat: heat,
            isDirectory: false
          };
          current.children.push(existing);
        } else {
          existing = {
            name: part,
            path: parts.slice(0, i + 1).join('/'),
            children: [],
            isDirectory: true
          };
          current.children.push(existing);
        }
      }
      
      current = existing;
    }
  });
  
  return root;
}

/**
 * Mock directory listing mappings
 */
function getMockDirectoryEntries(name) {
  const nameLower = name.toLowerCase();
  if (nameLower === 'react') {
    return [
      { path: 'packages/react/src/React.js', size: 12500, type: 'blob' },
      { path: 'packages/react/src/ReactElement.js', size: 8400, type: 'blob' },
      { path: 'packages/react/src/ReactHooks.js', size: 14200, type: 'blob' },
      { path: 'packages/react-dom/src/ReactDOM.js', size: 11000, type: 'blob' },
      { path: 'packages/react-dom/src/ReactDOMHostConfig.js', size: 6200, type: 'blob' },
      { path: 'packages/react-reconciler/src/ReactFiber.js', size: 28400, type: 'blob' },
      { path: 'packages/react-reconciler/src/ReactFiberWorkLoop.js', size: 45000, type: 'blob' },
      { path: 'packages/react-reconciler/src/ReactFiberBeginWork.js', size: 31000, type: 'blob' },
      { path: 'packages/scheduler/src/Scheduler.js', size: 15600, type: 'blob' },
      { path: 'packages/shared/ReactSharedInternals.js', size: 3500, type: 'blob' },
      { path: 'scripts/rollup/config.js', size: 9200, type: 'blob' },
      { path: 'scripts/jest/config.js', size: 4100, type: 'blob' },
      { path: 'package.json', size: 2400, type: 'blob' },
      { path: 'README.md', size: 8593, type: 'blob' },
      { path: 'LICENSE', size: 1083, type: 'blob' }
    ];
  } else if (nameLower.includes('next')) {
    return [
      { path: 'packages/next/src/client/index.tsx', size: 18400, type: 'blob' },
      { path: 'packages/next/src/client/router.ts', size: 24200, type: 'blob' },
      { path: 'packages/next/src/server/next-server.ts', size: 38200, type: 'blob' },
      { path: 'packages/next/src/server/render.tsx', size: 41000, type: 'blob' },
      { path: 'packages/next/src/build/index.ts', size: 32000, type: 'blob' },
      { path: 'packages/next/src/build/webpack-config.ts', size: 28000, type: 'blob' },
      { path: 'errors/invalid-href.md', size: 1200, type: 'blob' },
      { path: 'examples/basic-css/pages/index.js', size: 850, type: 'blob' },
      { path: 'examples/with-redux/store.js', size: 3200, type: 'blob' },
      { path: 'package.json', size: 4100, type: 'blob' },
      { path: 'README.md', size: 14200, type: 'blob' }
    ];
  } else {
    return [
      { path: 'src/index.js', size: 3500, type: 'blob' },
      { path: 'src/components/App.js', size: 5200, type: 'blob' },
      { path: 'src/components/Header.js', size: 1800, type: 'blob' },
      { path: 'src/utils/helpers.js', size: 2200, type: 'blob' },
      { path: 'public/index.html', size: 1200, type: 'blob' },
      { path: 'package.json', size: 1400, type: 'blob' },
      { path: 'README.md', size: 2900, type: 'blob' }
    ];
  }
}

/**
 * Controller to fetch repository details and return parsed dashboard graph
 */
export async function getRepositoryEcosystem(owner, name) {
  try {
    const rawData = await queryGitHubAPI(REPO_QUERY, { owner, name });
    const payload = parseGitHubResponse(rawData);
    
    // Fetch filesystem directory tree
    const defaultBranchName = rawData.repository?.defaultBranchRef?.name || 'main';
    let directoryTree = null;
    
    try {
      const token = process.env.GITHUB_PAT?.trim();
      const headers = {
        'User-Agent': 'Interactive-Repository-Visualizer'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log(`[Github Service] Retrieving git trees REST mapping for ${owner}/${name} under ${defaultBranchName}...`);
      const treeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${name}/git/trees/${defaultBranchName}?recursive=1`,
        { headers }
      );
      
      if (treeResponse.ok) {
        const treeData = await treeResponse.json();
        if (treeData && Array.isArray(treeData.tree)) {
          directoryTree = buildTreeFromPaths(treeData.tree);
        }
      } else {
        console.warn(`[Github Service] REST tree fetch received status: ${treeResponse.status}`);
      }
    } catch (treeError) {
      console.error('[Github Service] Failed resolving repository tree recursively:', treeError.message);
    }
    
    if (!directoryTree) {
      console.log('[Github Service] Falling back to default directory schema...');
      directoryTree = buildTreeFromPaths(getMockDirectoryEntries(name));
    }
    
    payload.directoryTree = directoryTree;
    return payload;
  } catch (error) {
    if (error.message === 'GITHUB_PAT_MISSING') {
      console.warn(`[Github Service] GITHUB_PAT missing. Returning sandbox repository generator for target: ${owner}/${name}`);
      return generateMockRepositoryData(owner, name);
    }
    
    const isSandboxQuery = ['react', 'next.js', 'nextjs', 'visualizer'].includes(name.toLowerCase());
    if (isSandboxQuery) {
      console.warn(`[Github Service] Encountered API error: "${error.message}". Redirecting request to sandbox repository mock.`);
      return generateMockRepositoryData(owner, name);
    }

    throw error;
  }
}
