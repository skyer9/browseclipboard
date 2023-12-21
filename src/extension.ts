import * as vscode from 'vscode';
import { commands, ExtensionContext, TreeItem, TreeItemCollapsibleState, window } from 'vscode';

var clipboardList: Clipboard[] = [];
var command: string;

export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration("browseclipboard");
	let maximumClips = config.get('maximumClips', 200);

	function createTreeView() {
		// vscode.window.createTreeView('browseclipboard.history', {
		// 	treeDataProvider: new ClipboardProvider()
		// });
	}

	async function addClipboardItem() {
		let copied = await vscode.env.clipboard.readText();
		copied = copied.replace(/\n/gi, "↵");
		addItem(copied);
	}

	async function addItem(str: string) {
		const item = new Clipboard(str, TreeItemCollapsibleState.None);

		if (clipboardList.find(c => c.label === str)) {
			clipboardList = clipboardList.filter(c => c.label !== str);
		}

		clipboardList.push(item);
		if (maximumClips > 0) {
			clipboardList = clipboardList.reverse().slice(0, maximumClips).reverse();
		}
	}

	async function delItem(str: string) {
		const item = new Clipboard(str, TreeItemCollapsibleState.None);
		if (clipboardList.find(c => c.label === str)) {
			clipboardList = clipboardList.filter(c => c.label !== str);
		}
	}

	async function pasteString(label: string) {
		vscode.env.clipboard.writeText(label).then(() => {
			if (!!window.activeTextEditor) {
				const editor = window.activeTextEditor;
				editor.edit((textInserter => textInserter.delete(editor.selection))).then(() => {
					editor.edit((textInserter => textInserter.insert(editor.selection.start, label)));
				});
			}
		});
	}

	commands.registerCommand('browseclipboard.copy', () => {
		commands.executeCommand("editor.action.clipboardCopyAction").then(() => {
			addClipboardItem().then(() => {
				createTreeView();
			});
		});
	});

	commands.registerCommand('browseclipboard.cut', () => {
		commands.executeCommand("editor.action.clipboardCutAction").then(() => {
			addClipboardItem().then(() => {
				createTreeView();
			});
		});
	});

	commands.registerCommand('browseclipboard.openQuickPick', () => {
		createTreeView();

		const items = clipboardList.map(c => {
			return {
				label: c.label,
				description: ''
			};
		}).reverse();

		command = "pastemove";
		window.showQuickPick(items).then(item => {
			if (item === undefined) { return; }
			let str = ((item as vscode.QuickPickItem).label as string);
			const label = str.replace(/↵/gi, "\n");
			switch (command) {
				case "pastemove":
					addItem(str);
					pasteString(label);
					break;
				case "pasteonly":
					pasteString(label);
					break;
				case "copy":
					vscode.env.clipboard.writeText(label);
					break;
				case "cut":
					vscode.env.clipboard.writeText(label);
					delItem(str);
					break;
				case "delete":
					delItem(str);
					break;
				default:
					//
			}
		});
	});

	commands.registerCommand('browseclipboard.quickpick.pasteonly', () => {
		command = "pasteonly";
		vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
	});

	commands.registerCommand('browseclipboard.quickpick.copy', () => {
		command = "copy";
		vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
	});

	commands.registerCommand('browseclipboard.quickpick.cut', () => {
		command = "cut";
		vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
	});

	commands.registerCommand('browseclipboard.quickpick.delete', () => {
		command = "delete";
		vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
	});
}

export function deactivate() {}

export class ClipboardProvider implements vscode.TreeDataProvider<Clipboard> {
	constructor() { }

	getTreeItem(element: Clipboard): TreeItem {
		return element;
	}

	getChildren(element?: Clipboard): Thenable<Clipboard[]> {
		const temp = Object.assign([], clipboardList);
		return Promise.resolve(temp.reverse());
	}
}

class Clipboard extends TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		this.contextValue = "browseClipboardItem:";
	}
}
