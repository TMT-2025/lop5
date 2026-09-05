import { FormulaToken, TokenType } from './types';

/**
 * Formula Engine - Lexical Tokenizer (v2)
 *
 * Converts standardized canonical formula string representations (produced by the Normalizer)
 * into a sequential array of strongly-typed FormulaToken structures.
 *
 * This module has NO understanding of mathematics, chemistry, physics, or biology domains, nor
 * does it perform context analysis, tree structure parsing, validation, or rendering. It operates
 * strictly as a lightweight, high-performance lexical scanner.
 *
 * Supported token representations and examples:
 * 1. Numbers (integer, fractional/real): "12", "0.05", "3.1415" -> 'number'
 * 2. LaTeX commands: "\sqrt", "\frac", "\lim", "\int", "\sum", "\vec", "\unit" -> mapped markers
 * 3. Script markers: "_" -> 'subscript-marker', "^" -> 'superscript-marker'
 * 4. Punctuation brackets: "{", "(", "[" -> 'left-bracket', "}", ")", "]" -> 'right-bracket'
 * 5. Chemical symbols (IUPAC elemental symbols): "H", "Na", "Cl", "Fe" -> 'chemical-element'
 * 6. Mathematical operators and relations: "+", "-", "*", "/", "=", "<", ">", "±", "×", "÷", "·", "≠", "≤", "≥", "≈", "⊥" -> 'operator'
 * 7. Reaction arrows: "→", "⇌" -> 'reaction-arrow'
 * 8. Special symbols: "Δ", "π", "∞" -> 'special-symbol'
 * 9. Generic text variables/identifiers: "x", "y", "v0", "t", "a" -> 'text'
 *
 * Tokenization Examples:
 * - "H_{2}SO_{4}" ->
 *     [ chemical-element("H"), subscript-marker("_"), left-bracket("{"), number("2"), right-bracket("}"),
 *       chemical-element("S"), chemical-element("O"), subscript-marker("_"), left-bracket("{"), number("4"), right-bracket("}") ]
 * - "x^{2} + a_{1}" ->
 *     [ text("x"), superscript-marker("^"), left-bracket("{"), number("2"), right-bracket("}"),
 *       whitespace(" "), operator("+"), whitespace(" "), text("a"), subscript-marker("_"), left-bracket("{"), number("1"), right-bracket("}") ]
 */

/**
 * Set of all valid IUPAC Chemical Element symbols to ensure strict alphabetical scanning.
 * Dual-character structures (e.g., He, Li) are prioritized before single character checks.
 */
const IUPAC_ELEMENTS = new Set([
  'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar',
  'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr',
  'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe',
  'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu',
  'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn',
  'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr',
  'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'
]);

/**
 * Mapping of specialized LaTeX command backslash sequences to specific Token Types.
 */
const LATEX_COMMAND_MAP: Record<string, TokenType> = {
  '\\sqrt': 'sqrt-marker',
  '\\frac': 'fraction-marker',
  '\\dfrac': 'fraction-marker',
  '\\lim': 'limit-marker',
  '\\int': 'integral-marker',
  '\\sum': 'summation-marker',
  '\\vec': 'vector-marker',
  '\\unit': 'unit-marker',
  '\\overset': 'overset-marker',
  '\\widehat': 'widehat-marker'
};

/**
 * Set of matched operators and comparison indicators.
 */
const OPERATORS = new Set([
  '+', '-', '*', '/', '=', '<', '>', '±', '×', '÷', '·', '≠', '≤', '≥', '≈', '⊥'
]);

/**
 * Set of general punctuation symbols and delimiters categorized as special-symbol.
 */
const PUNCTUATION_SYMBOLS = new Set([
  ',', '.', ';', ':', '?', '!'
]);

/**
 * Scans a slice of string text from current cursor index and returns the matched token if found.
 */
function scanToken(text: string, index: number): FormulaToken | null {
  const slice = text.slice(index);
  if (!slice) return null;

  // 1. Whitespace Matcher
  const whitespaceMatch = /^\s+/.exec(slice);
  if (whitespaceMatch) {
    const value = whitespaceMatch[0];
    return {
      type: 'whitespace',
      value,
      start: index,
      end: index + value.length
    };
  }

  // 2. LaTeX Command Matcher (e.g. \sqrt, \frac, \alpha, \vec or any word prefixed with a single backslash)
  if (slice.startsWith('\\')) {
    const commandMatch = /^\\[a-zA-Z]+/.exec(slice);
    if (commandMatch) {
      const value = commandMatch[0];
      const type = LATEX_COMMAND_MAP[value] || 'special-symbol';
      return {
        type,
        value,
        start: index,
        end: index + value.length
      };
    }
  }

  // 3. Numbers Matcher (including decimals)
  const numberMatch = /^\d+(?:\.\d+)?/.exec(slice);
  if (numberMatch) {
    const value = numberMatch[0];
    return {
      type: 'number',
      value,
      start: index,
      end: index + value.length
    };
  }

  // 4. Bracket Matchers
  const firstChar = slice[0];
  if (firstChar === '{' || firstChar === '(' || firstChar === '[') {
    return {
      type: 'left-bracket',
      value: firstChar,
      start: index,
      end: index + 1
    };
  }
  if (firstChar === '}' || firstChar === ')' || firstChar === ']') {
    return {
      type: 'right-bracket',
      value: firstChar,
      start: index,
      end: index + 1
    };
  }

  // 5. Script Marker Matchers
  if (firstChar === '_') {
    return {
      type: 'subscript-marker',
      value: '_',
      start: index,
      end: index + 1
    };
  }
  if (firstChar === '^') {
    return {
      type: 'superscript-marker',
      value: '^',
      start: index,
      end: index + 1
    };
  }

  // 6. Reaction Arrow Matchers
  if (firstChar === '→' || firstChar === '⇌') {
    return {
      type: 'reaction-arrow',
      value: firstChar,
      start: index,
      end: index + 1
    };
  }

  // 7. Operators Matcher
  if (OPERATORS.has(firstChar)) {
    return {
      type: 'operator',
      value: firstChar,
      start: index,
      end: index + 1
    };
  }

  // 8. Delimiter/Punctuation Matcher
  if (PUNCTUATION_SYMBOLS.has(firstChar)) {
    return {
      type: 'special-symbol',
      value: firstChar,
      start: index,
      end: index + 1
    };
  }

  // 9. Chemical Element Matcher
  // IUPAC elements can consist of an uppercase letter followed by an optional lowercase letter (e.g. "Cl", "Na").
  // Regex balances this checking pattern:
  const elementMatch = /^[A-Z][a-z]?/.exec(slice);
  if (elementMatch) {
    const value = elementMatch[0];
    if (IUPAC_ELEMENTS.has(value)) {
      return {
        type: 'chemical-element',
        value,
        start: index,
        end: index + value.length
      };
    }
  }

  // 10. General Variables or Text Matcher (alphabetical runs)
  const textMatch = /^[a-zA-Z\u0304]+/.exec(slice);
  if (textMatch) {
    const value = textMatch[0];
    return {
      type: 'text',
      value,
      start: index,
      end: index + value.length
    };
  }

  // 11. Custom Special Symbols (including standalone scientific symbols, Greek letters, or emojis)
  // Match any non-ascii character that survived earlier matchers (like Greek letter unicode points)
  const specialMatch = /^[^\x00-\x7F]/.exec(slice);
  if (specialMatch) {
    const value = specialMatch[0];
    return {
      type: 'special-symbol',
      value,
      start: index,
      end: index + value.length
    };
  }

  // Fallback catch-all for unrecognized characters -> emit as 'text' to prevent parser lock
  return {
    type: 'text',
    value: firstChar,
    start: index,
    end: index + 1
  };
}

/**
 * Tokenizes standardized canonical formula strings sequentially, ignoring invalid gaps of text.
 * @param text Standardization string output of the Normalizer.
 * @returns Ordered sequence of FormulaToken entities.
 */
export function tokenize(text: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let currentIndex = 0;
  const length = text.length;

  while (currentIndex < length) {
    const token = scanToken(text, currentIndex);
    if (token) {
      tokens.push(token);
      currentIndex = token.end;
    } else {
      // Emergency cursor increment in case of anomalous empty returns
      currentIndex++;
    }
  }

  return tokens;
}
