const fs = require('fs');
const path = require('path');

const CASES_PATH = path.join(__dirname, 'cases.json');
const ENDPOINT = 'http://localhost:3000/enrich';

async function main() {
  const cases = JSON.parse(fs.readFileSync(CASES_PATH, 'utf8'));
  let categoryMatches = 0;
  const failures = [];

  for (const testCase of cases) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCase.input),
    });

    if (!res.ok) {
      failures.push({ id: testCase.id, note: testCase.note, reason: `HTTP ${res.status}` });
      console.log(`Case ${testCase.id} (${testCase.note}): FAILED — HTTP ${res.status}`);
      continue;
    }

    const result = await res.json();
    const categoryMatch = result.category === testCase.expected_category;

    if (categoryMatch) {
      categoryMatches++;
      console.log(`Case ${testCase.id} (${testCase.note}): OK — got "${result.category}"`);
    } else {
      failures.push({
        id: testCase.id,
        note: testCase.note,
        expected: testCase.expected_category,
        actual: result.category,
      });
      console.log(`Case ${testCase.id} (${testCase.note}): MISMATCH — expected "${testCase.expected_category}", got "${result.category}"`);
    }

    if (testCase.expected_quality_flag) {
      const hasFlag = (result.quality_flags || []).includes(testCase.expected_quality_flag);
      if (!hasFlag) {
        console.log(`  (note) expected quality_flag "${testCase.expected_quality_flag}" not present — got ${JSON.stringify(result.quality_flags)}`);
      }
    }
  }

  console.log(`\nEval result: ${categoryMatches}/${cases.length} correct on category`);
  if (failures.length) {
    console.log('\nFailed cases:');
    failures.forEach((f) => {
      console.log(`  #${f.id} (${f.note}): expected "${f.expected}", got "${f.actual ?? f.reason}"`);
    });
  }
}

main().catch((err) => {
  console.error('Eval run failed:', err);
  process.exit(1);
});