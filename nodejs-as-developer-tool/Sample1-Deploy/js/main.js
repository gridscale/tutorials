var gridscale = require('@gridscale/api').gridscale;
var client = new gridscale.Client('xyz', 'abc');

client.Server.list().then((result) => {
    console.log(result);
})
.catch((e) => {
    console.error(e);
});