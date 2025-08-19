import http from 'http';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = 8080;

const server = http.createServer(async (req, res) => {
    let filePath = join(__dirname, req.url === '/' ? 'test.html' : req.url);
    
    try {
        const content = await readFile(filePath);
        res.writeHead(200);
        res.end(content, 'utf-8');
    } catch (error) {
        res.writeHead(404);
        res.end('File not found');
    }
});

server.listen(PORT, () => {
    console.log(`HTTP server running at http://localhost:${PORT}`);
});
