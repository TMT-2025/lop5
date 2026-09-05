/**
 * Formula Engine - Core TypeScript Types (v2 - Simplified and Improved)
 * Designed for multi-domain (Mathematics, Physics, Chemistry, Biology) parsing,
 * representation, and rendering across both HTML Preview and DOCX outputs.
 */

/**
 * Combined Domain and Type classifier representing the primary scientific taxonomy.
 * Replaces the duplication between FormulaDomain and FormulaType, using 'unknown'
 * as a safer, clearer fallback than 'general' for unclassifiable or mixed expressions.
 */
export type FormulaDomain = 'mathematics' | 'physics' | 'chemistry' | 'biology' | 'unknown';

/**
 * Recognized original layouts when normalization is performed.
 */
export type FormulaSourceFormat = 'latex-block' | 'latex-inline' | 'unicode' | 'html-sub-sup' | 'plain-text';

/**
 * Result of the formula source normalization phase.
 */
export interface NormalizedExpression {
  rawInput: string;
  normalizedValue: string;
  sourceFormat: FormulaSourceFormat;
  isSanitized: boolean;
}

/**
 * Token types defined for lexical tokenization.
 */
export type TokenType =
  | 'text'
  | 'number'
  | 'operator'
  | 'subscript-marker'
  | 'superscript-marker'
  | 'left-bracket'
  | 'right-bracket'
  | 'fraction-marker'
  | 'sqrt-marker'
  | 'reaction-arrow'
  | 'chemical-element'
  | 'special-symbol'
  | 'whitespace'
  | 'limit-marker'
  | 'integral-marker'
  | 'summation-marker'
  | 'vector-marker'
  | 'unit-marker'
  | 'overset-marker'
  | 'widehat-marker';

/**
 * Token interface returned by the Tokenizer.
 */
export interface FormulaToken {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

/**
 * Contextual clues supplied to determine domain classification when layout is ambiguous.
 */
export interface ContextHint {
  precedingText?: string;
  succeedingText?: string;
  primarySubject?: string;
  neighborDomains?: FormulaDomain[];
}

/**
 * Structured classifier evaluation returned by the Context Analyzer.
 */
export interface ContextResult {
  resolvedDomain: FormulaDomain;
  confidence: number;
  matchingKeywords: string[];
}

/**
 * Core AST Node Type Identifier.
 * Extented to fully support advanced Math, Physics, Chemistry, and Biology.
 */
export type FormulaNodeType =
  | 'root'
  | 'text'
  | 'number'
  | 'symbol'
  | 'operator'
  | 'subscript'
  | 'superscript'
  | 'sub-sup-pair'
  | 'fraction'
  | 'radical'
  | 'chemical-element'
  | 'reaction'
  | 'genetic-cross'
  | 'matrix'
  | 'integral'
  | 'summation'
  | 'limit'
  | 'equation'
  | 'vector'
  | 'unit'
  | 'ion'
  | 'chemical-group'
  | 'overset'
  | 'unparsed-fallback';

/**
 * Base configuration for every AST tree node.
 */
export interface BaseNode {
  type: FormulaNodeType;
  range?: [number, number];
}

export interface RootNode extends BaseNode {
  type: 'root';
  children: FormulaNode[];
}

export interface TextNode extends BaseNode {
  type: 'text';
  value: string;
}

export interface NumberNode extends BaseNode {
  type: 'number';
  value: string;
}

export interface SymbolNode extends BaseNode {
  type: 'symbol';
  value: string;
}

export interface OperatorNode extends BaseNode {
  type: 'operator';
  value: string;
}

export interface SubscriptNode extends BaseNode {
  type: 'subscript';
  base: FormulaNode;
  subscript: FormulaNode;
}

export interface SuperscriptNode extends BaseNode {
  type: 'superscript';
  base: FormulaNode;
  superscript: FormulaNode;
}

export interface SubSupPairNode extends BaseNode {
  type: 'sub-sup-pair';
  base: FormulaNode;
  subscript: FormulaNode;
  superscript: FormulaNode;
}

export interface FractionNode extends BaseNode {
  type: 'fraction';
  numerator: FormulaNode;
  denominator: FormulaNode;
  isInline: boolean;
}

export interface RadicalNode extends BaseNode {
  type: 'radical';
  radicand: FormulaNode;
  index?: FormulaNode;
}

export interface ChemicalElementNode extends BaseNode {
  type: 'chemical-element';
  symbol: string;
  atomicNumber?: number;
  massNumber?: number;
}

export interface ReactionNode extends BaseNode {
  type: 'reaction';
  reactants: FormulaNode[];
  products: FormulaNode[];
  arrowType: 'one-way' | 'reversible';
  conditions?: FormulaNode[];
}

export interface GeneticCrossNode extends BaseNode {
  type: 'genetic-cross';
  parent1: FormulaNode;
  parent2: FormulaNode;
  crossSymbol: string;
}

export interface MatrixNode extends BaseNode {
  type: 'matrix';
  rows: FormulaNode[][];
}

export interface IntegralNode extends BaseNode {
  type: 'integral';
  lowerLimit?: FormulaNode;
  upperLimit?: FormulaNode;
  integrand: FormulaNode;
}

export interface SummationNode extends BaseNode {
  type: 'summation';
  lowerLimit?: FormulaNode;
  upperLimit?: FormulaNode;
  expression: FormulaNode;
}

export interface LimitNode extends BaseNode {
  type: 'limit';
  variable: FormulaNode;
  target: FormulaNode;
  expression: FormulaNode;
}

export interface EquationNode extends BaseNode {
  type: 'equation';
  left: FormulaNode;
  right: FormulaNode;
  operator: string;
}

export interface VectorNode extends BaseNode {
  type: 'vector';
  symbol: FormulaNode;
  isArrow: boolean;
}

export interface UnitNode extends BaseNode {
  type: 'unit';
  value?: FormulaNode;
  unit: string;
}

export interface IonNode extends BaseNode {
  type: 'ion';
  base: FormulaNode;
  charge: string;
}

export interface ChemicalGroupNode extends BaseNode {
  type: 'chemical-group';
  elements: FormulaNode[];
  coefficient?: number;
  subscript?: number;
}

export interface OversetNode extends BaseNode {
  type: 'overset';
  top: FormulaNode;
  base: FormulaNode;
}

export interface UnparsedFallbackNode extends BaseNode {
  type: 'unparsed-fallback';
  rawValue: string;
  reason: string;
}

/**
 * Discriminated Union type of all valid nodes inside the AST structure.
 */
export type FormulaNode =
  | RootNode
  | TextNode
  | NumberNode
  | SymbolNode
  | OperatorNode
  | SubscriptNode
  | SuperscriptNode
  | SubSupPairNode
  | FractionNode
  | RadicalNode
  | ChemicalElementNode
  | ReactionNode
  | GeneticCrossNode
  | MatrixNode
  | IntegralNode
  | SummationNode
  | LimitNode
  | EquationNode
  | VectorNode
  | UnitNode
  | IonNode
  | ChemicalGroupNode
  | OversetNode
  | UnparsedFallbackNode;

/**
 * Formula Abstract Syntax Tree Root definition.
 * Kept purely focused on syntax representation. Caching metadata is managed
 * completely independently in cache-store wrappers.
 */
export interface FormulaAST {
  root: RootNode;
  domain: FormulaDomain;
}

/**
 * Enumeration of all supported renderer formats.
 */
export type RendererType = 'unicode' | 'html' | 'docx' | 'omml';

/**
 * Simplified and unified options interface to feed render engines.
 */
export interface RenderOptions {
  rendererType: RendererType;
  /** HTML-specific rendering options */
  className?: string;
  elementTag?: 'span' | 'div' | 'code';
  useMathFont?: boolean;
  /** Word/DOCX specific typography configurations */
  font?: string;
  fontSizeHalfPoints?: number;
  bold?: boolean;
  italic?: boolean;
  colorHex?: string;
  /** OMML specific formatting */
  ommlLayout?: 'inline' | 'display';
}

/**
 * Structured details representing a warning or recoverable notice.
 */
export interface ValidationWarning {
  code: string;
  message: string;
  position?: number;
}

/**
 * Structured error details for tracking parse issues.
 */
export interface ErrorDetail {
  message: string;
  code: string;
  position?: number;
  rawInput?: string;
}

/**
 * Custom architectural exception thrown when syntax rules fail during Lexing or Parsing.
 */
export class FormulaParseError extends Error {
  public override readonly name = 'FormulaParseError';
  public readonly code: string;
  public readonly position?: number;
  public readonly rawInput?: string;

  constructor(detail: ErrorDetail) {
    super(detail.message);
    this.code = detail.code;
    this.position = detail.position;
    this.rawInput = detail.rawInput;
    Object.setPrototypeOf(this, FormulaParseError.prototype);
  }
}

/**
 * Custom architectural exception thrown when checking semantic structures or compliance rules.
 */
export class FormulaValidationError extends Error {
  public override readonly name = 'FormulaValidationError';
  public readonly code: string;
  public readonly warnings: ValidationWarning[];

  constructor(message: string, code: string, warnings: ValidationWarning[] = []) {
    super(message);
    this.code = code;
    this.warnings = warnings;
    Object.setPrototypeOf(this, FormulaValidationError.prototype);
  }
}

/**
 * Custom architectural exception thrown when a formula is recognized but uses structures unsupported by the selected renderer.
 */
export class UnsupportedFormulaError extends Error {
  public override readonly name = 'UnsupportedFormulaError';
  public readonly targetRenderer: RendererType;
  public readonly offendingNode?: FormulaNode;

  constructor(message: string, targetRenderer: RendererType, offendingNode?: FormulaNode) {
    super(message);
    this.targetRenderer = targetRenderer;
    this.offendingNode = offendingNode;
    Object.setPrototypeOf(this, UnsupportedFormulaError.prototype);
  }
}
