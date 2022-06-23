const fs = require('fs').promises;
const path = require('path');

const express = require('express');
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

const homePageTitle = "Film Noir Thematic Database";

//Functions called by the Express HTTP method callbacks

const getData = async (fileNames) => {
    const dataSet = [];
    for (let fileName of fileNames) {
        const rawData = await fs.readFile(fileName);
        const data = await JSON.parse(rawData);
        dataSet.push(data);
    }
    return dataSet;
}

const getSceneCaption = (pic) => {
    const { stars, film } = pic;
    if (!stars) {
        pic.caption = film;
    } else if (stars.length === 1) {
        pic.caption = `${stars[0]} in ${film}`;
    } else if (stars.length === 2) {
        pic.caption = `${stars[0]} and ${stars[1]} in ${film}`;
    } else if (stars.length > 2) {
        const body = stars.slice(0, stars.length - 1);
        const tail = ` and ${stars[stars.length - 1]} in ${film}`;
        pic.caption = body.join(", ") + tail;
    }
}

const getPosterCaption = (pic) => {
    const { origin, film } = pic;
    if (!origin) {
        pic.caption = film;
    } else {
        pic.caption = `${origin} poster for ${film}`;
    }
}

const getTooltip = (pic, filmData) => {
    if (!pic.film) {
        pic.tooltip = pic.type;
        return;
    }
    const targetFilm = filmData.find(film => film.title === pic.film);
    const { title, year } = targetFilm;
    let tooltip = `${title} (${year})`;
    tooltip = tooltip.replace(/[ ]/g, "\u00a0");
    pic.tooltip = tooltip;
}

const getRand = (arr) => {
    const randPos = Math.floor(Math.random() * arr.length);
    return arr[randPos];
}

const getCredits = (film) => {
    const targetKeys = ["directors", "producers", "writers", "stars", "distributors"];
    const entries = Object.entries(film);
    const targetEntries = entries.filter(entry => targetKeys.includes(entry[0]));
    const credits = [];
    const bgdark = "bg-dark text-light";
    const blank = "";
    for (let i = 0; i < targetEntries.length; i++) {
        const line = [];
        const keyRest = targetEntries[i][0].slice(1);
        const keyFirst = targetEntries[i][0][0].toUpperCase();
        let key = keyFirst + keyRest;
        let val = targetEntries[i][1];
        if (val.length === 1) key = key.slice(0, key.length - 1);
        key = key + ":";
        val = val.join(", ");
        if (i % 2 === 0) {
            line.push(key, val, bgdark, blank);
        } else {
            line.push(key, val, blank, bgdark);
        }
        credits.push(line);
    }
    return credits;
}

const getTableData = (credits, films) => {
    const headers = [];
    for (let credit of credits) {
        const first = credit[0].toUpperCase();
        const rest = credit.slice(1);
        headers.push(first + rest);
    }
    const filmCredits = [];
    for (let film of films) {
        const filmCreditsRow = [];
        for (let credit in film) {
            if (credits.includes(credit)) {
                if (Array.isArray(film[credit])) {
                    filmCreditsRow.push(film[credit].join(", "));
                } else {
                    filmCreditsRow.push(film[credit]);
                }
            }
        }
        filmCredits.push(filmCreditsRow);
    }
    return [headers, filmCredits];
}

const getThemesFormat = (themes) => {
    const { length } = themes;
    for (let i = 0; i < length; i++) {
        let align = "";
        let color = "text-success";
        if ((length % 3 === 1 && i === length - 1) || ((i + 1) % 3 === 2)) align = "text-center";
        if ((length % 3 === 2 && i === length - 1) || ((i + 1) % 3 === 0)) align = "text-end";
        if (i % 2 === 0) color = "text-danger";
        themes[i].align = align;
        themes[i].color = color;
    }
}

//Express HTTP method callbacks

const renderHome = async (req, res) => {
    try {
        const data = await getData(['filmdata.json', 'pics.json']);
        const mainPics = data[1].filter(pic => pic.rank === "main" && pic.type === "scene");
        const mainRandPic = getRand(mainPics);
        getSceneCaption(mainRandPic);
        getTooltip(mainRandPic, data[0]);
        const secPics = data[1].filter(pic => pic.rank === "secondary");
        const secRandPics = [getRand(secPics), getRand(secPics), getRand(secPics)];
        res.render('home', { filmData: data[0], mainPic: mainRandPic, secPics: secRandPics, pageTitle: homePageTitle });
    }
    catch (err) {
        console.error(err);
    }
}

const renderFilmPage = async (req, res) => {
    try {
        const data = await getData(['filmdata.json', 'pics.json', 'themedata.json']);
        const { film } = req.params;
        const filmData = data[0].find(f => f.path === film);
        const filmThemes = data[2].filter(theme => theme.films.includes(filmData.title));
        getThemesFormat(filmThemes);
        filmData.themes = filmThemes;
        const credits = getCredits(filmData);
        const mainPic = data[1].find(pic => pic.type === "poster" && pic.film === filmData.title);
        getPosterCaption(mainPic);
        getTooltip(mainPic, data[0]);
        const secPics = data[1].filter(pic => pic.rank === "secondary");
        const secRandPics = [getRand(secPics), getRand(secPics), getRand(secPics)];
        res.render('filmpage', { filmData: filmData, mainPic: mainPic, secPics: secRandPics, credits: credits });
    }
    catch (err) {
        console.error(err);
    }
}

const renderThemes = async (req, res) => {
    try {
        const data = await getData(['filmdata.json', 'pics.json', 'themedata.json']);
        for (let theme of data[2]) {
            const pics = data[1].filter(pic => pic.type === "scene" && pic.themeIds.includes(theme.id));
            const noPic = data[1].find(pic => pic.rank === "nopic");
            pics.length ? theme.pic = getRand(pics) : theme.pic = noPic;
            getTooltip(theme.pic, data[0]);
        }
        getThemesFormat(data[2]);
        const secPics = data[1].filter(pic => pic.rank === "secondary");
        const secRandPics = [getRand(secPics), getRand(secPics), getRand(secPics)];
        res.render('themes', { pageTitle: "Themes", themeData: data[2], secPics: secRandPics });
    }
    catch (err) {
        console.error(err);
    }
}

const renderThemePage = async (req, res) => {
    try {
        const data = await getData(['filmdata.json', 'pics.json', 'themedata.json']);
        const { theme } = req.params;
        const themeData = data[2].find(t => t.id === theme);
        const pics = data[1].filter(pic => pic.type === "scene" && pic.themeIds.includes(themeData.id));
        const noPic = data[1].find(pic => pic.rank === "nopic");
        pics.length ? themeData.pic = getRand(pics) : themeData.pic = noPic;
        getSceneCaption(themeData.pic);
        getTooltip(themeData.pic, data[0]);
        const themeFilms = data[0].filter(film => themeData.films.includes(film.title));
        const tableData = getTableData(["title", "year", "directors", "distributors"], themeFilms);
        const secPics = data[1].filter(pic => pic.rank === "secondary");
        const secRandPics = [getRand(secPics), getRand(secPics), getRand(secPics)];
        res.render('themepage', { themeData: themeData, tableData: tableData, themeFilms: themeFilms, mainPic: themeData.pic, secPics: secRandPics });
    }
    catch (err) {
        console.error(err);
    }
}

const renderAddFilm = async (req, res) => {
    try {
        const data = await getData(['filmdata.json', 'pics.json', 'themedata.json']);
        const secPics = data[1].filter(pic => pic.rank === "secondary");
        const secRandPics = [getRand(secPics), getRand(secPics), getRand(secPics)];
        res.render('addfilm', { pageTitle: "Add Film", secPics: secRandPics });
    }
    catch (err) {
        console.error(err);
    }
}

const addFilmReq = async (req, res) => {
    try {
        const data = await getData(['filmdata.json']);
        data[0].push(req.body);
        console.log(data[0]);
        res.send("Request received.")
    }
    catch (err) {
        console.error(err);
    }
}

//Express HTTP methods

app.get('/', renderHome);

app.get('/themes', renderThemes);

app.get('/f/:film', renderFilmPage);

app.get('/t/:theme', renderThemePage);

app.get('/add/film', renderAddFilm);

app.post('/add/film/request', addFilmReq);

//Listen

app.listen(3000, () => {
    console.log("LISTENING ON 3000");
})