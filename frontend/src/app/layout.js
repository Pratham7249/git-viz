import './globals.css';

export const metadata = {
  title: 'git-viz | Interactive Repository Visualizer',
  description: 'Deep dive into code structures, developer impact, reviewer collaborations, and repository metrics visualized dynamically.',
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
