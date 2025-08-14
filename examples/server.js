import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the examples directory
app.use(express.static(path.join(__dirname)));

// API endpoint to list all examples
app.get('/api/examples', (req, res) => {
  const examplesDir = path.join(__dirname, 'examples');
  const categories = fs.readdirSync(examplesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => {
      const categoryPath = path.join(examplesDir, dirent.name);
      const examples = fs.readdirSync(categoryPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(example => ({
          name: example.name,
          path: `/examples/${dirent.name}/${example.name}`,
          hasReadme: fs.existsSync(path.join(categoryPath, example.name, 'README.md'))
        }));
      
      return {
        category: dirent.name,
        examples
      };
    });
  
  res.json(categories);
});

// Serve example README files
app.get('/api/readme/:category/:example', (req, res) => {
  const { category, example } = req.params;
  const readmePath = path.join(__dirname, 'examples', category, example, 'README.md');
  
  try {
    const content = fs.readFileSync(readmePath, 'utf8');
    res.send(content);
  } catch (error) {
    res.status(404).send('README not found');
  }
});

// Serve the main index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n🚀 Salahor Examples Server is running!`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
  console.log(`\nAvailable examples:`);
  
  // List available examples in the console
  try {
    const result = execSync('node list-examples.js', { cwd: __dirname });
    console.log(result.toString());
  } catch (error) {
    console.log('\nUse the web interface to browse examples');
  }
});
