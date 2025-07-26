# Django Commands

Quickly discover and run Django management commands in Visual Studio Code — with recent command history, argument prompts, and integrated terminal or debugger support.

---

## ✨ Features

-   🧠 Parses and groups Django commands by category
-   🕹️ Runs commands in a VS Code terminal (with argument input)
-   🧪 Debugs Django commands using the Python debugger
-   🕘 Keeps track of recently used commands (configurable limit)
-   ⚙️ Uses your selected Python interpreter from the Python extension
-   🧵 Terminal reuse or always-new terminal behavior (configurable)

---

## 🔧 Extension Settings

This extension contributes the following settings:

| Setting                                | Type      | Default | Description                                                             |
| -------------------------------------- | --------- | ------- | ----------------------------------------------------------------------- |
| `djangoCommands.maxRecentCommands`     | `number`  | `5`     | Maximum number of recent Django commands to store (min: `1`, max: `15`) |
| `djangoCommands.showRecentCommands`    | `boolean` | `true`  | Show recently used Django commands at the top of the command picker     |
| `djangoCommands.alwaysOpenNewTerminal` | `boolean` | `false` | Always open a new terminal window instead of reusing the current one    |

---

## ⚙️ Requirements

-   [Python extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python) must be installed and enabled
-   An active Python environment selected in VS Code
-   A `manage.py` Django project file accessible from you working directory

---

## 🔧 Extension Settings

This extension contributes the following settings:

| Setting                                | Type      | Default | Description                                                  |
| -------------------------------------- | --------- | ------- | ------------------------------------------------------------ |
| `djangoCommands.maxRecentCommands`     | `number`  | `5`     | Number of recent Django commands to keep                     |
| `djangoCommands.showRecentCommands`    | `boolean` | `true`  | Show recent commands at the top of the picker                |
| `djangoCommands.alwaysOpenNewTerminal` | `boolean` | `true`  | Always use a new terminal instead of reusing the current one |

You can change these in `settings.json` or via the VS Code Settings UI.

---

## 🚀 Commands

You can access the following from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

-   `Django Commands: Run` – Run a Django command with optional arguments
-   `Django Commands: Debug` – Launch Django command with Python debugger
-   `Django Commands: Reload` – Refresh command list and clear recent history

---

## 📝 Release Notes

### 1.0.0

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
