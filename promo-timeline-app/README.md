# Promo Timeline App

## Overview
The Promo Timeline App is a web application designed to display promotional timelines for PerfectDraft products. It extracts timeline items from an HTML document and stores them in a JSON database for easy access and manipulation.

## Project Structure
The project consists of the following files and directories:

```
promo-timeline-app
├── src
│   ├── index.html          # HTML structure of the application
│   ├── styles.css          # CSS styles for the application
│   ├── db
│   │   └── timeline-items.json  # Database for storing timeline items
│   └── scripts
│       └── main.js         # JavaScript code for parsing and data handling
├── package.json            # Configuration file for npm
└── README.md               # Documentation for the project
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd promo-timeline-app
   ```

2. Install the dependencies:
   ```
   npm install
   ```

## Usage
1. Open `src/index.html` in a web browser to view the promotional timeline.
2. The application will automatically parse the timeline items from the HTML and store them in `src/db/timeline-items.json`.

## Development
- To modify the styles, edit `src/styles.css`.
- To change the HTML structure, update `src/index.html`.
- For JavaScript functionality, make changes in `src/scripts/main.js`.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.

## License
This project is licensed under the MIT License.