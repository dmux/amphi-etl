#!/usr/bin/env python3
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
        print(f"Installing {wheel.name}...")
        subprocess.run([sys.executable, "-m", "pip", "install", str(wheel), "--force-reinstall"])
    
    print("\nInstallation complete!")
    print("Start Amphi ETL with: amphi start")
    return True

if __name__ == "__main__":
    install_wheels()
