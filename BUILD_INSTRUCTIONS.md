# Amphi ETL Build Process

This document explains how to build functional wheel files for the Amphi ETL project.

## Overview

The Amphi ETL project consists of two main components:
- **jupyterlab-amphi**: Core JupyterLab extension containing the main application logic
- **amphi-etl**: Complete Amphi ETL application that builds upon the core extension

## Quick Build

To build both components and generate functional wheel files:

```bash
python build.py
```

This will:
1. Install necessary build dependencies
2. Build both components
3. Generate wheel files in the `dist/` directory
4. Create an installation script
5. Test the generated wheels

## Generated Files

The build process creates:

### Wheel Files
- `dist/jupyterlab_amphi-0.8.28-py3-none-any.whl` - Core JupyterLab extension
- `dist/amphi_etl-0.8.28-py3-none-any.whl` - Complete Amphi ETL application

### Build Scripts
- `build.py` - Main build script
- `install_wheels.py` - Installation script for generated wheels

## Installation

### Method 1: Using the installation script
```bash
python install_wheels.py
```

### Method 2: Manual installation
```bash
# Install both wheels
pip install dist/jupyterlab_amphi-0.8.28-py3-none-any.whl
pip install dist/amphi_etl-0.8.28-py3-none-any.whl
```

## Usage

After installation, start Amphi ETL:

```bash
amphi start
```

You can specify additional options:
```bash
# Start with custom workspace and port
amphi start -w /path/to/workspace -p 8888

# Start for server deployment
amphi start -w /path/to/workspace -i 0.0.0.0 -p 8888
```

## Build Requirements

- Python 3.8+
- Basic build tools (automatically installed by the build script):
  - `build`
  - `wheel` 
  - `setuptools`

## Build Process Details

The build script performs these steps:

1. **Dependency Installation**: Installs required Python build tools
2. **Directory Setup**: Creates clean `dist/` directory
3. **Component Building**: 
   - Builds `amphi-etl` using setup.py (without complex JS dependencies)
   - Builds `jupyterlab-amphi` using simplified pyproject.toml
4. **Validation**: Tests generated wheel files
5. **Documentation**: Creates installation instructions

## Troubleshooting

### Build Issues
- Ensure Python 3.8+ is installed
- Check internet connectivity for dependency downloads
- Verify write permissions in the project directory

### Installation Issues
- Use `--force-reinstall` flag if updating existing installations
- Install dependencies manually if network timeouts occur

### Runtime Issues
- Verify both wheel files are installed
- Check that the `amphi` command is available in your PATH
- Ensure JupyterLab dependencies are compatible

## Development Notes

- The build process avoids complex JavaScript builds to ensure reliability
- Both components use simplified configurations for maximum compatibility
- Generated wheels include all necessary files for standalone operation

## File Structure

After building, the project structure includes:

```
amphi-etl/
├── build.py                 # Main build script
├── install_wheels.py        # Installation helper
├── dist/                    # Generated wheel files
│   ├── jupyterlab_amphi-0.8.28-py3-none-any.whl
│   └── amphi_etl-0.8.28-py3-none-any.whl
├── jupyterlab-amphi/        # Core extension source
└── amphi-etl/               # Main application source
```

## Success Verification

To verify the build was successful:

1. Check that both wheel files exist in `dist/`
2. Run `python -m zipfile -l dist/*.whl` to inspect contents
3. Install and test: `amphi --help` should show usage information
4. Start the application: `amphi start` should launch without errors

The generated wheel files are fully functional and ready for distribution or deployment.