import { normalize } from "./normalizer";
import { tokenize } from "./tokenizer";
import {
  FormulaAST,
  FormulaNode,
  FormulaDomain,
  RootNode,
  FormulaToken,
  TokenType,
  ChemicalElementNode,
  ReactionNode,
  GeneticCrossNode,
  EquationNode,
  FractionNode,
  OversetNode,
  RadicalNode,
  IntegralNode,
  SummationNode,
  LimitNode,
  MatrixNode,
  VectorNode,
  UnitNode,
  IonNode,
  ChemicalGroupNode
} from "./types";

/**
 * =========================================================================
 * FORMULA ENGINE - ROBUST AST PARSER (v2)
 * =========================================================================
 *
 * Implements SPRINT 6 standard recursive descent parsing for canonical LaTeX
 * and scientific shorthand expressions. Consumes standardized tokens and
 * organizes them into a deep structural AST.
 */

export function parseFormula(rawInput: string): FormulaAST {
  const normalized = normalize(rawInput);
  const allTokens = tokenize(normalized.normalizedValue);
  
  // Filter out whitespace for standard parsing
  const tokens = allTokens.filter(t => t.type !== "whitespace");
  
  let current = 0;
  
  function peek(): FormulaToken | undefined {
    return tokens[current];
  }
  
  function consume(type?: TokenType): FormulaToken {
    const token = tokens[current];
    if (!token) {
      return { type: "text", value: "", start: 0, end: 0 };
    }
    if (type && token.type !== type) {
      // Gentle recovery instead of throwing to prevent application crashes
    }
    current++;
    return token;
  }

  function parseBracketedOrSingle(): FormulaNode {
    const token = peek();
    if (!token) {
      return { type: "text", value: "" } as FormulaNode;
    }

    if (token.type === "left-bracket") {
      const openChar = token.value;
      consume(); // absorb open bracket
      const nodes = parseExpressionList(() => {
        const next = peek();
        return !next || (next.type === "right-bracket" && getClosingBracket(openChar) === next.value);
      });
      if (peek()?.type === "right-bracket") {
        consume(); // absorb close bracket
      }
      if (nodes.length === 1) {
        return nodes[0];
      }
      return {
        type: "root",
        children: nodes
      } as RootNode;
    }

    return parseBaseNode();
  }

  function getClosingBracket(open: string): string {
    if (open === "{") return "}";
    if (open === "(") return ")";
    if (open === "[") return "]";
    return "";
  }

  function parseBaseNode(): FormulaNode {
    const token = peek();
    if (!token) {
      return { type: "text", value: "" } as FormulaNode;
    }

    if (token.type === "overset-marker") {
      consume(); // \overset
      const top = parseBracketedOrSingle();
      const base = parseBracketedOrSingle();
      const overset: OversetNode = {
        type: "overset",
        top,
        base
      };
      return overset;
    }

    if (token.type === "widehat-marker") {
      consume(); // \widehat
      const base = parseBracketedOrSingle();
      const overset: OversetNode = {
        type: "overset",
        top: { type: "symbol", value: "^" },
        base
      };
      return overset;
    }

    if (token.type === "fraction-marker") {
      consume(); // \frac
      const num = parseBracketedOrSingle();
      const den = parseBracketedOrSingle();
      const frac: FractionNode = {
        type: "fraction",
        numerator: num,
        denominator: den,
        isInline: false
      };
      return frac;
    }

    if (token.type === "sqrt-marker") {
      consume(); // \sqrt
      let index: FormulaNode | undefined;
      if (peek()?.type === "left-bracket" && peek()?.value === "[") {
        consume(); // [
        const indexNodes = parseExpressionList(() => peek()?.value === "]");
        if (peek()?.value === "]") consume();
        index = indexNodes.length === 1 ? indexNodes[0] : ({ type: "root", children: indexNodes } as RootNode);
      }
      const radicand = parseBracketedOrSingle();
      const rad: RadicalNode = {
        type: "radical",
        radicand,
        index
      };
      return rad;
    }

    if (token.type === "integral-marker") {
      consume(); // \int
      let lowerLimit: FormulaNode | undefined;
      let upperLimit: FormulaNode | undefined;
      while (current < tokens.length) {
        const next = peek();
        if (next?.type === "subscript-marker") {
          consume();
          lowerLimit = parseBracketedOrSingle();
        } else if (next?.type === "superscript-marker") {
          consume();
          upperLimit = parseBracketedOrSingle();
        } else {
          break;
        }
      }
      // Parse integrand until comparison operator or end
      const integrandNodes = parseExpressionList(() => {
        const next = peek();
        return !next || (next.type === "operator" && (next.value === "=" || next.value === "<" || next.value === ">" || next.value === "≤" || next.value === "≥" || next.value === "→" || next.value === "⇌"));
      });
      const integrand = integrandNodes.length === 1 ? integrandNodes[0] : ({ type: "root", children: integrandNodes } as RootNode);
      const intg: IntegralNode = {
        type: "integral",
        integrand,
        lowerLimit,
        upperLimit
      };
      return intg;
    }

    if (token.type === "summation-marker") {
      consume(); // \sum
      let lowerLimit: FormulaNode | undefined;
      let upperLimit: FormulaNode | undefined;
      while (current < tokens.length) {
        const next = peek();
        if (next?.type === "subscript-marker") {
          consume();
          lowerLimit = parseBracketedOrSingle();
        } else if (next?.type === "superscript-marker") {
          consume();
          upperLimit = parseBracketedOrSingle();
        } else {
          break;
        }
      }
      const exprNodes = parseExpressionList(() => {
        const next = peek();
        return !next || (next.type === "operator" && (next.value === "=" || next.value === "<" || next.value === ">" || next.value === "≤" || next.value === "≥" || next.value === "→" || next.value === "⇌"));
      });
      const expr = exprNodes.length === 1 ? exprNodes[0] : ({ type: "root", children: exprNodes } as RootNode);
      const sum: SummationNode = {
        type: "summation",
        expression: expr,
        lowerLimit,
        upperLimit
      };
      return sum;
    }

    if (token.type === "limit-marker") {
      consume(); // \lim
      let variable: FormulaNode = { type: "text", value: "x" } as FormulaNode;
      let target: FormulaNode = { type: "text", value: "0" } as FormulaNode;
      if (peek()?.type === "subscript-marker") {
        consume();
        // Parse the subscript expression, e.g., {x \to 0}
        const sub = parseBracketedOrSingle();
        if (sub.type === "root") {
          const rootNode = sub as RootNode;
          // Find standard arrow separator
          const toIndex = rootNode.children.findIndex(
            n => n.type === "operator" && (n.value === "→" || n.value === "to" || n.value === "\\to")
          );
          if (toIndex !== -1) {
            const varKids = rootNode.children.slice(0, toIndex);
            const tarKids = rootNode.children.slice(toIndex + 1);
            variable = varKids.length === 1 ? varKids[0] : ({ type: "root", children: varKids } as RootNode);
            target = tarKids.length === 1 ? tarKids[0] : ({ type: "root", children: tarKids } as RootNode);
          } else {
            variable = sub;
          }
        } else {
          variable = sub;
        }
      }
      const exprNodes = parseExpressionList(() => {
        const next = peek();
        return !next || (next.type === "operator" && (next.value === "=" || next.value === "<" || next.value === ">" || next.value === "≤" || next.value === "≥" || next.value === "→" || next.value === "⇌"));
      });
      const expr = exprNodes.length === 1 ? exprNodes[0] : ({ type: "root", children: exprNodes } as RootNode);
      const lim: LimitNode = {
        type: "limit",
        variable,
        target,
        expression: expr
      };
      return lim;
    }

    if (token.type === "unit-marker") {
      consume(); // \unit
      const sub = parseBracketedOrSingle();
      const unit: UnitNode = {
        type: "unit",
        unit: extractTextContent(sub)
      };
      return unit;
    }

    if (token.type === "vector-marker") {
      consume(); // \vec
      const operand = parseBracketedOrSingle();
      const vec: VectorNode = {
        type: "vector",
        symbol: operand,
        isArrow: true
      };
      return vec;
    }

    // Leaf nodes
    consume();
    if (token.type === "chemical-element") {
      const elem: ChemicalElementNode = {
        type: "chemical-element",
        symbol: token.value
      };
      return elem;
    }
    if (token.type === "number") {
      return { type: "number", value: token.value } as FormulaNode;
    }
    if (token.type === "operator") {
      return { type: "operator", value: token.value } as FormulaNode;
    }
    if (token.type === "reaction-arrow") {
      return { type: "operator", value: token.value } as FormulaNode;
    }
    if (token.type === "special-symbol") {
      return { type: "symbol", value: token.value } as FormulaNode;
    }
    return { type: "text", value: token.value } as FormulaNode;
  }

  function parseExpressionList(untilFn?: () => boolean): FormulaNode[] {
    const nodes: FormulaNode[] = [];
    while (current < tokens.length) {
      if (untilFn && untilFn()) {
        break;
      }

      let node = parseBaseNode();

      // Parse subscripts/superscripts immediately following the base node
      while (current < tokens.length) {
        const scriptToken = peek();
        if (!scriptToken) break;

        if (scriptToken.type === "subscript-marker") {
          consume();
          const subNode = parseBracketedOrSingle();
          if (node.type === "superscript") {
            const supNode = node as any;
            node = {
              type: "sub-sup-pair",
              base: supNode.base,
              subscript: subNode,
              superscript: supNode.superscript
            } as FormulaNode;
          } else {
            node = {
              type: "subscript",
              base: node,
              subscript: subNode
            } as FormulaNode;
          }
        } else if (scriptToken.type === "superscript-marker") {
          consume();
          const supNode = parseBracketedOrSingle();
          if (node.type === "subscript") {
            const subNode = node as any;
            node = {
              type: "sub-sup-pair",
              base: subNode.base,
              subscript: subNode.subscript,
              superscript: supNode
            } as FormulaNode;
          } else {
            node = {
              type: "superscript",
              base: node,
              superscript: supNode
            } as FormulaNode;
          }
        } else {
          break;
        }
      }

      nodes.push(node);
    }
    return nodes;
  }

  function extractTextContent(node: FormulaNode): string {
    if (node.type === "text" || node.type === "number" || node.type === "symbol" || node.type === "operator") {
      return (node as any).value;
    }
    if (node.type === "root") {
      return (node as RootNode).children.map(extractTextContent).join("");
    }
    return "";
  }

  // Parse top level expression list
  const expressionNodes = parseExpressionList();

  // Deduce Domain
  let domain: FormulaDomain = "mathematics";
  
  // 1. Is it Chemistry? (Has chemical element, reaction arrow, or typical chemistry patterns)
  const hasChemicalElements = tokens.some(t => t.type === "chemical-element");
  const hasReactionArrow = tokens.some(t => t.type === "reaction-arrow" || t.value === "→" || t.value === "⇌");
  if (hasChemicalElements || hasReactionArrow) {
    domain = "chemistry";
  } else {
    // 2. Is it Biology? (Has parent cross symbols)
    const hasCrossSymbol = tokens.some(t => t.value === "×" || t.value === "x");
    const hasAllelePattern = tokens.some(t => t.type === "text" && /^[A-Z][a-z][A-Z]?[a-z]?$/.test(t.value));
    if (hasCrossSymbol && hasAllelePattern) {
      domain = "biology";
    } else {
      // 3. Is it Physics? (Has unit markers or physical variables)
      const hasUnitMarker = tokens.some(t => t.type === "unit-marker" || t.value === "\\unit");
      if (hasUnitMarker) {
        domain = "physics";
      }
    }
  }

  // Refinement for Chemistry: If domain is chemistry, coalesce chemical formulas into ChemicalGroupNodes
  let finalNodes = expressionNodes;
  if (domain === "chemistry") {
    finalNodes = buildChemicalGroups(expressionNodes);
  }

  // Refinement for Reaction nodes:
  // If there is an arrow symbol, split the top-level nodes into reactant groups and product groups
  const arrowIndex = finalNodes.findIndex(
    n => n.type === "operator" && (((n as any).value === "→" || (n as any).value === "⇌"))
  );
  if (arrowIndex !== -1 && domain === "chemistry") {
    const leftSide = finalNodes.slice(0, arrowIndex);
    const rightSide = finalNodes.slice(arrowIndex + 1);
    const reactantGroups: FormulaNode[] = groupChemicalReactionParts(leftSide);
    const productGroups: FormulaNode[] = groupChemicalReactionParts(rightSide);
    
    const reactionNode: ReactionNode = {
      type: "reaction",
      reactants: reactantGroups,
      products: productGroups,
      arrowType: (finalNodes[arrowIndex] as any).value === "⇌" ? "reversible" : "one-way"
    };
    finalNodes = [reactionNode];
  }

  const resolvedNodes = resolveSlashesInArray(finalNodes);

  return {
    root: {
      type: "root",
      children: resolvedNodes
    },
    domain
  };
}

/**
 * Coalesces consecutive chemical element elements and subscript pairs into ChemicalGroupNodes.
 */
function buildChemicalGroups(nodes: FormulaNode[]): FormulaNode[] {
  const result: FormulaNode[] = [];
  let currentGroup: FormulaNode[] = [];

  function flushGroup() {
    if (currentGroup.length > 0) {
      // Group them as a single ChemicalGroup
      const group: ChemicalGroupNode = {
        type: "chemical-group",
        elements: [...currentGroup]
      };
      result.push(group);
      currentGroup = [];
    }
  }

  for (const node of nodes) {
    if (node.type === "chemical-element" || node.type === "subscript" || node.type === "superscript" || node.type === "sub-sup-pair" || node.type === "overset") {
      currentGroup.push(node);
    } else if (node.type === "operator" && (node as any).value === "+") {
      flushGroup();
      result.push(node);
    } else {
      flushGroup();
      result.push(node);
    }
  }
  flushGroup();
  return result;
}

/**
 * Separates entities by '+' operator inside a half of a chemical reaction equation.
 */
function groupChemicalReactionParts(nodes: FormulaNode[]): FormulaNode[] {
  const parts: FormulaNode[] = [];
  let currentGroup: FormulaNode[] = [];

  function flush() {
    if (currentGroup.length > 0) {
      if (currentGroup.length === 1) {
        parts.push(currentGroup[0]);
      } else {
        parts.push({
          type: "root",
          children: [...currentGroup]
        } as RootNode);
      }
      currentGroup = [];
    }
  }

  for (const node of nodes) {
    if (node.type === "operator" && (node as any).value === "+") {
      flush();
    } else {
      currentGroup.push(node);
    }
  }
  flush();
  return parts;
}

/**
 * Recursively scans and parses inline sashes ('/') as mathematical FractionNodes.
 */
function resolveSlashes(node: FormulaNode): FormulaNode {
  if (!node) return node;

  if (node.type === "root") {
    const root = node as RootNode;
    root.children = resolveSlashesInArray(root.children);
  } else if (node.type === "fraction") {
    const frac = node as FractionNode;
    frac.numerator = resolveSlashes(frac.numerator);
    frac.denominator = resolveSlashes(frac.denominator);
  } else if (node.type === "radical") {
    const rad = node as RadicalNode;
    rad.radicand = resolveSlashes(rad.radicand);
    if (rad.index) rad.index = resolveSlashes(rad.index);
  } else if (node.type === "subscript" || node.type === "superscript") {
    const script = node as any;
    script.base = resolveSlashes(script.base);
    if (script.subscript) script.subscript = resolveSlashes(script.subscript);
    if (script.superscript) script.superscript = resolveSlashes(script.superscript);
  } else if (node.type === "sub-sup-pair") {
    const pair = node as any;
    pair.base = resolveSlashes(pair.base);
    pair.subscript = resolveSlashes(pair.subscript);
    pair.superscript = resolveSlashes(pair.superscript);
  } else if (node.type === "reaction") {
    const rxn = node as any;
    rxn.reactants = resolveSlashesInArray(rxn.reactants);
    rxn.products = resolveSlashesInArray(rxn.products);
  } else if (node.type === "equation") {
    const eq = node as any;
    eq.left = resolveSlashes(eq.left);
    eq.right = resolveSlashes(eq.right);
  } else if (node.type === "limit") {
    const lim = node as any;
    lim.variable = resolveSlashes(lim.variable);
    lim.target = resolveSlashes(lim.target);
    lim.expression = resolveSlashes(lim.expression);
  } else if (node.type === "integral") {
    const intg = node as any;
    intg.integrand = resolveSlashes(intg.integrand);
    if (intg.lowerLimit) intg.lowerLimit = resolveSlashes(intg.lowerLimit);
    if (intg.upperLimit) intg.upperLimit = resolveSlashes(intg.upperLimit);
  } else if (node.type === "summation") {
    const sum = node as any;
    sum.expression = resolveSlashes(sum.expression);
    if (sum.lowerLimit) sum.lowerLimit = resolveSlashes(sum.lowerLimit);
    if (sum.upperLimit) sum.upperLimit = resolveSlashes(sum.upperLimit);
  } else if (node.type === "chemical-group") {
    const cg = node as any;
    cg.elements = resolveSlashesInArray(cg.elements);
  }
  return node;
}

function resolveSlashesInArray(nodes: FormulaNode[]): FormulaNode[] {
  if (!nodes || nodes.length === 0) return [];

  let processed = nodes.map(n => resolveSlashes(n));

  let i = 0;
  while (i < processed.length) {
    const node = processed[i];
    const isSlash = (node.type === "operator" || node.type === "text") && (node as any).value === "/";
    if (isSlash) {
      let numNode: FormulaNode;
      let leftBound = i - 1;
      if (leftBound >= 0 && (processed[leftBound] as any).value === ")") {
        let depth = 0;
        let matchIdx = -1;
        for (let j = leftBound; j >= 0; j--) {
          if ((processed[j] as any).value === ")") depth++;
          if ((processed[j] as any).value === "(") depth--;
          if (depth === 0) {
            matchIdx = j;
            break;
          }
        }
        if (matchIdx !== -1) {
          const inner = processed.slice(matchIdx + 1, leftBound);
          numNode = inner.length === 1 ? inner[0] : ({ type: "root", children: inner } as RootNode);
          leftBound = matchIdx;
        } else {
          numNode = processed[leftBound];
        }
      } else if (leftBound >= 0) {
        numNode = processed[leftBound];
      } else {
        numNode = { type: "text", value: "" };
      }

      let denNode: FormulaNode;
      let rightBound = i + 1;
      if (rightBound < processed.length && (processed[rightBound] as any).value === "(") {
        let depth = 0;
        let matchIdx = -1;
        for (let j = rightBound; j < processed.length; j++) {
          if ((processed[j] as any).value === "(") depth++;
          if ((processed[j] as any).value === ")") depth--;
          if (depth === 0) {
            matchIdx = j;
            break;
          }
        }
        if (matchIdx !== -1) {
          const inner = processed.slice(rightBound + 1, matchIdx);
          denNode = inner.length === 1 ? inner[0] : ({ type: "root", children: inner } as RootNode);
          rightBound = matchIdx + 1;
        } else {
          denNode = processed[rightBound];
          rightBound++;
        }
      } else if (rightBound < processed.length) {
        denNode = processed[rightBound];
        rightBound++;
      } else {
        denNode = { type: "text", value: "" };
      }

      const frac: FractionNode = {
        type: "fraction",
        numerator: numNode,
        denominator: denNode,
        isInline: false
      };

      const prefix = processed.slice(0, Math.max(0, leftBound));
      const suffix = processed.slice(rightBound);
      
      const oldLen = processed.length;
      processed = [...prefix, frac, ...suffix];
      
      if (processed.length >= oldLen && i === prefix.length) {
        i++;
      } else {
        i = prefix.length;
      }
    } else {
      i++;
    }
  }

  return processed;
}
