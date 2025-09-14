/**
 * WebSocket message compression utilities
 * Uses built-in compression APIs for zero dependencies
 */

/**
 * Compresses data using the Deflate algorithm
 * @param {string|Uint8Array} data - Data to compress
 * @returns {Promise<Uint8Array>} Compressed data
 */
export async function compressMessage(data) {
  // Convert string to Uint8Array if needed
  const buffer = typeof data === 'string' 
    ? new TextEncoder().encode(data)
    : data;
    
  // Create deflate stream
  const cs = new CompressionStream('deflate');
  const writer = cs.writable.getWriter();
  const reader = cs.readable.getReader();
  
  // Write data
  await writer.write(buffer);
  await writer.close();
  
  // Read compressed data
  const chunks = [];
  let totalLength = 0;
  
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }
  
  // Combine chunks
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}

/**
 * Decompresses data using the Deflate algorithm
 * @param {Uint8Array} data - Compressed data
 * @returns {Promise<string|Uint8Array>} Decompressed data
 */
export async function decompressMessage(data) {
  // Create inflate stream  
  const ds = new DecompressionStream('deflate');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  
  // Write compressed data
  await writer.write(data);
  await writer.close();
  
  // Read decompressed data
  const chunks = [];
  let totalLength = 0;
  
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }
  
  // Combine chunks
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  // Try to convert to string if it looks like text
  try {
    return new TextDecoder().decode(result);
  } catch {
    return result;
  }
}
