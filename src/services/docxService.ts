import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, Math as DocxMath } from "docx";
import { saveAs } from "file-saver";
import { parseFormula } from "./formula/parser";
import { renderFormulaToDocx } from "./formula/docxRenderer";
import { RenderOptions } from "./formula/types";

function maskMathPipes(text: string): string {
  let result = '';
  let currentIdx = 0;

  while (currentIdx < text.length) {
    const displayStart = text.indexOf('$$', currentIdx);
    const inlineStart = text.indexOf('$', currentIdx);

    if (displayStart !== -1 && (inlineStart === -1 || displayStart <= inlineStart)) {
      if (displayStart > currentIdx) {
        result += text.substring(currentIdx, displayStart);
      }
      const displayEnd = text.indexOf('$$', displayStart + 2);
      if (displayEnd !== -1) {
        const mathContent = text.substring(displayStart + 2, displayEnd);
        const maskedMath = mathContent.replace(/\|/g, '@@PIPE@@');
        result += '$$' + maskedMath + '$$';
        currentIdx = displayEnd + 2;
      } else {
        result += text.substring(displayStart);
        break;
      }
    } else if (inlineStart !== -1) {
      if (inlineStart > currentIdx) {
        result += text.substring(currentIdx, inlineStart);
      }
      const inlineEnd = text.indexOf('$', inlineStart + 1);
      if (inlineEnd !== -1) {
        const mathContent = text.substring(inlineStart + 1, inlineEnd);
        const maskedMath = mathContent.replace(/\|/g, '@@PIPE@@');
        result += '$' + maskedMath + '$';
        currentIdx = inlineEnd + 1;
      } else {
        result += text.substring(inlineStart);
        break;
      }
    } else {
      result += text.substring(currentIdx);
      break;
    }
  }

  return result;
}

// Formula Engine Integration

function isFormulaText(text: string): boolean {
  const clean = text.trim();
  if (!clean) return false;

  const cleanLower = clean.toLowerCase();
  
  // 1. Explicit exclusion list for normal English/Vietnamese education/tech terms
  const EXCLUDED_KEYWORDS = [
    'quizizz', 'kahoot', 'geogebra', 'desmos', 'chatgpt', 'gemini', 'claude', 'openai', 'microsoft', 'google',
    'ai', 'prompt', 'prompt engineering', 'machine learning', 'deep learning', 'internet', 'website', 'email', 'url', 'qr code',
    'padlet', 'mentimeter', 'powerpoint', 'google drive', 'google docs', 'google forms', 'cntt', 'năng lực số',
    'điện thoại', 'máy tính', 'máy tính cầm tay', 'máy tính bảng', 'laptop', 'diện tích', 'thể tích',
    'công cụ số', 'trí tuệ nhân tạo', 'tiết', 'hoạt động', 'bài tập', 'đáp án', 'giáo viên', 'học sinh', 'nhiệm vụ', 'báo cáo', 'thảo luận',
    'sinh', 'sinh học', 'học sinh', 'sinh sản', 'sinh trưởng', 'phát sinh', 'nảy sinh', 'sinh viên', 'tan học', 'tan trường'
  ];

  for (const keyword of EXCLUDED_KEYWORDS) {
    if (keyword === 'ai' || keyword === 'cntt') {
      // Use standard boundary bounds to prevent collision with Vietnamese words containing ai/cntt as syllables
      const regex = new RegExp(`(?:^|\\s)${keyword}(?:\\s|$|[\\p{P}])`, 'ui');
      if (regex.test(cleanLower)) {
        return false;
      }
    } else {
      if (cleanLower.includes(keyword)) {
        return false;
      }
    }
  }

  // 2. Clear mathematical LaTeX formatting triggers
  if (
    clean.includes('\\frac') ||
    clean.includes('\\sqrt') ||
    clean.includes('\\int') ||
    clean.includes('\\sum') ||
    clean.includes('\\lim') ||
    clean.includes('\\vec') ||
    clean.includes('\\unit') ||
    clean.includes('\\overset') ||
    clean.includes('\\widehat') ||
    clean.includes('\\alpha') ||
    clean.includes('\\beta') ||
    clean.includes('\\gamma') ||
    clean.includes('\\delta') ||
    clean.includes('\\pi') ||
    clean.includes('_') ||
    clean.includes('^')
  ) {
    return true;
  }

  // 3. Mathematical symbols / operations unicode characters
  const hasMathSymbols = /[⇌→⇌√±×÷·≠≤≥≈⊥ΔΩΣ∫∑∞π′]/.test(clean);
  if (hasMathSymbols) return true;

  // 4. Standalone unicode subscripts or superscripts (e.g. x², x₁)
  const hasUnicodeScript = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱᵃᵇᶜᵈᵉᶠᵍʰʲᵏˡᵐᵒᵖʳˢᵗᵘᵛʷˣʸᶻᴬᴮᴰᴱᴳᴴᴵᴶᵷᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ]/.test(clean);
  if (hasUnicodeScript && /\w/.test(clean)) {
    return true;
  }

  // 5. Classic chemical formula structures or charged ions
  const CHEM_FORMULA_REGEX = /^\[?\d*[A-Z][A-Za-z0-9\(\)\[\]]*$/;
  const CHEM_ION_REGEX = /^\[?\d*[A-Z][A-Za-z0-9\(\)\[\]]*[+-]$/;
  const hasFormulaIndicator = /[\d\(\)\[\]]/.test(clean);

  if (CHEM_FORMULA_REGEX.test(clean) && hasFormulaIndicator) return true;
  if (CHEM_ION_REGEX.test(clean)) return true;

  // 6. Classical mathematical functions or expressions matching f(x), sin(x)
  if (/^[a-df-hj-z]\s*\(\s*[a-z0-9θπ]\s*\)/i.test(clean)) return true;
  if (/^(sin|cos|tan|cot|ln|log|lim)\b/i.test(clean)) return true;

  // 7. Equations/comparisons like y=ax+b, x=5
  if (/^[a-zA-Z0-9]\s*(=|<|>|≤|≥)\s*[a-zA-Z0-9]/i.test(clean)) return true;

  return false;
}

function fallbackRenderContent(text: string, isBold: boolean, isNLS: boolean, customColor?: string): TextRun[] {
  const result: TextRun[] = [];
  
  let lastIndex = 0;
  let match;

  const runColor = isNLS ? "FF0000" : (customColor || undefined);
  const shouldBeBold = isNLS ? false : isBold;

  // Replace arrow symbols and strip internal tags
  let processedText = text.replace(/-->/g, " → ").replace(/->/g, " → ");
  processedText = processedText.replace(/<\/?nls>/gi, '').replace(/<\/?correct>/gi, '');
  // Normalize degree/temperature symbols (\circ) to ° and strip any superscript wrappers around them
  processedText = processedText.replace(/\^{\s*\\circ\s*}/g, '°')
                               .replace(/\^\s*\\circ(?![a-zA-Z])/g, '°')
                               .replace(/\\circ(?![a-zA-Z])/g, '°');
  // Normalize precipitate (\down) and gas (\up) symbols to Unicode arrows
  processedText = processedText.replace(/\\down\b/g, '↓')
                               .replace(/\\up\b/g, '↑');
  // Normalize average/mean values \bar{x} or \bar x to x̄ (combining macron)
  processedText = processedText.replace(/\\bar\s*\{\s*([a-zA-Z])\s*\}/g, '$1\u0304')
                               .replace(/\\bar\s*([a-zA-Z])/g, '$1\u0304');
  processedText = processedText.replace(/<br\s*\/?>/gi, ' ').replace(/&lt;br\s*\/?&gt;/gi, ' ');
  processedText = processedText.replace(/\\?right\s*(➔|→|⟶|\\rightarrow|\\to|\\Rightarrow|\\leftarrow|\\leftrightarrow|⇒|←|↔)/gi, '$1');
  // Strip $ signs sometimes used for LaTeX
  processedText = processedText.replace(/\$/g, '');

  if (/\\xrightarrow\{([^}]+)\}/g.test(processedText)) {
    const parts = processedText.split(/\\xrightarrow\{[^}]+\}/g);
    const matches = processedText.match(/\\xrightarrow\{([^}]+)\}/g) || [];
    const runs: TextRun[] = [];
    
    parts.forEach((part, idx) => {
      runs.push(...fallbackRenderContent(part, isBold, isNLS, customColor));
      if (idx < matches.length) {
        const condMatch = matches[idx].match(/\\xrightarrow\{([^}]+)\}/);
        const cond = condMatch ? condMatch[1] : "";
        runs.push(new TextRun({ text: " ──", bold: shouldBeBold, color: runColor }));
        runs.push(new TextRun({ text: cond, superScript: true, bold: shouldBeBold, color: runColor }));
        runs.push(new TextRun({ text: "──> ", bold: shouldBeBold, color: runColor }));
      }
    });
    return runs;
  }

  // Convert LaTeX math symbols to Unicode equivalents for DOCX
  const symbolMap: { [key: string]: string } = {
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\delta': 'δ',
    '\\epsilon': 'ε',
    '\\eta': 'η',
    '\\theta': 'θ',
    '\\lambda': 'λ',
    '\\mu': 'μ',
    '\\pi': 'π',
    '\\rho': 'ρ',
    '\\sigma': 'σ',
    '\\omega': 'ω',
    '\\phi': 'φ',
    '\\Delta': 'Δ',
    '\\Omega': 'Ω',
    '\\Sigma': 'Σ',
    '\\cap': '∩',
    '\\cup': '∪',
    '\\in': '∈',
    '\\notin': '∉',
    '\\subset': '⊂',
    '\\supset': '⊃',
    '\\subseteq': '⊆',
    '\\supseteq': '⊇',
    '\\empty': '∅',
    '\\varnothing': '∅',
    '\\times': '×',
    '\\div': '÷',
    '\\pm': '±',
    '\\le': '≤',
    '\\ge': '≥',
    '\\leq': '≤',
    '\\geq': '≥',
    '\\approx': '≈',
    '\\neq': '≠',
    '\\perp': '⊥',
    '\\parallel': '∥',
    '\\to': '→',
    '\\rightarrow': '→',
    '\\leftarrow': '←',
    '\\leftrightarrow': '↔',
    '\\Rightarrow': '⇒',
    '\\infty': '∞',
    '\\angle': '∠',
    '\\triangle': '△',
    '\\deg': '°',
    '\\circ': '°',
    '\\sin': 'sin',
    '\\cos': 'cos',
    '\\tan': 'tan',
    '\\cot': 'cot',
    '\\ln': 'ln',
    '\\log': 'log',
  };

  Object.keys(symbolMap).forEach(key => {
    const escapedKey = key.replace(/\\/g, '\\\\');
    const regex = new RegExp(escapedKey + '(?![a-zA-Z])', 'g');
    processedText = processedText.replace(regex, symbolMap[key]);
  });

  const chemRegex = /([A-Za-z\)\]])(\d+|n\b)|([A-Za-z\)\]])(\d*[+-])|(_)(\{([^}]+)\}|([a-zA-Z0-9α-ωΔΩΣ′]))|(\^)(\{([^}]+)\}|([a-zA-Z0-9α-ωΔΩΣ′\+-]+))/g;
  
  lastIndex = 0;
  while ((match = chemRegex.exec(processedText)) !== null) {
    if (match.index > lastIndex) {
      result.push(new TextRun({
        text: processedText.substring(lastIndex, match.index),
        bold: shouldBeBold,
        color: runColor,
      }));
    }

    if (match[1]) {
      result.push(new TextRun({
        text: match[1],
        bold: shouldBeBold,
        color: runColor,
      }));
      result.push(new TextRun({
        text: match[2],
        subScript: true,
        bold: shouldBeBold,
        color: runColor,
      }));
    } else if (match[3]) {
      result.push(new TextRun({
        text: match[3],
        bold: shouldBeBold,
        color: runColor,
      }));
      result.push(new TextRun({
        text: match[4],
        superScript: true,
        bold: shouldBeBold,
        color: runColor,
      }));
    } else if (match[5]) {
      const subVal = match[7] || match[8];
      result.push(new TextRun({
        text: subVal,
        subScript: true,
        bold: shouldBeBold,
        color: runColor,
      }));
    } else if (match[9]) {
      const supVal = match[11] || match[12];
      result.push(new TextRun({
        text: supVal,
        superScript: true,
        bold: shouldBeBold,
        color: runColor,
      }));
    }
    lastIndex = chemRegex.lastIndex;
  }

  if (lastIndex < processedText.length) {
    result.push(new TextRun({
      text: processedText.substring(lastIndex),
      bold: shouldBeBold,
      color: runColor,
    }));
  }
  return result;
}

function segmentText(text: string): Array<{ type: 'text' | 'inline-math' | 'display-math'; value: string }> {
  const result: Array<{ type: 'text' | 'inline-math' | 'display-math'; value: string }> = [];
  let currentIdx = 0;

  while (currentIdx < text.length) {
    const displayStart = text.indexOf('$$', currentIdx);
    const inlineStart = text.indexOf('$', currentIdx);

    if (displayStart !== -1 && (inlineStart === -1 || displayStart <= inlineStart)) {
      if (displayStart > currentIdx) {
        result.push({ type: 'text', value: text.substring(currentIdx, displayStart) });
      }
      const displayEnd = text.indexOf('$$', displayStart + 2);
      if (displayEnd !== -1) {
        result.push({ type: 'display-math', value: text.substring(displayStart + 2, displayEnd) });
        currentIdx = displayEnd + 2;
      } else {
        result.push({ type: 'text', value: text.substring(displayStart) });
        break;
      }
    } else if (inlineStart !== -1) {
      if (inlineStart > currentIdx) {
        result.push({ type: 'text', value: text.substring(currentIdx, inlineStart) });
      }
      const inlineEnd = text.indexOf('$', inlineStart + 1);
      if (inlineEnd !== -1) {
        result.push({ type: 'inline-math', value: text.substring(inlineStart + 1, inlineEnd) });
        currentIdx = inlineEnd + 1;
      } else {
        result.push({ type: 'text', value: text.substring(inlineStart) });
        break;
      }
    } else {
      result.push({ type: 'text', value: text.substring(currentIdx) });
      break;
    }
  }

  return result;
}

function isMathFriendly(part: string): boolean {
  const p = part.trim();
  if (!p) return true; // whitespace is friendly
  
  // If it contains any LaTeX backslash, subscripts, superscripts, or math symbols
  if (p.includes('\\') || p.includes('_') || p.includes('^')) return true;
  if (/[⇌→⇌√±×÷·≠≤≥≈⊥ΔΩΣ∫∑∞π′=<>]/.test(p)) return true;
  
  // If it has math operators or parentheses/brackets
  if (/[\-+*/=<>()[\]{}]/.test(p)) return true;

  // Pure numbers are friendly
  if (/^\d+(?:\.\d+)?$/.test(p)) return true;

  // Standalone unicode subscripts or superscripts (e.g. x², x₁)
  const hasUnicodeScript = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱᵃᵇᶜᵈᵉᶠᵍʰʲᵏˡᵐᵒᵖʳˢᵗᵘᵛʷˣʸᶻᴬᴮᴰᴱᴳᴴᴵᴶᵷᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ]/.test(p);
  if (hasUnicodeScript) return true;

  // Pure alphabetic words are friendly ONLY if length is <= 2 (variables, calculus dx/dy)
  if (/^[a-zA-Z]+$/.test(p)) {
    return p.length <= 2;
  }

  return false;
}

function renderContent(text: string, isBold: boolean, isNLS: boolean, customColor?: string): Array<TextRun | any> {
  let processedText = text.replace(/-->/g, " → ").replace(/->/g, " → ");
  processedText = processedText.replace(/<\/?nls>/gi, '').replace(/<\/?correct>/gi, '');
  processedText = processedText.replace(/<br\s*\/?>/gi, ' ').replace(/&lt;br\s*\/?&gt;/gi, ' ');
  processedText = processedText.replace(/\\?right\s*(➔|→|⟶|\\rightarrow|\\to|\\Rightarrow|\\leftarrow|\\leftrightarrow|⇒|←|↔)/gi, '$1');

  if (/\\xrightarrow\{([^}]+)\}/g.test(processedText)) {
    const parts = processedText.split(/\\xrightarrow\{[^}]+\}/g);
    const matches = processedText.match(/\\xrightarrow\{([^}]+)\}/g) || [];
    const runs: Array<TextRun | any> = [];
    const runColor = isNLS ? "FF0000" : (customColor || undefined);
    const shouldBeBold = isNLS ? false : isBold;
    
    parts.forEach((part, idx) => {
      runs.push(...renderContent(part, isBold, isNLS, customColor));
      if (idx < matches.length) {
        const condMatch = matches[idx].match(/\\xrightarrow\{([^}]+)\}/);
        const cond = condMatch ? condMatch[1] : "";
        runs.push(new TextRun({ text: " ──", bold: shouldBeBold, color: runColor }));
        runs.push(new TextRun({ text: cond, superScript: true, bold: shouldBeBold, color: runColor }));
        runs.push(new TextRun({ text: "──> ", bold: shouldBeBold, color: runColor }));
      }
    });
    return runs;
  }

  const segments = segmentText(processedText);
  const result: Array<TextRun | any> = [];
  const runColor = isNLS ? "FF0000" : (customColor || undefined);
  const shouldBeBold = isNLS ? false : isBold;

  for (const seg of segments) {
    if (seg.type === 'inline-math' || seg.type === 'display-math') {
      try {
        const ast = parseFormula(seg.value);
        const options: RenderOptions = {
          rendererType: 'docx',
          bold: shouldBeBold,
          colorHex: runColor
        };
        const rendered = renderFormulaToDocx(ast, options);
        if (rendered && rendered.length > 0) {
          result.push(...rendered);
          continue;
        }
      } catch (err) {
        console.warn("Formula Engine parser failed on segment:", seg.value, err);
      }
      result.push(...fallbackRenderContent(seg.value, isBold, isNLS, customColor));
    } else {
      // Normal text segment - preserve spaces by splitting and grouping math expressions
      const cleanSegValue = seg.value.replace(/\$/g, '');
      const parts = cleanSegValue.split(/(\s+)/);
      const groupedSegments: string[] = [];
      let currentGroup: string[] = [];

      const flushGroup = () => {
        if (currentGroup.length > 0) {
          const merged = currentGroup.join("");
          if (isFormulaText(merged)) {
            groupedSegments.push(merged);
          } else {
            // Push each non-empty item individually to remain standard text runs
            currentGroup.forEach(item => {
              if (item) groupedSegments.push(item);
            });
          }
          currentGroup = [];
        }
      };

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;

        if (isMathFriendly(part)) {
          currentGroup.push(part);
        } else {
          flushGroup();
          groupedSegments.push(part);
        }
      }
      flushGroup();

      for (const word of groupedSegments) {
        if (/^\s+$/.test(word)) {
          result.push(new TextRun({
            text: word,
            bold: shouldBeBold,
            color: runColor,
          }));
          continue;
        }

        if (!isFormulaText(word)) {
          result.push(new TextRun({
            text: word,
            bold: shouldBeBold,
            color: runColor,
          }));
        } else {
          try {
            const ast = parseFormula(word);
            const options: RenderOptions = {
              rendererType: 'docx',
              bold: shouldBeBold,
              colorHex: runColor
            };
            const rendered = renderFormulaToDocx(ast, options);
            if (rendered && rendered.length > 0) {
              result.push(...rendered);
              continue;
            }
          } catch (err) {
            // silent fallback
          }
          result.push(...fallbackRenderContent(word, isBold, isNLS, customColor));
        }
      }
    }
  }

  return result;
}

export async function generateDocx(content: string, fileName: string, periods?: number) {
  // Ensure [Tích hợp NLS: ...] markers are wrapped in <nls> tags if not already
  let processedContent = content.replace(/(?<!<nls>)\[Tích hợp NLS:(.*?)\](?!<\/nls>)/gi, '<nls>[Tích hợp NLS:$1]</nls>');
  
  // Remove ** from content
  let cleanContent = processedContent.replace(/\*\*/g, '');
  
  const lines = cleanContent.split('\n');
  const children: (Paragraph | Table)[] = [];

  // Trích xuất số tiết từ content hoặc sử dụng tham số periods
  let periodsStr = "";
  if (periods && periods > 0) {
    periodsStr = `(${periods} tiết)`;
  } else {
    const periodsMatch = content.match(/(?:Số tiết|Thời lượng)\s*:\s*(\d+)/i);
    if (periodsMatch) {
      periodsStr = `(${periodsMatch[1]} tiết)`;
    } else {
      const parenMatch = content.match(/\((\d+)\s*tiết\)/i);
      if (parenMatch) {
        periodsStr = `(${parenMatch[1]} tiết)`;
      } else {
        const shortMatch = content.match(/(\d+)\s*tiết/i);
        if (shortMatch) {
          periodsStr = `(${shortMatch[1]} tiết)`;
        }
      }
    }
  }

  // 1. Add Header Table (School/Teacher)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: "TRƯỜNG TIỂU HỌC: ...........................", size: 24 })] }),
              new Paragraph({ children: [new TextRun({ text: "TỔ CHUYÊN MÔN: KHỐI 5", size: 24 })] }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Họ và tên giáo viên:", size: 24 })] 
              }),
              new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "..........................................", size: 24 })] 
              }),
            ],
          }),
        ],
      }),
    ],
  });

  children.push(headerTable);
  children.push(new Paragraph({ spacing: { before: 400 } }));

  // 2. Add Titles (as per user image)
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: "KẾ HOẠCH BÀI DẠY",
        bold: true,
        size: 28,
      }),
    ],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: periodsStr ? { after: 120 } : { after: 400 },
    children: [
      new TextRun({
        text: `BÀI DẠY: ${fileName.toUpperCase()}`,
        bold: true,
        size: 26,
      }),
    ],
  }));

  if (periodsStr) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: periodsStr,
          bold: true,
          size: 26,
        }),
      ],
    }));
  }

  let started = false;
  let inWorksheetSection = false;
  let choiceBuffer: string[] = [];
  let tableBuffer: string[] = [];

  const createMarkdownTable = (tableLines: string[]) => {
    // Filter out separator lines like |---|---|
    const rows = tableLines.filter(line => !/^\|?[:\s-]*(\|[:\s-]*)*\|?$/.test(line.replace(/\|/g, '-')));
    const tableRows: TableRow[] = [];

    const isTeacherStudentTable = rows.length > 0 && /giáo\s*viên|học\s*sinh/i.test(rows[0]);

    rows.forEach((rowText, rowIndex) => {
      // Mask math pipes
      const maskedRowText = maskMathPipes(rowText);
      // Split by | but ignore escaped \|
      const cells = maskedRowText.split(/(?<!\\)\|/).map(c => c.trim()).filter((c, i, arr) => {
        // Remove first and last empty cells if they exist (standard markdown | cell |)
        if (i === 0 && c === "" && arr.length > 1) return false;
        if (i === arr.length - 1 && c === "" && arr.length > 1) return false;
        return true;
      }).map(cell => cell.replace(/@@PIPE@@/g, '|'));

      if (cells.length === 0) return;

      const tableCells = cells.map((cellText, cIdx) => {
        // Split by <br> or fallback to lookbehind period split for the second column (Nội dung)
        let cellLines: string[] = [];
        if (/<br\s*\/?>|&lt;br\s*\/?&gt;/gi.test(cellText)) {
          cellLines = cellText.split(/<br\s*\/?>|&lt;br\s*\/?&gt;/gi);
        } else if (cIdx === 1 && rowIndex > 0 && !isTeacherStudentTable) {
          // Split by period followed by space (using lookbehind to keep the period)
          cellLines = cellText.split(/(?<=\.)\s+/);
        } else {
          cellLines = [cellText];
        }

        const cellParagraphs = cellLines.map(line => {
          return new Paragraph({
            children: renderContent(line.trim(), rowIndex === 0, false), // Bold header row
            alignment: rowIndex === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { after: 100 } // Add spacing between lines in the cell
          });
        });

        let colWidth = 100 / cells.length;
        if (cells.length === 2) {
          if (isTeacherStudentTable) {
            colWidth = 50;
          } else {
            colWidth = cIdx === 0 ? 25 : 75;
          }
        }

        return new TableCell({
          children: cellParagraphs,
          verticalAlign: rowIndex === 0 ? "center" : undefined,
          width: { size: colWidth, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
          }
        });
      });

      tableRows.push(new TableRow({ children: tableCells }));
    });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    });
  };

  const createChoiceTable = (choices: string[]) => {
    const rows: TableRow[] = [];
    // Determine if it should be 1 row (4 cols) or 2 rows (2 cols)
    const numCols = choices.length > 2 ? 2 : choices.length;
    const numRows = Math.ceil(choices.length / numCols);

    for (let r = 0; r < numRows; r++) {
      const cells: TableCell[] = [];
      for (let c = 0; c < numCols; c++) {
        const idx = r * numCols + c;
        const choiceText = choices[idx] || "";
        
        let targetBold = false;
        let targetColor: string | undefined = undefined;
        let choiceContent = choiceText;
        let label = "";

        // Improved regex to handle labels both with and without <correct> tags
        const match = choiceText.match(/^(<correct>)?(([A-D])\.\s*)(.*)/i);
        if (match) {
          label = match[2]; // The "A. " part
          choiceContent = match[4]; // The rest
        }

        const isCorrect = choiceText.includes('<correct>');
        const cleanChoiceContent = choiceContent.replace(/<\/?correct>/g, '');
        
        const cellParts: Array<TextRun | any> = [];
        if (label) {
          // Label (A., B., etc) - ALWAYS bold, Red if correct
          cellParts.push(...renderContent(label, true, false, isCorrect ? "FF0000" : undefined));
        }
        // Content - NOT bold if correct, but Red
        cellParts.push(...renderContent(cleanChoiceContent, false, false, isCorrect ? "FF0000" : undefined));

        cells.push(new TableCell({
          width: { size: 100 / numCols, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          },
          children: [new Paragraph({ children: cellParts })],
        }));
      }
      rows.push(new TableRow({ children: cells }));
    }

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: rows,
    });
  };

  lines.forEach((line, lineIdx) => {
    let text = line.trim();
    if (!text) {
      if (choiceBuffer.length > 0) children.push(createChoiceTable(choiceBuffer));
      if (tableBuffer.length > 0) children.push(createMarkdownTable(tableBuffer));
      choiceBuffer = [];
      tableBuffer = [];
      return;
    }

    // Detect if we are in a table block
    if (text.startsWith('|')) {
      tableBuffer.push(text);
      if (lineIdx === lines.length - 1) {
        children.push(createMarkdownTable(tableBuffer));
        tableBuffer = [];
      }
      return;
    } else {
      if (tableBuffer.length > 0) {
        children.push(createMarkdownTable(tableBuffer));
        tableBuffer = [];
      }
    }

    // Remove all asterisks as requested
    text = text.replace(/\*/g, '');
    text = text.trim();
    if (!text) return;

    // Detect if we are in a choice block
    const isChoice = /^([A-D])\.\s/.test(text) || /^<correct>([A-D])\.\s/.test(text);
    if (isChoice) {
      choiceBuffer.push(text);
      if (lineIdx === lines.length - 1) {
        children.push(createChoiceTable(choiceBuffer));
        choiceBuffer = [];
      }
      return;
    } else {
      if (choiceBuffer.length > 0) {
        children.push(createChoiceTable(choiceBuffer));
        choiceBuffer = [];
      }
    }

    // Detect if we entered the Worksheet section
    if (/^IV\.\s+CÁC PHIẾU HỌC TẬP/i.test(text) || /^CÁC PHIẾU HỌC TẬP/i.test(text)) {
      inWorksheetSection = true;
    }

    // Only start from "I. YÊU CẦU CẦN ĐẠT" or "I. MỤC TIÊU" to avoid double titles
    if (!started) {
      if (text.toUpperCase().includes("I. YÊU CẦU CẦN ĐẠT") || text.toUpperCase().includes("I. MỤC TIÊU")) {
        started = true;
      } else {
        return;
      }
    }

    let heading: "Heading1" | "Heading2" | "Heading3" | undefined = undefined;
    let bold = false;
    let customColor: string | undefined = undefined;
    let alignment: any = AlignmentType.LEFT;
    let labelPart: string | undefined = undefined;
    let contentPart: string = text;

    // Detect markdown headings (any level of hashes followed by a space)
    if (/^#+\s+/.test(text)) {
      bold = true;
      if (text.startsWith('# ')) {
        heading = HeadingLevel.HEADING_1 as "Heading1";
      } else if (text.startsWith('## ')) {
        heading = HeadingLevel.HEADING_2 as "Heading2";
      } else if (text.startsWith('### ')) {
        heading = HeadingLevel.HEADING_3 as "Heading3";
      }
      text = text.replace(/^#+\s*/, '');
      contentPart = text;
    }

    // Tiết X (Centered, Bold, Upper)
    const tietMatch = text.match(/^(\**)?(tiết\s+\d+[:.]?)(.*)/i);
    if (tietMatch) {
      alignment = AlignmentType.CENTER;
      bold = true;
      contentPart = text.toUpperCase().replace(/\*/g, '');
    }

    // Bold/Color patterns
    if (inWorksheetSection) {
      // In worksheet section: Only bold the titles "PHIẾU HỌC TẬP SỐ X"
      if (/^Phiếu học tập số\s+\d+/i.test(text) || /^PHIẾU HỌC TẬP SỐ\s+\d+/i.test(text)) {
        bold = true;
        customColor = "0000FF"; // Blue
      } else if (/^IV\.\s+CÁC PHIẾU HỌC TẬP/i.test(text) || /^CÁC PHIẾU HỌC TẬP/i.test(text)) {
        bold = true;
        customColor = "FF0000"; // Red
      } else {
        const questionMatch = text.match(/^(Câu\s+\d+:)\s*(.*)/i);
        if (questionMatch) {
          labelPart = questionMatch[1];
          contentPart = questionMatch[2];
          bold = false; // content not bold
        }
      }
    } else {
      // Standard section logic
      const activityMatch = text.match(/^(\d+\.\s+)?(Hoạt động\s+(\d+))(.*)/i);
      const stepMatch = text.match(/^(?:[-•\s]*)([a-d]\)\s*(Mục tiêu|Nội dung|Sản phẩm|Tổ chức thực hiện):)\s*(.*)/i);
      const nlsTitleMatch = text.match(/^(3\.\s+Năng lực số:)\s*(.*)/i);
      const orgStepMatch = text.match(/^(•\s*(?:\*\*)?)(Giao nhiệm vụ học tập|Thực hiện nhiệm vụ|Báo cáo,\s*thảo luận|Kết luận,\s*nhận định)((?:\*\*)?[:.]?)\s*(.*)/i);

      if (activityMatch) {
        bold = true;
        customColor = "0000FF"; // Blue
        // Transform "Hoạt động 1" into "1) Hoạt động 1"
        contentPart = `${activityMatch[3]}) ${activityMatch[2]}${activityMatch[4]}`;
      } else if (/^[IVXLCDM]+\.\s/i.test(text) || /^CÁC PHIẾU HỌC TẬP/i.test(text)) {
        bold = true;
        customColor = "FF0000"; // Red
      } else if (nlsTitleMatch) {
        // specifically handle "3. Năng lực số:" - only bold the title part
        // The content after it should be red and not bold
        labelPart = nlsTitleMatch[1];
        // Only wrap in <nls> if AI hasn't already done so
        const rawContent = nlsTitleMatch[2].trim();
        contentPart = rawContent.startsWith('<nls>') ? rawContent : `<nls>${rawContent}</nls>`;
        bold = false; // content part not bold
      } else if (orgStepMatch) {
        // Handle organizational steps: • **Giao nhiệm vụ học tập:** nội dung
        // Strip asterisks from label
        const cleanLabel = orgStepMatch[2];
        const cleanPunct = orgStepMatch[3].replace(/\*/g, '');
        labelPart = `• ${cleanLabel}${cleanPunct}`;
        contentPart = orgStepMatch[4].replace(/^\*\*/, ''); // strip leading stars if any left
        bold = false;
      } else if (/^\[Tích hợp NLS:/i.test(text)) {
        // Handle standalone NLS note lines
        contentPart = `<nls>${text}</nls>`;
        bold = false;
      } else if (/^\d+\.\s/.test(text) || /^Phiếu học tập số\s+\d+/i.test(text)) {
        bold = true;
        customColor = "0000FF"; // Blue
      } else if (stepMatch) {
        // Bold only the label "a) Mục tiêu:"
        // stepMatch[1] contains the "a) Mục tiêu:" part without leading hyphen
        labelPart = stepMatch[1];
        contentPart = stepMatch[3];
        bold = false; // rest of content is not bold
      } else if (/^\d+\.\d+[:\.]/i.test(text) || 
                 /^[a-d]\)\s/i.test(text) || /^•\s/.test(text) || /^\[Tích hợp NLS:/.test(text) || 
                 /^Năng lực chung:/i.test(text) || /^Năng lực đặc thù:/i.test(text) || 
                 /^Năng lực vận dụng kiến thức, kĩ năng đã học:/i.test(text)) {
        bold = true;
      }
    }

    const parts: Array<TextRun | any> = [];
    
    // Process labelPart if exists (always bold)
    if (labelPart) {
      parts.push(...renderContent(labelPart, true, false, customColor));
      // Add a space if content follows
      if (contentPart) {
        parts.push(new TextRun({ text: " " }));
      }
    }

    const nlsSegments: { text: string; isNLS: boolean }[] = [];
    const nlsRegex = /<nls>(.*?)<\/nls>/g;
    let lastIndex = 0;
    let nlsMatch;

    while ((nlsMatch = nlsRegex.exec(contentPart)) !== null) {
      if (nlsMatch.index > lastIndex) {
        nlsSegments.push({ text: contentPart.substring(lastIndex, nlsMatch.index), isNLS: false });
      }
      nlsSegments.push({ text: nlsMatch[1], isNLS: true });
      lastIndex = nlsRegex.lastIndex;
    }

    if (lastIndex < contentPart.length) {
      nlsSegments.push({ text: contentPart.substring(lastIndex), isNLS: false });
    }

    nlsSegments.forEach(seg => {
      parts.push(...renderContent(seg.text, bold, seg.isNLS, customColor));
    });

    children.push(new Paragraph({
      children: parts,
      heading: heading,
      spacing: { 
        before: heading ? 240 : 0, 
        after: 120,
        line: 288, // 1.2 spacing (240 * 1.2)
        lineRule: "auto"
      },
      alignment: alignment,
    }));
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            size: 26, // 13pt
            font: "Times New Roman",
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1134, // 2cm
            bottom: 1134,
            left: 1701, // 3cm
            right: 1134, // 2cm
          }
        }
      },
      children: children
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}_KHBD_tich_hop_NLS.docx`);
}
