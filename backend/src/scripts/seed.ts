import { initDatabase } from '../db/client.js';
import { generateSyntheticWorld } from '../generator/synthetic-world.js';

async function main() {
  console.log('--- Seeding upay Shield Synthetic World ---');
  await initDatabase();
  const summary = await generateSyntheticWorld();
  console.log('--- Seed Completed Successfully ---');
  console.log(summary);
  process.exit(0);
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
