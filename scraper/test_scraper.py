#!/usr/bin/env python3
"""Simple test to verify scraper setup"""

import sys

print("Python version:", sys.version)
print("\nTesting imports...")

try:
    import requests
    print("✓ requests installed")
except ImportError:
    print("✗ requests NOT installed - run: pip install requests")

try:
    from bs4 import BeautifulSoup
    print("✓ beautifulsoup4 installed")
except ImportError:
    print("✗ beautifulsoup4 NOT installed - run: pip install beautifulsoup4")

try:
    import json
    import os
    print("✓ Standard library modules available")
except ImportError:
    print("✗ Standard library issue")

print("\nChecking matchups.json...")
if os.path.exists("../matchups.json"):
    print("✓ matchups.json found")
    with open("../matchups.json", 'r') as f:
        data = json.load(f)
        print(f"  Found {len(data)} character entries")
else:
    print("✗ matchups.json NOT found")

print("\nTest complete!")

