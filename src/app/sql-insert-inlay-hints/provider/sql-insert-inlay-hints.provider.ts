import * as vscode from 'vscode';
import { ParsedInsert } from '../type/parsed-insert.type';

const SQL_INSERT_PATTERN =
  /INSERT\s+INTO\s+(?:["`]?[\w]+["`]?)(?:\.["`]?[\w]+["`]?)?\s*\((.*?)\)\s*VALUES\s*((?:\s*\([^)]+\)\s*,?)+)/gis;

class SQLInsertInlayHintsProvider implements vscode.InlayHintsProvider {
  public async provideInlayHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    token: vscode.CancellationToken,
  ): Promise<vscode.InlayHint[]> {
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
      const valuesGroupStr = match[2];
      const valuesClauseStart = text.toUpperCase().indexOf('VALUES', match.index);
      const valueRowsRegex = /\(([^)]+)\)/g;
      const valueRows: { values: string[]; position: number }[] = [];
      let valueRowMatch: RegExpExecArray | null;
      let searchStartPos = text.indexOf(valuesGroupStr, valuesClauseStart);

      while ((valueRowMatch = valueRowsRegex.exec(valuesGroupStr)) !== null) {
        const rowText = valueRowMatch[0];
        const rowValues = this.parseRowValues(valueRowMatch[1]);
        const rowPosition = text.indexOf(rowText, searchStartPos);

        if (rowPosition !== -1) {
          valueRows.push({
            values: rowValues,
            position: rowPosition + 1,
          });

          searchStartPos = rowPosition + rowText.length;
        }
      }

      yield {
        columns: this.parseColumns(columnsStr),
        valueRows: valueRows,
      };
    }
  }

  private parseColumns(columnsStr: string): string[] {
    return columnsStr.split(',').map((col) => col.trim());
  }

  private parseRowValues(valuesStr: string): string[] {
    const values: string[] = [];
    let currentValue = '';
    let inString = false;
    let parenthesesDepth = 0;

    for (const char of valuesStr) {
      if (this.shouldStartNewValue(char, inString, parenthesesDepth)) {
        values.push(currentValue.trim());
        currentValue = '';
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
    return char === ',' && !inString && depth === 0;
  }

  private updateParenthesesDepth(char: string, inString: boolean, depth: number): number {
    if (inString) {
      return depth;
    } else if (char === '(') {
      return depth + 1;
    } else if (char === ')') {
      return depth - 1;
    }

    return depth;
  }

  private updateStringState(char: string, inString: boolean): boolean {
    return char === "'" ? !inString : inString;
  }

  private isValidInsert(statement: ParsedInsert): boolean {
    if (!statement.valueRows || statement.valueRows.length === 0) {
      return false;
    }

    for (const row of statement.valueRows) {
      if (row.values.length !== statement.columns.length) {
        return false;
      }
    }

    return true;
  }

  private createHintsForInsert(
    document: vscode.TextDocument,
    statement: ParsedInsert,
    hints: vscode.InlayHint[],
  ): void {
    for (const row of statement.valueRows) {
      let currentPos = row.position;

      for (let i = 0; i < statement.columns.length; i++) {
        const value = row.values[i].trim();
        const documentText = document.getText();
        const valuePos = documentText.indexOf(value, currentPos);

        if (valuePos !== -1) {
          const hint = new vscode.InlayHint(
            document.positionAt(valuePos),
            `${statement.columns[i]}: `,
            vscode.InlayHintKind.Parameter,
          );

          hints.push(hint);
          currentPos = valuePos + value.length;
        }
      }
    }
  }
}

export const SQL_INSERT_INLAY_HINTS_PROVIDER = vscode.languages.registerInlayHintsProvider(
  { scheme: 'file', language: 'sql' },
  new SQLInsertInlayHintsProvider(),
);
