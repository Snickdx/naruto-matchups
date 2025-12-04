#!/bin/bash

echo "Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "Running scraper..."
python scrape_images.py

echo ""
echo "Done! Check the ../img folder for downloaded images."

