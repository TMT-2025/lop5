import { NormalizedExpression, FormulaSourceFormat } from './types';

/**
 * Formula Engine - Source Expression Normalizer (v2)
 *
 * Normalizes multi-format formula inputs (obtained from Gemini, documents, or direct user input)
 * into a standardized, canonical pseudo-LaTeX representation. This establishes a clean,
 * predictable tokenization and parsing target, eliminating duplicated sanitization logic.
 *
 * Supported transformations:
 * - HTML <sub>/<sup> tags to standard LaTeX subscript/superscript formatting.
 * - Multi-character and single-character Unicode subscripts & superscripts to canonical `_{...}` & `^{...}`.
 * - Unicode radical markers (e.g., √) to canonical `\sqrt{...}` representations.
 * - Plaintext chemistry arrows/operators to structured unicode characters (e.g., -> to →, <=> to ⇌).
 * - Imbalanced bracket structures are repaired natively, adjusting opening/closing pairs.
 * - XML tags such as <nls> or </nls> are stripped cleanly.
 *
 * Scenarios and test examples included as inline documentation:
 * 1. Chemistry: "H₂SO₄" -> "H_{2}SO_{4}"
 * 2. HTML Chemistry: "H<sub>2</sub>SO<sub>4</sub>" -> "H_{2}SO_{4}"
 * 3. Chemistry Ion: "SO₄²⁻" -> "SO_{4}^{2-}"
 * 4. Physics with subscript: "v₀" -> "v_{0}"
 * 5. Physics Sub/Sup: "a_x²" -> "a_{x}^{2}"
 * 6. Mathematical square: "x² + y² = z²" -> "x^{2} + y^{2} = z^{2}"
 * 7. Unicode radical: "√x" -> "\sqrt{x}"
 * 8. Unicode radical nested: "√(x + 1)" -> "\sqrt{x + 1}"
 * 9. LaTeX block wrapper: "$$E = mc²$$" -> "E = mc^{2}"
 * 10. LaTeX inline wrapper: "$E = mc²$" -> "E = mc^{2}"
 * 11. HTML superscript: "x<sup>n+1</sup>" -> "x^{n+1}"
 * 12. Imbalanced opening brackets: "x_{1" -> "x_{1}"
 * 13. Imbalanced closing brackets: "(x + 1))" -> "(x + 1)"
 * 14. Nested chemistry group: "Ca(OH)₂" -> "Ca(OH)_{2}"
 * 15. Bio genetic cross cross symbol: "AaBb x AaBb" -> "AaBb × AaBb"
 * 16. Reaction equation simple: "2H2 + O2 -> 2H2O" -> "2H_{2} + O_{2} → 2H_{2}O"
 * 17. Reversible reaction simple: "N2 + 3H2 <=> 2NH3" -> "N_{2} + 3H_{2} ⇌ 2NH_{3}"
 * 18. Complex complex ion: "[Co(NH₃)₆]³⁺" -> "[Co(NH_{3})_{6}]^{3+}"
 * 19. LaTeX command character conversion: "a \pm b" -> "a ± b"
 * 20. Surrounding XML cleanup: "<nls>CO2</nls>" -> "CO_{2}"
 */

// Mappings for Unicode Superscripts to their standard character representations
const UNICODE_SUPERSCRIPTS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')', 'ⁿ': 'n', 'ⁱ': 'i', 'ᵃ': 'a', 'ᵇ': 'b', 'ᶜ': 'c',
  'ᵈ': 'd', 'ᵉ': 'e', 'ᶠ': 'f', 'ᵍ': 'g', 'ʰ': 'h', 'ʲ': 'j', 'ᵏ': 'k', 'ˡ': 'l', 'ᵐ': 'm', 'ᵒ': 'o',
  'ᵖ': 'p', 'ʳ': 'r', 'ˢ': 's', 'ᵗ': 't', 'ᵘ': 'u', 'ᵛ': 'v', 'ʷ': 'w', 'ˣ': 'x', 'ʸ': 'y', 'ᶻ': 'z',
  'ᴬ': 'A', 'ᴮ': 'B', 'ᴰ': 'D', 'ᴱ': 'E', 'ᴳ': 'G', 'ᴴ': 'H', 'ᴵ': 'I', 'ᴶ': 'J', 'ᴷ': 'K', 'ᴸ': 'L',
  'ᴹ': 'M', 'ᴺ': 'N', 'ᴼ': 'O', 'ᴾ': 'P', 'ᴿ': 'R', 'ᵀ': 'T', 'ᵁ': 'U', 'ⱽ': 'V', 'ᵂ': 'W'
};

// Mappings for Unicode Subscripts to their standard character representations
const UNICODE_SUBSCRIPTS: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')', 'ₐ': 'a', 'ₑ': 'e', 'ₕ': 'h', 'ᵢ': 'i', 'ⱼ': 'j',
  'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm', 'ₙ': 'n', 'ₒ': 'o', 'ₚ': 'p', 'ᵣ': 'r', 'ₛ': 's', 'ₜ': 't', 'ᵤ': 'u',
  'ᵥ': 'v', 'ₓ': 'x', 'ᵦ': 'β', 'ᵧ': 'γ', 'ᵨ': 'ρ', 'ᵩ': 'φ', 'ᵪ': 'χ'
};

// LaTeX symbol commands to readable standard unicode operators
const LATEX_SYMBOL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\\backsim/g, '∽'],
  [/\\pm/g, '±'],
  [/\\Delta/g, 'Δ'],
  [/\\pi/g, 'π'],
  [/\\times/g, '×'],
  [/\\div/g, '÷'],
  [/\\le(?!a)|\\leq/g, '≤'],
  [/\\ge(?!m)|\\geq/g, '≥'],
  [/\\approx/g, '≈'],
  [/\\infty/g, '∞'],
  [/\\neq/g, '≠'],
  [/\\cdot/g, '·'],
  [/\\alpha/g, 'α'],
  [/\\beta/g, 'β'],
  [/\\gamma/g, 'γ'],
  [/\\theta/g, 'θ'],
  [/\\lambda/g, 'λ'],
  [/\\mu/g, 'μ']
];

// Regex selectors for matching blocks of scripts
const UNICODE_SUP_REGEX = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱᵃᵇᶜᵈᵉᶠᵍʰʲᵏˡᵐᵒᵖʳˢᵗᵘᵛʷˣʸᶻᴬᴮᴰᴱᴳᴴᴵᴶᵷᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ]+/g;
const UNICODE_SUB_REGEX = /[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ]+/g;
const HTML_SUB_REGEX = /<sub[^>]*>([\s\S]*?)<\/sub>/gi;
const HTML_SUP_REGEX = /<sup[^>]*>([\s\S]*?)<\/sup>/gi;

/**
 * High-performance balancing function to correct imbalanced braces, brackets, and parentheses.
 * Ensures the expression is syntactically correct and will not trigger tokenizer/parser crashes.
 */
function balanceBrackets(text: string): { sanitized: string; isSanitized: boolean } {
  const openPairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closePairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const stack: Array<{ char: string; pos: number }> = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (openPairs[char]) {
      stack.push({ char, pos: i });
    } else if (closePairs[char]) {
      const last = stack[stack.length - 1];
      if (last && last.char === closePairs[char]) {
        stack.pop();
      } else {
        // Unmatched closing bracket, marker saved
        stack.push({ char, pos: i });
      }
    }
  }

  if (stack.length === 0) {
    return { sanitized: text, isSanitized: false };
  }

  const toIgnore = new Set<number>();
  const toAppend: string[] = [];

  // Stack is processed backwards to prevent indexing shifts
  for (let idx = stack.length - 1; idx >= 0; idx--) {
    const item = stack[idx];
    if (closePairs[item.char]) {
      toIgnore.add(item.pos);
    } else {
      toAppend.push(openPairs[item.char]);
    }
  }

  let reconstructed = '';
  for (let i = 0; i < text.length; i++) {
    if (!toIgnore.has(i)) {
      reconstructed += text[i];
    }
  }
  reconstructed += toAppend.join('');

  return { sanitized: reconstructed, isSanitized: true };
}

/**
 * Primary normalization entry point.
 * Converts raw mathematical/scientific expressions into consistent Canonical pseudo-LaTeX.
 */
export function normalize(rawInput: string): NormalizedExpression {
  let value = rawInput;
  let sourceFormat: FormulaSourceFormat = 'plain-text';
  let isSanitized = false;

  // 1. Strip surrounding XML tags such as <nls> or </nls>
  const originalLength = value.length;
  value = value.replace(/<\/?nls>/g, '');
  if (value.length !== originalLength) {
    isSanitized = true;
  }
  value = value.trim();

  // 1.1 Support and clean absolute bars (\vert) and standard LaTeX layout commands (\left, \right, \text, \mathrm, \operatorname)
  value = value.replace(/\\vert/gi, '|').replace(/\\Vert/gi, '||');
  value = value.replace(/\\left\./gi, '').replace(/\\right\./gi, '');
  value = value.replace(/\\left\s*/gi, '').replace(/\\right\s*/gi, '');
  
  // Remove escaped or stray \backslash text generated by AI (e.g. \backslash\cos -> \cos, \backslash circ -> \circ)
  value = value.replace(/\\backslash\s*\\?/g, '\\');
  // Normalize degree/temperature symbols (\circ) to ° and strip any superscript wrappers around them
  value = value.replace(/\^{\s*\\circ\s*}/g, '°')
               .replace(/\^\s*\\circ(?![a-zA-Z])/g, '°')
               .replace(/\\circ(?![a-zA-Z])/g, '°');
  // Normalize precipitate (\down) and gas (\up) symbols to Unicode arrows
  value = value.replace(/\\down\b/g, '↓')
               .replace(/\\up\b/g, '↑');
  // Normalize average/mean values \bar{x} or \bar x to x̄ (combining macron)
  value = value.replace(/\\bar\s*\{\s*([a-zA-Z])\s*\}/g, '$1\u0304')
               .replace(/\\bar\s*([a-zA-Z])/g, '$1\u0304');
  // Normalize AI-generated "arrow" or "\text{arrow}" terms to standard arrows
  value = value.replace(/\\?arrow\b|\\text\{arrow\}/gi, ' → ');
  // Normalize stray "right" words before arrows
  value = value.replace(/\\?right\s*(➔|→|⟶|\\rightarrow|\\to|\\Rightarrow|\\leftarrow|\\leftrightarrow|⇒|←|↔)/gi, '$1');
  // Normalize LaTeX math function backslashes (e.g., \cos -> cos, \sin -> sin) for cleaner DOCX rendering
  value = value.replace(/\\(sin|cos|tan|cot|ln|log)\b/g, '$1');

  for (let k = 0; k < 3; k++) {
    const nextVal = value
      .replace(/\\text\s*\{([^{}]+)\}/gi, '$1')
      .replace(/\\mathrm\s*\{([^{}]+)\}/gi, '$1')
      .replace(/\\operatorname\s*\{([^{}]+)\}/gi, '$1');
    if (nextVal === value) break;
    value = nextVal;
  }
  value = value.replace(/\\mathrm\s+([a-zA-Z0-9]+)/gi, '$1');
  value = value.replace(/\\operatorname\s+([a-zA-Z0-9]+)/gi, '$1');
  value = value.replace(/\\text\s+([a-zA-Z0-9]+)/gi, '$1');

  // 1.2 Standardize raw mathematical operators, spacing/limits commands and shorthand to standard LaTeX commands
  value = value.replace(/∫/g, '\\int ');
  value = value.replace(/∑/g, '\\sum ');
  value = value.replace(/\\limits\s*/gi, '');
  value = value.replace(/\\displaystyle\s*/gi, '');
  value = value.replace(/\\qquad\s*/gi, '   ');
  value = value.replace(/\\quad\s*/gi, '  ');
  value = value.replace(/\\,\s*/g, ' ');
  value = value.replace(/\\!\s*/g, '');
  value = value.replace(/\\:\s*/g, ' ');
  value = value.replace(/\\;\s*/g, ' ');
  value = value.replace(/\\to\s*/g, '→').replace(/\\rightarrow\s*/g, '→');
  value = value.replace(/\blim\b/gi, '\\lim');

  // 1.3 Clean up LaTeX array/matrix/cases environments to standard nested bracket/brace layouts
  value = value.replace(/\\begin\{cases\}/gi, '{ ')
               .replace(/\\end\{cases\}/gi, ' }')
               .replace(/\\begin\{matrix\}/gi, '[ ')
               .replace(/\\end\{matrix\}/gi, ' ]')
               .replace(/\\begin\{pmatrix\}/gi, '( ')
               .replace(/\\end\{pmatrix\}/gi, ' )')
               .replace(/\\begin\{bmatrix\}/gi, '[ ')
               .replace(/\\end\{bmatrix\}/gi, ' ]')
               .replace(/\\begin\{array\}(\{[^}]*\})?/gi, '[ ')
               .replace(/\\end\{array\}/gi, ' ]')
               .replace(/\\begin\{align\*?\}/gi, '')
               .replace(/\\end\{align\*?\}/gi, '')
               .replace(/\\begin\{equation\*?\}/gi, '')
               .replace(/\\end\{equation\*?\}/gi, '');
  
  // Replace column separators '&' with spaces/commas and row separators '\\' with semicolons
  value = value.replace(/&/g, '  ')
               .replace(/\\\\/g, ' ; ');

  // 2. Identify the enclosing layout format
  if (value.startsWith('$$') && value.endsWith('$$')) {
    sourceFormat = 'latex-block';
    value = value.slice(2, -2).trim();
  } else if (value.startsWith('$_') && value.endsWith('_$')) {
    sourceFormat = 'latex-inline';
    value = value.slice(2, -2).trim();
  } else if (value.startsWith('$') && value.endsWith('$')) {
    sourceFormat = 'latex-inline';
    value = value.slice(1, -1).trim();
  } else if (HTML_SUB_REGEX.test(value) || HTML_SUP_REGEX.test(value)) {
    sourceFormat = 'html-sub-sup';
  } else if (UNICODE_SUP_REGEX.test(value) || UNICODE_SUB_REGEX.test(value)) {
    sourceFormat = 'unicode';
  }

  // 3. Transform HTML tags into standard LaTeX notation
  if (sourceFormat === 'html-sub-sup' || /<sub|<sup/i.test(value)) {
    value = value.replace(HTML_SUB_REGEX, (_, content) => `_{${content.trim()}}`);
    value = value.replace(HTML_SUP_REGEX, (_, content) => `^{${content.trim()}}`);
  }

  // 4. Group adjacent Unicode superscript runs into continuous canonical scripts
  value = value.replace(UNICODE_SUP_REGEX, (match) => {
    const chars = Array.from(match);
    const converted = chars.map(c => UNICODE_SUPERSCRIPTS[c] || c).join('');
    return `^{${converted}}`;
  });

  // 5. Group adjacent Unicode subscript runs into continuous canonical scripts
  value = value.replace(UNICODE_SUB_REGEX, (match) => {
    const chars = Array.from(match);
    const converted = chars.map(c => UNICODE_SUBSCRIPTS[c] || c).join('');
    return `_{${converted}}`;
  });

  // 6. Inline Chemistry transformations: converts raw plain text structures to uniform chemical elements and arrows
  // 6.1 Convert "->" or "-->" to "→"
  if (value.includes('->')) {
    value = value.replace(/--?>/g, ' → ');
  }
  // 6.2 Convert "<=>" or "<==>" to "⇌"
  if (value.includes('<=>')) {
    value = value.replace(/<==?>/g, ' ⇌ ');
  }

  // 7. Simplify common unescaped subscripts/superscripts mapping
  // 7.1 Convert chemical charges/ions first (e.g. SO42- -> SO4^{2-}, Na+ -> Na^{+})
  value = value.replace(/\b([A-Za-z0-9\(\)\[\]]+)(\d*[+-])\b/g, '$1^{$2}');

  // 7.2 Convert subscripts for chemical formulas/elements (e.g., H2SO4 -> H_{2}SO_{4})
  // Match any capital letter (optionally followed by lowercase letter) or a closing parenthesis/bracket, followed by a number
  value = value.replace(/([A-Z][a-z]?|[\)\]])(\d+)/g, '$1_{$2}');

  // 8. Normalize radicals (Unicode square root wrappers to standard \sqrt)
  if (value.includes('√')) {
    // √{expression} -> \sqrt{expression}
    value = value.replace(/√\{([^{}]+)\}/g, '\\sqrt{$1}');
    // √(expression) -> \sqrt{expression}
    value = value.replace(/√\(([^()]+)\)/g, '\\sqrt{$1}');
    // √x -> \sqrt{x} for individual variables or numbers
    value = value.replace(/√([a-zA-Z0-9α-ωΑ-ΩθπΔ])/g, '\\sqrt{$1}');
  }

  // 9. Standardize LaTeX symbols to keep the formula parsing uniform
  for (const [pattern, unicodeSymbol] of LATEX_SYMBOL_REPLACEMENTS) {
    value = value.replace(pattern, unicodeSymbol);
  }

  // 10. Ensure the Biology mating cross is canonical
  // Normalizes "x" used for crosses to "×" with balanced genetics spacing
  value = value.replace(/\b([A-Za-z]+)\s+x\s+([A-Za-z]+)\b/g, '$1 × $2');

  // 11. Repair imbalanced brackets
  const balanceResult = balanceBrackets(value);
  value = balanceResult.sanitized;
  if (balanceResult.isSanitized) {
    isSanitized = true;
  }

  // 12. Tidy duplicate double scripts (e.g., duplicate carets resulting from overlapping rules)
  value = value.replace(/\^{2,}/g, '^');
  value = value.replace(/_{2,}/g, '_');

  return {
    rawInput,
    normalizedValue: value,
    sourceFormat,
    isSanitized
  };
}
