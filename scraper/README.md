# Naruto Character Image Scraper

This script scrapes character profile images from the Naruto Fandom Wiki and saves them locally.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Usage

Run the scraper:
```bash
python scrape_images.py
```

The script will:
1. Read character names from `../matchups.json`
2. Visit each character's wiki page
3. Extract the profile image URL
4. Download images to `../img/` folder

## Output

Images are saved to `../img/` with filenames based on character names (e.g., `Naruto_Uzumaki.png`)

## Notes

- The script includes a 1-second delay between requests to avoid rate limiting
- Already downloaded images are skipped
- Failed downloads are reported at the end

