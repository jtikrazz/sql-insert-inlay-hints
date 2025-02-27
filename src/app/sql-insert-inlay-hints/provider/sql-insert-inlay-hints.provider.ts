import * as vscode from "vscode";
import { ParsedInsert } from "../type/parsed-insert.type";

const SQL_INSERT_PATTERN = /INSERT\s+INTO\s+"?\w+"?\s*\((.*?)\)\s*VALUES\s*\(([\s\S]*?)\)/gis;

class SQLInsertInlayHintsProvider implements vscode.InlayHintsProvider {
  public async provideInlayHints(document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken): Promise<vscode.InlayHint[]> {
    const text = document.getText();
    const hints: vscode.InlayHint[] = [];

    for (const insert of this.findInserts(text)) {
      if (token.isCancellationRequested) {
        return hints;
      }

      if (!this.isValidInsert(insert)) {
        continue;
      }

      this.createHintsForInsert(document, insert, hints);
    }

    return hints;
  }

  private *findInserts(text: string): Generator<ParsedInsert> {
    let match: RegExpExecArray | null;

    while ((match = SQL_INSERT_PATTERN.exec(text)) !== null) {
      const columnsStr = match[1];
      const valuesStr = match[2];
      const valuesClauseStart = text.toUpperCase().indexOf("VALUES", match.index);
      const valuesStartPosition = text.indexOf("(", valuesClauseStart) + 1;

      yield {
        columns: this.parseColumns(columnsStr),
        values: this.parseValues(valuesStr),
        valuesStartPosition,
      };
    }
  }

  private parseColumns(columnsStr: string): string[] {
    return columnsStr.split(",").map((col) => col.trim());
  }

  private parseValues(valuesStr: string): string[] {
    const values: string[] = [];
    let currentValue = "";
    let inString = false;
    let parenthesesDepth = 0;

    for (const char of valuesStr) {
      if (this.shouldStartNewValue(char, inString, parenthesesDepth)) {
        values.push(currentValue.trim());
        currentValue = "";
        continue;
      }

      parenthesesDepth = this.updateParenthesesDepth(char, inString, parenthesesDepth);
      inString = this.updateStringState(char, inString);
      currentValue += char;
    }

    if (currentValue) {
      values.push(currentValue.trim());
    }

    return values;
  }

  private shouldStartNewValue(char: string, inString: boolean, depth: number): boolean {
    return char === "," && !inString && depth === 0;
  }

  private updateParenthesesDepth(char: string, inString: boolean, depth: number): number {
    if (inString) {
      return depth;
    } else if (char === "(") {
      return depth + 1;
    } else if (char === ")") {
      return depth - 1;
    }

    return depth;
  }

  private updateStringState(char: string, inString: boolean): boolean {
    return char === "'" ? !inString : inString;
  }

  private isValidInsert(statement: ParsedInsert): boolean {
    return statement.columns.length === statement.values.length;
  }

  private createHintsForInsert(document: vscode.TextDocument, statement: ParsedInsert, hints: vscode.InlayHint[]): void {
    let currentPos = statement.valuesStartPosition;

    for (let i = 0; i < statement.values.length; i++) {
      const value = statement.values[i].trim();
      const valuePos = document.getText().indexOf(value, currentPos);

      if (valuePos !== -1) {
        const hint = new vscode.InlayHint(document.positionAt(valuePos), `${statement.columns[i]}: `, vscode.InlayHintKind.Parameter);

        hints.push(hint);
        currentPos = valuePos + value.length;
      }
    }
  }
}

export const SQL_INSERT_INLAY_HINTS_PROVIDER = vscode.languages.registerInlayHintsProvider(
  { scheme: "file", language: "sql" },
  new SQLInsertInlayHintsProvider()
);
