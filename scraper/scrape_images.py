#!/usr/bin/env python3
"""
Scrape character profile images from Naruto Fandom Wiki
Downloads images to ../img/ folder
"""

import os
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, quote
import time
import sys

# Configuration
WIKI_BASE_URL = "https://naruto.fandom.com/wiki/"
IMG_DIR = "../img"
DELAY_BETWEEN_REQUESTS = 1  # seconds to avoid rate limiting

def get_character_slug(character_name):
    """Convert character name to wiki URL slug"""
    # Remove parenthetical content
    clean_name = character_name.split('(')[0].strip()
    # Replace spaces with underscores
    slug = clean_name.replace(' ', '_')
    return slug

def scrape_character_image(character_name):
    """Scrape image URL for a character from their wiki page"""
    slug = get_character_slug(character_name)
    url = f"{WIKI_BASE_URL}{quote(slug)}"
    
    # Get first name for data-image-name attribute
    first_name = character_name.split('(')[0].strip().split()[0]  # Get first word
    
    print(f"Fetching: {character_name} -> {url}")
    print(f"  Looking for data-image-name=\"{first_name}\"")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Helper function for fuzzy matching data-image-name
        def matches_image_name(attr_value, search_name):
            """Check if data-image-name matches (exact, with .png, or contains)"""
            if not attr_value:
                return False
            attr_lower = attr_value.lower()
            search_lower = search_name.lower()
            # Exact match
            if attr_lower == search_lower:
                return True
            # Match with .png extension (e.g., "Haku.png")
            if attr_lower == f"{search_lower}.png":
                return True
            # Contains match (case insensitive)
            if search_lower in attr_lower:
                return True
            return False
        
        # Primary: Look for img tag with data-image-name matching first name (fuzzy)
        img = soup.find('img', {'data-image-name': lambda x: matches_image_name(x, first_name)})
        
        if not img:
            # Try with full name (without parentheses)
            full_name = character_name.split('(')[0].strip()
            img = soup.find('img', {'data-image-name': lambda x: matches_image_name(x, full_name)})
        
        if not img:
            # Fallback: Look for img with class "mw-file-element" and fuzzy match
            img = soup.find('img', {'class': 'mw-file-element', 'data-image-name': lambda x: matches_image_name(x, first_name)})
        
        if not img:
            # Fallback: Look for any img with data-image-name fuzzy matching first name
            img = soup.find('img', {'data-image-name': lambda x: matches_image_name(x, first_name)})
        
        if not img:
            # Fallback: Look for img with alt attribute containing first name
            img = soup.find('img', {'alt': lambda x: x and matches_image_name(x, first_name)})
        
        if not img:
            # Fallback: Look for img with alt attribute containing full name
            full_name = character_name.split('(')[0].strip()
            img = soup.find('img', {'alt': lambda x: x and matches_image_name(x, full_name)})
        
        if not img:
            # Last fallback: Look for image in infobox with mw-file-element class
            infobox = soup.find('aside', {'class': 'portable-infobox'})
            if infobox:
                img = infobox.find('img', {'class': 'mw-file-element'})
        
        if img and img.get('src'):
            img_url = img['src']
            print(f"  Found image: {img_url}")
            print(f"  Using exact URL from src attribute: {img_url}")
            return img_url
        
        print(f"  ⚠️  No image found for {character_name} (searched for data-image-name=\"{first_name}\")")
        return None
        
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Error fetching {character_name}: {e}")
        return None
    except Exception as e:
        print(f"  ❌ Unexpected error for {character_name}: {e}")
        import traceback
        traceback.print_exc()
        return None

def download_image(img_url, character_name):
    """Download image and save to img folder"""
    if not img_url:
        return False
    
    try:
        # Create filename from character name
        clean_name = character_name.split('(')[0].strip()
        filename = clean_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
        filename = ''.join(c for c in filename if c.isalnum() or c in ('_', '-'))
        
        # Determine file extension from URL
        ext = '.png'
        if '.jpg' in img_url.lower() or '.jpeg' in img_url.lower():
            ext = '.jpg'
        elif '.gif' in img_url.lower():
            ext = '.gif'
        
        filepath = os.path.join(IMG_DIR, f"{filename}{ext}")
        
        # Skip if already exists
        if os.path.exists(filepath):
            print(f"  ✓ Image already exists: {filename}{ext}")
            return True
        
        # Download image
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(img_url, headers=headers, timeout=10, stream=True)
        response.raise_for_status()
        
        # Save image
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"  ✓ Downloaded: {filename}{ext}")
        return True
        
    except Exception as e:
        print(f"  ❌ Error downloading image for {character_name}: {e}")
        return False

def load_image_links():
    """Load image links from image_links.txt file"""
    image_links_file = "../image_links.txt"
    image_links_map = {}
    
    if os.path.exists(image_links_file):
        with open(image_links_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        # Skip header lines (first 3 lines: header, separator, empty)
        for line in lines[3:]:
            line = line.strip()
            if not line or line.startswith('='):
                continue
            
            # Parse format: "Character Name https://url"
            # Find the first occurrence of "https://" to separate name from URL
            if 'https://' in line:
                url_start = line.find('https://')
                character_name = line[:url_start].strip()
                image_url = line[url_start:].strip()
                
                if character_name and image_url:
                    image_links_map[character_name] = image_url
                    # Also add without parentheses content for matching
                    clean_name = character_name.split('(')[0].strip()
                    if clean_name != character_name:
                        image_links_map[clean_name] = image_url
    
    return image_links_map

def main():
    """Main function to scrape all character images"""
    # Force output to be unbuffered
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__
    
    # Create img directory if it doesn't exist
    os.makedirs(IMG_DIR, exist_ok=True)
    print(f"Created/verified image directory: {IMG_DIR}")
    
    # Load image links from image_links.txt
    image_links_map = load_image_links()
    if image_links_map:
        print(f"Loaded {len(image_links_map)} image links from image_links.txt\n")
    
    # Load character list from matchups.json
    matchups_file = "../matchups.json"
    if not os.path.exists(matchups_file):
        print(f"Error: {matchups_file} not found!")
        return
    
    with open(matchups_file, 'r', encoding='utf-8') as f:
        matchups_data = json.load(f)
    
    # Extract all unique character names
    characters = set()
    for entry in matchups_data:
        for character in entry.keys():
            characters.add(character)
    
    characters = sorted(list(characters))
    print(f"Found {len(characters)} characters to scrape\n")
    
    # Helper function to check if image already exists
    def image_exists(character_name):
        """Check if image file already exists for character"""
        clean_name = character_name.split('(')[0].strip()
        filename = clean_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
        filename = ''.join(c for c in filename if c.isalnum() or c in ('_', '-'))
        
        # Check common image extensions
        for ext in ['.png', '.jpg', '.jpeg', '.gif']:
            filepath = os.path.join(IMG_DIR, f"{filename}{ext}")
            if os.path.exists(filepath):
                return True, filepath
        return False, None
    
    # Scrape images
    success_count = 0
    failed_count = 0
    skipped_count = 0
    not_found_characters = []
    
    for i, character in enumerate(characters, 1):
        print(f"[{i}/{len(characters)}] {character}")
        
        # Check if image already exists
        exists, filepath = image_exists(character)
        if exists:
            print(f"  ⏭️  Skipping - image already exists: {os.path.basename(filepath)}")
            skipped_count += 1
            success_count += 1  # Count as success since we have the image
            continue
        
        # Check if we have a direct image link from image_links.txt
        img_url = None
        clean_character_name = character.split('(')[0].strip()
        
        if character in image_links_map:
            img_url = image_links_map[character]
            print(f"  📎 Using image link from image_links.txt")
        elif clean_character_name in image_links_map:
            img_url = image_links_map[clean_character_name]
            print(f"  📎 Using image link from image_links.txt (matched clean name)")
        
        # If no direct link, try scraping
        if not img_url:
            img_url = scrape_character_image(character)
        
        if img_url:
            if download_image(img_url, character):
                success_count += 1
            else:
                failed_count += 1
                not_found_characters.append(character)
        else:
            failed_count += 1
            not_found_characters.append(character)
        
        # Be nice to the server
        if i < len(characters):
            time.sleep(DELAY_BETWEEN_REQUESTS)
    
    # Write not found characters to file
    not_found_file = "../not_found_characters.txt"
    if not_found_characters:
        with open(not_found_file, 'w', encoding='utf-8') as f:
            f.write("Characters whose images were not found:\n")
            f.write("=" * 50 + "\n\n")
            for char in sorted(not_found_characters):
                f.write(f"{char}\n")
        print(f"\n⚠️  {len(not_found_characters)} characters not found - saved to {not_found_file}")
    else:
        # Create empty file or clear existing one
        with open(not_found_file, 'w', encoding='utf-8') as f:
            f.write("All character images found successfully!\n")
    
    print(f"\n{'='*50}")
    print(f"Scraping complete!")
    print(f"Success: {success_count}")
    print(f"Skipped (already exists): {skipped_count}")
    print(f"Failed: {failed_count}")
    if not_found_characters:
        print(f"Not found: {len(not_found_characters)} (see {not_found_file})")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()

