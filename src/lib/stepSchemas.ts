// Schema-driven editor registry for lesson step types.
//
// StepEditor.vue hand-writes rich editors for the 13 most common types
// (concept, quote, question, match, scripture, …). The real content corpus
// uses ~47 distinct types; the long tail previously fell back to a raw-JSON
// textarea. This registry describes the field shape of those remaining types
// so GenericStepFields.vue can render a proper labeled form for each one.
//
// Shapes were derived from the richest live instance of each type in prod.
// Deeply cross-referenced types (checkpoint, deepdive, timeline-drop) expose
// their scalar fields as inputs and their nested arrays as a JSON field — a
// strict improvement over editing the whole step as raw JSON.

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'bool'
  | 'select'
  | 'stringList'
  | 'object'
  | 'objectList'
  | 'json'

export interface FieldSpec {
  key: string
  label: string
  kind: FieldKind
  placeholder?: string
  rows?: number
  options?: string[] // for kind: 'select'
  itemLabel?: string // singular noun for objectList/stringList "add" button
  itemFields?: FieldSpec[] // for kind: 'object' | 'objectList' (scalars + stringList, one level)
}

export interface StepSchema {
  label: string // toolbar / picker label
  category: 'Content' | 'Quiz' | 'Interactive' | 'Other'
  fields: FieldSpec[]
  make: () => Record<string, any> // default new step
}

const T = (key: string, label: string, placeholder = ''): FieldSpec => ({ key, label, kind: 'text', placeholder })
const TA = (key: string, label: string, rows = 2, placeholder = ''): FieldSpec => ({ key, label, kind: 'textarea', rows, placeholder })
const NUM = (key: string, label: string): FieldSpec => ({ key, label, kind: 'number' })
const BOOL = (key: string, label: string): FieldSpec => ({ key, label, kind: 'bool' })
const SL = (key: string, label: string, itemLabel = 'item'): FieldSpec => ({ key, label, kind: 'stringList', itemLabel })

export const STEP_SCHEMAS: Record<string, StepSchema> = {
  explanation: {
    label: 'Explanation',
    category: 'Content',
    fields: [TA('body', 'Body', 3), T('quote', 'Pull quote (optional)')],
    make: () => ({ type: 'explanation', body: '', quote: '' }),
  },

  witness: {
    label: 'Witness',
    category: 'Content',
    fields: [
      T('person', 'Person'),
      T('role', 'Role'),
      T('dates', 'Dates', 'e.g. 1932–2018'),
      TA('quote', 'Quote', 2),
      T('quoteSource', 'Quote source'),
      TA('body', 'Body', 4),
      T('source', 'Source (citation)'),
    ],
    make: () => ({ type: 'witness', person: '', role: '', dates: '', quote: '', quoteSource: '', body: '', source: '' }),
  },

  'fear-reassurance': {
    label: 'Fear / Reassurance',
    category: 'Content',
    fields: [
      TA('fear', 'Fear', 2),
      TA('reassurance', 'Reassurance', 3),
      TA('theologicalBasis', 'Theological basis', 3),
      T('source', 'Source (citation)'),
    ],
    make: () => ({ type: 'fear-reassurance', fear: '', reassurance: '', theologicalBasis: '', source: '' }),
  },

  stance: {
    label: 'Stance',
    category: 'Content',
    fields: [
      TA('claim', 'Claim', 2),
      { key: 'verdict', label: 'Verdict', kind: 'select', options: ['true', 'false', 'fair_point', 'oversimplified'] },
      TA('resolution', 'Resolution', 3),
      T('source', 'Source (citation)'),
    ],
    make: () => ({ type: 'stance', claim: '', verdict: 'false', resolution: '', source: '' }),
  },

  apply: {
    label: 'Apply',
    category: 'Content',
    fields: [T('label', 'Label', 'e.g. Your move'), TA('prompt', 'Prompt', 3)],
    make: () => ({ type: 'apply', label: '', prompt: '' }),
  },

  mnemonic: {
    label: 'Mnemonic',
    category: 'Content',
    fields: [
      T('title', 'Title'),
      TA('hook', 'Hook', 2),
      T('device', 'Device', 'e.g. phrase'),
      T('prompt', 'Prompt'),
      SL('items', 'Items', 'item'),
    ],
    make: () => ({ type: 'mnemonic', title: '', hook: '', device: 'phrase', prompt: '', items: [''] }),
  },

  article: {
    label: 'Article',
    category: 'Content',
    fields: [TA('summary', 'Summary', 2), TA('body', 'Body', 4)],
    make: () => ({ type: 'article', summary: '', body: '' }),
  },

  painting: {
    label: 'Painting',
    category: 'Content',
    fields: [
      {
        key: 'artwork',
        label: 'Artwork',
        kind: 'object',
        itemFields: [T('title', 'Title'), T('artist', 'Artist'), T('year', 'Year'), TA('caption', 'Caption', 2), T('image_url', 'Image URL')],
      },
      SL('panels', 'Panels (narration)', 'panel'),
    ],
    make: () => ({ type: 'painting', artwork: { title: '', artist: '', year: '', caption: '', image_url: '' }, panels: [''] }),
  },

  interpretations: {
    label: 'Interpretations',
    category: 'Quiz',
    fields: [TA('question', 'Question', 2), SL('options', 'Options', 'option'), TA('explanation', 'Explanation', 2)],
    make: () => ({ type: 'interpretations', question: '', options: ['', '', ''], explanation: '' }),
  },

  confidence: {
    label: 'Confidence',
    category: 'Quiz',
    fields: [
      TA('question', 'Question', 2),
      SL('options', 'Options', 'option'),
      NUM('answerIndex', 'Answer index (0-based)'),
      { key: 'feedback', label: 'Feedback', kind: 'object', itemFields: [TA('why', 'Why', 3)] },
    ],
    make: () => ({ type: 'confidence', question: '', options: ['', ''], answerIndex: 0, feedback: { why: '' } }),
  },

  predict: {
    label: 'Predict',
    category: 'Quiz',
    fields: [
      TA('question', 'Question', 3),
      NUM('answer', 'Answer'),
      NUM('min', 'Min'),
      NUM('max', 'Max'),
      NUM('step', 'Step'),
      NUM('start', 'Start'),
      T('unit', 'Unit', 'e.g. years old'),
      TA('payoff', 'Payoff', 3),
    ],
    make: () => ({ type: 'predict', question: '', answer: 0, min: 0, max: 100, step: 1, start: 0, unit: '', payoff: '' }),
  },

  'hot-take': {
    label: 'Hot Take',
    category: 'Quiz',
    fields: [T('objection_slug', 'Objection slug', 'links to viral_objections')],
    make: () => ({ type: 'hot-take', objection_slug: '' }),
  },

  'fallacy-id': {
    label: 'Fallacy ID',
    category: 'Quiz',
    fields: [
      T('objection_slug', 'Objection slug', 'links to viral_objections'),
      T('correct_pattern', 'Correct pattern', 'e.g. ad-hominem'),
      SL('distractor_patterns', 'Distractor patterns', 'pattern'),
    ],
    make: () => ({ type: 'fallacy-id', objection_slug: '', correct_pattern: '', distractor_patterns: [''] }),
  },

  order: {
    label: 'Order',
    category: 'Interactive',
    fields: [
      TA('instruction', 'Instruction', 2),
      { key: 'items', label: 'Items (correct order)', kind: 'objectList', itemLabel: 'item', itemFields: [T('id', 'ID'), TA('text', 'Text', 2)] },
      TA('explanation', 'Explanation', 2),
    ],
    make: () => ({ type: 'order', instruction: '', items: [{ id: '1', text: '' }], explanation: '' }),
  },

  rank: {
    label: 'Rank',
    category: 'Interactive',
    fields: [
      TA('instruction', 'Instruction', 2),
      T('hint', 'Hint'),
      { key: 'items', label: 'Items', kind: 'objectList', itemLabel: 'item', itemFields: [T('id', 'ID'), TA('text', 'Text', 2), NUM('correct_position', 'Correct position (0-based)')] },
      TA('explanation', 'Explanation', 2),
    ],
    make: () => ({ type: 'rank', instruction: '', hint: '', items: [{ id: '1', text: '', correct_position: 0 }], explanation: '' }),
  },

  timeline: {
    label: 'Timeline',
    category: 'Interactive',
    fields: [
      { key: 'items', label: 'Events', kind: 'objectList', itemLabel: 'event', itemFields: [T('title', 'Title / year'), TA('body', 'Body', 3)] },
    ],
    make: () => ({ type: 'timeline', items: [{ title: '', body: '' }] }),
  },

  tapword: {
    label: 'Tap Word',
    category: 'Interactive',
    fields: [
      TA('instruction', 'Instruction', 2),
      T('source', 'Source'),
      NUM('targetCount', 'Target count'),
      { key: 'tokens', label: 'Tokens', kind: 'objectList', itemLabel: 'token', itemFields: [T('id', 'ID'), TA('text', 'Text', 2), BOOL('isTarget', 'Is target')] },
      TA('explanation', 'Explanation', 2),
    ],
    make: () => ({ type: 'tapword', instruction: '', source: '', targetCount: 1, tokens: [{ id: '1', text: '', isTarget: false }], explanation: '' }),
  },

  fillblank: {
    label: 'Fill Blank',
    category: 'Interactive',
    fields: [
      { key: 'tokens', label: 'Tokens', kind: 'objectList', itemLabel: 'token', itemFields: [T('id', 'ID'), TA('text', 'Text', 2), BOOL('isBlank', 'Is blank'), T('hint', 'Hint')] },
      SL('wordBank', 'Word bank', 'word'),
      { key: 'options', label: 'Options (optional MCQ)', kind: 'objectList', itemLabel: 'option', itemFields: [T('id', 'ID'), TA('text', 'Text', 2), BOOL('isCorrect', 'Correct')] },
      TA('explanation', 'Explanation', 3),
    ],
    make: () => ({ type: 'fillblank', tokens: [{ id: '1', text: '', isBlank: false }], wordBank: [''], explanation: '' }),
  },

  buildverse: {
    label: 'Build Verse',
    category: 'Interactive',
    fields: [
      TA('instruction', 'Instruction', 2),
      T('reference', 'Reference'),
      TA('verseText', 'Full verse text', 3),
      { key: 'words', label: 'Word chunks', kind: 'objectList', itemLabel: 'chunk', itemFields: [T('id', 'ID'), TA('text', 'Text', 2), BOOL('isPlaced', 'Is placed')] },
      TA('explanation', 'Explanation', 3),
    ],
    make: () => ({ type: 'buildverse', instruction: '', reference: '', verseText: '', words: [{ id: '1', text: '', isPlaced: false }], explanation: '' }),
  },

  quotematch: {
    label: 'Quote Match',
    category: 'Interactive',
    fields: [
      TA('instruction', 'Instruction', 2),
      {
        key: 'questions',
        label: 'Questions',
        kind: 'objectList',
        itemLabel: 'question',
        itemFields: [TA('quote', 'Quote', 2), T('correctAnswer', 'Correct answer'), SL('options', 'Options', 'option')],
      },
      TA('explanation', 'Explanation', 3),
    ],
    make: () => ({ type: 'quotematch', instruction: '', questions: [{ quote: '', correctAnswer: '', options: ['', ''] }], explanation: '' }),
  },

  swipe: {
    label: 'Swipe',
    category: 'Interactive',
    fields: [
      TA('instruction', 'Instruction', 2),
      { key: 'cards', label: 'Cards', kind: 'objectList', itemLabel: 'card', itemFields: [TA('statement', 'Statement', 2), BOOL('answer', 'Answer (true/false)'), TA('explanation', 'Explanation', 2)] },
    ],
    make: () => ({ type: 'swipe', instruction: '', cards: [{ statement: '', answer: true, explanation: '' }] }),
  },

  conceptmap: {
    label: 'Concept Map',
    category: 'Interactive',
    fields: [
      T('title', 'Title'),
      { key: 'nodes', label: 'Nodes', kind: 'objectList', itemLabel: 'node', itemFields: [T('label', 'Label'), TA('description', 'Description', 2)] },
      { key: 'connections', label: 'Connections', kind: 'objectList', itemLabel: 'connection', itemFields: [T('fromLabel', 'From label'), T('toLabel', 'To label'), T('relationship', 'Relationship')] },
    ],
    make: () => ({ type: 'conceptmap', title: '', nodes: [{ label: '', description: '' }], connections: [] }),
  },

  ladder: {
    label: 'Ladder',
    category: 'Interactive',
    fields: [
      T('source', 'Source'),
      { key: 'steps', label: 'Rungs', kind: 'objectList', itemLabel: 'rung', itemFields: [TA('q', 'Question', 2), SL('options', 'Options', 'option'), NUM('answer', 'Answer index (0-based)')] },
      TA('conclusion', 'Conclusion', 3),
    ],
    make: () => ({ type: 'ladder', source: '', steps: [{ q: '', options: ['Yes', 'No'], answer: 1 }], conclusion: '' }),
  },

  // Deeply cross-referenced — scalar fields as inputs, nested arrays as JSON.
  checkpoint: {
    label: 'Checkpoint',
    category: 'Other',
    fields: [
      T('eyebrow', 'Eyebrow'),
      { key: 'items', label: 'Items (nested — edit as JSON)', kind: 'json' },
    ],
    make: () => ({ type: 'checkpoint', eyebrow: '', items: [] }),
  },

  deepdive: {
    label: 'Deep Dive',
    category: 'Other',
    fields: [
      T('title', 'Title'),
      T('source', 'Source'),
      { key: 'sections', label: 'Sections (nested — edit as JSON)', kind: 'json' },
    ],
    make: () => ({ type: 'deepdive', title: '', source: '', sections: [] }),
  },

  'timeline-drop': {
    label: 'Timeline Drop',
    category: 'Other',
    fields: [
      TA('instruction', 'Instruction', 2),
      { key: 'slots', label: 'Slots (nested — edit as JSON)', kind: 'json' },
      { key: 'events', label: 'Events (nested — edit as JSON)', kind: 'json' },
      TA('explanation', 'Explanation', 3),
    ],
    make: () => ({ type: 'timeline-drop', instruction: '', slots: [], events: [], explanation: '' }),
  },
}

export const SCHEMA_TYPES = Object.keys(STEP_SCHEMAS)
