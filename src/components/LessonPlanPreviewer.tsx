import React, { useState } from 'react';
import { Download, Copy, Check, RotateCcw, FileText, Sparkles, Award, ArrowLeftRight, HelpCircle } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

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

interface LessonPlanPreviewerProps {
  content: string;
  subject: string;
  grade: string;
  lessonName: string;
  periods?: number;
  onDownload: () => void;
  onReset: () => void;
}

export default function LessonPlanPreviewer({
  content,
  subject,
  grade,
  lessonName,
  periods,
  onDownload,
  onReset,
}: LessonPlanPreviewerProps) {
  const [copied, setCopied] = useState(false);

  // Helper to detect chemical subscripts (e.g., H2SO4 -> H₂SO₄, O2 -> O₂, (SO4)3 -> (SO₄)₃, (C2H4)n -> (C₂H₄)ₙ)
  const formatChemicalText = (text: string): string => {
    // Replace element symbols followed by digits or 'n' at a word boundary, or closing brackets/parentheses followed by digits/'n'
    return text.replace(/([A-Z][a-z]?|[\)\]])(\d+|n\b)/g, (match, element, num) => {
      const subscripts: { [key: string]: string } = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
        'n': 'ₙ'
      };
      const subNum = num.split('').map((char: string) => subscripts[char] || char).join('');
      return element + subNum;
    });
  };

  // Helper to detect chemical charges/ions (e.g., SO42- -> SO₄²⁻, Na+ -> Na⁺)
  const formatChemicalCharges = (text: string): string => {
    return text.replace(/([A-Za-z0-9\(\)\[\]]+)(\d*[+-])/g, (match, formula, charge) => {
      const superscripts: { [key: string]: string } = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        '+': '⁺', '-': '⁻'
      };
      const superCharge = charge.split('').map((char: string) => superscripts[char] || char).join('');
      return formula + superCharge;
    });
  };

  // Helper to convert LaTeX math symbols and subscripts/superscripts to Unicode/HTML
  const formatMathSymbols = (text: string): string => {
    let result = text;

    // Convert standard LaTeX oversets: \overset{top}{base} -> stacked layout
    result = result.replace(/\\overset\{([^}]+)\}\{([^}]+)\}/g, '<span class="inline-flex flex-col items-center align-middle mx-0.5"><span class="text-[9px] text-slate-500 font-semibold leading-none mb-0.5">$1</span><span class="text-xs leading-none">$2</span></span>');

    // Convert standard LaTeX widehats: \widehat{base} -> overset layout
    result = result.replace(/\\widehat\{([^}]+)\}/g, '<span class="inline-flex flex-col items-center align-middle mx-0.5"><span class="text-[10px] leading-none -mb-1 font-bold">^</span><span class="border-t-0">$1</span></span>');

    // 1. Convert standard LaTeX fractions: \frac{a}{b} -> built fractions
    result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span class="inline-block text-center align-middle mx-1"><span class="block border-b border-slate-400 text-xs leading-tight px-1 pb-0.5">$1</span><span class="block text-xs leading-tight px-1 pt-0.5">$2</span></span>');

    // 2. Convert standard LaTeX square roots: \sqrt{a} -> √a, \sqrt[n]{a} -> <sup>n</sup>√a
    result = result.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '<sup>$1</sup>√<span class="border-t border-slate-600 px-0.5">$2</span>');
    result = result.replace(/\\sqrt\{([^}]+)\}/g, '√<span class="border-t border-slate-600 px-0.5">$1</span>');

    // 3. Define common LaTeX math commands and their Unicode equivalents
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
      '\\choose': 'C',
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

    // Convert LaTeX math symbols
    Object.keys(symbolMap).forEach(key => {
      // Escape the backslash for RegExp matching
      const escapedKey = key.replace(/\\/g, '\\\\');
      const regex = new RegExp(escapedKey + '(?![a-zA-Z])', 'g'); // Ensure we don't match partial words
      result = result.replace(regex, symbolMap[key]);
    });

    // 4. Convert subscript and superscript notation to HTML tags
    // Subscripts: _{...}, _(...) or _x where x is a letter/number
    result = result.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
    result = result.replace(/_\(([^)]+)\)/g, '<sub>$1</sub>');
    
    // Convert subscripts like P1, M1, P_alpha but make sure not to break words
    result = result.replace(/([a-zA-Zα-ωΔΩΣ′])_([a-zA-Z0-9α-ωΔΩΣ])/g, '$1<sub>$2</sub>');

    // Superscripts: ^{...}, ^(...) or ^x where x is a letter/number
    result = result.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');
    result = result.replace(/\^\(([^)]+)\)/g, '<sup>$1</sup>');
    result = result.replace(/([a-zA-Zα-ωΔΩΣ′])\^([a-zA-Z0-9α-ωΔΩΣ])/g, '$1<sup>$2</sup>');

    // Remove remaining backslashes that might be left before single characters (e.g. \', \`, etc) or clean up double spaces
    result = result.replace(/\\(['`^"~])/g, '$1');

    return result;
  };

  // Helper to parse line text with formatting tags (*bold*, <nls>, <correct>, $)
  const parseLineText = (text: string) => {
    // Split by $ to detect inline math segments.
    // Every odd index in the split array (1, 3, 5...) is inline math.
    const parts = text.split('$');
    
    const renderedElements = parts.map((part, index) => {
      const isMath = index % 2 === 1;
      
      if (isMath) {
        try {
          const renderedMath = katex.renderToString(part, {
            displayMode: false,
            throwOnError: false
          });
          return <span key={index} dangerouslySetInnerHTML={{ __html: renderedMath }} />;
        } catch (e) {
          return <code key={index} className="font-mono bg-indigo-50 text-indigo-700 px-1 rounded">{part}</code>;
        }
      } else {
        // Normal text segment - format text formatting tags, chemical subscripts/charges
        let html = part;

        // Clean up \backslash and arrow in plain text
        html = html.replace(/\\backslash\s*\\?/g, '\\');
        html = html.replace(/\\?arrow\b|\\text\{arrow\}/gi, ' ➔ ');
        // Clean up degree symbols
        html = html.replace(/\^{\s*\\circ\s*}/g, '°')
                   .replace(/\^\s*\\circ(?![a-zA-Z])/g, '°')
                   .replace(/\\circ(?![a-zA-Z])/g, '°');
        // Normalize precipitate (\down) and gas (\up) symbols
        html = html.replace(/\\down\b/g, '↓')
                   .replace(/\\up\b/g, '↑');
        // Normalize average/mean values \bar{x} or \bar x to x̄ (combining macron)
        html = html.replace(/\\bar\s*\{\s*([a-zA-Z])\s*\}/g, '$1\u0304')
                   .replace(/\\bar\s*([a-zA-Z])/g, '$1\u0304');
        html = html.replace(/\\?right\s*(➔|→|⟶|\\rightarrow|\\to|\\Rightarrow|\\leftarrow|\\leftrightarrow|⇒|←|↔)/gi, '$1');

        // Replace \xrightarrow{cond} with styled HTML arrow block
        html = html.replace(/\\xrightarrow\{([^}]+)\}/g, '<span class="inline-flex flex-col items-center align-middle mx-1.5"><span class="text-[9px] font-semibold text-slate-500 leading-none pb-0.5">$1</span><span class="text-slate-500 leading-none -mt-1 font-sans">⟶</span></span>');

        // Convert **bold** to strong
        html = html.replace(/\*\?(.*?)\*\?/g, '<strong class="font-bold text-slate-900">$1</strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
        
        // Convert *italic* to em
        html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

        // Format LaTeX math symbols fallback (only for standalone text like \alpha if any)
        html = formatMathSymbols(html);

        // Format chemical formulas
        html = formatChemicalCharges(html);
        html = formatChemicalText(html);

        // Format arrows
        html = html.replace(/-->/g, ' ➔ ').replace(/->/g, ' ➔ ');

        // Match tags and replace with formatted HTML
        // 1. <nls> tag for digital competence / AI
        const nlsRegex = /<nls>(.*?)<\/nls>/gi;
        html = html.replace(nlsRegex, '<span class="bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded font-medium inline-block my-0.5 shadow-sm" title="💡 Tích hợp Năng lực số & Giáo dục AI">$1</span>');

        // 2. <correct> tag for multiple-choice answers
        const correctRegex = /<correct>(.*?)<\/correct>/gi;
        html = html.replace(correctRegex, '<span class="bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 my-0.5 shadow-sm">✓ $1 <span class="text-[9px] uppercase tracking-wider bg-emerald-600 text-white px-1 rounded ml-1 font-semibold">Đáp án</span></span>');

        return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
      }
    });

    return <span className="inline">{renderedElements}</span>;
  };

  // Counting metrics
  const wordCount = content.split(/\s+/).length;
  const nlsCount = (content.match(/<nls>/g) || []).length;
  const correctCount = (content.match(/<correct>/g) || []).length;

  // Process markdown block-by-block and line-by-line
  const parseBlocks = () => {
    const cleanContentForParsing = content
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
    const lines = cleanContentForParsing.split('\n');
    const elements: React.ReactNode[] = [];
    let currentTable: string[] = [];
    let started = false;

    const handleFlushTable = (keyIndex: number) => {
      if (!started || currentTable.length === 0) return;
      const tableRows = currentTable.slice();
      currentTable = [];
      
      // Filter out separator rows like |---|---|
      const cleanRows = tableRows.filter(line => !/^\|?[:\s-]*(\|[:\s-]*)*\|?$/.test(line.replace(/\|/g, '-')));
      if (cleanRows.length === 0) return;

      elements.push(
        <div key={`table-${keyIndex}`} className="my-6 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <tbody className="divide-y divide-slate-200 bg-white">
              {cleanRows.map((rowStr, rIdx) => {
                const maskedRowStr = maskMathPipes(rowStr);
                const cells = maskedRowStr
                  .split(/(?<!\\)\|/)
                  .map(c => c.trim())
                  .filter((c, i, arr) => {
                    if (i === 0 && c === "" && arr.length > 1) return false;
                    if (i === arr.length - 1 && c === "" && arr.length > 1) return false;
                    return true;
                  })
                  .map(cell => cell.replace(/@@PIPE@@/g, '|'));
                
                const isHeader = rIdx === 0;
                const isTeacherStudentTable = cleanRows.length > 0 && /giáo\s*viên|học\s*sinh/i.test(cleanRows[0]);
                return (
                  <tr key={`tr-${rIdx}`} className={isHeader ? "bg-slate-50 font-semibold" : "hover:bg-slate-50/50"}>
                    {cells.map((cellText, cIdx) => {
                      const Tag = isHeader ? 'th' : 'td';
                      
                      // Split by <br> or fallback to lookbehind period split for the second column (Nội dung)
                      let cellLines: string[] = [];
                      if (/<br\s*\/?>/gi.test(cellText)) {
                        cellLines = cellText.split(/<br\s*\/?>/gi);
                      } else if (cIdx === 1 && !isHeader && !isTeacherStudentTable) {
                        cellLines = cellText.split(/(?<=\.)\s+/);
                      } else {
                        cellLines = [cellText];
                      }

                      let colWidth = undefined;
                      if (cells.length === 2) {
                        colWidth = isTeacherStudentTable ? '50%' : (cIdx === 0 ? '25%' : '75%');
                      }

                      return (
                        <Tag 
                          key={`td-${cIdx}`} 
                          className={`px-4 py-3 text-left text-xs ${isHeader ? "text-slate-700 font-bold tracking-wider" : "text-slate-600 font-serif"}`}
                          style={colWidth ? { width: colWidth } : undefined}
                        >
                          {cellLines.map((line, lIdx) => (
                            <div key={lIdx} className={lIdx > 0 ? "mt-2" : ""}>
                              {parseLineText(line)}
                            </div>
                          ))}
                        </Tag>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Check for table line
      if (trimmedLine.startsWith('|')) {
        currentTable.push(trimmedLine);
        return;
      } else {
        handleFlushTable(index);
      }

      if (trimmedLine === '') {
        if (started) {
          elements.push(<div key={`empty-${index}`} className="h-3" />);
        }
        return;
      }

      // Only start once we see "I. YÊU CẦU CẦN ĐẠT" or "I. MỤC TIÊU"
      if (!started) {
        if (trimmedLine.toUpperCase().includes("I. YÊU CẦU CẦN ĐẠT") || trimmedLine.toUpperCase().includes("I. MỤC TIÊU")) {
          started = true;
        } else {
          return;
        }
      }

      // 1. Math Block Formula ($$...$$)
      if (trimmedLine.startsWith('$$') && trimmedLine.endsWith('$$')) {
        const formula = trimmedLine.substring(2, trimmedLine.length - 2);
        let blockHtml = "";
        try {
          blockHtml = katex.renderToString(formula, {
            displayMode: true,
            throwOnError: false
          });
        } catch (e) {
          blockHtml = formula;
        }
        elements.push(
          <div key={`mathblk-${index}`} className="my-4 p-4 rounded-xl bg-indigo-50/30 border border-indigo-100 text-center text-indigo-800 shadow-inner overflow-x-auto">
            <div className="text-base font-semibold" dangerouslySetInnerHTML={{ __html: blockHtml }} />
            <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Công thức toán (LaTeX)</div>
          </div>
        );
        return;
      }

      // 2. Headings (I., II., III., IV., V., etc. or #, ##, ###)
      const isRomanHeading = /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+(.*)/i.test(trimmedLine);
      const isMarkdownHeading = trimmedLine.startsWith('#');
      
      if (isRomanHeading || isMarkdownHeading) {
        let text = trimmedLine;
        let fontClass = "text-lg md:text-xl text-red-700 font-bold tracking-wide mt-8 mb-4 border-b pb-2 border-red-100 uppercase";
        
        if (isMarkdownHeading) {
          const level = trimmedLine.match(/^#+/)?.[0].length || 1;
          text = trimmedLine.replace(/^#+\s*/, '');
          if (level === 1) fontClass = "text-xl md:text-2xl text-red-700 font-extrabold mt-10 mb-6 border-b pb-2 border-red-200 uppercase";
          else if (level === 2) fontClass = "text-lg md:text-xl text-sky-700 font-bold mt-8 mb-4 uppercase";
          else fontClass = "text-base text-slate-800 font-bold mt-6 mb-3";
        }

        elements.push(
          <h2 key={`h-${index}`} className={fontClass}>
            {parseLineText(text)}
          </h2>
        );
        return;
      }

      // 3. Activity / Task Headings ("1) Hoạt động 1", "a) Mục tiêu:")
      const isActivityHeading = /^(\d+[\).]\s+)?Hoạt\s+động\s+\d+/gi.test(trimmedLine);
      const isStepHeading = /^[a-d][\).]\s+(Mục tiêu|Nội dung|Sản phẩm|Tổ chức thực hiện)/gi.test(trimmedLine);
      const isLessonHeading = /^\*\*TIẾT\s+\d+:?/gi.test(trimmedLine);

      if (isLessonHeading) {
        elements.push(
          <div key={`lesson-${index}`} className="my-8 text-center bg-slate-900 text-white py-3 px-6 rounded-xl font-bold tracking-wider text-base shadow-md uppercase">
            {parseLineText(trimmedLine.replace(/\*\*/g, ''))}
          </div>
        );
        return;
      }

      if (isActivityHeading) {
        elements.push(
          <h3 key={`act-${index}`} className="text-base md:text-lg text-sky-700 font-extrabold mt-6 mb-3 flex items-center gap-2 bg-sky-50/50 py-2 px-4 rounded-xl border border-sky-100">
            <Sparkles className="w-5 h-5 text-sky-600 shrink-0" />
            {parseLineText(trimmedLine)}
          </h3>
        );
        return;
      }

      if (isStepHeading) {
        elements.push(
          <h4 key={`step-${index}`} className="text-sm md:text-base text-slate-800 font-bold mt-4 mb-2 pl-2 border-l-4 border-sky-500">
            {parseLineText(trimmedLine)}
          </h4>
        );
        return;
      }

      // 4. Standard list item or paragraph
      const isListItem = trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || /^\d+\./.test(trimmedLine);
      if (isListItem) {
        elements.push(
          <div key={`list-${index}`} className="pl-6 md:pl-8 py-1 font-serif text-slate-700 text-sm leading-relaxed relative">
            <span className="absolute left-1 md:left-2 top-2 w-1.5 h-1.5 rounded-full bg-slate-400" />
            {parseLineText(trimmedLine.replace(/^[-*]\s*/, ''))}
          </div>
        );
      } else {
        elements.push(
          <p key={`p-${index}`} className="py-2 pl-2 font-serif text-slate-700 text-sm leading-relaxed">
            {parseLineText(trimmedLine)}
          </p>
        );
      }
    });

    // Make sure to flush any trailing table
    handleFlushTable(lines.length);

    return elements;
  };

  const handleCopyText = () => {
    // Clean tags for clean text copy
    const cleanText = content
      .replace(/<nls>/gi, '')
      .replace(/<\/nls>/gi, '')
      .replace(/<correct>/gi, '')
      .replace(/<\/correct>/gi, '')
      .replace(/\*\*/g, '');

    navigator.clipboard.writeText(cleanText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div id="lesson-plan-preview-container" className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-lg animate-in fade-in zoom-in duration-300">
      
      {/* Top Banner Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-green-200">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Kiểm Tra Giáo Án Tích Hợp
            </h3>
            <p className="text-xs text-slate-500">
              Môn {subject} — Khối {grade} — {wordCount} từ
            </p>
          </div>
        </div>

        {/* Info stats */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs px-2.5 py-1 rounded-lg font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            {nlsCount} Điểm tích tích hợp AI/NLS
          </div>
          {correctCount > 0 && (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-2.5 py-1 rounded-lg font-semibold">
              <Award className="w-3.5 h-3.5 text-emerald-500" />
              {correctCount} Đáp án luyện tập
            </div>
          )}
        </div>
      </div>

      {/* Main Preview Workspace */}
      <div className="flex-grow p-4 md:p-8 overflow-y-auto bg-slate-100 shadow-inner max-h-[600px] min-h-[400px]">
        <div className="mx-auto max-w-4xl bg-white p-8 md:p-12 rounded-2xl shadow-md border border-slate-200 font-serif">
          {/* Paper watermark effect header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-6">
            <div className="flex justify-between text-xs text-slate-500 uppercase tracking-widest font-semibold font-sans">
              <span>Học liệu số & Thiết kế AI Tiểu học</span>
              <span>CV 2345, TT 32/2018, QĐ 2422 & CV 5588</span>
            </div>
          </div>

          {/* School and Teacher block */}
          <div className="grid grid-cols-2 gap-4 text-xs font-sans text-slate-600 mb-8 pb-4 border-b border-dashed border-slate-200">
            <div>
              <p className="font-semibold text-slate-700">TRƯỜNG TIỂU HỌC: ...........................</p>
              <p className="font-semibold text-slate-700 mt-1">TỔ CHUYÊN MÔN: KHỐI 5</p>
            </div>
            <div className="text-center flex flex-col items-center justify-center">
              <p className="text-slate-500">Họ và tên giáo viên:</p>
              <p className="font-semibold text-slate-700 mt-1">..........................................</p>
            </div>
          </div>

          {/* Document Header (Centred, Bold, similar to image) */}
          {(() => {
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

            return (
              <div className="text-center space-y-1 mb-10 font-sans">
                <h1 className="text-base md:text-lg font-bold tracking-wider text-slate-900 leading-tight uppercase">KẾ HOẠCH BÀI DẠY</h1>
                <h2 className="text-sm md:text-base font-bold text-slate-800 leading-snug uppercase">TÊN BÀI DẠY: {lessonName.toUpperCase()}</h2>
                {periodsStr && (
                  <p className="text-sm md:text-base font-bold text-slate-800 leading-normal">{periodsStr}</p>
                )}
              </div>
            );
          })()}
          
          {/* Main Parsed Content */}
          <div className="space-y-1">
            {parseBlocks()}
          </div>
        </div>
      </div>

      {/* Bottom Control Actions */}
      <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <button
          onClick={onReset}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-prof-blue-primary hover:bg-prof-blue-dark text-white font-bold text-sm px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md"
        >
          <RotateCcw className="w-4 h-4" />
          Tạo tiếp KHBD
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleCopyText}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                Đã sao chép!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Sao chép văn bản
              </>
            )}
          </button>
          
          <button
            onClick={onDownload}
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-md shadow-green-100 transition-all cursor-pointer"
          >
            <Download className="w-5 h-5 text-green-100 animate-bounce" />
            Tải về File Word DOCX
          </button>
        </div>
      </div>

    </div>
  );
}
