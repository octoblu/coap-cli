#! /usr/bin/env node

var program = require('commander')
  , version = require('./package').version
  , coap = require('coap')
  , request = coap.request
  , URL     = require('url')
  , through = require('through2')
  , method  = 'GET' // default
  , url

program
  .version(version)
  .option('-o, --observe', 'Observe the given resource', 'boolean', false)
  .option('-n, --no-new-line', 'No new line at the end of the stream', 'boolean', true)
  .option('-p, --payload <payload>', 'The payload for POST and PUT requests')
  .option('-q, --quiet', 'Do not print status codes of received packets', 'boolean', false)
  .option('-H, --headers <headers>', 'Add headers to request')
  .usage('[command] [options] urlx')


;['GET', 'PUT', 'POST', 'DELETE'].forEach(function(name) {
  program
    .command(name.toLowerCase())
    .description('performs a ' + name + ' request')
    .action(function() { method = name })
})

program.parse(process.argv)

if (!program.args[0]) {
  program.outputHelp()
  process.exit(-1)
}

url = URL.parse(program.args[0])
url.method = method
url.observe = program.observe

if (url.protocol !== 'coap:' || !url.hostname) {
  console.log('Wrong URL. Protocol is not coap or no hostname found.')
  process.exit(-1)
}

req = request(url).on('response', function(res) {
  // print only status code on empty response
  if (!res.payload.length && !program.quiet)
    process.stderr.write('\x1b[1m(' + res.code + ')\x1b[0m\n')

  res.pipe(through(function addNewLine(chunk, enc, callback) {
    if (!program.quiet)
      process.stderr.write('\x1b[1m(' + res.code + ')\x1b[0m\t')
    if (program.newLine && chunk)
      chunk = chunk.toString('utf-8') + '\n'

    this.push(chunk)
    callback()
  })).pipe(process.stdout)

  // needed because of some weird issue with
  // empty responses and streams
  if (!res.payload.length)
    process.exit(0)
})

var fromString = function(result) {
  return new Buffer(result)
}

var toString = function(value) {
  return value.toString()
}

if (method === 'GET' || method === 'DELETE' || program.payload) {
  if(program.headers){
    // Parse string of headers looking for skynet/meshblu uuid/tokens and send them in mesage
    var query = {};
    var a = program.headers.split('&');
    for (var i in a)
    {
      var b = a[i].split('=');

      if (decodeURIComponent(b[0]) == "skynet_auth_uuid" || decodeURIComponent(b[0]) == "meshblu_auth_uuid"){
        req.setOption('98', new Buffer(decodeURIComponent(b[1])));
      } 
      if (decodeURIComponent(b[0]) == "skynet_auth_token" || decodeURIComponent(b[0]) == "meshblu_auth_token"){
        req.setOption('99', new Buffer(decodeURIComponent(b[1])));
      } 
    }    
    console.log(query);
  }
  req.end(program.payload)
  return
}

process.stdin.pipe(req)
