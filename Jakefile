var fs = require('fs');
var path= require('path');

desc("create build file");
task("build",["docs"],function(){
    var fs = require("fs");
    var jsp = require("uglify-js").parser;
    var pro = require("uglify-js").uglify;
    var orig_code = fs.readFileSync("src/watch.js").toString();
    var ast = jsp.parse(orig_code); // parse code and get the initial AST
    // ast = pro.ast_mangle(ast); // get a new AST with mangled names
    // ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
    var options = {};
    options.beautify = true;
    var final_code = pro.gen_code(ast,options); // compressed code here
    fs.writeFileSync("lib/watch.js", final_code);
   console.log('Build done');
   // console.log('Test integration');
});


desc("create docs");
task("docs",function(){
    var ar_files = [];
  fs.readdirSync('./src').forEach(function(scrpt){
    if(path.extname(scrpt) === '.js'){
      ar_files.push('./src/'+scrpt)
    }
  }); 
    var spawn = require('child_process').spawn,
        doc = spawn('node_modules/docco/bin/docco',ar_files);
    
    doc.stdout.on('data', function (data) {
         process.stdout.write(data);
    });
    doc.stderr.on('data', function (data) {
        process.stderr.write( data);
    });
});

desc("run specs");
task("test",function(){
    require('VNLS');
    var jasmine = require('jasmine-node');
    
    jasmine.dev_mode = "src";
    
    var Path= require('path')
    var specFolder = Path.join(process.cwd(), "specs");

    for (var key in jasmine)
      global[key] = jasmine[key];
    
    var isVerbose = false;
    var showColors = true;
    var extentions = "js";
    var teamcity = false;
    var useRequireJs = false;

    var junitreport = {
      report: false,
      savePath : "./reports/",
      useDotNotation: true,
      consolidate: true
    }
    jasmine.loadHelpersInFolder(specFolder, new RegExp("[-_]helper\\.(" + extentions + ")$"));
    jasmine.executeSpecsInFolder(specFolder, function(runner, log){
      if (runner.results().failedCount == 0) {
        // test.kill('SIGHUP');
        process.exit(0);
        
      } else {
       //  test.kill('SIGHUP');
        process.exit(1);
        // test.kill('SIGHUP');
      }
    }, isVerbose, showColors, teamcity, useRequireJs, new RegExp(".spec\\.(" + extentions + ")$", 'i'),junitreport);
});

desc("run specs for integration");
task("test_integration",function(){
    // Jasmine is cool
    var jasmine = require('jasmine-node');
    
    jasmine.dev_mode = "lib";
    
    var Path= require('path')
    var specFolder = Path.join(process.cwd(), "spec");

    for (var key in jasmine)
      global[key] = jasmine[key];
    
    var isVerbose = false;
    var showColors = true;
    var extentions = "js";
    jasmine.loadHelpersInFolder(specFolder, new RegExp("[-_]helper\\.(" + extentions + ")$"));
    jasmine.executeSpecsInFolder(specFolder, function(runner, log){
      if (runner.results().failedCount == 0) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    }, isVerbose, showColors, new RegExp(".spec\\.(" + extentions + ")$", 'i'));
});

desc("Autorun specs");
task('autotest',function(){
    console.log('Quit autotest with CTRL - C');
    var watch = require('nodewatch'),
        spawn = require('child_process').spawn,
        busy = false,
        test = null;
        
    watch.add("./specs").add("./src").onChange(function(file){
        if(!busy){
            busy = true;
            test    = spawn('jake', ['test']);
            test.stdout.on('data', function (data) {
                process.stdout.write(data);
            });
            
            test.stderr.on('data', function (data) {
                process.stderr.write( data);
            });
            test.on('exit', function (code) {
              // Clear test (possible memory leak?)
              test.stdout.removeAllListeners("data");
              test.stderr.removeAllListeners("date");
              test.removeAllListeners("exit");
              test = null;
              busy = false;
            });
        }
    });
    

});