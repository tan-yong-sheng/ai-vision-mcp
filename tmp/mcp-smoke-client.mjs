import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    stderr: 'pipe',
  });

  const client = new Client({ name: 'mcp-smoke', version: '0.0.0' });

  transport.onerror = (e) => {
    console.error('[transport error]', e);
  };
  transport.onclose = () => {
    console.error('[transport closed]');
  };

  await client.connect(transport);

  // MCP logging notifications
  // This SDK version expects a schema when registering handlers; keep smoke test minimal
  // and rely on server stderr for now.

  const tools = await client.listTools();
  console.log('tools', tools.tools.map((t) => t.name));

  // Ask server to send info+ logs
  await client.setLoggingLevel('info');

  const ping = await client.ping();
  console.log('ping', ping);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
