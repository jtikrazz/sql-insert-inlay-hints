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

    const insertRegex = /INSERT\s+INTO\s+\w+\s*\((.*?)\)\s*VALUES\s*\(([\s\S]*?)\)/gi;

    let match;
    while ((match = insertRegex.exec(text)) !== null) {
      if (token.isCancellationRequested) {
        return hints;
      }

      const columnsStr = match[1];
      const valuesStr = match[2];

      const columns = columnsStr.split(",").map((col) => col.trim());
      const values = this.parseValues(valuesStr);

      if (columns.length !== values.length) {
        continue;
      }

      const valuesClauseStart = text.toUpperCase().indexOf("VALUES", match.index);
      const valuesStart = text.indexOf("(", valuesClauseStart) + 1;

      let currentPos = valuesStart;
      for (let i = 0; i < values.length; i++) {
        const value = values[i].trim();
        const valuePos = text.indexOf(value, currentPos);
        if (valuePos !== -1) {
          hints.push(new vscode.InlayHint(document.positionAt(valuePos), `${columns[i]}: `, vscode.InlayHintKind.Parameter));
          currentPos = valuePos + value.length;
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
}
