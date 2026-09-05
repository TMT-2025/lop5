import {
  Math,
  MathRun,
  MathFraction,
  MathSubScript,
  MathSuperScript,
  MathSubSuperScript,
  MathRadical,
  MathSum,
  MathIntegral,
  MathLimitLower,
  MathLimitUpper,
  TextRun,
  IRunOptions,
  MathComponent
} from "docx";
import {
  FormulaAST,
  FormulaNode,
  RootNode,
  RenderOptions,
  UnitNode,
  ChemicalElementNode,
  ChemicalGroupNode,
  IonNode,
  ReactionNode,
  EquationNode,
  GeneticCrossNode,
  FractionNode,
  OversetNode,
  RadicalNode,
  IntegralNode,
  SummationNode,
  LimitNode,
  MatrixNode,
  VectorNode
} from "./types";

/**
 * =========================================================================
 * FORMULA ENGINE - MS WORD (DOCX) PRODUCTION HYBRID RENDERER (v2)
 * =========================================================================
 *
 * Implements SPRINT 5: Converts the parsed Formula AST into high-quality Word
 * structures, adhering to strict layout and scientific standards.
 *
 * 🧪 SCIENTIFIC DESIGN COMPLIANCE
 * 1. Chemistry (formulas, ions, equations, oxidation states):
 *    Chemistry elements MUST render in upright (Roman) typeface. Word's standard
 *    Equation Editor automatically italicizes letters as variables (e.g. H_2O renders
 *    as italicized $H_{2}O$), which violates IUPAC chemistry standards.
 *    To ensure complete fidelity, we render chemistry using sequential standard
 *    `TextRun` segments with exact `subScript` or `superScript` formatting toggles.
 *
 * 🧮 MATHEMATICS (fractions, roots, power scripts, summations, integrals, etc.):
 *    Mathematics uses formal Office Math (OMML) wrappers (`Math`, `MathRun`,
 *    `MathFraction`, etc.) allowing beautiful kerning alignments and native Word equation editing.
 *
 * 🧭 PHYSICS:
 *    Physics mixes both models: mathematical expressions are rendered using OMML,
 *    and physical units (e.g., m/s², N) are split out and rendered as upright `TextRun`s.
 *
 * 🧬 BIOLOGY:
 *    Biology utilizes upright `TextRun`s for cross-pair symbols and standard notations
 *    unless formal equations or fractions require math blocks.
 */

/**
 * Utility: Converts RenderOptions into standard docx IRunOptions attributes
 * for consistent font sizing, bold, italic, and color styling.
 */
function mapOptions(options?: RenderOptions, extraOverrides?: Partial<IRunOptions>): IRunOptions {
  const result: any = {};
  if (options) {
    if (options.bold !== undefined) {
      result.bold = options.bold;
    }
    if (options.italic !== undefined) {
      result.italics = options.italic; // docx employs 'italics' (plural) for TextRuns
    }
    if (options.font !== undefined) {
      result.font = options.font;
    }
    if (options.fontSizeHalfPoints !== undefined) {
      result.size = options.fontSizeHalfPoints;
    }
    if (options.colorHex !== undefined) {
      result.color = options.colorHex;
    }
  }
  if (extraOverrides) {
    Object.assign(result, extraOverrides);
  }
  return result as IRunOptions;
}

/**
 * Helper: Analyzes whether an AST subtree contains any mathematical operator
 * or structural Node types requiring formal OMML layouts.
 */
function hasMathematicalNodes(node: FormulaNode): boolean {
  if (
    node.type === "fraction" ||
    node.type === "radical" ||
    node.type === "integral" ||
    node.type === "summation" ||
    node.type === "limit" ||
    node.type === "matrix" ||
    node.type === "overset"
  ) {
    return true;
  }

  if (node.type === "root") {
    const root = node as RootNode;
    return root.children.some(hasMathematicalNodes);
  }
  if (node.type === "subscript" || node.type === "superscript") {
    const subscriptOpt = node as { base: FormulaNode; subscript?: FormulaNode; superscript?: FormulaNode };
    if (hasMathematicalNodes(subscriptOpt.base)) return true;
    if (subscriptOpt.subscript && hasMathematicalNodes(subscriptOpt.subscript)) return true;
    if (subscriptOpt.superscript && hasMathematicalNodes(subscriptOpt.superscript)) return true;
  }
  if (node.type === "sub-sup-pair") {
    const subSup = node as { base: FormulaNode; subscript: FormulaNode; superscript: FormulaNode };
    return (
      hasMathematicalNodes(subSup.base) ||
      hasMathematicalNodes(subSup.subscript) ||
      hasMathematicalNodes(subSup.superscript)
    );
  }
  if (node.type === "reaction") {
    const reaction = node as ReactionNode;
    return (
      reaction.reactants.some(hasMathematicalNodes) ||
      reaction.products.some(hasMathematicalNodes)
    );
  }
  if (node.type === "chemical-group") {
    const chemGroup = node as ChemicalGroupNode;
    return chemGroup.elements.some(hasMathematicalNodes);
  }
  if (node.type === "equation") {
    const eq = node as EquationNode;
    return hasMathematicalNodes(eq.left) || hasMathematicalNodes(eq.right);
  }
  if (node.type === "genetic-cross") {
    const cross = node as GeneticCrossNode;
    return hasMathematicalNodes(cross.parent1) || hasMathematicalNodes(cross.parent2);
  }

  return false;
}

/**
 * Helper to recursively extract only raw text contents from AST subtrees
 * (e.g. for creating unified TextRun names or unit names).
 */
function getSymbolText(node: FormulaNode): string {
  if (!node) return "";
  if (node.type === "symbol" || node.type === "text" || node.type === "number" || node.type === "operator") {
    return (node as any).value || "";
  }
  if (node.type === "root") {
    return (node as RootNode).children.map(getSymbolText).join("");
  }
  if (node.type === "chemical-element") {
    return (node as ChemicalElementNode).symbol || "";
  }
  return "";
}

/**
 * -------------------------------------------------------------------------
 * RENDERER 1: HIGH-FIDELITY TEXTRUN CONVERTER (Chemistry & Biology Focus)
 * -------------------------------------------------------------------------
 * Recursively parses the AST tree to generate sequential Word TextRun elements.
 * Keeps IUPAC characters upright, handles script flags, and preserves margins.
 */
function renderNodeToTextRuns(
  node: FormulaNode,
  options?: RenderOptions,
  isSub = false,
  isSuper = false
): TextRun[] {
  switch (node.type) {
    case "root": {
      const root = node as RootNode;
      return root.children.flatMap((child) => renderNodeToTextRuns(child, options, isSub, isSuper));
    }

    case "text":
    case "number":
    case "symbol":
    case "operator": {
      const simple = node as { value: string };
      return [
        new TextRun(
          mapOptions(options, {
            text: simple.value,
            subScript: isSub,
            superScript: isSuper
          })
        )
      ];
    }

    case "subscript": {
      const subNode = node as { base: FormulaNode; subscript: FormulaNode };
      return [
        ...renderNodeToTextRuns(subNode.base, options, isSub, isSuper),
        ...renderNodeToTextRuns(subNode.subscript, options, true, false)
      ];
    }

    case "superscript": {
      const superNode = node as { base: FormulaNode; superscript: FormulaNode };
      return [
        ...renderNodeToTextRuns(superNode.base, options, isSub, isSuper),
        ...renderNodeToTextRuns(superNode.superscript, options, false, true)
      ];
    }

    case "sub-sup-pair": {
      const pairNode = node as { base: FormulaNode; subscript: FormulaNode; superscript: FormulaNode };
      return [
        ...renderNodeToTextRuns(pairNode.base, options, isSub, isSuper),
        ...renderNodeToTextRuns(pairNode.subscript, options, true, false),
        ...renderNodeToTextRuns(pairNode.superscript, options, false, true)
      ];
    }

    case "overset": {
      const overNode = node as OversetNode;
      return [
        ...renderNodeToTextRuns(overNode.base, options, isSub, isSuper),
        new TextRun(mapOptions(options, { text: "(", superScript: true })),
        ...renderNodeToTextRuns(overNode.top, options, false, true),
        new TextRun(mapOptions(options, { text: ")", superScript: true }))
      ];
    }

    case "chemical-element": {
      const elemNode = node as ChemicalElementNode;
      const runs: TextRun[] = [];
      // Mass number is formatted as a prepended superscript
      if (elemNode.massNumber !== undefined) {
        runs.push(
          new TextRun(
            mapOptions(options, {
              text: String(elemNode.massNumber),
              superScript: true
            })
          )
        );
      }
      // Atomic number is formatted as a prepended subscript
      if (elemNode.atomicNumber !== undefined) {
        runs.push(
          new TextRun(
            mapOptions(options, {
              text: String(elemNode.atomicNumber),
              subScript: true
            })
          )
        );
      }
      // Chemical elements must remain upright per IUPAC guidelines
      runs.push(
        new TextRun(
          mapOptions(options, {
            text: elemNode.symbol,
            bold: true,
            italics: false,
            subScript: isSub,
            superScript: isSuper
          })
        )
      );
      return runs;
    }

    case "chemical-group": {
      const groupNode = node as ChemicalGroupNode;
      const runs: TextRun[] = [];
      if (groupNode.coefficient !== undefined) {
        runs.push(
          new TextRun(
            mapOptions(options, {
              text: String(groupNode.coefficient),
              bold: false,
              italics: false
            })
          )
        );
      }
      runs.push(
        ...groupNode.elements.flatMap((f) => renderNodeToTextRuns(f, options, isSub, isSuper))
      );
      if (groupNode.subscript !== undefined) {
        runs.push(
          new TextRun(
            mapOptions(options, {
              text: String(groupNode.subscript),
              subScript: true
            })
          )
        );
      }
      return runs;
    }

    case "ion": {
      const ionNode = node as IonNode;
      return [
        ...renderNodeToTextRuns(ionNode.base, options, isSub, isSuper),
        new TextRun(
          mapOptions(options, {
            text: ionNode.charge,
            superScript: true
          })
        )
      ];
    }

    case "reaction": {
      const reactNode = node as ReactionNode;
      const runs: TextRun[] = [];
      reactNode.reactants.forEach((param, index) => {
        if (index > 0) {
          runs.push(new TextRun(mapOptions(options, { text: " + " })));
        }
        runs.push(...renderNodeToTextRuns(param, options));
      });

      const arrowSymbol = reactNode.arrowType === "reversible" ? " ⇌ " : " → ";
      runs.push(new TextRun(mapOptions(options, { text: arrowSymbol })));

      if (reactNode.conditions && reactNode.conditions.length > 0) {
        runs.push(new TextRun(mapOptions(options, { text: "(", italics: true })));
        reactNode.conditions.forEach((cond, idx) => {
          if (idx > 0) runs.push(new TextRun(mapOptions(options, { text: ", " })));
          runs.push(...renderNodeToTextRuns(cond, options));
        });
        runs.push(new TextRun(mapOptions(options, { text: ") ", italics: true })));
      }

      reactNode.products.forEach((param, index) => {
        if (index > 0) {
          runs.push(new TextRun(mapOptions(options, { text: " + " })));
        }
        runs.push(...renderNodeToTextRuns(param, options));
      });
      return runs;
    }

    case "equation": {
      const eqNode = node as EquationNode;
      return [
        ...renderNodeToTextRuns(eqNode.left, options, isSub, isSuper),
        new TextRun(mapOptions(options, { text: ` ${eqNode.operator} ` })),
        ...renderNodeToTextRuns(eqNode.right, options, isSub, isSuper)
      ];
    }

    case "genetic-cross": {
      const crossNode = node as GeneticCrossNode;
      return [
        ...renderNodeToTextRuns(crossNode.parent1, options, isSub, isSuper),
        new TextRun(mapOptions(options, { text: ` ${crossNode.crossSymbol} ` })),
        ...renderNodeToTextRuns(crossNode.parent2, options, isSub, isSuper)
      ];
    }

    case "unit": {
      const unitNode = node as UnitNode;
      const runs: TextRun[] = [];
      if (unitNode.value) {
        runs.push(...renderNodeToTextRuns(unitNode.value, options, isSub, isSuper));
        runs.push(new TextRun(mapOptions(options, { text: " " })));
      }
      runs.push(new TextRun(mapOptions(options, { text: unitNode.unit, italics: false })));
      return runs;
    }

    case "fraction": {
      const frac = node as FractionNode;
      return [
        new TextRun(mapOptions(options, { text: "(" })),
        ...renderNodeToTextRuns(frac.numerator, options),
        new TextRun(mapOptions(options, { text: ")/(" })),
        ...renderNodeToTextRuns(frac.denominator, options),
        new TextRun(mapOptions(options, { text: ")" }))
      ];
    }

    case "radical": {
      const rad = node as RadicalNode;
      const runs: TextRun[] = [];
      if (rad.index) {
        runs.push(new TextRun(mapOptions(options, { text: "[", superScript: true })));
        runs.push(...renderNodeToTextRuns(rad.index, options, false, true));
        runs.push(new TextRun(mapOptions(options, { text: "]", superScript: true })));
      }
      runs.push(new TextRun(mapOptions(options, { text: "√(" })));
      runs.push(...renderNodeToTextRuns(rad.radicand, options));
      runs.push(new TextRun(mapOptions(options, { text: ")" })));
      return runs;
    }

    case "integral": {
      const calc = node as IntegralNode;
      const runs: TextRun[] = [];
      runs.push(new TextRun(mapOptions(options, { text: "∫" })));
      if (calc.lowerLimit) {
        runs.push(...renderNodeToTextRuns(calc.lowerLimit, options, true, false));
      }
      if (calc.upperLimit) {
        runs.push(...renderNodeToTextRuns(calc.upperLimit, options, false, true));
      }
      runs.push(...renderNodeToTextRuns(calc.integrand, options));
      return runs;
    }

    case "summation": {
      const summation = node as SummationNode;
      const runs: TextRun[] = [];
      runs.push(new TextRun(mapOptions(options, { text: "∑" })));
      if (summation.lowerLimit) {
        runs.push(...renderNodeToTextRuns(summation.lowerLimit, options, true, false));
      }
      if (summation.upperLimit) {
        runs.push(...renderNodeToTextRuns(summation.upperLimit, options, false, true));
      }
      runs.push(...renderNodeToTextRuns(summation.expression, options));
      return runs;
    }

    case "limit": {
      const lim = node as LimitNode;
      return [
        new TextRun(mapOptions(options, { text: "lim(" })),
        ...renderNodeToTextRuns(lim.variable, options),
        new TextRun(mapOptions(options, { text: "→" })),
        ...renderNodeToTextRuns(lim.target, options),
        new TextRun(mapOptions(options, { text: ") " })),
        ...renderNodeToTextRuns(lim.expression, options)
      ];
    }

    case "matrix": {
      const mat = node as MatrixNode;
      const runs: TextRun[] = [];
      runs.push(new TextRun(mapOptions(options, { text: "[" })));
      mat.rows.forEach((row, rIdx) => {
        if (rIdx > 0) runs.push(new TextRun(mapOptions(options, { text: "; " })));
        row.forEach((cell, cIdx) => {
          if (cIdx > 0) runs.push(new TextRun(mapOptions(options, { text: " " })));
          runs.push(...renderNodeToTextRuns(cell, options));
        });
      });
      runs.push(new TextRun(mapOptions(options, { text: "]" })));
      return runs;
    }

    case "vector": {
      const vec = node as VectorNode;
      const symbolText = getSymbolText(vec.symbol);
      return [
        new TextRun(
          mapOptions(options, {
            text: symbolText + "\u20d7",
            bold: true,
            subScript: isSub,
            superScript: isSuper
          })
        )
      ];
    }

    case "unparsed-fallback": {
      return [
        new TextRun(
          mapOptions(options, {
            text: (node as { rawValue: string }).rawValue,
            subScript: isSub,
            superScript: isSuper
          })
        )
      ];
    }

    default:
      return [];
  }
}

/**
 * -------------------------------------------------------------------------
 * RENDERER 2: OFFICE MATH OMML CONVERTER (Formal Mathematics Focus)
 * -------------------------------------------------------------------------
 * Recursively maps parsed AST nodes to formal Microsoft Word MathComponent children.
 */
function renderNodeToOMMLChildren(node: FormulaNode, options?: RenderOptions): MathComponent[] {
  switch (node.type) {
    case "root": {
      const root = node as RootNode;
      return root.children.flatMap((child) => renderNodeToOMMLChildren(child, options));
    }

    case "text":
    case "number":
    case "symbol":
    case "operator": {
      const simple = node as { value: string };
      return [new MathRun(simple.value)];
    }

    case "subscript": {
      const sub = node as { base: FormulaNode; subscript: FormulaNode };
      return [
        new MathSubScript({
          children: renderNodeToOMMLChildren(sub.base, options),
          subScript: renderNodeToOMMLChildren(sub.subscript, options)
        })
      ];
    }

    case "superscript": {
      const sup = node as { base: FormulaNode; superscript: FormulaNode };
      return [
        new MathSuperScript({
          children: renderNodeToOMMLChildren(sup.base, options),
          superScript: renderNodeToOMMLChildren(sup.superscript, options)
        })
      ];
    }

    case "sub-sup-pair": {
      const pair = node as { base: FormulaNode; subscript: FormulaNode; superscript: FormulaNode };
      return [
        new MathSubSuperScript({
          children: renderNodeToOMMLChildren(pair.base, options),
          subScript: renderNodeToOMMLChildren(pair.subscript, options),
          superScript: renderNodeToOMMLChildren(pair.superscript, options)
        })
      ];
    }

    case "overset": {
      const overset = node as OversetNode;
      return [
        new MathLimitUpper({
          children: renderNodeToOMMLChildren(overset.base, options),
          limit: renderNodeToOMMLChildren(overset.top, options)
        })
      ];
    }

    case "fraction": {
      const frac = node as FractionNode;
      return [
        new MathFraction({
          numerator: renderNodeToOMMLChildren(frac.numerator, options),
          denominator: renderNodeToOMMLChildren(frac.denominator, options)
        })
      ];
    }

    case "radical": {
      const rad = node as RadicalNode;
      return [
        new MathRadical({
          children: renderNodeToOMMLChildren(rad.radicand, options),
          degree: rad.index ? renderNodeToOMMLChildren(rad.index, options) : undefined
        })
      ];
    }

    case "chemical-element": {
      const element = node as ChemicalElementNode;
      const res: MathComponent[] = [];
      if (element.massNumber !== undefined) {
        res.push(
          new MathSuperScript({
            children: [],
            superScript: [new MathRun(String(element.massNumber))]
          })
        );
      }
      if (element.atomicNumber !== undefined) {
        res.push(
          new MathSubScript({
            children: [],
            subScript: [new MathRun(String(element.atomicNumber))]
          })
        );
      }
      res.push(new MathRun(element.symbol));
      return res;
    }

    case "chemical-group": {
      const chemGroup = node as ChemicalGroupNode;
      const res: MathComponent[] = [];
      if (chemGroup.coefficient !== undefined) {
        res.push(new MathRun(String(chemGroup.coefficient)));
      }
      res.push(...chemGroup.elements.flatMap((f) => renderNodeToOMMLChildren(f, options)));
      if (chemGroup.subscript !== undefined) {
        res.push(
          new MathSubScript({
            children: [],
            subScript: [new MathRun(String(chemGroup.subscript))]
          })
        );
      }
      return res;
    }

    case "ion": {
      const ion = node as IonNode;
      return [
        new MathSuperScript({
          children: renderNodeToOMMLChildren(ion.base, options),
          superScript: [new MathRun(ion.charge)]
        })
      ];
    }

    case "reaction": {
      const reaction = node as ReactionNode;
      const parts: MathComponent[] = [];
      reaction.reactants.forEach((r, idx) => {
        if (idx > 0) parts.push(new MathRun(" + "));
        parts.push(...renderNodeToOMMLChildren(r, options));
      });
      const arrowSymbol = reaction.arrowType === "reversible" ? " ⇌ " : " → ";
      parts.push(new MathRun(arrowSymbol));
      if (reaction.conditions && reaction.conditions.length > 0) {
        parts.push(new MathRun("("));
        reaction.conditions.forEach((c, idx) => {
          if (idx > 0) parts.push(new MathRun(", "));
          parts.push(...renderNodeToOMMLChildren(c, options));
        });
        parts.push(new MathRun(") "));
      }
      reaction.products.forEach((p, idx) => {
        if (idx > 0) parts.push(new MathRun(" + "));
        parts.push(...renderNodeToOMMLChildren(p, options));
      });
      return parts;
    }

    case "equation": {
      const eq = node as EquationNode;
      return [
        ...renderNodeToOMMLChildren(eq.left, options),
        new MathRun(` ${eq.operator} `),
        ...renderNodeToOMMLChildren(eq.right, options)
      ];
    }

    case "genetic-cross": {
      const cross = node as GeneticCrossNode;
      return [
        ...renderNodeToOMMLChildren(cross.parent1, options),
        new MathRun(` ${cross.crossSymbol} `),
        ...renderNodeToOMMLChildren(cross.parent2, options)
      ];
    }

    case "matrix": {
      const mat = node as MatrixNode;
      const parts: MathComponent[] = [];
      parts.push(new MathRun("["));
      mat.rows.forEach((row, rIdx) => {
        if (rIdx > 0) parts.push(new MathRun("; "));
        row.forEach((cell, cIdx) => {
          if (cIdx > 0) parts.push(new MathRun(" "));
          parts.push(...renderNodeToOMMLChildren(cell, options));
        });
      });
      parts.push(new MathRun("]"));
      return parts;
    }

    case "integral": {
      const calc = node as IntegralNode;
      return [
        new MathIntegral({
          children: renderNodeToOMMLChildren(calc.integrand, options),
          subScript: calc.lowerLimit ? renderNodeToOMMLChildren(calc.lowerLimit, options) : undefined,
          superScript: calc.upperLimit ? renderNodeToOMMLChildren(calc.upperLimit, options) : undefined
        })
      ];
    }

    case "summation": {
      const sum = node as SummationNode;
      return [
        new MathSum({
          children: renderNodeToOMMLChildren(sum.expression, options),
          subScript: sum.lowerLimit ? renderNodeToOMMLChildren(sum.lowerLimit, options) : undefined,
          superScript: sum.upperLimit ? renderNodeToOMMLChildren(sum.upperLimit, options) : undefined
        })
      ];
    }

    case "limit": {
      const lim = node as LimitNode;
      return [
        new MathLimitLower({
          children: [new MathRun("lim")],
          limit: [
            ...renderNodeToOMMLChildren(lim.variable, options),
            new MathRun("→"),
            ...renderNodeToOMMLChildren(lim.target, options)
          ]
        }),
        new MathRun(" "),
        ...renderNodeToOMMLChildren(lim.expression, options)
      ];
    }

    case "vector": {
      const vec = node as VectorNode;
      const runs = renderNodeToOMMLChildren(vec.symbol, options);
      runs.forEach(run => {
        if (run instanceof MathRun && (run as any).value) {
          (run as any).value = (run as any).value + "\u20d7";
        }
      });
      return runs;
    }

    case "unit": {
      const unitNode = node as UnitNode;
      const parts: MathComponent[] = [];
      if (unitNode.value) {
        parts.push(...renderNodeToOMMLChildren(unitNode.value, options));
        parts.push(new MathRun(" "));
      }
      parts.push(new MathRun(unitNode.unit));
      return parts;
    }

    case "unparsed-fallback": {
      return [new MathRun((node as { rawValue: string }).rawValue)];
    }

    default:
      return [];
  }
}

/**
 * -------------------------------------------------------------------------
 * RENDERER 3: DOMAIN-AWARE PHYSICS BLOCK RENDERER
 * -------------------------------------------------------------------------
 * Intelligently separates mathematical operations (which map to OMML blocks)
 * from unit definitions (which map to clean, upright TextRun layouts).
 */
function renderPhysicsToDocx(root: RootNode, options?: RenderOptions): Array<TextRun | Math> {
  const result: Array<TextRun | Math> = [];
  const currentMathChildren: MathComponent[] = [];

  const flushMath = () => {
    if (currentMathChildren.length > 0) {
      result.push(new Math({ children: [...currentMathChildren] }));
      currentMathChildren.length = 0;
    }
  };

  const traverseTree = (nodes: FormulaNode[]) => {
    for (const node of nodes) {
      if (node.type === "unit") {
        const uNode = node as UnitNode;
        if (uNode.value) {
          // Include numerical values directly in current Math node block
          currentMathChildren.push(...renderNodeToOMMLChildren(uNode.value, options));
        }
        flushMath(); // Terminate equation editor run before rendering unit
        result.push(new TextRun(mapOptions(options, { text: " " + uNode.unit, italics: false })));
      } else if (node.type === "root") {
        traverseTree((node as RootNode).children);
      } else {
        currentMathChildren.push(...renderNodeToOMMLChildren(node, options));
      }
    }
  };

  traverseTree(root.children);
  flushMath();
  return result;
}

/**
 * -------------------------------------------------------------------------
 * PUBLIC API ENTRY POINT
 * -------------------------------------------------------------------------
 * Automatically determines and fires the ideal rendering layout based on the
 * taxonomic domain, scientific guidelines, and node structure inside the AST.
 *
 * @param ast Structural syntax representation from the Formula Parser.
 * @param options Output Word options (fonts, sizes, colors).
 * @returns Balanced array of Paragraph child components ready for docx insertion.
 */
export function renderFormulaToDocx(
  ast: FormulaAST,
  options?: RenderOptions
): Array<TextRun | Math> {
  const domain = ast.domain;

  // Crucial: If there is ANY mathematical node (e.g. fractions, radicals, summations, integrals, etc.),
  // we MUST render using Office Math (OMML) MathFraction / physics-math block representation to prevent any fraction
  // from falling back to a plain TextRun.
  if (hasMathematicalNodes(ast.root)) {
    return renderPhysicsToDocx(ast.root, options);
  }

  // 1. Chemistry Domain Strategy: Element symbols must be upright
  if (domain === "chemistry") {
    return renderToTextRuns(ast.root, options);
  }

  // 2. Physics Domain Strategy: Math variables rendered in OMML, units left as TextRuns
  if (domain === "physics") {
    return renderPhysicsToDocx(ast.root, options);
  }

  // 3. Biology Domain Strategy: Genetic crosses remain plain text, formulas fall back to hybrid math
  if (domain === "biology") {
    return renderToTextRuns(ast.root, options);
  }

  // 4. Mathematics / Unknown Fallback Domain Strategy: Render entirely inside formal Office Math (OMML)
  const mathKids = renderNodeToOMMLChildren(ast.root, options);
  if (mathKids.length === 0) {
    return [];
  }
  return [new Math({ children: mathKids })];
}

/**
 * Accessor for the standard TextRun translator to satisfy external custom structures when needed.
 */
export function renderToTextRuns(root: RootNode, options?: RenderOptions): TextRun[] {
  return renderNodeToTextRuns(root, options);
}

/**
 * Accessor for the mathematical Office Math generator.
 */
export function renderToOMML(root: RootNode, options?: RenderOptions): Math {
  return new Math({ children: renderNodeToOMMLChildren(root, options) });
}
