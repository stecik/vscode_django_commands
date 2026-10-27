# Lists Django management commands without django.setup() (no models import).
# Usage: python list_commands.py path/to/manage.py
# Prints MARKER + JSON {group: [commands]}; non-zero exit means "use manage.py help".
# Keep Python 2.7 compatible.

import importlib
import json
import os
import re
import sys

MARKER = "@@DJANGO_COMMANDS@@"
SETTINGS_RE = re.compile(r"""DJANGO_SETTINGS_MODULE['"]\s*,\s*['"]([\w.]+)['"]""")


def app_name(entry):
    try:
        importlib.import_module(entry)
        return entry
    except ImportError:
        # dotted path to an AppConfig subclass
        module_path, _, cls_name = entry.rpartition(".")
        return getattr(importlib.import_module(module_path), cls_name).name


def app_path(name):
    module = importlib.import_module(name)
    if getattr(module, "__file__", None):
        return os.path.dirname(module.__file__)
    return next(iter(module.__path__))


def main():
    manage_py = os.path.abspath(sys.argv[1])
    project_dir = os.path.dirname(manage_py)
    with open(manage_py) as f:
        match = SETTINGS_RE.search(f.read())
    if not os.environ.get("DJANGO_SETTINGS_MODULE"):
        if not match:
            return 1
        os.environ["DJANGO_SETTINGS_MODULE"] = match.group(1)
    os.chdir(project_dir)
    sys.path.insert(0, project_dir)

    import django.core.management
    from django.conf import settings
    from django.core.management import find_commands

    # same precedence as django.core.management.get_commands()
    commands = {
        name: "django.core"
        for name in find_commands(django.core.management.__path__[0])
    }
    for entry in reversed(list(settings.INSTALLED_APPS)):
        name = app_name(entry)
        management_dir = os.path.join(app_path(name), "management")
        commands.update({cmd: name for cmd in find_commands(management_dir)})

    groups = {}
    for cmd, app in commands.items():
        group = "django" if app == "django.core" else app.rpartition(".")[2]
        groups.setdefault(group, []).append(cmd)
    print(MARKER + json.dumps({g: sorted(c) for g, c in sorted(groups.items())}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
