/**
 * Robertson–Sparck Jones (RSJ) Weight Logic
 */

export interface Document {
  id: string;
  name: string;
  content: string;
  isRelevant: boolean;
}

export interface TermStats {
  term: string;
  r: number; // number of relevant documents containing the term
  n: number; // total number of documents containing the term
  weight: number;
}

export const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "if", "in", "into", "is", "it", "no", "not", "of", "on", "or", "such", "that", "the", "their", "then", "there", "these", "they", "this", "to", "was", "will", "with"
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 0);
}

export function calculateRSJ(
  documents: Document[],
  query: string,
  useStopwords: boolean = true
): TermStats[] {
  const N = documents.length;
  const relevantDocs = documents.filter(d => d.isRelevant);
  const R = relevantDocs.length;

  if (N === 0) return [];

  // Tokenize all documents and query
  const queryTerms = new Set(tokenize(query));
  const docTerms = documents.map(doc => new Set(tokenize(doc.content)));

  // All unique terms across all documents
  const allTerms = new Set<string>();
  docTerms.forEach(terms => terms.forEach(t => allTerms.add(t)));

  const results: TermStats[] = [];

  allTerms.forEach(term => {
    // Skip if it's a stopword and toggle is on
    if (useStopwords && STOPWORDS.has(term)) return;

    // Only calculate for terms in the query (standard IR practice for weighting)
    // or all terms if the user wants to see everything. 
    // Let's calculate for all terms but maybe highlight query terms in the UI.
    
    let n = 0;
    let r = 0;

    documents.forEach((doc, idx) => {
      const containsTerm = docTerms[idx].has(term);
      if (containsTerm) {
        n++;
        if (doc.isRelevant) {
          r++;
        }
      }
    });

    // RSJ Formula: w = log( ((r + 0.5)/(R - r + 0.5)) / ((n - r + 0.5)/(N - n - R + r + 0.5)) )
    const numerator = (r + 0.5) / (R - r + 0.5);
    const denominator = (n - r + 0.5) / (N - n - R + r + 0.5);
    const weight = Math.log(numerator / denominator);

    results.push({
      term,
      r,
      n,
      weight
    });
  });

  return results.sort((a, b) => b.weight - a.weight);
}
