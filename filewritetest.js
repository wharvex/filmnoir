const fs = require('fs');
const { readFileSync, writeFile } = fs;
const rawFilmData = readFileSync('filmdata.json');
const filmData = JSON.parse(rawFilmData);
const rawThemesData = readFileSync('themesdata.json');
const themesData = JSON.parse(rawThemesData);

for (let theme of themesData) {
    const targetFilms = filmData.filter(film => film.themeids.includes(theme.id));
    theme.films = targetFilms.map(film => film.title);
}

const rawThemeData = JSON.stringify(themesData);

writeFile('themedata.json', rawThemeData, (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
});