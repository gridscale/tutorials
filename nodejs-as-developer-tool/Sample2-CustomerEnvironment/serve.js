const DIR_APP = __dirname + '/app/';
const DIR_CUSTOMER = __dirname + '/customers/';
const DIR_DIST = __dirname + '/dist/';

const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const sass = require('sass');


// gather customer key from argument
var customer = process.argv[2] || undefined; // `process` is a global available variable

if (customer !== undefined && !fs.existsSync(DIR_CUSTOMER + '/' + customer)) {
    throw new Error('Customer ' + customer + ' does not exist');
}

// create temp dir and ensure it's empty
childProcess.execSync('mkdir -p ' + DIR_DIST);
childProcess.execSync('rm -rf ' + DIR_DIST + '*');

// copy app files to temp dir
childProcess.execSync('cp ' + DIR_APP + 'index.html ' + DIR_DIST);
childProcess.execSync('cp -r ' + DIR_APP + '*.scss ' + DIR_DIST);
childProcess.execSync('cp -r ' + DIR_APP + '*.js ' + DIR_DIST);

if (customer !== undefined) {
    childProcess.execSync('cp ' + DIR_CUSTOMER + '/' + customer + '/_theme.scss ' + DIR_DIST);
}

// compile sass
var sassResult = sass.renderSync({ file: DIR_DIST + 'style.scss' });
fs.writeFileSync(DIR_DIST + 'style.css', sassResult.css);

// merge settings json
var baseJSON = JSON.parse(fs.readFileSync(DIR_APP + 'settings.json', 'utf8'));
var customerJSON = {};
if (customer !== undefined) {
    customerJSON = JSON.parse(fs.readFileSync(DIR_CUSTOMER + '/' + customer + '/settings.json', 'utf8'));
}

var mergedJSON = Object.assign(baseJSON, customerJSON);
fs.writeFileSync(DIR_DIST + 'settings.json', JSON.stringify(mergedJSON));

// start simple webserver
http.createServer(function (req, res) {
    var file = DIR_DIST.replace(/\/$/, '') + req.url || '/index.html';
    fs.readFile(file, function (err, data) {
        if (err) {
            console.error(file, ' not found');
            res.writeHead(404);
            res.end(JSON.stringify(err));
            return;
        }
        console.info('Serving ', file)
        res.writeHead(200);
        res.end(data);
    });
}).listen(8080);

console.info('Open http://localhost:8080 to see the result');



