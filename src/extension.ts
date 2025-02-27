import * as vscode from "vscode";
import { SQL_INSERT_INLAY_HINTS_PROVIDER } from "./app/sql-insert-inlay-hints/provider/sql-insert-inlay-hints.provider";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(SQL_INSERT_INLAY_HINTS_PROVIDER);
}

export function deactivate() {}
