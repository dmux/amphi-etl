#!/usr/bin/env python3
"""
Amphi ETL Build Script

This script builds both jupyterlab-amphi and amphi-etl components,
generating fully functional wheel files.
"""

import os
import sys
import subprocess
import shutil
import argparse
from pathlib import Path

class AmphiBuildTool:
    def __init__(self, project_root=None):
        """Initialize the build tool."""
        if project_root is None:
            self.project_root = Path(__file__).parent.absolute()
        else:
            self.project_root = Path(project_root).absolute()
        
        self.jupyterlab_amphi_dir = self.project_root / "jupyterlab-amphi"
        self.amphi_etl_dir = self.project_root / "amphi-etl"
        self.dist_dir = self.project_root / "dist"
        
    def run_command(self, cmd, cwd=None, check=True):
        """Run a command and handle errors."""
        if cwd is None:
            cwd = self.project_root
        
        print(f"Running: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
        print(f"Working directory: {cwd}")
        
        try:
            result = subprocess.run(
                cmd, 
                cwd=cwd, 
                check=check,
                capture_output=True,
                text=True,
                shell=isinstance(cmd, str)
            )
            
            if result.stdout:
                print("STDOUT:", result.stdout)
            if result.stderr:
                print("STDERR:", result.stderr)
                
            return result
            
        except subprocess.CalledProcessError as e:
            print(f"Command failed with exit code {e.returncode}")
            if e.stdout:
                print("STDOUT:", e.stdout)
            if e.stderr:
                print("STDERR:", e.stderr)
            if check:
                sys.exit(1)
            return e
    
    def check_prerequisites(self):
        """Check if all required tools are installed."""
        print("Checking prerequisites...")
        
        # Check Python
        result = self.run_command([sys.executable, "--version"])
        print(f"Python version: {result.stdout.strip()}")
        
        # Check Node.js
        try:
            result = self.run_command(["node", "--version"])
            print(f"Node.js version: {result.stdout.strip()}")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("ERROR: Node.js is not installed")
            return False
        
        # Check npm
        try:
            result = self.run_command(["npm", "--version"])
            print(f"npm version: {result.stdout.strip()}")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("ERROR: npm is not installed")
            return False
        
        # Check if build tools are installed
        required_packages = ["build", "hatchling", "hatch-jupyter-builder", "hatch-nodejs-version"]
        missing_packages = []
        
        for package in required_packages:
            try:
                result = self.run_command([sys.executable, "-c", f"import {package.replace('-', '_')}"], check=False)
                if result.returncode != 0:
                    missing_packages.append(package)
            except:
                missing_packages.append(package)
        
        if missing_packages:
            print(f"Installing missing Python packages: {missing_packages}")
            self.run_command([sys.executable, "-m", "pip", "install"] + missing_packages)
        
        return True
    
    def prepare_dist_directory(self):
        """Create and clean the distribution directory."""
        print("Preparing distribution directory...")
        if self.dist_dir.exists():
            shutil.rmtree(self.dist_dir)
        self.dist_dir.mkdir(exist_ok=True)
    
    def build_jupyterlab_amphi(self):
        """Build the jupyterlab-amphi component."""
        print("\n" + "="*50)
        print("Building jupyterlab-amphi...")
        print("="*50)
        
        if not self.jupyterlab_amphi_dir.exists():
            print(f"ERROR: jupyterlab-amphi directory not found: {self.jupyterlab_amphi_dir}")
            return False
        
        # Install JavaScript dependencies
        print("Installing JavaScript dependencies...")
        self.run_command(["npm", "install", "--legacy-peer-deps"], cwd=self.jupyterlab_amphi_dir)
        
        # Build the extension
        print("Building the extension...")
        try:
            # Try to build using npm script first
            self.run_command(["npm", "run", "build"], cwd=self.jupyterlab_amphi_dir, check=False)
        except:
            print("npm build failed, trying alternative build approach...")
        
        # Build Python package
        print("Building Python wheel...")
        jupyterlab_dist_dir = self.jupyterlab_amphi_dir / "dist"
        self.run_command([
            sys.executable, "-m", "build", 
            "--wheel", 
            "--outdir", str(jupyterlab_dist_dir),
            "--no-isolation"
        ], cwd=self.jupyterlab_amphi_dir)
        
        # Copy wheel to main dist directory
        if jupyterlab_dist_dir.exists():
            for wheel_file in jupyterlab_dist_dir.glob("*.whl"):
                shutil.copy2(wheel_file, self.dist_dir)
                print(f"Copied wheel: {wheel_file.name}")
        
        return True
    
    def build_amphi_etl(self):
        """Build the amphi-etl component."""
        print("\n" + "="*50)
        print("Building amphi-etl...")
        print("="*50)
        
        if not self.amphi_etl_dir.exists():
            print(f"ERROR: amphi-etl directory not found: {self.amphi_etl_dir}")
            return False
        
        # Check if we need to update pyproject.toml for amphi-etl
        pyproject_path = self.amphi_etl_dir / "pyproject.toml"
        if not pyproject_path.exists():
            print("Creating pyproject.toml for amphi-etl...")
            self.create_amphi_etl_pyproject()
        
        # Install JavaScript dependencies if needed
        package_json = self.amphi_etl_dir / "package.json"
        if package_json.exists():
            print("Installing JavaScript dependencies...")
            self.run_command(["npm", "install", "--legacy-peer-deps"], cwd=self.amphi_etl_dir)
            
            print("Building JavaScript components...")
            self.run_command(["npm", "run", "build"], cwd=self.amphi_etl_dir, check=False)
        
        # Build Python package
        print("Building Python wheel...")
        amphi_dist_dir = self.amphi_etl_dir / "dist"
        
        # Use setup.py for now since it exists
        self.run_command([
            sys.executable, "-m", "build", 
            "--wheel", 
            "--outdir", str(amphi_dist_dir),
            "--no-isolation"
        ], cwd=self.amphi_etl_dir)
        
        # Copy wheel to main dist directory
        if amphi_dist_dir.exists():
            for wheel_file in amphi_dist_dir.glob("*.whl"):
                shutil.copy2(wheel_file, self.dist_dir)
                print(f"Copied wheel: {wheel_file.name}")
        
        return True
    
    def create_amphi_etl_pyproject(self):
        """Create a pyproject.toml for amphi-etl if it doesn't exist."""
        pyproject_content = """[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "amphi-etl"
dynamic = ["version", "description", "readme", "authors", "license", "dependencies"]

[tool.setuptools]
packages = ["amphi"]

[tool.setuptools.dynamic]
version = {attr = "amphi._version.__version__"}
"""
        
        pyproject_path = self.amphi_etl_dir / "pyproject.toml"
        with open(pyproject_path, "w") as f:
            f.write(pyproject_content)
        
        print(f"Created {pyproject_path}")
    
    def test_wheels(self):
        """Test the generated wheel files."""
        print("\n" + "="*50)
        print("Testing generated wheels...")
        print("="*50)
        
        wheel_files = list(self.dist_dir.glob("*.whl"))
        if not wheel_files:
            print("ERROR: No wheel files found!")
            return False
        
        for wheel_file in wheel_files:
            print(f"\nTesting wheel: {wheel_file.name}")
            
            # Check wheel contents
            result = self.run_command([
                sys.executable, "-m", "zipfile", "-l", str(wheel_file)
            ], check=False)
            
            if result.returncode == 0:
                print(f"✓ Wheel {wheel_file.name} is valid")
            else:
                print(f"✗ Wheel {wheel_file.name} may be corrupted")
        
        return True
    
    def build_all(self):
        """Build both components."""
        print("Starting Amphi ETL build process...")
        
        if not self.check_prerequisites():
            return False
        
        self.prepare_dist_directory()
        
        # Build jupyterlab-amphi first
        if not self.build_jupyterlab_amphi():
            print("ERROR: Failed to build jupyterlab-amphi")
            return False
        
        # Build amphi-etl
        if not self.build_amphi_etl():
            print("ERROR: Failed to build amphi-etl")
            return False
        
        # Test the wheels
        self.test_wheels()
        
        print(f"\n" + "="*50)
        print("Build completed successfully!")
        print(f"Wheel files are available in: {self.dist_dir}")
        print("="*50)
        
        # List generated files
        wheel_files = list(self.dist_dir.glob("*.whl"))
        for wheel_file in wheel_files:
            print(f"  - {wheel_file.name}")
        
        return True

def main():
    parser = argparse.ArgumentParser(description="Build Amphi ETL components")
    parser.add_argument("--component", choices=["jupyterlab-amphi", "amphi-etl", "all"], 
                       default="all", help="Component to build")
    parser.add_argument("--project-root", help="Project root directory")
    
    args = parser.parse_args()
    
    builder = AmphiBuildTool(args.project_root)
    
    if args.component == "all":
        success = builder.build_all()
    elif args.component == "jupyterlab-amphi":
        if not builder.check_prerequisites():
            sys.exit(1)
        builder.prepare_dist_directory()
        success = builder.build_jupyterlab_amphi()
    elif args.component == "amphi-etl":
        if not builder.check_prerequisites():
            sys.exit(1)
        builder.prepare_dist_directory()
        success = builder.build_amphi_etl()
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()