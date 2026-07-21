# Contributing to GitViz

Thank you for your interest in contributing to GitViz! Open source contributions, issues, and feature additions keep projects healthy and robust.

---

## 🛠️ Getting Started with Contribution

### 1. Fork and Clone
1. Fork the repository on GitHub.
2. Clone the repository locally:
   ```bash
   git clone https://github.com/Pratham7249/git-viz.git
   ```
3. Initialize the development dependencies:
   * In the root folder, navigate to both backend and frontend to install:
     ```bash
     cd backend && npm install
     cd ../frontend && npm install
     ```

### 2. General Contribution Rules
* **Branch Naming**: Use descriptive branch names. Examples: `feature/network-dnd`, `bugfix/cache-timeout`.
* **Testing Work**: Ensure your changes do not break the mock fallback runner. Test the frontend behavior without `.env` credentials to check sandbox output is complete.
* **Component Standards**: Keep components modular under `frontend/src/components`. All state manipulation should be readable and documented.
* **Backend Best Practices**: 
  * Gracefully handle GraphQL errors.
  * Ensure caching fallbacks remain functional when Redis connection parameters fail.

### 3. Pull Request Guidelines
1. Push your changes to your feature branch.
2. Open a Pull Request pointing to the `main` branch.
3. Describe the problem solved, visual changes (include screenshots if modifying UI components), and any new backend endpoints created.
4. Ensure files like `node_modules` or local `.env` logs are ignored and not checked in.

---

## 🐞 Reporting Issues
If you encounter a bug or have a suggestion, please open an Issue with:
* Steps to reproduce the bug.
* Expected vs actual behavior.
* Relevant console logs or server stack traces.
