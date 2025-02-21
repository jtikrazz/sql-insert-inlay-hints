import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const provider = new SQLInsertInlayHintsProvider();

  context.subscriptions.push(vscode.languages.registerInlayHintsProvider({ scheme: "file", language: "sql" }, provider));
}

export function deactivate() {}

class SQLInsertInlayHintsProvider implements vscode.InlayHintsProvider {
  async provideInlayHints(document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken): Promise<vscode.InlayHint[]> {
    const hints: vscode.InlayHint[] = [];

    for (let i = range.start.line; i <= range.end.line; i++) {
      if (token.isCancellationRequested) {
        return hints;
      }

      const currentLine = document.lineAt(i);
      if (!currentLine.text.trim().toUpperCase().startsWith("INSERT")) {
        continue;
      }

      let fullStatement = "";
      let currentLineNum = i;
      let statementStartLine = i;
      let valueStartColumn = 0;
      let isComplete = false;

      while (currentLineNum <= document.lineCount - 1 && !isComplete) {
        const line = document.lineAt(currentLineNum).text;
        fullStatement += " " + line.trim();

        const openParens = (fullStatement.match(/\(/g) || []).length;
        const closeParens = (fullStatement.match(/\)/g) || []).length;

        if (openParens === closeParens && openParens > 0) {
          isComplete = true;
          const lastLine = document.lineAt(currentLineNum).text;

          if (lastLine.toUpperCase().includes("VALUES")) {
            valueStartColumn = lastLine.toUpperCase().indexOf("VALUES");
          }
        }

        currentLineNum++;
      }

      if (!isComplete) {
        continue;
      }

      const insertMatch = fullStatement.match(/INSERT\s+INTO\s+(\w+)\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)/i);

      if (insertMatch) {
        const [, , columns, values] = insertMatch;
        const columnList = columns.split(",").map((c) => c.trim());
        const valueList = this.parseValues(values);

        let currentLine = statementStartLine;
        let currentLineText = "";

        for (let j = 0; j < valueList.length; j++) {
          const value = valueList[j];
          const column = columnList[j];

          if (!column) continue;

          while (currentLine < document.lineCount) {
            currentLineText = document.lineAt(currentLine).text;
            const valueIndex = currentLineText.indexOf(value);

            if (valueIndex !== -1) {
              const hint = new vscode.InlayHint(new vscode.Position(currentLine, valueIndex), `${column}: `, vscode.InlayHintKind.Parameter);
              hints.push(hint);
              break;
            }
            currentLine++;
          }
        }
      }

      i = currentLineNum - 1;
    }

    return hints;
  }

  private parseValues(valuesStr: string): string[] {
    const values: string[] = [];
    let currentValue = "";
    let inString = false;
    let escapeNext = false;

    for (const char of valuesStr) {
      if (escapeNext) {
        currentValue += char;
        escapeNext = false;
        continue;
      }

      switch (char) {
        case "\\":
          escapeNext = true;
          currentValue += char;
          break;
        case "'":
          inString = !inString;
          currentValue += char;
          break;
        case ",":
          if (!inString) {
            values.push(currentValue.trim());
            currentValue = "";
          } else {
            currentValue += char;
          }
          break;
        default:
          currentValue += char;
      }
    }

    if (currentValue.trim()) {
      values.push(currentValue.trim());
    }

    return values;
  }

  async resolveInlayHint(hint: vscode.InlayHint, token: vscode.CancellationToken): Promise<vscode.InlayHint> {
    return hint;
  }
}
