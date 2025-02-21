import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const provider = new SQLInsertInlayHintsProvider();

  context.subscriptions.push(vscode.languages.registerInlayHintsProvider({ scheme: "file", language: "sql" }, provider));
}

export function deactivate() {}

class SQLInsertInlayHintsProvider implements vscode.InlayHintsProvider {
  async provideInlayHints(document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken): Promise<vscode.InlayHint[]> {
    const hints: vscode.InlayHint[] = [];
    const text = document.getText();

    // Regular expression to match INSERT statements
    const insertRegex = /INSERT\s+INTO\s+\w+\s*\((.*?)\)\s*VALUES\s*\(([\s\S]*?)\)/gi;

    let match;
    while ((match = insertRegex.exec(text)) !== null) {
      if (token.isCancellationRequested) {
        return hints;
      }

      const columnsStr = match[1];
      const valuesStr = match[2];

      // Parse columns and values
      const columns = columnsStr.split(",").map((col) => col.trim());
      const values = this.parseValues(valuesStr);

      if (columns.length !== values.length) {
        continue; // Skip if columns and values don't match
      }

      // Calculate the position for each value
      const valuePositions = this.findValuePositions(document, match.index, valuesStr);

      // Create hints for each value
      for (let i = 0; i < columns.length; i++) {
        if (valuePositions[i]) {
          const hint = new vscode.InlayHint(valuePositions[i], `${columns[i]}: `, vscode.InlayHintKind.Parameter);
          hints.push(hint);
        }
      }
    }

    return hints;
  }

  private parseValues(valuesStr: string): string[] {
    const values: string[] = [];
    let currentValue = "";
    let inString = false;
    let depth = 0;

    for (const char of valuesStr) {
      if (char === "(" && !inString) {
        depth++;
      } else if (char === ")" && !inString) {
        depth--;
      } else if (char === "'") {
        inString = !inString;
      } else if (char === "," && !inString && depth === 0) {
        values.push(currentValue.trim());
        currentValue = "";
        continue;
      }
      currentValue += char;
    }

    if (currentValue) {
      values.push(currentValue.trim());
    }

    return values;
  }

  private findValuePositions(document: vscode.TextDocument, startIndex: number, valuesStr: string): vscode.Position[] {
    const positions: vscode.Position[] = [];
    let currentValue = "";
    let currentPos = 0;
    let inString = false;
    let depth = 0;

    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];

      if (char === "(" && !inString) {
        depth++;
      } else if (char === ")" && !inString) {
        depth--;
      } else if (char === "'") {
        inString = !inString;
      } else if (char === "," && !inString && depth === 0) {
        const valueStartOffset = startIndex + document.getText().indexOf(currentValue.trim(), currentPos);
        positions.push(document.positionAt(valueStartOffset));
        currentValue = "";
        currentPos = i + 1;
        continue;
      }
      currentValue += char;
    }

    if (currentValue) {
      const valueStartOffset = startIndex + document.getText().indexOf(currentValue.trim(), currentPos);
      positions.push(document.positionAt(valueStartOffset));
    }

    return positions;
  }
}
