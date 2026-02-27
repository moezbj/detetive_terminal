// services/NLPEvaluationService.ts
import nlp from 'compromise';
import stringSimilarity from 'string-similarity';

// Types based on your existing schema
import type {CrimeCase} from '../types'


// Evaluation result types
export interface EvaluationResult {
  correct: boolean;
  score: number;
  confidence: number;
  feedback: {
    type: 'brilliant' | 'correct' | 'partial' | 'incorrect';
    message: string;
    suggestions?: string[];
  };
  details: {
    suspectMatch: boolean;
    semanticScore: number;
    keywordScore: number;
    entityScore: number;
    narrativeScore: number;
    temporalScore: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    matchedEntities: Record<string, string[]>;
    timelineMatch: boolean;
  };
}

// Internal processed data types
interface ProcessedText {
  text: string;
  keywords: Set<string>;
  entities: {
    people: string[];
    places: string[];
    times: string[];
    actions: string[];
    objects: string[];
  };
  timeline: {
    times: string[];
    sequences: string[];
  };
  relationships: Array<{
    subject: string;
    action: string;
    object: string;
  }>;
  embedding: number[];
}

type NlpDoc = {
  verbs(): { out: (mode: string) => string[] };
  nouns(): { out: (mode: string) => string[] };
  places(): { out: (mode: string) => string[] };
  times(): { out: (mode: string) => string[] };
  match(pattern: string): { out: (mode: string) => string[] };
  sentences(): { out: (mode: string) => string[] };
  people(): { out: (mode: string) => string[] };
};

class NLPEvaluationService {
  private solutionCache: Map<string, ProcessedText>;
  private lexiconCache: Map<string, {
    methods: string[];
    tools: string[];
    locations: string[];
    times: string[];
  }>;
  
  // Common crime-related terms for better matching
  private crimeLexicon = {
    methods: [
      'disabled', 'cut off', 'turned off', 'shut down', 'blocked',
      'poisoned', 'stabbed', 'shot', 'strangled', 'drowned',
      'pushed', 'hit', 'injected', 'suffocated', 'asphyxiated'
    ],
    tools: [
      'knife', 'gun', 'rope', 'poison', 'pillow', 'handle',
      'key', 'code', 'password', 'access', 'app', 'phone',
      'remote', 'developer', 'oxygen', 'scrubber', 'ventilation'
    ],
    locations: [
      'balcony', 'kitchen', 'library', 'gym', 'pod', 'penthouse',
      'office', 'bedroom', 'bathroom', 'basement', 'garage'
    ],
    times: [
      'pm', 'am', 'o\'clock', 'midnight', 'evening', 'morning',
      'afternoon', 'night', 'dinner', 'party', 'call'
    ]
  };

  constructor() {
    this.solutionCache = new Map();
    this.lexiconCache = new Map();
  }

  /**
   * Main evaluation method - works with existing case schema
   */
  public async evaluateConclusion(
    suspectId: string,
    userConclusion: string,
    caseData: CrimeCase
  ): Promise<EvaluationResult> {
    // Check if suspect is correct
    if (suspectId !== caseData.killerId) {
      return {
        correct: false,
        score: 0,
        confidence: 1,
        feedback: {
          type: 'incorrect',
          message: "You've accused the wrong person. The evidence points elsewhere.",
          suggestions: this.generateSuspectSuggestions()
        },
        details: {
          suspectMatch: false,
          semanticScore: 0,
          keywordScore: 0,
          entityScore: 0,
          narrativeScore: 0,
          temporalScore: 0,
          matchedKeywords: [],
          missingKeywords: [],
          matchedEntities: { people: [], places: [], actions: [], objects: [] },
          timelineMatch: false
        }
      };
    }

    // Process solution from cache or create new
    let solutionData = this.solutionCache.get(caseData.id);
    if (!solutionData) {
      solutionData = await this.processText(caseData.solutionSecret, caseData);
      this.solutionCache.set(caseData.id, solutionData);
    }

    // Process user conclusion
    const userData = await this.processText(userConclusion, caseData);

    // Calculate scores
    const semanticScore = this.calculateSemanticSimilarity(userData, solutionData);
    const keywordScore = this.calculateKeywordScore(userData, solutionData);
    const entityScore = this.calculateEntityScore(userData, solutionData);
    const narrativeScore = this.calculateNarrativeScore(userData, solutionData);
    const temporalScore = this.calculateTemporalScore(userData, solutionData, caseData);

    // Weighted total score
    const totalScore = 
      semanticScore * 0.3 +
      keywordScore * 0.3 +
      entityScore * 0.2 +
      narrativeScore * 0.1 +
      temporalScore * 0.1;

    // Calculate confidence
    const confidence = this.calculateConfidence([
      semanticScore, keywordScore, entityScore, narrativeScore, temporalScore
    ]);

    const correct = totalScore >= 0.65;

    // Generate feedback and suggestions
    const feedback = this.generateFeedback(
      correct,
      totalScore,
      userData,
      solutionData,
      caseData
    );

    // Prepare details
    const matchedKeywords = [...userData.keywords].filter(k => 
      solutionData.keywords.has(k)
    );
    
    const missingKeywords = [...solutionData.keywords].filter(k => 
      !userData.keywords.has(k)
    ).slice(0, 5); // Limit to top 5 missing keywords

    return {
      correct,
      score: Math.round(totalScore * 100),
      confidence: Math.round(confidence * 100),
      feedback,
      details: {
        suspectMatch: true,
        semanticScore: Math.round(semanticScore * 100),
        keywordScore: Math.round(keywordScore * 100),
        entityScore: Math.round(entityScore * 100),
        narrativeScore: Math.round(narrativeScore * 100),
        temporalScore: Math.round(temporalScore * 100),
        matchedKeywords,
        missingKeywords,
        matchedEntities: this.getMatchedEntities(userData, solutionData),
        timelineMatch: temporalScore > 0.7
      }
    };
  }

  /**
   * Process any text into analyzable components
   */
  private async processText(text: string, caseData: CrimeCase): Promise<ProcessedText> {
    const doc = nlp(text) as unknown as NlpDoc;
    const lowerText = text.toLowerCase();
    const lexicon = this.getLexicon(caseData);
    
    // Extract keywords
    const tokens = this.tokenize(lowerText);
    const keywords = new Set(
      tokens
        .filter(t => t.length > 3)
        .map(t => this.stem(t))
    );

    // Extract entities
    const people = [
      ...doc.people().out('array'),
      ...this.extractPeopleFromText(lowerText, caseData)
    ];

    // Extract places (plugin may be unavailable, so guard and fallback)
    const places = [
      ...(((doc as unknown as { places?: () => { out: (m: string) => string[] } }).places)
        ? (doc as unknown as { places: () => { out: (m: string) => string[] } }).places().out('array')
        : []),
      ...lexicon.locations.filter(l => lowerText.includes(l))
    ];

    // Extract times (compromise times plugin is not guaranteed; use regex + lexicon)
    const times = [
      ...this.extractTimesFromText(lowerText),
      ...lexicon.times.filter(t => lowerText.includes(t))
    ];

    // Extract actions (verbs related to crime)
    const actions = doc.verbs().out('array').filter((v: string) => 
      lexicon.methods.some(m => v.toLowerCase().includes(m))
    );

    // Extract objects (nouns that could be tools/evidence)
    const objects = doc.match('#Noun').out('array').filter((n: string) =>
      lexicon.tools.some(t => n.toLowerCase().includes(t))
    );

    // Extract relationships
    const relationships = this.extractRelationships(doc);

    // Extract timeline information
    const sequences = doc.match('(before|after|during|while|then|when|first|finally)')
      .out('array');

    // Create simple embedding (bag of words with TF-IDF style weighting)
    const embedding = this.createEmbedding(tokens, keywords);

    return {
      text,
      keywords,
      entities: { people, places, times, actions, objects },
      timeline: { times, sequences },
      relationships,
      embedding
    };
  }

  /**
   * Build or retrieve dynamic crime lexicon from solutionSecret
   */
  private getLexicon(caseData: CrimeCase): { methods: string[]; tools: string[]; locations: string[]; times: string[] } {
    const cached = this.lexiconCache.get(caseData.id);
    if (cached) return cached;

    const built = this.buildLexiconFromSolution(caseData.solutionSecret, caseData);
    // Fallback to default terms if some categories are empty
    const merged = {
      methods: built.methods.length ? built.methods : this.crimeLexicon.methods,
      tools: built.tools.length ? built.tools : this.crimeLexicon.tools,
      locations: built.locations.length ? built.locations : this.crimeLexicon.locations,
      times: built.times.length ? built.times : this.crimeLexicon.times,
    };
    this.lexiconCache.set(caseData.id, merged);
    return merged;
  }

  private buildLexiconFromSolution(solution: string, caseData: CrimeCase): { methods: string[]; tools: string[]; locations: string[]; times: string[] } {
    const doc = nlp(solution) as unknown as NlpDoc;

    // Extract candidates
    const verbs: string[] = doc.verbs().out('array').map((v: string) => v.toLowerCase());
    const nouns: string[] = doc.nouns().out('array').map((n: string) => n.toLowerCase());
    const places: string[] = (((doc as unknown as { places?: () => { out: (m: string) => string[] } }).places)
      ? (doc as unknown as { places: () => { out: (m: string) => string[] } }).places().out('array').map((p: string) => p.toLowerCase())
      : []);
    const times: string[] = this.extractTimesFromText(solution.toLowerCase());

    // Heuristics for methods/tools:
    // - methods: verb stems that relate to harm/disable/manipulate
    // - tools: noun candidates and clue titles/description nouns
    const harmVerbs = ['poison', 'stab', 'shoot', 'strangle', 'drown', 'push', 'hit', 'inject', 'suffocat', 'asphyxiat', 'electrocute', 'disable', 'cut', 'block', 'turn'];
    const methodCandidates = Array.from(new Set(
      verbs
        .map(v => v.replace(/[^a-z]/g, ''))
        .filter(v => harmVerbs.some(h => v.includes(h)))
    ));

    const clueNouns: string[] = [];
    caseData.clues.forEach(c => {
      const cdoc = nlp(`${c.title} ${c.description}`) as unknown as NlpDoc;
      clueNouns.push(...cdoc.nouns().out('array').map((n: string) => n.toLowerCase()));
    });

    const toolCandidates = Array.from(new Set(
      [...nouns, ...clueNouns]
        .map((n: string) => n.replace(/[^a-z]/g, ''))
        .filter((n: string) => n.length > 2)
    ));

    // Locations: from solution places, plus any location-like words in description
    const descPlacesDoc = nlp(caseData.description) as unknown as NlpDoc;
    const descPlaces = descPlacesDoc.places().out('array').map((p: string) => p.toLowerCase());
    const locationCandidates = Array.from(new Set([...places, ...descPlaces]));

    // Times: from solution times plus timeline explicit times
    const timelineTimes = caseData.timeline.map(t => t.time.toLowerCase());
    const timeCandidates = Array.from(new Set([...times, ...timelineTimes]));

    // Limit and clean
    const unique = (arr: string[], limit = 20) =>
      Array.from(new Set(arr.map(a => a.trim()).filter(Boolean))).slice(0, limit);

    return {
      methods: unique(methodCandidates, 20),
      tools: unique(toolCandidates, 25),
      locations: unique(locationCandidates, 15),
      times: unique(timeCandidates, 15),
    };
  }

  /**
   * Extract people names from text by matching against suspects
   */
  private extractPeopleFromText(text: string, caseData: CrimeCase): string[] {
    const found: string[] = [];
    caseData.suspects.forEach(suspect => {
      if (text.includes(suspect.name.toLowerCase())) {
        found.push(suspect.name);
      }
      if (text.includes(suspect.role.toLowerCase())) {
        found.push(suspect.role);
      }
    });
    return found;
  }

  /**
   * Extract subject-verb-object relationships
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractRelationships(doc: any): Array<{subject: string; action: string; object: string}> {
    const relationships = [];
    const sentences = doc.sentences().out('array');

    for (const sentence of sentences) {
      const sentDoc = nlp(sentence);
      const subjects = sentDoc.match('#Noun+').out('array');
      const verbs = sentDoc.verbs().out('array');
      const objects = sentDoc.match('#Noun+ (and|or) #Noun+').out('array');

      if (subjects.length > 0 && verbs.length > 0) {
        relationships.push({
          subject: subjects[0],
          action: verbs[0],
          object: objects[0] || ''
        });
      }
    }

    return relationships;
  }

  /**
   * Create a simple embedding vector
   */
  private createEmbedding(tokens: string[], keywords: Set<string>): number[] {
    const embedding = new Array(50).fill(0);
    const uniqueTokens = [...new Set(tokens)];
    
    uniqueTokens.forEach((token, index) => {
      if (index < 50) {
        const hash = this.simpleHash(token) % 50;
        embedding[hash] += keywords.has(token) ? 2 : 1;
      }
    });
    
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(v => v / magnitude) : embedding;
  }

  private tokenize(text: string): string[] {
    const matches = text.match(/[a-z]+/g);
    return matches ? matches : [];
  }

  private stem(word: string): string {
    let w = word;
    if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
    else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
    else if (w.endsWith('es') && w.length > 4) w = w.slice(0, -2);
    else if (w.endsWith('s') && w.length > 3) w = w.slice(0, -1);
    return w;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Extract time tokens from raw text using regex and common words
   */
  private extractTimesFromText(text: string): string[] {
    const results: string[] = [];
    const patterns: RegExp[] = [
      /\b\d{1,2}:\d{2}\s?(am|pm)?\b/gi,
      /\b\d{1,2}\s?(am|pm)\b/gi,
      /\b(midnight|noon|morning|evening|night|afternoon|dawn|dusk|o'clock)\b/gi,
    ];
    for (const re of patterns) {
      const matches = text.match(re);
      if (matches) results.push(...matches.map(m => m.toLowerCase()));
    }
    return Array.from(new Set(results));
  }
  /**
   * Calculate semantic similarity between two processed texts
   */
  private calculateSemanticSimilarity(userData: ProcessedText, solutionData: ProcessedText): number {
    // Cosine similarity between embeddings
    let dotProduct = 0;
    for (let i = 0; i < userData.embedding.length; i++) {
      dotProduct += userData.embedding[i] * solutionData.embedding[i];
    }
    
    // Dot product is already normalized because embeddings are normalized
    return dotProduct;
  }

  /**
   * Calculate keyword matching score
   */
  private calculateKeywordScore(userData: ProcessedText, solutionData: ProcessedText): number {
    const userKeywords = userData.keywords;
    const solutionKeywords = solutionData.keywords;
    
    if (solutionKeywords.size === 0) return 0;
    
    let matchCount = 0;
    solutionKeywords.forEach(keyword => {
      if (userKeywords.has(keyword)) {
        matchCount++;
      } else {
        // Check for similar keywords
        userKeywords.forEach(userKeyword => {
          const similarity = stringSimilarity.compareTwoStrings(keyword, userKeyword);
          if (similarity > 0.8) {
            matchCount += similarity;
          }
        });
      }
    });
    
    return matchCount / solutionKeywords.size;
  }

  /**
   * Calculate entity matching score
   */
  private calculateEntityScore(userData: ProcessedText, solutionData: ProcessedText): number {
    const entityTypes = ['people', 'places', 'times', 'actions', 'objects'] as const;
    let totalScore = 0;
    let totalEntities = 0;

    for (const type of entityTypes) {
      const solutionEntities = new Set(solutionData.entities[type]);
      const userEntities = new Set(userData.entities[type]);
      
      if (solutionEntities.size > 0) {
        const matches = [...solutionEntities].filter(e => 
          userEntities.has(e) || 
          [...userEntities].some(ue => 
            stringSimilarity.compareTwoStrings(e.toLowerCase(), ue.toLowerCase()) > 0.8
          )
        );
        
        totalScore += matches.length / solutionEntities.size;
        totalEntities++;
      }
    }

    return totalEntities > 0 ? totalScore / totalEntities : 1;
  }

  /**
   * Calculate narrative coherence score
   */
  private calculateNarrativeScore(userData: ProcessedText, solutionData: ProcessedText): number {
    const userRels = userData.relationships;
    const solutionRels = solutionData.relationships;
    
    if (solutionRels.length === 0) return 1;
    
    let matchCount = 0;
    
    for (const solRel of solutionRels) {
      for (const userRel of userRels) {
        const actionMatch = stringSimilarity.compareTwoStrings(
          solRel.action.toLowerCase(),
          userRel.action.toLowerCase()
        ) > 0.7;
        
        const subjectMatch = solRel.subject && userRel.subject ? 
          stringSimilarity.compareTwoStrings(
            solRel.subject.toLowerCase(),
            userRel.subject.toLowerCase()
          ) > 0.7 : false;
        
        if (actionMatch && subjectMatch) {
          matchCount++;
          break;
        }
      }
    }
    
    return matchCount / solutionRels.length;
  }

  /**
   * Calculate temporal matching score
   */
  private calculateTemporalScore(
    userData: ProcessedText, 
    solutionData: ProcessedText,
    caseData: CrimeCase
  ): number {
    // Check if user mentioned any timeline events
    const timelineEvents = caseData.timeline.map(t => t.time.toLowerCase());
    const userText = userData.text.toLowerCase();
    
    const mentionedEvents = timelineEvents.filter(event => 
      userText.includes(event)
    );
    
    // Check for sequence words
    const sequenceWords = ['before', 'after', 'during', 'while', 'then', 'when'];
    const hasSequence = sequenceWords.some(word => userText.includes(word));
    
    const eventScore = timelineEvents.length > 0 
      ? mentionedEvents.length / timelineEvents.length 
      : 0;
    
    return (eventScore + (hasSequence ? 1 : 0)) / 2;
  }

  /**
   * Get matched entities between user and solution
   */
  private getMatchedEntities(
    userData: ProcessedText, 
    solutionData: ProcessedText
  ): Record<string, string[]> {
    const matched: Record<string, string[]> = {
      people: [],
      places: [],
      actions: [],
      objects: []
    };

    for (const type of ['people', 'places', 'actions', 'objects'] as const) {
      const solutionEntities = solutionData.entities[type];
      const userEntities = userData.entities[type];
      
      matched[type] = solutionEntities.filter(e => 
        userEntities.some(ue => 
          stringSimilarity.compareTwoStrings(e.toLowerCase(), ue.toLowerCase()) > 0.8
        )
      );
    }

    return matched;
  }

  /**
   * Calculate confidence based on score consistency
   */
  private calculateConfidence(scores: number[]): number {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Higher confidence when scores are consistent and high
    return Math.max(0, Math.min(1, mean * (1 - stdDev)));
  }

  /**
   * Generate feedback and suggestions
   */
  private generateFeedback(
    correct: boolean,
    score: number,
    userData: ProcessedText,
    solutionData: ProcessedText,
    caseData: CrimeCase
  ): { type: 'brilliant' | 'correct' | 'partial' | 'incorrect'; message: string; suggestions?: string[] } {
    
    if (correct && score > 0.85) {
      return {
        type: 'brilliant',
        message: "Outstanding detective work! Your conclusion perfectly matches all the evidence."
      };
    }
    
    if (correct) {
      return {
        type: 'correct',
        message: "You've solved the case! Your reasoning captures the essential truth."
      };
    }
    
    if (score > 0.4) {
      const suggestions = this.generateSuggestions(userData, solutionData, caseData);
      return {
        type: 'partial',
        message: "You're on the right track, but some key details are missing.",
        suggestions
      };
    }
    
    return {
      type: 'incorrect',
      message: "Your theory doesn't match the evidence. Review the clues and timeline.",
      suggestions: this.generateGeneralSuggestions()
    };
  }

  /**
   * Generate specific suggestions based on missing elements
   */
  private generateSuggestions(
    userData: ProcessedText,
    solutionData: ProcessedText,
    caseData: CrimeCase
  ): string[] {
    const suggestions: string[] = [];
    
    // Check missing keywords
    const missingKeywords = [...solutionData.keywords].filter(k => !userData.keywords.has(k));
    if (missingKeywords.length > 0) {
      suggestions.push(`Consider mentioning: ${missingKeywords.slice(0, 3).join(', ')}`);
    }
    
    // Check missing entities
    if (solutionData.entities.people.length > 0 && userData.entities.people.length === 0) {
      suggestions.push("Include who was involved in your explanation.");
    }
    
    if (solutionData.entities.actions.length > 0 && userData.entities.actions.length === 0) {
      suggestions.push("Describe the specific actions taken to commit the crime.");
    }
    
    // Check timeline
    const timelineMentioned = caseData.timeline.some(t => 
      userData.text.toLowerCase().includes(t.time.toLowerCase()) ||
      userData.text.toLowerCase().includes(t.event.toLowerCase())
    );
    
    if (!timelineMentioned) {
      suggestions.push("Reference specific times from the timeline.");
    }
    
    return suggestions.slice(0, 3); // Max 3 suggestions
  }

  /**
   * Generate general suggestions
   */
  private generateGeneralSuggestions(): string[] {
    return [
      "Review all the clues carefully",
      "Check the timeline for key moments",
      "Consider each suspect's motive and opportunity",
      "Think about how the crime was physically committed"
    ];
  }

  /**
   * Generate suggestions when wrong suspect is accused
   */
  private generateSuspectSuggestions(): string[] {
    return [
      "Review each suspect's motive",
      "Check their alibis against the timeline",
      "Look for clues that point to a specific person"
    ];
  }

  /**
   * Clear cache for a case
   */
  public clearCache(caseId?: string): void {
    if (caseId) {
      this.solutionCache.delete(caseId);
    } else {
      this.solutionCache.clear();
    }
  }
}

export default new NLPEvaluationService();
