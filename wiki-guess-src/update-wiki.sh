sed -i '' 's/const wikiLang = gameLang ?? lang;/const wikiLang = gameLang || lang;/g' src/App.jsx
