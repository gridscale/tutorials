// global settings
const DIR_DIST = __dirname + '/dist/';
const DIR_JS = __dirname + '/js/';
const FILE_MAIN_SCSS = __dirname + '/css/main.scss';

// import 1st party requirements (are included in Node.js)
const childProcess = require('child_process'); // required to spawn additonal processes / execute shell commands
const events = require('events'); // required for event handling
const fs = require('fs'); // required for file system operations
const https = require('https');
const os = require('os'); // required to gather information from operating system (we use it to get the username)
const readline = require("readline").createInterface({ 
    input: process.stdin,
    output: process.stdout
}); // required (and set up) to gather some input from the user


// import 3rd party requirements (have to be installed via `npm i --save-dev browserify sass`)
const browserify = require('browserify'); // this compiles our javascript files, including all dependencies
const sass = require('sass'); // this compiles our CSS files

// we wrap our logic into an async function so we can use the `await` construct to keep a synchronous code style
(async function () {
    // ensure that dist directory exists and is empty
    childProcess.execSync('mkdir -p ' + DIR_DIST); // we use shell command here, because this silently quits if directory exists
    childProcess.execSync('rm -rf ' + DIR_DIST + '*'); // we use shell command here, because recursive removal is experimental in `fs`

    // ensure all packages of the main app are up-to-date before building
    childProcess.execSync('npm i --prod', { cwd: __dirname });

    
    var releaseType;
    var releaseDescription;
    readline.question("What kind of release are you deploying (P)atch, (M)inor, M(a)jor?\n", _releaseType => {
        if (!_releaseType.match(/^[PMA]$/i)) throw new Error('Invalid answer!');
        releaseType = _releaseType;

        readline.question("Short description of whats included in the release?\n", _releaseDescription => {
            if (!_releaseDescription.match(/^(\w+\s?){10,}/)) throw new Error('Please enter a short description, minimum 10 characters!');
            releaseDescription = _releaseDescription;

            readline.close(); // resolves the promise we are waiting for further execution
        });
    });
    await events.once(readline, 'close');

    switch (releaseType.toLowerCase()) {
        case 'p':
            childProcess.execSync('npm version patch', { cwd: __dirname }); 
            break;
        case 'm':
            childProcess.execSync('npm version minor', { cwd: __dirname }); 
            break;
        case 'a':
            childProcess.execSync('npm version major', { cwd: __dirname }); 
            break;
    }


    // collect all the javascript files we have and add to browserify
    var b = browserify();
    fs.readdirSync(DIR_JS)
        .forEach(file => b.add(DIR_JS + file));
    // compile javascript!
    var distJS = fs.createWriteStream(DIR_DIST + 'main.js');
    b.bundle().pipe(distJS);
    await events.once(distJS, 'close'); // wait with further execution until stream is closed


    // compile sass to CSS, using the `sass` package
    var sassResult = sass.renderSync({file: FILE_MAIN_SCSS});
    fs.writeFileSync(DIR_DIST + 'style.css', sassResult.css);
    
    // create a ZIP file from our dist dir
    childProcess.execSync('zip ' + __dirname + '/dist.zip ' + DIR_DIST + '*');


    // run integration tests
    childProcess.execSync('myTestSuite --resultfile=' + __dirname + '/tmp/integrationtest.json'); // "myTestSuite" is a placeholder here - testing is out of scope for this article
    var testResults = JSON.parse(fs.readFileSync(__dirname + '/tmp/integrationtest.json', 'utf8'));

    if (testResults.tests === testResults.passed) {
        // all tests passed, trigger the deployment

        // initialize POST request to our deploy service
        const req = https.request('https://myUrl.com/myDeployService', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (result) => {
            console.log('Deploy Service result: ' + result.statusCode);
        });

        req.on('error', (e) => {
            console.error(`problem with deploy request: ${e.message}`);
        });


        // set request body
        req.write(JSON.stringify({
            deployer: os.userInfo().username,
            testResults: testResults,
            releaseDescription: releaseDescription,
            applicationZip: fs.readFileSync(__dirname + '/dist.zip')
        }));
        
        // executes the request
        req.end();
    }
})();

