// The module 'vscode' contains the VS Code extensibility API

// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */

let workingDir;
let pythonInterpreter;
let managePy;
let commands;

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
    return result;
}

async function getPythonInterpreter() {
    const pythonExt = vscode.extensions.getExtension("ms-python.python");

    if (!pythonExt) {
        vscode.window.showErrorMessage("Python extension not found");
        return;
    }

    if (!pythonExt.isActive) {
        await pythonExt.activate();
    }

    const pythonAPI = pythonExt.exports;
    const interpreterPath =
        pythonAPI.environments.getActiveEnvironmentPath().path;

    vscode.window.showInformationMessage(
        `Python interpreter: ${interpreterPath}`
    );
    return interpreterPath;
}

function getManagePy() {
    return path.join(workingDir, "manage.py");
}

async function showDjangoCommandPicker() {
    const items = [];

    // NOTE: destructure so we don't shadow `commands`
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

function getDjangoCommands() {
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

async function run() {
    const cmd = await showDjangoCommandPicker();
    if (!cmd) {
        return;
    }
    const term = vscode.window.createTerminal(`Django: ${cmd}`);
    term.show();
    term.sendText(`${pythonInterpreter} ${managePy} ${cmd}`);
}

async function debug() {
    const cmd = await showDjangoCommandPicker();
    if (!cmd) {
        return;
    }
    await vscode.debug.startDebugging(undefined, {
        name: `Django: ${cmd}`,
        type: "python",
        request: "launch",
        program: managePy,
        args: [cmd],
        console: "integratedTerminal",
        cwd: workingDir,
    });
}

async function reload() {
    commands = await getDjangoCommands();
}

async function activate(context) {
    workingDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
    pythonInterpreter = await getPythonInterpreter();
    managePy = getManagePy();
    commands = await getDjangoCommands();

    let cmd = vscode.commands.registerCommand("django-commands.run", run);
    context.subscriptions.push(cmd);

    cmd = vscode.commands.registerCommand("django-commands.debug", debug);
    context.subscriptions.push(cmd);

    cmd = vscode.commands.registerCommand("django-commands.reload", reload);
    context.subscriptions.push(cmd);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
