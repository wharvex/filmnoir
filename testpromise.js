const fs = require('fs').promises;

async function getFilmData() {
    const rawData = await fs.readFile('filmdata.json');
    const parsedData = await JSON.parse(rawData);
    console.log(parsedData);
}
getFilmData();