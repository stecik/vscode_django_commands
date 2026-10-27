# Django Commands

Quickly discover and run Django management commands in Visual Studio Code — with recent command history, argument prompts, and integrated terminal or debugger support.

---

## ✨ Features

-   🧠 Parses and groups Django commands by category
-   📂 Finds all `manage.py` files in the workspace (subprojects included) and groups commands by project
-   ⚡ Fast command loading (settings only, without `django.setup()`), cached and refreshed in background
-   🕹️ Runs commands in a VS Code terminal (with argument input)
-   🧪 Debugs Django commands using the Python debugger
-   🕘 Keeps track of recently used commands (configurable limit)
-   ⚙️ Uses the nearest `.venv`/`venv` of each project, falling back to the interpreter selected in the Python extension
-   🧵 One reusable terminal per project, a new one is opened only when the previous command is still running (or always-new terminal, configurable)

---

## 🔧 Extension Settings

This extension contributes the following settings:

| Setting                                | Type      | Default | Description                                                             |
| -------------------------------------- | --------- | ------- | ----------------------------------------------------------------------- |
| `djangoCommands.maxRecentCommands`     | `number`  | `5`     | Maximum number of recent Django commands to store (min: `1`, max: `15`) |
| `djangoCommands.showRecentCommands`    | `boolean` | `true`  | Show recently used Django commands at the top of the command picker     |
| `djangoCommands.alwaysOpenNewTerminal` | `boolean` | `false` | Always open a new terminal instead of reusing the project's terminal    |

You can change these in `settings.json` or via the VS Code Settings UI.

---

## ⚙️ Requirements

-   [Python extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python) installed and enabled (used for debugging and for projects without `.venv`/`venv`)
-   At least one `manage.py` Django project file in the workspace (hidden folders and `site-packages` are skipped)

---

## 🚀 Commands

You can access the following from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

-   `Django Commands: Run` – Run a Django command with optional arguments
-   `Django Commands: Debug` – Launch Django command with Python debugger
-   `Django Commands: Reload` – Search `manage.py` files again, reload commands of all projects and clear recent history

---

## 📝 Release Notes

### 1.0.0

-   All `manage.py` files in the workspace are found and commands are grouped by project
-   Hidden folders (`.venv`, `.uv-cache`, ...) and `site-packages` are skipped when searching for `manage.py`
-   Python interpreter is taken from the nearest `.venv`/`venv`, falling back to the Python extension
-   Faster command loading (settings only, without `django.setup()`), commands are cached and refreshed in background
-   One reusable terminal per project, a new one is opened only when the previous command is still running
-   Fixed: cancelling the picker closed the active terminal
-   Fixed: debugging a command without arguments failed
-   Fixed: settings changes were applied only after reload

### 0.0.2

-   Support for Python extension API before 2024.23 (Python 2.7 projects)
-   Bug fixes

### 0.0.1

-   Initial release:
    -   Command grouping
    -   Terminal execution
    -   Debug mode
    -   Recent command tracking
    -   Configurable settings

---

## 🙌 Contributing

Pull requests and feedback welcome! Submit issues or feature suggestions via [Github](https://github.com/stecik/vscode_django_commands).

---

## 💡 Tips

-   Use recent commands to quickly re-run common tasks
-   Use the debugger when inspecting issues with management commands

---

**Enjoy using Django Commands!**
