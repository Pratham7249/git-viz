import './globals.css';

export const metadata = {
  title: 'Interactive Developer Ecosystem & Repository Visualizer',
  description: 'Deep dive into code structures, developer impact, reviewer collaborations, and repository star metrics visualized with real-time GraphQL API connection caching.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
