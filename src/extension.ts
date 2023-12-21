import * as vscode from 'vscode';
import { commands, ExtensionContext, TreeItem, TreeItemCollapsibleState, window } from 'vscode';

var clipboardList: Clipboard[] = [];

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
		const item = new Clipboard(copied, TreeItemCollapsibleState.None);

		if (clipboardList.find(c => c.label === copied)) {
			clipboardList = clipboardList.filter(c => c.label !== copied);
		}

		clipboardList.push(item);
		if (maximumClips > 0) {
			clipboardList = clipboardList.reverse().slice(0, maximumClips).reverse();
		}
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

	// quickpick.pastemove : paste and move first / ret
	// quickpick.pasteonly : paste / shift+inc
	// quickpick.copy : copy / ctrl+c, ctrl+inc
	// quickpick.cut : cut ctrl+x
	// quickpick.delete : delete ctrl+d

	commands.registerCommand('browseclipboard.pasteFromQuickPick', () => {
		createTreeView();

		const items = clipboardList.map(c => {
			return {
				label: c.label,
				description: ''
			};
		}).reverse();

		window.showQuickPick(items).then(item => {
			const label = ((item as vscode.QuickPickItem).label as string).replace(/↵/gi, "\n");
			vscode.env.clipboard.writeText(label).then(() => {
				if (!!window.activeTextEditor) {
					const editor = window.activeTextEditor;
					editor.edit((textInserter => textInserter.delete(editor.selection))).then(() => {
						editor.edit((textInserter => textInserter.insert(editor.selection.start, label)));
					});
				}
			});
		});
	});
}

// This method is called when your extension is deactivated
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
