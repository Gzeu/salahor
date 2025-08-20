import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting deployment...');

try {
  // Install production dependencies
  console.log('Installing production dependencies...');
  execSync('npm install --omit=dev', { stdio: 'inherit' });

  // Install PM2 globally if not installed
  try {
    execSync('pm2 --version', { stdio: 'ignore' });
  } catch (e) {
    console.log('Installing PM2 globally...');
    execSync('npm install -g pm2', { stdio: 'inherit' });
  }

  // Start the server with PM2
  console.log('Starting server with PM2...');
  execSync('pm2 start ecosystem.config.js', { stdio: 'inherit' });
  
  // Save PM2 process list
  console.log('Saving PM2 process list...');
  execSync('pm2 save', { stdio: 'inherit' });

  console.log('\n✅ Deployment completed successfully!');
  console.log('Server is running on port 4002');
  console.log('Check logs with: npm run pm2:logs');
  console.log('Stop server with: npm run pm2:stop');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
