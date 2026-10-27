# Change Log

All notable changes to the "django-commands" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.0]

- All `manage.py` files in the workspace are found and commands are grouped by project
- Hidden folders (`.venv`, `.uv-cache`, ...) and `site-packages` are skipped when searching for `manage.py`
- Python interpreter is taken from the nearest `.venv`/`venv`, falling back to the Python extension
- Faster command loading (settings only, without `django.setup()`), commands are cached and refreshed in background
- One reusable terminal per project, a new one is opened only when the previous command is still running
- Fixed: cancelling the picker closed the active terminal
- Fixed: debugging a command without arguments failed
- Fixed: settings changes were applied only after reload

## [0.0.2] - 2025-07-26

- Support for Python extension API before 2024.23 (Python 2.7 projects)
- Bug fixes

## [0.0.1] - 2025-07-26

- Initial release
