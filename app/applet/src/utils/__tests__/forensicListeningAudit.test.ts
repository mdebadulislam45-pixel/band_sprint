import test from 'node:test';
import assert from 'node:assert';
import { CAMBRIDGE_VOLUMES_CATALOGUE, getAllSprintTests, getSprintTestById } from '../../data/sprintLibraryData';

test('Forensic Audit of Sprint 11-21 Practice Library Listening Audio', () => {
  console.log("=================================================");
  console.log("CAMBRIDGE 11–21 PRACTICE LIBRARY FORENSIC AUDIT");
  console.log("=================================================\n");

  const allTests = getAllSprintTests();
  console.log(`Total Inspected Tests in Library: ${allTests.length}`);

  let shortCount = 0;
  let totalParts = 0;

  const volumeSummary: Record<number, {
    testsCount: number;
    part1AvgWords: number;
    part2AvgWords: number;
    part3AvgWords: number;
    part4AvgWords: number;
    totalAvgWords: number;
    totalEstAudioSec: number;
  }> = {};

  for (let v = 11; v <= 21; v++) {
    const volTests = allTests.filter(t => t.volume === v);
    let p1Words = 0, p2Words = 0, p3Words = 0, p4Words = 0;

    volTests.forEach(t => {
      if (t.listening && t.listening.parts) {
        t.listening.parts.forEach((p, idx) => {
          totalParts++;
          let text = p.dialogue ? p.dialogue.map(d => d.text).join(' ') : p.audioScript || '';
          const wc = text.trim().split(/\s+/).filter(Boolean).length;
          if (wc < 400) shortCount++;

          if (idx === 0) p1Words += wc;
          if (idx === 1) p2Words += wc;
          if (idx === 2) p3Words += wc;
          if (idx === 3) p4Words += wc;
        });
      }
    });

    const count = volTests.length || 1;
    const avgTotalWords = Math.round((p1Words + p2Words + p3Words + p4Words) / count);
    const avgSec = Math.round((avgTotalWords / 130) * 60);

    volumeSummary[v] = {
      testsCount: volTests.length,
      part1AvgWords: Math.round(p1Words / count),
      part2AvgWords: Math.round(p2Words / count),
      part3AvgWords: Math.round(p3Words / count),
      part4AvgWords: Math.round(p4Words / count),
      totalAvgWords: avgTotalWords,
      totalEstAudioSec: avgSec
    };
  }

  console.log("\nVolume-by-Volume Average Script Word Count Table:");
  console.table(volumeSummary);

  console.log(`\nTotal Parts Inspected: ${totalParts}`);
  console.log(`Total Short/Truncated Parts (<400 words): ${shortCount} / ${totalParts} (${((shortCount/totalParts)*100).toFixed(1)}%)`);

  // Check C18 Test 1 specifically
  const c18t1 = getSprintTestById('sprint-18-academic-test-1');
  if (c18t1 && c18t1.listening) {
    console.log("\n--- Specific Audit of Sprint Practice Set 18 Academic Test 1 ---");
    c18t1.listening.parts.forEach((p, idx) => {
      const text = p.dialogue ? p.dialogue.map(d => d.text).join(' ') : p.audioScript || '';
      const wc = text.trim().split(/\s+/).filter(Boolean).length;
      const durSec = Math.round((wc / 130) * 60);
      const m = Math.floor(durSec / 60);
      const s = durSec % 60;
      console.log(`Part ${idx + 1}: "${p.title}" | ${wc} words | ~${m}:${s.toString().padStart(2, '0')} audio duration (${durSec}s)`);
    });
  }

  assert.ok(totalTestsInspected > 0 || allTests.length > 0);
});
