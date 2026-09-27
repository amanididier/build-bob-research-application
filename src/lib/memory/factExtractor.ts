import { addImportantFact } from './memoryManager';

const FACT_TRIGGERS = [
  /i am working on (.*)/i,
  /my project is (.*)/i,
  /i live in (.*)/i,
  /i prefer (.*)/i,
  /i study (.*)/i,
  /i need to finish (.*)/i,
  /my goal is (.*)/i,
  /i don't like (.*)/i,
  /i usually (.*)/i,
];

export async function extractFactsFromText(userMessage: string): Promise<string[]> {
  const extracted: string[] = [];
  const text = userMessage.trim();

  for (const regex of FACT_TRIGGERS) {
    const match = text.match(regex);
    if (match && match[1]) {
      const fact = match[1].replace(/[.!?,;]+$/, '').trim();
      if (fact.length > 3 && fact.length < 120) {
        extracted.push(fact);
        addImportantFact(fact);
      }
    }
  }

  return extracted;
}
