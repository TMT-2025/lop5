import {
  Document,
  Paragraph,
  TextRun,
  Math,
  MathRun,
  MathFraction,
  MathSubScript,
  MathSuperScript,
  MathSubSuperScript,
  MathRadical,
  MathSum,
  MathIntegral,
  MathRoundBrackets,
  MathSquareBrackets
} from "docx";

/**
 * =========================================================================
 * FORMULA ENGINE - MS WORD (DOCX) RENDERING PROOF OF CONCEPT (v2)
 * =========================================================================
 *
 * This file serves *strictly* as a Proof of Concept (POC) to analyze, document,
 * and validate rendering strategies for Microsoft Word utilizing the `docx`
 * library (v9.6.1) without modifying the main application rendering path.
 *
 * -------------------------------------------------------------------------
 * CORE ARCHITECTURAL INSIGHT: THE MATH ITALICIZATION PROBLEM (IUPAC STYLE)
 * -------------------------------------------------------------------------
 * Under Microsoft Word's Equation Editor engine (OMML / <m:oMath>), any raw
 * letter nodes parsed as variables are automatically italicized by default
 * (e.g., "H_2O" renders as "$H_{2}O$").
 *
 * While this default makes mathematical variables (like "x", "y", "a") look
 * correct, it directly violates IUPAC Chemistry/Biology standards, which mandate
 * that chemical elements, molecular compounds, and atomic charges MUST remain in
 * an upright (Roman) typeface (e.g., "H₂O", "SO₄²⁻").
 *
 * Therefore, optimal rendering requires a domain-aware hybrid execution:
 * 1. Chemistry (and certain Physics/Biology structures) -> High-density TextRuns with
 *    subscript/superscript toggles or pure Unicode, preserving upright lettering.
 * 2. Pure Mathematics (integrals, fractions, radicals) -> Formal Office Math (OMML) wrappers.
 */

// =========================================================================
// STRATEGY DOCUMENTATION FOR SPRINT 4 EXAMPLES
// =========================================================================

/**
 * EXAMPLE 1: H₂SO₄ (Sulfuric Acid)
 * Recommended Strategy: TextRun (with subScript: true) or Unicode.
 *
 * Why:
 * Using Office Math (OMML) would italicize 'H', 'S', and 'O' into variables (H, S, O),
 * which is chemically incorrect. Word's equation style does not support convenient Inline
 * upright formatting without complex style overrides.
 * Splitting the text into regular `TextRun`s and toggling `subScript: true` or utilizing
 * direct Unicode characters (H₂SO₄) produces perfect, accessible, upright chemical formulas.
 */
export function exampleH2SO4TextRuns(): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: "H", bold: true }),
      new TextRun({ text: "2", subScript: true }),
      new TextRun({ text: "S", bold: true }),
      new TextRun({ text: "O", bold: true }),
      new TextRun({ text: "4", subScript: true })
    ]
  });
}

/**
 * EXAMPLE 2: SO₄²⁻ (Sulfate Ion)
 * Recommended Strategy: TextRun (using script nesting helper) or Unicode.
 *
 * Why:
 * This requires adjacent subscripts and superscripts ("4" and "2-").
 * - If using Office Math (OMML), we could use `MathSubSuperScript` but the elements are italicized.
 * - If using normal TextRuns, we must handle subscripts and superscripts sequentially
 *   (e.g., "SO", then subscript "4", then superscript "2-"). This is highly legible,
 *   keeps elements upright, and preserves standard font features.
 */
export function exampleSO42MinusTextRuns(): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: "SO", bold: true }),
      new TextRun({ text: "4", subScript: true }),
      new TextRun({ text: "2-", superScript: true })
    ]
  });
}

/**
 * EXAMPLE 3: x² (Square of x)
 * Recommended Strategy: Office Math (OMML - MathSuperScript).
 *
 * Why:
 * This is a standard math expression where italicized variables are desired.
 * Using formal `MathSuperScript` tells Microsoft Word that this is a mathematical
 * construct, enabling high-quality math kerning and integration with Word's built-in
 * equation editor tooltips.
 */
export function exampleXSquaredMath(): Paragraph {
  return new Paragraph({
    children: [
      new Math({
        children: [
          new MathSuperScript({
            children: [new MathRun("x")],
            superScript: [new MathRun("2")]
          })
        ]
      })
    ]
  });
}

/**
 * EXAMPLE 4: x₁ (x subscript 1)
 * Recommended Strategy: Office Math (OMML - MathSubScript).
 *
 * Why:
 * Similar to x², this is structured mathematical notation. Representing it with
 * `MathSubScript` is correct, as it formats variables beautifully and lets users edit it
 * natively as a subscripts structure inside Word's Equation Editor.
 */
export function exampleX1Math(): Paragraph {
  return new Paragraph({
    children: [
      new Math({
        children: [
          new MathSubScript({
            children: [new MathRun("x")],
            subScript: [new MathRun("1")]
          })
        ]
      })
    ]
  });
}

/**
 * EXAMPLE 5: √x (Square Root of x)
 * Recommended Strategy: Office Math (OMML - MathRadical).
 *
 * Why:
 * Standard Unicode radical characters (√x) do not extend a horizontal bar over
 * the radicand operand in primitive text contexts.
 * Using `MathRadical` produces the full algebraic radical grouping bracket in Word.
 */
export function exampleSqrtXMath(): Paragraph {
  return new Paragraph({
    children: [
      new Math({
        children: [
          new MathRadical({
            children: [new MathRun("x")]
          })
        ]
      })
    ]
  });
}

/**
 * EXAMPLE 6: Fraction (numerator over denominator)
 * Recommended Strategy: Office Math (OMML - MathFraction).
 *
 * Why:
 * Rendering tall vertical fractions is impossible with plain inline TextRuns (like "a/b"),
 * which look amateurish.
 * Using `MathFraction` activates the elegant, stacked design of fractions in Word with proper font sizing.
 */
export function exampleFractionMath(): Paragraph {
  return new Paragraph({
    children: [
      new Math({
        children: [
          new MathFraction({
            numerator: [new MathRun("a")],
            denominator: [new MathRun("b")]
          })
        ]
      })
    ]
  });
}

/**
 * EXAMPLE 7: Matrix (Grid representation)
 * Recommended Strategy: Raw XML Injection or Table Block layout (NOT natively supported by docx model).
 *
 * Why DOCX Cannot Render it Natively:
 * The `docx` npm package lacks a `MathMatrix` or `MathGrid` model class corresponding to the OMML
 * matrix element `<m:m>`.
 *
 * Fallback Methods:
 * A) Simple plain-text unicode brackets (e.g., "[ x  y ]") with manual spacing.
 * B) Raw XML Injection using custom `XmlComponent` elements mimicking Word's OMML structure:
 *    <m:m>
 *      <m:mr>  <!-- row -->
 *        <m:e> <!-- element -->
 *          <m:r><m:t>1</m:t></m:r>
 *        </m:e>
 *      </m:mr>
 *    </m:m>
 * C) Table with bracket borders (non-inline, clumsy).
 * For this POC, we can demonstrate the fallback using unicode representations and detail the exact lack of native classes.
 */
export function exampleMatrixPOC(): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: "[ a  b ]",
        font: "Consolas",
        color: "444444"
      }),
      new TextRun({
        text: " (Matrix is not natively supported by the standard docx library API; requires raw XML injection of <m:m> elements for full compliance)",
        italics: true,
        color: "777777"
      })
    ]
  });
}

/**
 * EXAMPLE 8: Integral (∫ x dx)
 * Recommended Strategy: Office Math (OMML - MathIntegral).
 *
 * Why:
 * Integrals require a large mathematical glyph (∫) along with upper/lower bounds.
 * `MathIntegral` provides native control over these boundaries and automatically adjusts
 * heights to match the integrand content.
 */
export function exampleIntegralMath(): Paragraph {
  return new Paragraph({
    children: [
      new Math({
        children: [
          new MathIntegral({
            children: [new MathRun("x"), new MathRun("dx")],
            subScript: [new MathRun("0")],
            superScript: [new MathRun("∞")]
          })
        ]
      })
    ]
  });
}

/**
 * EXAMPLE 9: Summation (∑ i)
 * Recommended Strategy: Office Math (OMML - MathSum).
 *
 * Why:
 * Summation equations require the capital sigma (∑) accompanied by limits above and below.
 * `MathSum` automatically centers limits below and above the operator for clean display math.
 */
export function exampleSummationMath(): Paragraph {
  return new Paragraph({
    children: [
      new Math({
        children: [
          new MathSum({
            children: [new MathRun("i")],
            subScript: [new MathRun("i=1")],
            superScript: [new MathRun("n")]
          })
        ]
      })
    ]
  });
}

/**
 * EXAMPLE 10: Chemical reaction (2H₂ + O₂ → 2H₂O)
 * Recommended Strategy: TextRun (with reaction arrow and subscripts) or Unicode.
 *
 * Why:
 * Combining upright molecules with a horizontal reaction arrow is best executed
 * using text runs. This prevents elements from being italicized under the LaTeX layout
 * rules, and maintains balanced visual margins around the special character "→".
 */
export function exampleChemicalReactionTextRuns(): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: "2H", bold: true }),
      new TextRun({ text: "2", subScript: true }),
      new TextRun({ text: " + O", bold: true }),
      new TextRun({ text: "2", subScript: true }),
      new TextRun({ text: " → 2H", bold: true }),
      new TextRun({ text: "2", subScript: true }),
      new TextRun({ text: "O", bold: true })
    ]
  });
}

// =========================================================================
// POC DIAGNOSTICS GENERATOR
// =========================================================================

/**
 * Construct a diagnostic document containing all 10 examples mapped to their ideal structures.
 * This guarantees compilation compatibility with SPRINT 4 standards.
 */
export function buildDiagnosticPOCDocument(): Document {
  return new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ text: "=== SPRINT 4: FORMULA ENGINE RENDERING CHALLENGES ===" }),
          exampleH2SO4TextRuns(),
          exampleSO42MinusTextRuns(),
          exampleXSquaredMath(),
          exampleX1Math(),
          exampleSqrtXMath(),
          exampleFractionMath(),
          exampleMatrixPOC(),
          exampleIntegralMath(),
          exampleSummationMath(),
          exampleChemicalReactionTextRuns()
        ]
      }
    ]
  });
}
