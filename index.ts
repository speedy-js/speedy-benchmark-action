import { run } from './src/run';

run().catch((e) => {
  console.log('Error encountered', e);
  process.exit(1);
});
