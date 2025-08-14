// Debug script to check ws package exports
import ws from 'ws';
import * as wsAll from 'ws';

console.log('Default export:', typeof ws);
console.log('All exports:', Object.keys(wsAll).filter(k => !k.startsWith('_')))
