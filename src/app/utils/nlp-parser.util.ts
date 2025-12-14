/**
 * Natural Language Processing utilities for parsing task input
 */

export interface ParsedTaskInput {
  title: string;
  description?: string;
  dueDate?: string;
  time?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

/**
 * Parse natural language input to extract task information
 */
export function parseTaskInput(input: string): ParsedTaskInput {
  const result: ParsedTaskInput = {
    title: input.trim()
  };

  // Extract date patterns
  const datePatterns = [
    /(?:today|tonight)/i,
    /(?:tomorrow|tmr)/i,
    /(?:next week|next month|next year)/i,
    /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/, // MM/DD/YYYY
    /(\d{1,2})-(\d{1,2})(?:\-(\d{2,4}))?/, // MM-DD-YYYY
    /(?:in|after)\s+(\d+)\s+(?:day|days|week|weeks|month|months)/i
  ];

  // Extract time patterns
  const timePatterns = [
    /(?:at|@)\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?/i,
    /(?:at|@)\s*(\d{1,2})\s*(am|pm)/i,
    /(?:morning|afternoon|evening|night|noon|midnight)/i
  ];

  // Extract priority keywords
  const priorityKeywords = {
    high: /\b(?:urgent|important|critical|asap|immediately|high priority)\b/i,
    medium: /\b(?:normal|medium|moderate)\b/i,
    low: /\b(?:low|optional|whenever)\b/i
  };

  // Extract category keywords
  const categoryKeywords: { [key: string]: RegExp } = {
    'Work': /\b(?:work|office|meeting|project|client|business)\b/i,
    'School': /\b(?:school|study|homework|exam|assignment|class|university|college)\b/i,
    'Personal': /\b(?:personal|home|family|shopping|grocery|errand)\b/i,
    'Health': /\b(?:health|exercise|gym|doctor|appointment|medical)\b/i
  };

  // Extract tags (words starting with #)
  const tagPattern = /#(\w+)/g;
  const tags: string[] = [];
  let tagMatch;
  while ((tagMatch = tagPattern.exec(input)) !== null) {
    tags.push(tagMatch[1]);
  }
  if (tags.length > 0) {
    result.tags = tags;
    // Remove tags from title
    result.title = result.title.replace(/#\w+/g, '').trim();
  }

  // Check for priority
  for (const [priority, pattern] of Object.entries(priorityKeywords)) {
    if (pattern.test(input)) {
      result.priority = priority as 'low' | 'medium' | 'high';
      break;
    }
  }

  // Check for category
  for (const [category, pattern] of Object.entries(categoryKeywords)) {
    if (pattern.test(input)) {
      result.category = category;
      break;
    }
  }

  // Extract date
  for (const pattern of datePatterns) {
    const match = input.match(pattern);
    if (match) {
      result.dueDate = parseDateFromMatch(match[0], input);
      break;
    }
  }

  // Extract time
  for (const pattern of timePatterns) {
    const match = input.match(pattern);
    if (match) {
      result.time = match[0];
      break;
    }
  }

  return result;
}

/**
 * Parse date from natural language
 */
function parseDateFromMatch(match: string, fullInput: string): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const lowerMatch = match.toLowerCase();

  if (lowerMatch.includes('today')) {
    return today.toISOString().split('T')[0];
  }

  if (lowerMatch.includes('tomorrow') || lowerMatch.includes('tmr')) {
    return tomorrow.toISOString().split('T')[0];
  }

  // Day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lowerMatch.includes(days[i])) {
      const dayIndex = i;
      const currentDay = today.getDay();
      let daysUntil = (dayIndex - currentDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 7; // Next week if today
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntil);
      return targetDate.toISOString().split('T')[0];
    }
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const dateMatch = match.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (dateMatch) {
    const month = parseInt(dateMatch[1]) - 1;
    const day = parseInt(dateMatch[2]);
    const year = dateMatch[3] ? parseInt(dateMatch[3]) : today.getFullYear();
    const date = new Date(year, month, day);
    return date.toISOString().split('T')[0];
  }

  // "in X days"
  const daysMatch = match.match(/(\d+)\s+(?:day|days)/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + days);
    return targetDate.toISOString().split('T')[0];
  }

  return today.toISOString().split('T')[0];
}

/**
 * Detect if a task is a duplicate of existing tasks
 */
export function detectDuplicate(
  newTask: { title: string; description?: string },
  existingTasks: Array<{ title: string; description?: string }>
): { isDuplicate: boolean; similarity: number; similarTask?: any } {
  const threshold = 0.7; // 70% similarity threshold

  for (const task of existingTasks) {
    const similarity = calculateSimilarity(
      newTask.title.toLowerCase(),
      task.title.toLowerCase()
    );

    if (similarity >= threshold) {
      return {
        isDuplicate: true,
        similarity,
        similarTask: task
      };
    }
  }

  return { isDuplicate: false, similarity: 0 };
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Suggest category based on task content
 */
export function suggestCategory(title: string, description?: string): string {
  const content = `${title} ${description || ''}`.toLowerCase();

  const categoryScores: { [key: string]: number } = {
    'Work': 0,
    'School': 0,
    'Personal': 0,
    'Health': 0
  };

  const keywords: { [key: string]: string[] } = {
    'Work': ['meeting', 'project', 'client', 'office', 'business', 'deadline', 'report', 'presentation'],
    'School': ['homework', 'exam', 'study', 'assignment', 'class', 'lecture', 'quiz', 'test', 'essay'],
    'Personal': ['grocery', 'shopping', 'family', 'home', 'personal', 'errand', 'chore'],
    'Health': ['exercise', 'gym', 'doctor', 'appointment', 'health', 'fitness', 'workout', 'medical']
  };

  for (const [category, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (content.includes(word)) {
        categoryScores[category]++;
      }
    }
  }

  const maxScore = Math.max(...Object.values(categoryScores));
  if (maxScore === 0) return 'Personal'; // Default

  for (const [category, score] of Object.entries(categoryScores)) {
    if (score === maxScore) {
      return category;
    }
  }

  return 'Personal';
}

