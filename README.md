# GitViz: Interactive Developer Ecosystem & Repository Visualizer

<!-- Deployment trigger commit -->

GitViz is a developer analytics tool that fetches public or private repository statistics from the GitHub GraphQL API, processes contributors' interactions, and visualizes codebase complexity and collaboration topologies. 

It provides teams with insights into ownership distribution, developer network clusters, and module churn.

---

## 🚀 Key Features

* **Interactive Developer Collaboration Network**: A force-directed canvas that maps developer interaction clusters, contribution weights (commits, PRs, reviews), and cross-developer pull request review linkages. Developed using `react-force-graph-2d` (D3 force simulation).
* **Repository Directory Heatmap**: An interactive codebase size and churn treemap. Visualize folder nesting, file size hierarchy, and change intensities directly in the browser.
* **Aggregated Codebase Metrics**: Clean metrics panels illustrating total star/fork/watcher counts, active issues, open pull requests, and line addition/deletion metrics.
* **Hybrid Cache Driver Backend**: Fully decoupled Express.js API proxy integrating automatic Redis tier management. Supports seamless self-healing fallback to pure memory caching when Redis instances are offline.
* **Futuristic Dark-Mode Interface**: Styled using vanilla CSS variables, glowing focus rings, responsive CSS panels, transitions, and hover-triggered micro-interactions.

---

## 🛠️ Technology Stack

### Frontend (Client App)
* **Core Framework**: React 19 / Next.js 16 (App Router)
* **Data Visualization**: D3.js, `react-force-graph-2d`, `recharts`
* **Icons**: `lucide-react`
* **Styling**: Vanilla CSS Variables & Flex/Grid configurations

### Backend (Server API)
* **Runtime & Framework**: Node.js (ES Modules import syntax) & Express.js
* **API Engine**: GitHub GraphQL API proxy client
* **Cache System**: Redis (via `@redis/client`), in-memory fallback mappings

---

## 🛹 Step-by-Step Running Guide

### 1. Backend Server Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Configure your environment variables in `backend/.env`:
   ```env
   PORT=5000
   GITHUB_PAT=YOUR_GITHUB_PERSONAL_ACCESS_TOKEN
   REDIS_URL=redis://127.0.0.1:6379
   ```
   *(Note: `GITHUB_PAT` and `REDIS_URL` are completely optional for sandbox preview. The system auto-detects empty tokens/offline services and serves rich simulated datasets for repositories like `react` or `next.js`).*
3. Start the node dev environment:
   ```bash
   npm run dev
   ```

### 2. Frontend Launch
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Launch Next.js development server:
   ```bash
   npx next dev -p 3000
   ```
3. Visit the dashboard at **[http://localhost:3000](http://localhost:3000)**.

---

## 📁 Repository Structure
```
memo_1/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express app entry & cache routes
│   │   └── utils/
│   │       ├── cache.js       # Redis client & fallback mappings
│   │       └── github.js      # GraphQL APIs queries & mock sandbox triggers
│   ├── .env                  # Port & optional connection strings
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js routers
│   │   └── components/       # Interactive charts, heatmaps, sidebar graph canvases
│   ├── public/
│   └── package.json
└── README.md                 # Main workspace documentation
```

---

## 🎯 Profile Suitability & Career Applications

This project showcases several complex software engineering patterns. If you are using this workspace for job applications, it fits the following roles:

* **Full-Stack Software Engineer**: Demonstrates ability to write clean modern React clients communicating with isolated API proxy routers, with robust configurations and caching strategies.
* **Frontend Web Developer (Visualizations Focus)**: Showcases proficiency in D3 canvases, responsive animations, complex SVG calculations, coordinate system layouts, and smooth user interactions.
* **Backend Platform Integration Developer**: Demonstrates skill in GraphQL schema design, API rate-limiting mitigation, handling raw network streams, and building resilience for offline microservices/third-party APIs.
