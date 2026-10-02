import { initDatabase } from '../db/client.js';
import { generateSyntheticWorld } from '../generator/synthetic-world.js';
import { seedInvestigationEvidenceLedger } from '../generator/investigation-evidence-ledger.js';

async function main() {
  console.log('--- Seeding upay Shield Synthetic World & Investigation Ledger ---');
  await initDatabase();
  const summary = await generateSyntheticWorld();
  const ledger = await seedInvestigationEvidenceLedger();
  console.log('--- Seed Completed Successfully ---');
  console.log('World Summary:', summary);
  console.log('Evidence Ledger Scenarios:', ledger.scenarios.length);
  process.exit(0);
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
