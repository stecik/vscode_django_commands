// The module 'vscode' contains the VS Code extensibility API

// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */

const CACHE_KEY = "commandsCache";
const MARKER = "@@DJANGO_COMMANDS@@";
// skip hidden folders (.venv, .uv-cache, .git, ...) and installed packages
const MANAGE_PY_EXCLUDE = "{**/node_modules/**,**/.*/**,**/site-packages/**}";

let extensionPath;
let projects = [];
let commandsCache;
let recentCommands;
const loading = new Map();
const busyTerminals = new Set();
const usedTerminals = new WeakSet();

function getConfig() {
    const config = vscode.workspace.getConfiguration("djangoCommands");
    return {
        maxRecent: config.get("maxRecentCommands", 5),
        showRecent: config.get("showRecentCommands", true),
        openNewTerminal: config.get("alwaysOpenNewTerminal", false),
    };
}

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

async function getPythonInterpreter(resource) {
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
        return pythonAPI.environments.getActiveEnvironmentPath(resource).path;
    }

    // Legacy fallback (pre-2024)
    if (pythonAPI.settings) {
        return pythonAPI.settings.getExecutionDetails(resource).execCommand?.[0];
    }

    vscode.window.showErrorMessage("Unable to determine Python interpreter.");
}

// nearest .venv/venv from manage.py dir up to the workspace folder root
function findVenvPython(dir, rootDir) {
    const executable =
        process.platform === "win32"
            ? path.join("Scripts", "python.exe")
            : path.join("bin", "python");
    let current = dir;
    while (true) {
        for (const venv of [".venv", "venv"]) {
            const python = path.join(current, venv, executable);
            if (fs.existsSync(python)) {
                return python;
            }
        }
        const parent = path.dirname(current);
        if (current === rootDir || parent === current) {
            return;
        }
        current = parent;
    }
}

async function findProjects() {
    const files = await vscode.workspace.findFiles(
        "**/manage.py",
        MANAGE_PY_EXCLUDE
    );
    if (files.length === 0) {
        vscode.window.showErrorMessage("No manage.py found in workspace.");
    }
    const found = await Promise.all(
        files.map(async (uri) => {
            const dir = path.dirname(uri.fsPath);
            const folder = vscode.workspace.getWorkspaceFolder(uri);
            const rootDir = folder ? folder.uri.fsPath : dir;
            const relative = path.relative(rootDir, dir).replace(/\\/g, "/");
            return {
                managePy: uri.fsPath,
                dir,
                folder,
                name: relative || (folder ? folder.name : path.basename(dir)),
                depth: relative ? relative.split("/").length : 0,
                python:
                    findVenvPython(dir, rootDir) ||
                    (await getPythonInterpreter(uri)),
            };
        })
    );
    return found.sort(
        (a, b) => a.depth - b.depth || a.name.localeCompare(b.name)
    );
}

function execPython(python, args, cwd) {
    return new Promise((resolve, reject) => {
        execFile(
            python,
            args,
            { cwd, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
            (err, stdout, stderr) => {
                if (err) {
                    return reject(new Error(stderr || err.message));
                }
                return resolve(stdout);
            }
        );
    });
}

async function loadCommands(project) {
    if (!project.python) {
        throw new Error("No Python interpreter");
    }
    // fast path: settings only, without django.setup()
    try {
        const stdout = await execPython(
            project.python,
            [path.join(extensionPath, "list_commands.py"), project.managePy],
            project.dir
        );
        const line = stdout
            .split(/\r?\n/)
            .find((row) => row.startsWith(MARKER));
        if (line) {
            return JSON.parse(line.slice(MARKER.length));
        }
    } catch (err) {
        console.log(`list_commands.py failed for ${project.managePy}`, err);
    }
    const stdout = await execPython(
        project.python,
        [project.managePy, "help"],
        project.dir
    );
    return parseDjangoCommands(stdout);
}

function refreshCommands(context, project) {
    if (!loading.has(project.managePy)) {
        const promise = loadCommands(project)
            .then((groups) => {
                commandsCache[project.managePy] = groups;
                context.workspaceState.update(CACHE_KEY, commandsCache);
                return groups;
            })
            .catch((err) => {
                vscode.window.showErrorMessage(
                    `Django commands of ${project.name}: ${err.message}`
                );
                return {};
            })
            .finally(() => loading.delete(project.managePy));
        loading.set(project.managePy, promise);
    }
    return loading.get(project.managePy);
}

function refreshAll(context) {
    for (const project of projects) {
        refreshCommands(context, project);
    }
}

async function getCommands(context, project) {
    return (
        commandsCache[project.managePy] || refreshCommands(context, project)
    );
}

async function showDjangoCommandPicker(context) {
    const items = [];
    const projectByManagePy = new Map(projects.map((p) => [p.managePy, p]));
    const multiple = projects.length > 1;

    // add recent commands
    if (getConfig().showRecent) {
        items.push({
            label: `── RECENT ──`,
            kind: vscode.QuickPickItemKind.Separator,
        });
        for (const key of [...recentCommands].reverse()) {
            const [managePy, cmd] = JSON.parse(key);
            const project = projectByManagePy.get(managePy);
            if (project) {
                items.push({
                    label: cmd,
                    description: multiple ? `recent · ${project.name}` : "recent",
                    project,
                    cmd,
                });
            }
        }
    }

    const loaded = await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Window,
            title: "Loading Django commands",
        },
        () => Promise.all(projects.map((p) => getCommands(context, p)))
    );
    projects.forEach((project, index) => {
        for (const [group, cmds] of Object.entries(loaded[index])) {
            const title = multiple ? `${project.name} › ${group}` : group;
            items.push({
                label: `── ${title.toUpperCase()} ──`,
                kind: vscode.QuickPickItemKind.Separator,
            });
            for (const cmd of cmds) {
                items.push({ label: cmd, description: group, project, cmd });
            }
        }
    });

    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a Django management command",
        matchOnDescription: true,
    });

    // either null or the selected item
    return selection && selection.kind !== vscode.QuickPickItemKind.Separator
        ? selection
        : null;
}

function addRecentCommand(selection, context) {
    const key = JSON.stringify([selection.project.managePy, selection.cmd]);
    recentCommands.delete(key);
    recentCommands.add(key);

    if (recentCommands.size > getConfig().maxRecent) {
        recentCommands.delete(recentCommands.values().next().value);
    }
    context.globalState.update("recentCommands", [...recentCommands]);
}

function quote(value) {
    return /\s/.test(value) ? `"${value}"` : value;
}

function commandLine(project, cmd, args) {
    let python = quote(project.python);
    if (python !== project.python && /pwsh|powershell/i.test(vscode.env.shell)) {
        python = `& ${python}`;
    }
    return `${python} ${quote(project.managePy)} ${cmd} ${args || ""}`.trim();
}

function isTerminalFree(term) {
    if (term.exitStatus !== undefined || busyTerminals.has(term)) {
        return false;
    }
    // without shell integration we can not tell if the last command finished
    return Boolean(term.shellIntegration) || !usedTerminals.has(term);
}

function getTerminal(project) {
    const name = `Django Commands (${project.name})`;
    if (!getConfig().openNewTerminal) {
        const term = vscode.window.terminals.find(
            (t) => t.creationOptions.name === name && isTerminalFree(t)
        );
        if (term) {
            return term;
        }
    }
    return vscode.window.createTerminal({
        name,
        cwd: project.dir,
        location: {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: true,
        },
    });
}

async function run(context) {
    const selection = await showDjangoCommandPicker(context);
    if (!selection) {
        return;
    }
    addRecentCommand(selection, context);
    const args = await vscode.window.showInputBox({
        prompt: `Arguments for: ${selection.cmd}`,
        placeHolder: "Enter arguments",
        ignoreFocusOut: true,
    });
    const term = getTerminal(selection.project);
    usedTerminals.add(term);
    term.show();
    term.sendText(commandLine(selection.project, selection.cmd, args));
}

async function debug(context) {
    const selection = await showDjangoCommandPicker(context);
    if (!selection) {
        return;
    }
    addRecentCommand(selection, context);
    const args = await vscode.window.showInputBox({
        prompt: `Arguments for: ${selection.cmd}`,
        placeHolder: "Enter arguments",
    });
    const { project, cmd } = selection;
    await vscode.debug.startDebugging(project.folder, {
        name: `Django: ${cmd}`,
        type: "python",
        request: "launch",
        program: project.managePy,
        args: [cmd, ...(args ? args.split(" ").filter(Boolean) : [])],
        console: "integratedTerminal",
        cwd: project.dir,
        python: project.python,
    });
}

async function reload(context) {
    projects = await findProjects();
    commandsCache = {};
    context.workspaceState.update(CACHE_KEY, commandsCache);
    refreshAll(context);
    context.globalState.update("recentCommands", []);
    recentCommands = new Set();
}

async function activate(context) {
    extensionPath = context.extensionPath;
    // drop recent commands stored by older versions (plain strings)
    recentCommands = new Set(
        context.globalState.get("recentCommands", []).filter((key) => {
            try {
                return Array.isArray(JSON.parse(key));
            } catch {
                return false;
            }
        })
    );
    commandsCache = context.workspaceState.get(CACHE_KEY, {});
    projects = await findProjects();
    // picker uses cached commands, cache gets refreshed in background
    refreshAll(context);

    context.subscriptions.push(
        vscode.window.onDidStartTerminalShellExecution((e) =>
            busyTerminals.add(e.terminal)
        ),
        vscode.window.onDidEndTerminalShellExecution((e) =>
            busyTerminals.delete(e.terminal)
        ),
        vscode.window.onDidCloseTerminal((term) => busyTerminals.delete(term))
    );

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
function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
