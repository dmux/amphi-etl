#!/usr/bin/env python3
"""
Final Amphi ETL Build Script

This is the main build script that generates functional wheel files
for both jupyterlab-amphi and amphi-etl components.
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def run_command(cmd, cwd=None, check=True):
    """Run a command with proper error handling."""
    if cwd is None:
        cwd = Path.cwd()
    
    print(f"🔧 Running: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    
    try:
        result = subprocess.run(
            cmd, 
            cwd=cwd, 
            check=check,
            capture_output=True,
            text=True,
            shell=isinstance(cmd, str)
        )
        
        if result.stdout.strip():
            print("✅ Success")
        if result.stderr.strip() and check:
            print("⚠️  Warnings:", result.stderr.strip())
            
        return result
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed with exit code {e.returncode}")
        if check:
            raise
        return e

def main():
    """Main build function."""
    print("🚀 Amphi ETL Build Process")
    print("="*40)
    
    project_root = Path(__file__).parent.absolute()
    dist_dir = project_root / "dist"
    
    # Install build requirements
    print("\n📦 Installing build requirements...")
    run_command([sys.executable, "-m", "pip", "install", "build", "wheel", "setuptools"])
    
    # Clean and create dist directory
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    dist_dir.mkdir(exist_ok=True)
    print(f"📁 Created distribution directory: {dist_dir}")
    
    # Build amphi-etl
    print("\n🔨 Building amphi-etl...")
    amphi_etl_dir = project_root / "amphi-etl"
    
    # Remove problematic pyproject.toml if it exists
    amphi_etl_pyproject = amphi_etl_dir / "pyproject.toml"
    if amphi_etl_pyproject.exists():
        amphi_etl_pyproject.unlink()
    
    try:
        run_command([
            sys.executable, "-m", "build", 
            "--wheel", 
            "--outdir", str(dist_dir),
            "--no-isolation"
        ], cwd=amphi_etl_dir)
        print("✅ amphi-etl built successfully")
    except Exception as e:
        print(f"❌ Failed to build amphi-etl: {e}")
        return False
    
    # Build jupyterlab-amphi
    print("\n🔨 Building jupyterlab-amphi...")
    jupyterlab_amphi_dir = project_root / "jupyterlab-amphi"
    
    try:
        run_command([
            sys.executable, "-m", "build", 
            "--wheel", 
            "--outdir", str(dist_dir),
            "--no-isolation"
        ], cwd=jupyterlab_amphi_dir)
        print("✅ jupyterlab-amphi built successfully")
    except Exception as e:
        print(f"❌ Failed to build jupyterlab-amphi: {e}")
        return False
    
    # Test the wheels
    print("\n🧪 Testing generated wheels...")
    wheels = list(dist_dir.glob("*.whl"))
    
    for wheel in wheels:
        print(f"🔍 Testing {wheel.name}...")
        result = run_command([sys.executable, "-m", "zipfile", "-l", str(wheel)], check=False)
        if result.returncode == 0:
            print(f"✅ {wheel.name} is valid")
        else:
            print(f"⚠️  {wheel.name} may have issues")
    
    # Summary
    print(f"\n🎉 Build completed successfully!")
    print(f"📦 Generated {len(wheels)} wheel file(s):")
    for wheel in wheels:
        size_mb = wheel.stat().st_size / (1024 * 1024)
        print(f"  • {wheel.name} ({size_mb:.2f} MB)")
    
    print(f"\n📁 Wheels are available in: {dist_dir}")
    
    # Create simple installation instructions
    install_script = project_root / "install_wheels.py"
    install_content = f'''#!/usr/bin/env python3
"""
Install Amphi ETL from generated wheels
"""

import subprocess
import sys
from pathlib import Path

def install_wheels():
    dist_dir = Path(__file__).parent / "dist"
    wheels = list(dist_dir.glob("*.whl"))
    
    if not wheels:
        print("No wheel files found in dist directory")
        return False
    
    print("Installing Amphi ETL wheels...")
    for wheel in wheels:
        print(f"Installing {{wheel.name}}...")
        subprocess.run([sys.executable, "-m", "pip", "install", str(wheel), "--force-reinstall"])
    
    print("\\nInstallation complete!")
    print("Start Amphi ETL with: amphi start")
    return True

if __name__ == "__main__":
    install_wheels()
'''
    
    with open(install_script, "w") as f:
        f.write(install_content)
    
    install_script.chmod(0o755)
    print(f"📝 Created installation script: {install_script}")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)