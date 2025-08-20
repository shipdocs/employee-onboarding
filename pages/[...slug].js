import { readFileSync } from 'fs';
import { join } from 'path';

export default function CatchAll() {
  return null; // This will never render since we return the HTML directly
}

export async function getServerSideProps({ res }) {
  try {
    // Serve the React app's index.html for all non-API routes
    const filePath = join(process.cwd(), 'build', 'index.html');
    const html = readFileSync(filePath, 'utf8');

    res.setHeader('Content-Type', 'text/html');
    res.write(html);
    res.end();

    return { props: {} };
  } catch (error) {
    console.error('Error serving React app:', error);

    // Fallback to redirect to index.html
    return {
      redirect: {
        destination: '/index.html',
        permanent: false
      }
    };
  }
}
