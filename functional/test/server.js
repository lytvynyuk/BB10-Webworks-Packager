function Server() {
    this.start = function  () {
        var http = require('http');
        //process.send({ msg: 'start'});
        http.createServer(function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            var data = "",
                report;
            req.on("data", function(chunk) {
                data += chunk;
            });
            req.on("end", function () {
                report = JSON.parse(data);
                console.log(report);
                process.nextTick(function () {
                    process.send({ msg: 'Response Received', status: report.status});
                });
                res.end('I am dummy page.\n');
            });
            }).listen(9644);
    };
    this.stop = function () {
        process.nextTick(function () {
            process.send({ msg: 'stop'});
            process.exit(0);
        });
    };
}

var server = new Server();

process.on('message', function (msg) {
    console.log('The parent says: ', msg);
    server[msg.method]();
    process.nextTick(function () {
        process.send({ msg: 'Method ' + msg.method + ' called'});
    });
});

