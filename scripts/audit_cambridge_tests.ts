import { CAMBRIDGE_VOLUMES_CATALOGUE, CAMBRIDGE_COMPLETE_CATALOGUE, INITIAL_CAMBRIDGE_TESTS, getAllCambridgeTests } from '../src/data/cambridgeLibraryData.js';
import { generateListeningModule, generateReadingModule, generateWritingModule, generateSpeakingModule } from '../src/data/cambridgeTestGenerator.js';

console.log("=== CAMBRIDGE LIBRARY DEEP AUDIT ===");

console.log("\n1. VOLUMES CATALOGUE:");
CAMBRIDGE_VOLUMES_CATALOGUE.forEach(vol => {
  const tracks = vol.tracksSupported ? vol.tracksSupported.join(', ') : (vol as any).track || 'N/A';
  console.log(`Volume ${vol.volumeNumber} (${vol.volumeTitle}) | Year: ${vol.publicationYear} | Tracks: ${tracks} | Tests: ${vol.testsAvailable}`);
});

console.log(`\n2. COMPLETE CATALOGUE COUNT: ${CAMBRIDGE_COMPLETE_CATALOGUE.length} test entries`);

console.log(`\n3. INITIAL_CAMBRIDGE_TESTS COUNT: ${INITIAL_CAMBRIDGE_TESTS.length} test sets`);

console.log("\n4. INSPECTING INITIAL_CAMBRIDGE_TESTS DETAILS:");
INITIAL_CAMBRIDGE_TESTS.forEach((ct, idx) => {
  console.log(`\nTest #${idx + 1} | ID: "${ct.id}" | Title: "${ct.title}"`);
  
  // Listening
  if (ct.listening) {
    const l = ct.listening;
    console.log(`  [Listening] Title: "${l.title}" | Sections: ${l.sections?.length || 0}`);
    let totalQs = 0;
    let totalDur = 0;
    l.sections?.forEach((sec: any, sIdx: number) => {
      const qCount = sec.questions?.length || 0;
      totalQs += qCount;
      const dur = sec.audioDuration || sec.durationSeconds || 0;
      totalDur += dur;
      const scriptWords = sec.audioScript ? sec.audioScript.split(/\s+/).length : 0;
      console.log(`    Section ${sIdx + 1} (${sec.id}): ${qCount} Qs | Dur: ${dur}s (${(dur/60).toFixed(1)}m) | Script: ${scriptWords} words`);
    });
    console.log(`    Total Listening Qs: ${totalQs} | Total Audio Dur: ${(totalDur/60).toFixed(1)} min`);
  } else {
    console.log(`  [Listening] MISSING`);
  }

  // Reading
  if (ct.reading) {
    const r = ct.reading;
    console.log(`  [Reading] Passages: ${r.passages?.length || 0}`);
    let totalQs = 0;
    r.passages?.forEach((p: any, pIdx: number) => {
      const qCount = p.questions?.length || 0;
      totalQs += qCount;
      const words = p.content ? p.content.split(/\s+/).length : 0;
      console.log(`    Passage ${pIdx + 1}: ${qCount} Qs | Passage length: ${words} words`);
    });
    console.log(`    Total Reading Qs: ${totalQs}`);
  } else {
    console.log(`  [Reading] MISSING`);
  }

  // Writing
  if (ct.writing) {
    const w = ct.writing;
    console.log(`  [Writing] Tasks: ${w.tasks?.length || 0}`);
    w.tasks?.forEach((t: any, tIdx: number) => {
      console.log(`    Task ${tIdx + 1}: type="${t.type}" | prompt length=${t.prompt?.length || 0}`);
    });
  } else {
    console.log(`  [Writing] MISSING`);
  }

  // Speaking
  if (ct.speaking) {
    const s = ct.speaking;
    console.log(`  [Speaking] Parts: ${s.parts?.length || 0}`);
    s.parts?.forEach((pt: any, ptIdx: number) => {
      console.log(`    Part ${ptIdx + 1}: ${pt.questions?.length || 0} questions/cues`);
    });
  } else {
    console.log(`  [Speaking] MISSING`);
  }
});

console.log("\n5. TESTING DYNAMIC GENERATOR (cambridgeTestGenerator.ts):");
[1, 5, 10, 15, 18, 19, 20, 21].forEach(volNum => {
  const lMod = generateListeningModule(volNum, 1);
  const rMod = generateReadingModule(volNum, 1, 'academic');
  const wMod = generateWritingModule(volNum, 1, 'academic');
  const sMod = generateSpeakingModule(volNum, 1);

  let lDur = 0;
  lMod.sections.forEach((s: any) => lDur += (s.audioDuration || 0));
  const lQs = lMod.sections.reduce((acc: number, s: any) => acc + (s.questions?.length || 0), 0);
  const rQs = rMod.passages.reduce((acc: number, p: any) => acc + (p.questions?.length || 0), 0);
  
  console.log(`Vol ${volNum} Test 1 Generated -> Listening: ${lMod.sections.length} Secs (${lQs} Qs, ${(lDur/60).toFixed(1)}m audio) | Reading: ${rMod.passages.length} Passages (${rQs} Qs) | Writing: ${wMod.tasks.length} Tasks | Speaking: ${sMod.parts.length} Parts`);
});

