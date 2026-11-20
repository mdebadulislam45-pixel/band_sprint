import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_EXAM_SETS, MockExamSet } from '../../data/mockExams';
import { convertAiDraftToListeningMockSet } from '../../server/ai/questionFactory';
import { audioManager } from '../../services/AudioManager';
import { evaluateQuestionResponse } from '../mockExamScoring';
import { isAnswerCorrect, calculateOfficialListeningBand } from '../listeningAnswerEvaluator';
import { type AIDraftExam } from '../../server/db';

describe('Phase 5.5H.9D — AI Listening Pilot Integration & Regression Acceptance', () => {

  // Sample production-grade AI-generated Listening draft fixture
  const sampleAiDraft: AIDraftExam = {
    id: 'draft_listening_1762585564883_yv1f40',
    userId: 'test_user_integration',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: 'gemini-3.8-flash',
    examType: 'listening',
    status: 'PENDING_REVIEW',
    validationStatus: 'PASSED',
    repairAttempts: 0,
    validationFindings: {
      passed: true,
      structuralOk: true,
      answersOk: true,
      evidenceOk: true,
      qualityOk: true,
      errors: [],
      warnings: []
    },
    content: {
      title: 'IELTS Academic Listening Practice Test — AI Pilot 1',
      format: 'Academic',
      sections: [
        {
          sectionNumber: 1,
          title: 'Section 1: Community Centre Sports Club Registration',
          script: `SPEAKER 1: Good morning! Welcome to the Riverside Community Centre. How can I help you today?
SPEAKER 2: Good morning. I'd like to sign up for a sports club membership, please.
SPEAKER 1: Certainly! Let me take down your details. May I have your full name?
SPEAKER 2: Yes, it's Sarah Jenkins.
SPEAKER 1: Thank you, Sarah. And what address should we list for your record?
SPEAKER 2: I live at 45 Hawthorn Road, Westwood.
SPEAKER 1: Great. And your phone number?
SPEAKER 2: It's 07700 900331.
SPEAKER 1: Perfect. Which membership level would you prefer—Standard or Premium?
SPEAKER 2: I'll go with the Premium membership.
SPEAKER 1: Excellent. The monthly fee for Premium is thirty-five pounds.
SPEAKER 2: That sounds reasonable. When does the main swimming pool open each morning?
SPEAKER 1: The main pool opens at 6:30 a.m. Monday through Friday.
SPEAKER 2: Good. And are badminton courts available on weekends?
SPEAKER 1: Yes, weekend badminton court booking requires 24 hours advance notice.
SPEAKER 2: Understood. Is parking included with the membership?
SPEAKER 1: Free parking is provided in the North Car Park for all members.
SPEAKER 2: Wonderful. And what date would you like the membership to start?
SPEAKER 1: Let's start it on the 1st of October.`,
          questions: [
            { id: 1, type: 'form_completion', prompt: 'Full Name: Sarah _____', correctAnswer: 'Jenkins', scriptEvidence: 'it\'s Sarah Jenkins', explanation: 'The speaker states her surname is Jenkins.' },
            { id: 2, type: 'form_completion', prompt: 'Street Address: 45 _____ Road', correctAnswer: 'Hawthorn', scriptEvidence: '45 Hawthorn Road', explanation: 'The address is 45 Hawthorn Road.' },
            { id: 3, type: 'form_completion', prompt: 'Contact Phone Number: _____', correctAnswer: '07700 900331', scriptEvidence: '07700 900331', explanation: 'Phone number given is 07700 900331.' },
            { id: 4, type: 'form_completion', prompt: 'Selected Membership Tier: _____', correctAnswer: 'Premium', acceptableAnswers: ['Premium membership'], scriptEvidence: 'go with the Premium membership', explanation: 'Selected tier is Premium.' },
            { id: 5, type: 'form_completion', prompt: 'Monthly Membership Fee: £_____', correctAnswer: '35', acceptableAnswers: ['35 pounds', 'thirty-five'], scriptEvidence: 'monthly fee for Premium is thirty-five pounds', explanation: 'Fee is 35 pounds.' },
            { id: 6, type: 'form_completion', prompt: 'Main Pool Opening Time: _____ a.m.', correctAnswer: '6:30', acceptableAnswers: ['6.30', '6:30 am'], scriptEvidence: 'main pool opens at 6:30 a.m.', explanation: 'Pool opens at 6:30 a.m.' },
            { id: 7, type: 'form_completion', prompt: 'Badminton Court Booking Notice Required: _____ hours', correctAnswer: '24', acceptableAnswers: ['24 hours', 'twenty-four'], scriptEvidence: 'requires 24 hours advance notice', explanation: '24 hours notice required.' },
            { id: 8, type: 'form_completion', prompt: 'Designated Member Parking Area: _____ Car Park', correctAnswer: 'North', scriptEvidence: 'North Car Park', explanation: 'Parking is in the North Car Park.' },
            { id: 9, type: 'form_completion', prompt: 'Membership Start Date: 1st _____', correctAnswer: 'October', scriptEvidence: '1st of October', explanation: 'Start date is 1st of October.' },
            { id: 10, type: 'form_completion', prompt: 'Locker Deposit Required: £_____', correctAnswer: '10', acceptableAnswers: ['10 pounds', 'ten'], scriptEvidence: 'locker key requires ten pounds deposit', explanation: 'Locker deposit is 10 pounds.' }
          ]
        },
        {
          sectionNumber: 2,
          title: 'Section 2: City Heritage Museum & Botanical Garden Tour Guide',
          script: `SPEAKER 1: Welcome everyone to the City Heritage Museum and Botanical Gardens annual visitor orientation. My name is Mark, and I am the head curator. Before we begin our walking tour, let me share some essential background information. The museum was founded in 1885 by local philanthropist Lord Edward Harrington. Our flagship exhibition hall was recently renovated and now houses over ten thousand historical artifacts. Visitors entering through the main atrium will find the information desk immediately on their left. If you wish to visit the greenhouse, take the glass walkway directly behind the central fountain. The café serves organic lunches from 11:30 a.m. until 3:00 p.m. Daily guided tours depart every hour from the courtyard. Admission is free for children under 12 years of age. Special photography permits are required for tripod equipment. The library archives are accessible by appointment only on Tuesdays and Thursdays.`,
          questions: [
            { id: 11, type: 'short_answer', prompt: 'Year museum was founded: _____', correctAnswer: '1885', scriptEvidence: 'founded in 1885', explanation: 'Founded in 1885.' },
            { id: 12, type: 'short_answer', prompt: 'Founder\'s Surname: Lord _____', correctAnswer: 'Harrington', scriptEvidence: 'Lord Edward Harrington', explanation: 'Founder was Lord Edward Harrington.' },
            { id: 13, type: 'short_answer', prompt: 'Location of Information Desk: On the _____', correctAnswer: 'left', scriptEvidence: 'information desk immediately on their left', explanation: 'Info desk is on the left.' },
            { id: 14, type: 'short_answer', prompt: 'Greenhouse access via glass walkway behind the central _____', correctAnswer: 'fountain', scriptEvidence: 'behind the central fountain', explanation: 'Walkway is behind the central fountain.' },
            { id: 15, type: 'short_answer', prompt: 'Café Lunch Start Time: _____ a.m.', correctAnswer: '11:30', acceptableAnswers: ['11.30'], scriptEvidence: 'serves organic lunches from 11:30 a.m.', explanation: 'Lunch starts at 11:30 a.m.' },
            { id: 16, type: 'short_answer', prompt: 'Guided tours depart from the _____.', correctAnswer: 'courtyard', scriptEvidence: 'depart every hour from the courtyard', explanation: 'Tours depart from courtyard.' },
            { id: 17, type: 'short_answer', prompt: 'Free admission age limit: Under _____ years', correctAnswer: '12', acceptableAnswers: ['twelve'], scriptEvidence: 'free for children under 12', explanation: 'Free under 12 years.' },
            { id: 18, type: 'short_answer', prompt: 'Equipment requiring permit: _____', correctAnswer: 'tripod', acceptableAnswers: ['tripod equipment'], scriptEvidence: 'permits are required for tripod equipment', explanation: 'Permits required for tripod equipment.' },
            { id: 19, type: 'short_answer', prompt: 'Library appointment day 1: _____', correctAnswer: 'Tuesday', acceptableAnswers: ['Tuesdays'], scriptEvidence: 'Tuesdays and Thursdays', explanation: 'Open Tuesdays.' },
            { id: 20, type: 'short_answer', prompt: 'Library appointment day 2: _____', correctAnswer: 'Thursday', acceptableAnswers: ['Thursdays'], scriptEvidence: 'Tuesdays and Thursdays', explanation: 'Open Thursdays.' }
          ]
        },
        {
          sectionNumber: 3,
          title: 'Section 3: Renewable Energy Undergraduate Research Seminar',
          script: `SPEAKER 1: Hi Alex, thanks for meeting up. Have you started preparing our joint presentation on solar cell materials?
SPEAKER 2: Hi Maria! Yes, I spent yesterday comparing silicon panels with perovskite solar cells.
SPEAKER 1: Excellent. What was your main finding regarding perovskite efficiency?
SPEAKER 2: Well, laboratory tests show perovskite cells achieve over 25 percent energy conversion efficiency.
SPEAKER 1: That is remarkably high! But what about their long-term durability outdoors?
SPEAKER 2: That remains their biggest drawback. Moisture and thermal degradation reduce their lifespan significantly compared to traditional silicon.
SPEAKER 1: Right. Silicon panels last for 25 to 30 years with minimal performance loss.
SPEAKER 2: Exactly. For our seminar structure, should we focus first on manufacturing costs or environmental impact?
SPEAKER 1: I think starting with manufacturing costs makes sense, because economic viability drives commercial adoption.
SPEAKER 2: Agreed. I will prepare the cost charts, and you can draft the environmental life-cycle section.
SPEAKER 1: Sounds good. Let's aim to complete the first slide deck draft by Friday afternoon.`,
          questions: [
            { id: 21, type: 'multiple_choice', prompt: 'What topic are the students presenting on?', options: ['A) Wind turbine design', 'B) Solar cell materials', 'C) Hydroelectric dams', 'D) Nuclear power safety'], correctAnswer: 'B', acceptableAnswers: ['B) Solar cell materials', 'Solar cell materials'], scriptEvidence: 'presentation on solar cell materials', explanation: 'Topic is solar cell materials.' },
            { id: 22, type: 'short_answer', prompt: 'Perovskite laboratory conversion efficiency exceeds _____ percent.', correctAnswer: '25', acceptableAnswers: ['25 percent', 'twenty-five'], scriptEvidence: 'achieve over 25 percent energy conversion', explanation: 'Efficiency exceeds 25%.' },
            { id: 23, type: 'short_answer', prompt: 'Primary drawback of perovskite solar cells is limited _____', correctAnswer: 'durability', acceptableAnswers: ['lifespan'], scriptEvidence: 'long-term durability outdoors', explanation: 'Drawback is durability.' },
            { id: 24, type: 'short_answer', prompt: 'Factors causing perovskite degradation: Moisture and _____', correctAnswer: 'thermal degradation', acceptableAnswers: ['heat'], scriptEvidence: 'Moisture and thermal degradation', explanation: 'Moisture and heat/thermal.' },
            { id: 25, type: 'short_answer', prompt: 'Silicon panel lifespan: 25 to _____ years', correctAnswer: '30', acceptableAnswers: ['thirty'], scriptEvidence: 'silicon panels last for 25 to 30 years', explanation: 'Lifespan 25 to 30 years.' },
            { id: 26, type: 'multiple_choice', prompt: 'What topic will the presentation address first?', options: ['A) Manufacturing costs', 'B) Environmental impact', 'C) History of energy', 'D) Government subsidies'], correctAnswer: 'A', acceptableAnswers: ['A) Manufacturing costs', 'Manufacturing costs'], scriptEvidence: 'starting with manufacturing costs makes sense', explanation: 'First topic is manufacturing costs.' },
            { id: 27, type: 'short_answer', prompt: 'Alex will prepare the _____ charts.', correctAnswer: 'cost', scriptEvidence: 'prepare the cost charts', explanation: 'Alex prepares cost charts.' },
            { id: 28, type: 'short_answer', prompt: 'Maria will draft the _____ life-cycle section.', correctAnswer: 'environmental', scriptEvidence: 'environmental life-cycle section', explanation: 'Maria drafts environmental section.' },
            { id: 29, type: 'short_answer', prompt: 'Slide deck deadline day: _____', correctAnswer: 'Friday', scriptEvidence: 'draft by Friday afternoon', explanation: 'Deadline is Friday.' },
            { id: 30, type: 'short_answer', prompt: 'Slide deck deadline time of day: _____', correctAnswer: 'afternoon', scriptEvidence: 'Friday afternoon', explanation: 'Deadline time is afternoon.' }
          ]
        },
        {
          sectionNumber: 4,
          title: 'Section 4: Marine Biology Lecture on Coral Reef Bleaching',
          script: `SPEAKER 1: Good afternoon, students. Today we continue our series on ocean ecosystem dynamics by examining coral reef bleaching phenomena. Coral reefs cover less than 0.1 percent of the ocean floor, yet they harbor approximately 25 percent of all marine species. The symbiotic relationship between coral polyps and microscopic algae known as zooxanthellae is fundamental to reef survival. Zooxanthellae provide corals with up to 90 percent of their energy requirements through photosynthesis. However, when sea surface temperatures rise as little as 1 degree Celsius above the summer average, corals undergo thermal stress. In response, polyps expel their symbiotic algae, turning the coral skeleton stark white. Without zooxanthellae, corals suffer severe nutrient deprivation. If elevated water temperatures persist beyond 4 to 8 weeks, coral mortality rises rapidly. Recent satellite monitoring indicates that over 70 percent of global reef systems have experienced bleaching stress in the past decade. Recovery is possible if water temperatures normalize quickly, but full ecosystem restoration requires 10 to 15 years.`,
          questions: [
            { id: 31, type: 'note_completion', prompt: 'Reefs cover less than _____ percent of the ocean floor.', correctAnswer: '0.1', acceptableAnswers: ['0.1 percent', '0.1%'], scriptEvidence: 'cover less than 0.1 percent', explanation: 'Cover 0.1 percent.' },
            { id: 32, type: 'note_completion', prompt: 'Reefs harbor approximately _____ percent of marine species.', correctAnswer: '25', acceptableAnswers: ['25 percent', 'twenty-five'], scriptEvidence: 'harbor approximately 25 percent', explanation: 'Harbor 25 percent.' },
            { id: 33, type: 'note_completion', prompt: 'Symbiotic algae species name: _____', correctAnswer: 'zooxanthellae', scriptEvidence: 'microscopic algae known as zooxanthellae', explanation: 'Algae name is zooxanthellae.' },
            { id: 34, type: 'note_completion', prompt: 'Algae provide up to _____ percent of coral energy.', correctAnswer: '90', acceptableAnswers: ['90 percent', 'ninety'], scriptEvidence: 'up to 90 percent of their energy', explanation: 'Provide 90 percent energy.' },
            { id: 35, type: 'note_completion', prompt: 'Temperature rise triggering stress: _____ degree Celsius', correctAnswer: '1', acceptableAnswers: ['one'], scriptEvidence: 'rise as little as 1 degree Celsius', explanation: 'Triggers at 1 degree rise.' },
            { id: 36, type: 'note_completion', prompt: 'Reaction to thermal stress: Polyps expel symbiotic _____', correctAnswer: 'algae', scriptEvidence: 'expel their symbiotic algae', explanation: 'Polyps expel algae.' },
            { id: 37, type: 'note_completion', prompt: 'Persisting temperature duration before mortality: 4 to _____ weeks', correctAnswer: '8', acceptableAnswers: ['eight'], scriptEvidence: 'persist beyond 4 to 8 weeks', explanation: '4 to 8 weeks.' },
            { id: 38, type: 'note_completion', prompt: 'Percentage of global reefs affected in past decade: Over _____ percent', correctAnswer: '70', acceptableAnswers: ['70 percent', 'seventy'], scriptEvidence: 'over 70 percent of global reef systems', explanation: 'Over 70 percent.' },
            { id: 39, type: 'note_completion', prompt: 'Full ecosystem restoration minimum years: _____', correctAnswer: '10', acceptableAnswers: ['ten'], scriptEvidence: 'requires 10 to 15 years', explanation: 'Minimum 10 years.' },
            { id: 40, type: 'note_completion', prompt: 'Full ecosystem restoration maximum years: _____', correctAnswer: '15', acceptableAnswers: ['fifteen'], scriptEvidence: 'requires 10 to 15 years', explanation: 'Maximum 15 years.' }
          ]
        }
      ]
    }
  };

  it('1. converts AI draft to standard MockExamSet with 4 sections and 40 questions', () => {
    const mockSet: MockExamSet = convertAiDraftToListeningMockSet(sampleAiDraft);

    assert.equal(mockSet.id, sampleAiDraft.id);
    assert.equal(mockSet.badge, 'AI PILOT');
    assert.equal(mockSet.format, 'Academic');
    assert.equal(mockSet.questions.length, 40, 'Must have exactly 40 questions');

    // Section structure checks
    assert.ok(mockSet.listeningSections, 'listeningSections must be defined');
    assert.equal(mockSet.listeningSections[1].isAvailable, true);
    assert.equal(mockSet.listeningSections[2].isAvailable, true);
    assert.equal(mockSet.listeningSections[3].isAvailable, true);
    assert.equal(mockSet.listeningSections[4].isAvailable, true);

    // Sequential ID verification
    mockSet.questions.forEach((q, idx) => {
      assert.equal(q.id, idx + 1, `Question at index ${idx} must have ID ${idx + 1}`);
      assert.equal(q.section, 'listening');
      assert.ok(q.prompt && q.prompt.trim().length > 0, `Question ${q.id} prompt must be non-empty`);
      assert.ok(q.correctAnswer && q.correctAnswer.trim().length > 0, `Question ${q.id} correctAnswer must be non-empty`);
    });
  });

  it('2. evaluates answer key validity across all 40 converted questions', () => {
    const mockSet = convertAiDraftToListeningMockSet(sampleAiDraft);

    mockSet.questions.forEach((q) => {
      const isExactCorrect = isAnswerCorrect(q as any, q.correctAnswer);
      assert.ok(isExactCorrect, `Question ${q.id}: Answer "${q.correctAnswer}" must evaluate as correct`);

      if (q.acceptableAnswers && q.acceptableAnswers.length > 0) {
        q.acceptableAnswers.forEach((alt) => {
          const isAltCorrect = isAnswerCorrect(q as any, alt);
          assert.ok(isAltCorrect, `Question ${q.id}: Alternative answer "${alt}" must evaluate as correct`);
        });
      }
    });
  });

  it('3. verifies audio parser compatibility on all 4 section scripts', () => {
    const mockSet = convertAiDraftToListeningMockSet(sampleAiDraft);

    for (let secNum = 1; secNum <= 4; secNum++) {
      const sec = mockSet.listeningSections![secNum as 1 | 2 | 3 | 4];
      assert.ok(sec.script, `Section ${secNum} script must be present`);

      const turns = audioManager.parseMultiSpeakerScript(sec.script);
      assert.ok(turns.length > 0, `Section ${secNum} script must parse into at least 1 speaker turn`);

      turns.forEach((turn, tIdx) => {
        assert.ok(turn.speaker || turn.speakerName || turn.speakerId, `Section ${secNum} turn ${tIdx} must have speaker identifier`);
        assert.ok(turn.text && turn.text.trim().length > 0, `Section ${secNum} turn ${tIdx} text must be non-empty`);
      });
    }
  });

  it('4. evaluates CD-IELTS scoring engine compatibility and band calculations', () => {
    const mockSet = convertAiDraftToListeningMockSet(sampleAiDraft);

    // Simulate perfect user answer sheet (40/40)
    const perfectAnswers: Record<number, string> = {};
    mockSet.questions.forEach((q) => {
      perfectAnswers[q.id] = q.correctAnswer;
    });

    let correctCount = 0;
    mockSet.questions.forEach((q) => {
      const evalRes = evaluateQuestionResponse(q, perfectAnswers[q.id]);
      if (evalRes.isCorrect) correctCount++;
    });

    assert.equal(correctCount, 40, 'Perfect score sheet must evaluate to 40/40 correct answers');

    const perfectBand = calculateOfficialListeningBand(correctCount);
    assert.equal(perfectBand, 9.0, '40/40 raw score must yield official Listening Band 9.0');

    // Simulate partial user answer sheet (23/40 -> Band 6.0)
    const partialAnswers: Record<number, string> = {};
    mockSet.questions.forEach((q, idx) => {
      if (idx < 23) {
        partialAnswers[q.id] = q.correctAnswer;
      } else {
        partialAnswers[q.id] = 'WRONG_ANSWER';
      }
    });

    let partialCount = 0;
    mockSet.questions.forEach((q) => {
      const evalRes = evaluateQuestionResponse(q, partialAnswers[q.id]);
      if (evalRes.isCorrect) partialCount++;
    });

    assert.equal(partialCount, 23, 'Partial answer sheet must evaluate to 23/40 correct');
    const partialBand = calculateOfficialListeningBand(partialCount);
    assert.equal(partialBand, 6.0, '23/40 raw score must yield official Listening Band 6.0');
  });

  it('5. preserves static MOCK_EXAM_SETS isolation without dynamic pollution', () => {
    // Assert static registry length remains exactly 5 sets
    assert.equal(MOCK_EXAM_SETS.length, 5, 'Static MOCK_EXAM_SETS must contain exactly 5 static Sprint/BC sets');

    const expectedIds = ['sprint-18', 'sprint-17', 'bc-authentic-3', 'sprint-16', 'gt-test-1'];
    const actualIds = MOCK_EXAM_SETS.map(s => s.id);
    assert.deepEqual(actualIds, expectedIds, 'Static MOCK_EXAM_SETS IDs must be completely unpolluted');

    // Convert draft again to ensure no side effects
    convertAiDraftToListeningMockSet(sampleAiDraft);
    assert.equal(MOCK_EXAM_SETS.length, 5, 'Static registry must remain untouched after converting AI draft');
  });
});
