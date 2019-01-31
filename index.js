const requestPromise = require('request-promise');
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const Json2csvParser = require('json2csv').Parser;

const URL = "https://www.imdb.com/title/tt8291226/";

const head = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.5',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'DNT': '1',
    'Host': 'www.imdb.com',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36'
};


(async () => {
    const response = await requestPromise({
        uri: URL,
        headers: head,
        gzip: true
    });
    
    let $ = cheerio.load(response);

    let movies = [];
        $('span[id ^= "trending-list-rank-item-name-"] > a[href^="/title/"]').each((i, elm) => {
        let movie = {
            url: "https://www.imdb.com" + $(elm).attr('href'),
            id: $(elm).text()
        };
        movies.push(movie);
    });

    console.log(movies);

    (async () => {
        let moviesData = [];
        for(let link of movies) {
            const response = await requestPromise({
                uri: link.url,
                headers: head,
                gzip: true
            });
            
            let $ = cheerio.load(response);

            let title = $('div[class = "title_wrapper"] > h1').text().trim();
            let rating = $('span[itemprop = "ratingValue"]').text();
            let poster = $('div[class="poster"] > a > img').attr('src');
            let totalRatings = $('div[class = "imdbRating"] > a').text();
            let releaseDate = $('a[title="See more release dates"]').text().trim();
        
            let genres = [];
            $('div[class = "title_wrapper"] a[href^="/search/title?genres="]').each((i, elm) => {
                let genre = $(elm).text();
                genres.push(genre);
            });
            
            moviesData.push({
                title,
                rating,
                poster,
                totalRatings,
                releaseDate,
                genres 
            });
            
            let clean = link.id;
            clean = clean.replace(/[^a-z0-9\s]/gi, '');
            let name = clean+ ".png";
            let file = fs.createWriteStream(name); 

            await new Promise((resolve, reject) => {
                let stream = request({
                    uri: poster,
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Cache-Control': 'max-age=0',
                        'Connection': 'keep-alive',
                        'DNT': '1',
                        'Upgrade-Insecure-Requests': '1',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36'
                    },
                    gzip: true
                })
                .pipe(file)
                .on('finish', () => {
                    console.log(`${link.id} has Finished Downloading images.....`);
                    resolve();
                })
                .on('error', (error) => {
                    reject(error); 
                })
            })
            .catch(error => {
                console.log(`${link.id} has an Error....... ${error}`);
            });

        };

        const json2csvParser = new Json2csvParser();
        const csv = json2csvParser.parse(moviesData);
        
        console.log("Started writing CSV file");
        fs.writeFileSync('./data.csv', csv, 'utf-8');
        console.log("Finished writing CSV file");

        console.log("Started writing JSON file");
        fs.writeFileSync('./data.json', JSON.stringify(moviesData), 'utf-8');
        console.log("Finished writing JSON file");

        // console.log(moviesData);
    })()



})()