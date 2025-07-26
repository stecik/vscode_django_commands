// The module 'vscode' contains the VS Code extensibility API

// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const { exec } = require("child_process");
const config = vscode.workspace.getConfiguration("djangoCommands");
const maxRecent = config.get("maxRecentCommands", 5);
const showRecent = config.get("showRecentCommands", true);
const openNewTerminal = config.get("alwaysOpenNewTerminal", true);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */

let workingDir;
let pythonInterpreter;
let managePy = "";
let commands;
let recentCommands;

function parseDjangoCommands(text) {
    text = text.slice(text.indexOf("["));
    const lines = text.split("\n");
    const result = {};
    let currentGroup = null;

    for (let line of lines) {
        line = line.trim();

        if (line.startsWith("[") && line.endsWith("]")) {
            currentGroup = line.slice(1, -1);
            result[currentGroup] = [];
        } else if (line && currentGroup) {
            result[currentGroup].push(line);
        }
    }
    console.log(result);
    return result;
}

// async function getPythonInterpreter() {
//     const pythonExt = vscode.extensions.getExtension("ms-python.python");

//     if (!pythonExt) {
//         vscode.window.showErrorMessage("Python extension not found");
//         return;
//     }

//     if (!pythonExt.isActive) {
//         await pythonExt.activate();
//     }

//     const pythonAPI = pythonExt.exports;
//     const interpreterPath =
//         pythonAPI.environments.getActiveEnvironmentPath().path;
//     return interpreterPath;
// }

async function getPythonInterpreter() {
    const pythonExt = vscode.extensions.getExtension("ms-python.python");

    if (!pythonExt) {
        vscode.window.showErrorMessage("Python extension not found.");
        return;
    }

    if (!pythonExt.isActive) {
        await pythonExt.activate();
    }

    const pythonAPI = pythonExt.exports;

    // Modern API (2024.23+)
    if (pythonAPI?.environments?.getActiveEnvironmentPath) {
        return pythonAPI.environments.getActiveEnvironmentPath().path;
    }

    // Legacy fallback (pre-2024)
    if (pythonAPI.settings) {
        return pythonAPI.settings.getExecutionDetails().execCommand?.[0];
    }

    vscode.window.showErrorMessage("Unable to determine Python interpreter.");
}


async function findManagePy() {
    const files = await vscode.workspace.findFiles(
        "**/manage.py",
        "**/node_modules/**",
        1
    );
    if (files.length === 0) {
        vscode.window.showErrorMessage("No manage.py found in workspace.");
        return;
    }
    return files[0].fsPath;
}

async function showDjangoCommandPicker() {
    const items = [];

    // add recent commands
    if (showRecent) {
        items.push({
            label: `── RECENT ──`,
            kind: vscode.QuickPickItemKind.Separator,
        });
        for (const cmd of [...recentCommands].reverse()) {
            items.push({
                label: cmd,
                description: "recent",
            });
        }
    }

    for (const [group, cmds] of Object.entries(commands)) {
        items.push({
            label: `── ${group.toUpperCase()} ──`,
            kind: vscode.QuickPickItemKind.Separator,
        });
        for (const cmd of cmds) {
            items.push({
                label: cmd,
                description: group,
            });
        }
    }

    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a Django management command",
    });

    // either null or the label string
    return selection && selection.kind !== vscode.QuickPickItemKind.Separator
        ? selection.label
        : null;
}

async function getDjangoCommands() {
    if (!fs.existsSync(managePy)) {
        managePy = await findManagePy();
    }
    return new Promise((resolve, reject) => {
        if (!pythonInterpreter) {
            return reject(new Error("No Python interpreter"));
        }
        if (!fs.existsSync(managePy)) {
            return reject(new Error("manage.py not found"));
        }
        exec(`${pythonInterpreter} ${managePy} help`, (err, stdout, stderr) => {
            if (err) {
                vscode.window.showErrorMessage(err);
                return reject(err);
            }
            return resolve(parseDjangoCommands(stdout));
        });
    });
}

function addRecentCommand(cmd, context) {
    recentCommands.delete(cmd);
    recentCommands.add(cmd);

    if (recentCommands.size > maxRecent) {
        recentCommands.delete(recentCommands.values().next().value);
    }
    context.globalState.update("recentCommands", [...recentCommands]);
}

async function run(context) {
    if (!fs.existsSync(managePy)) {
        managePy = await findManagePy();
    }
    let term;
    if (!openNewTerminal) {
        term = vscode.window.activeTerminal;
    }
    if (!term) {
        term = vscode.window.createTerminal({
            name: "Django Commands",
            location: {
                viewColumn: vscode.ViewColumn.Beside,
                preserveFocus: true,
            },
            hideFromUser: true,
        });
    }
    const cmd = await showDjangoCommandPicker();
    if (!cmd) {
        term.dispose();
        return;
    }
    addRecentCommand(cmd, context);
    const args = await vscode.window.showInputBox({
        prompt: `Arguments for: ${cmd}`,
        placeHolder: "Enter arguments",
        ignoreFocusOut: true,
    });
    term.show();
    term.sendText(`${pythonInterpreter} ${managePy} ${cmd} ${args || ""}`);
}

async function debug(context) {
    if (!fs.existsSync(managePy)) {
        managePy = await findManagePy();
    }
    const cmd = await showDjangoCommandPicker();
    if (!cmd) {
        return;
    }
    addRecentCommand(cmd, context);
    let args = await vscode.window.showInputBox({
        prompt: `Arguments for: ${cmd}`,
        placeHolder: "Enter arguments",
    });
    if (args) {
        args = args.split(" ");
    }
    await vscode.debug.startDebugging(undefined, {
        name: `Django: ${cmd}`,
        type: "python",
        request: "launch",
        program: managePy,
        args: [cmd, ...args],
        console: "integratedTerminal",
        cwd: workingDir,
    });
}

async function reload(context) {
    if (!fs.existsSync(managePy)) {
        managePy = await findManagePy();
    }
    commands = await getDjangoCommands();
    context.globalState.update("recentCommands", []);
    recentCommands = new Set();
}

async function activate(context) {
    recentCommands = new Set(context.globalState.get("recentCommands", []));
    workingDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
    pythonInterpreter = await getPythonInterpreter();
    commands = await getDjangoCommands();

    let cmd = vscode.commands.registerCommand("django-commands.run", () => {
        run(context);
    });
    context.subscriptions.push(cmd);

    cmd = vscode.commands.registerCommand("django-commands.debug", () => {
        debug(context);
    });
    context.subscriptions.push(cmd);

    cmd = vscode.commands.registerCommand("django-commands.reload", () => {
        reload(context);
    });
    context.subscriptions.push(cmd);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
    activate,
    deactivate,
};
