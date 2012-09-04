// [Node-watch](https://github.com/jorritd/node-watch) Is a small [nodejs](http://www.nodejs.org/) 
// module/lib to watch for file changes.
// Filechanges are: 
//
// 1. changes where the mtime (make-time) of file's changes.
// 2. Files added to a watched folder
// 3. Files deleted from a watched folder


// 
//#### Install:
//
//Local (in "./node_modules"):
//
//   npm install nodewatch
//
//Global :
//
//   npm install nodewatch -g
//
//#### Usage:
// 
//   var watch = require('nodewatch');
//   
//   // Adding 2 dirs relative from process.cwd()
//   // Adding Abolute paths works as well
//   // (Nested dirs are not watched)
//   // and add the callback
//
//      watch.add("./spec").add("./lib/watch")
//      .onChange(function myWatch(file,prev,curr,action){
//          
//        console.log(file);
//        console.log(prev.mtime);
//        console.log(curr,mtime);
//        console.log(action);
//      });
//   
//      // Clear (remove) the listeners
//      watch.clearListeners();
//      
//      // Remove dirs to watch
//      watch.remove("./spec").remove("./lib/watch");
//  

// *nodejs requirements: EventEmitter, fs, path*
var EventEmitter = require("events").EventEmitter;

// *private helper function:* 
// extends child with the prototypes of parent and return the extended child 

var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
  for (var key in parent) {
    if (__hasProp.call(parent, key)) {
      child[key] = parent[key];
    }
  }
  function ctor() {
    this.constructor = child;
  }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor;
  child.__super__ = parent.prototype;
  return child;
};
// ## Watch class declaration ##
// extends from [EventEmitter](http://nodejs.org/docs/v0.4.8/api/events.html#events.EventEmitter)

var WatchClass = function() {
  "use strict";
  __extends(Watch, EventEmitter);
  // ### PUBLIC METHODS ###
  // 
  // -----------------------
  //
  
  // ## Watch class Constructor ##
  
  function Watch(options) {
    this.__watchedFolders = {};
    this.fs = require('fs');
    this.path = require('path');
  }
  
  // ## Public method: add(path , [recursive]) ##
  // `path` is an absolute or relative path
  // to a file or dir to add (watch),
  //
  // `recursive` is the flag to allow search in subfolders
  // (false by default)
  //
  // returns this object
  
  Watch.prototype.add = function(str_file_or_path, recursive) {
    recursive = recursive || false;
    if (str_file_or_path.substring(0, 1) == ".") {
      str_file_or_path = process.cwd() + "/" + str_file_or_path;
    }
    // str_file_or_path = this.path.normalize(str_file_or_path);
    
    // We should throw to be backbwards compatible
    // On the bliblic interface
    var stat = this.fs.statSync(str_file_or_path);
    
    return this.__handle(true, str_file_or_path, recursive);
  };
  
  // ## Public method: remove(path) ##
  // `path` is a absolute or relative path
  // to a file or dir to remove (unwatch),
  //
  //
  // returns this object
  
  Watch.prototype.remove = function(str_file_or_path) {
    var recursive = false;
    if(this.__watchedFolders.hasOwnProperty(str_file_or_path)){
        recursive = this.__watchedFolders[str_file_or_path].recursive
    }
    return this.__handle(false, str_file_or_path , recursive);
  };
  
  // ## Public method: onChange(callback) ##
  // Todo: check if *cb* is a function
  // 
  // add a callback *cb* :
  //
  //    function(file,prev,curr,action){
  //     /* do something with file,prev,curr */
  //    };
  //
  // When an event triggers, 4 arguments are send to the callback listener
  //
  //  * file String, absolute filepath
  //  * prev [stats objects](http://nodejs.org/docs/v0.4.8/api/fs.html#fs.watchFile)
  //  * curr [stats objects](http://nodejs.org/docs/v0.4.8/api/fs.html#fs.watchFile)
  //  * the action 'delete' || 'change' || 'new'
  //
  // and return *this* object
  
  Watch.prototype.onChange = function(cb) {
    this.on("change", cb);
    return this;
  };
  
  // ### Public method: clearListeners() ###
  
  Watch.prototype.clearListeners = function() {
    this.removeAllListeners("change");
    this.removeAllListeners();
    return this;
  };
  
  // ### PRIVATE METHODS ###
  // 
  // -----------------------
  //
  
  // ## Private method: __handle(boolean, string) ##
  // String is a absolute or relative path
  // to a file or dir. 
  //
  // First *str_file_or_path* is normalized as a valid path, relative paths
  // are made absolute depending on process.cwd()
  //
  //
  // The boolean *add* (true == add, false == remove) is passed to
  // the __file or __dir method
  //
  // returns this object
  
  Watch.prototype.__handle = function(add, str_file_or_path, recursive) {
    if (str_file_or_path.substring(0, 1) == ".") {
      str_file_or_path = process.cwd() + "/" + str_file_or_path;
    }
    str_file_or_path = this.path.normalize(str_file_or_path);
    // Do not proccess deleted files
    var stat = null;
    try{
      stat = this.fs.statSync(str_file_or_path);
    }catch(e){
      stat = false;
    }
    if(stat){
      if (stat.isFile()) {
        return this.__file(add, str_file_or_path);
      }
      if (stat.isDirectory()) {
        return this.__dir(add, str_file_or_path, recursive);
      }
    }
  };
  
  // ## Private method: __dir(boolean, string, recursive) ##
  // walk a dir and pass the files with the 'add' boolean
  // We put a watch on a folder
  // but this folder is never reported
  // it's purely to rescan a changed folder
  // or detect NEW created files
  Watch.prototype.__dir = function(add, dir, recursive) {

    var self = this;
    recursive = recursive || false;


    if(add){
      if(!this.__watchedFolders.hasOwnProperty(dir)){
        this.__watchedFolders[dir]= { recursive : recursive };
        self.__rescan(add,dir,recursive);
        self.fs.watchFile(dir, function(curr, prev) {
          if (prev.nlink !== curr.nlink) {
              // Ok, deletion or creation of a file is being detected
              // So if curr.nlink > prev.nlink probably
              // means something is added?
              // we need to find the OBJECT that is added,
              // which is probably curr.mtime === new object.ctime
              if(curr.nlink > prev.nlink){
                // Probably something added
                // I quess we can find it (no documentation about nlink 'number of links?')
                var files = self.fs.readdirSync(dir);
                for (var i = 0; i < files.length; i++) {
                  var full_path = dir + "/" + files[i];
                  var stat = self.fs.statSync(full_path);
                  if (stat.isFile()) {
                    if(stat.ctime.getTime() === curr.mtime.getTime()){
                      self.emit("change", full_path, stat, stat, 'new');
                    }
                  }
                }
              }
              self.__rescan(add,dir,recursive);
          }
        });
      }else{
        throw 'Folder already being watched';
      }

    }else{
      if(this.__watchedFolders.hasOwnProperty(dir)){
        self.__rescan(add,dir,this.__watchedFolders[dir].recursive);
        delete this.__watchedFolders[dir];
      }

      self.fs.unwatchFile(dir);
    }

    return this;
  };
  
  // ## Private method: __file(boolean, string) ##
  // Finally add (add==true) or remove a
  // file from watching, only files should be passed here
  // recursive is therefor obsolete
  // Handle only files
  // In the watch usage, this should no be async
  Watch.prototype.__file = function(add, file) {
    var self = this;
    var is_file = false;
    try {
      is_file = self.fs.statSync(file).isFile();
    }catch(e){
      is_file = false;
    }
    if(!is_file){
      return self;
    }
    if (add) {
      self.fs.watchFile(file, function watchMe(prev, curr) {
        try {
          // This will cause an error
          // when a file is deleted
          var stat = self.fs.statSync(file).isFile();
          // Else, register a change
          if (prev.mtime.getTime() !== curr.mtime.getTime()) {
            self.emit("change", file, prev, curr,'change');
          }
        }
        // A file inside the directory has been removed, emit event  
        catch(e) {
          if (e.code === 'ENOENT') {
            self.emit("change", file, prev, curr,'delete');
            return;
          }else{
            throw(e);
          }
        }
      });
    } else {
      // console.log('UN WATCH:'+file);
      self.fs.unwatchFile(file);
    }  
    return self;
  };
  // Walk a dir and start watching FILES (only Files),
  // if add === false STOP listening
  // if resurive? Walk the tree, but only ADD files for listenting
  Watch.prototype.__rescan = function(add,folder, recursive){
    var self = this;
    self.fs.stat(folder, function(err,stat){
      if(!err){
        var files = self.fs.readdirSync(folder);
        for (var i = 0; i < files.length; i++) {
          var full_path = folder + "/" + files[i];
          if (self.fs.statSync(full_path).isFile()) {
            self.__file(add, full_path);
            // If we read a directory, call recursively to `__dir` method
            // to be able to handle changes in files inside this directory
          } else if (recursive && self.fs.statSync(full_path).isDirectory()) {
            self.__dir(add, full_path, recursive);
          }
        }
      }
    });
  }

  return Watch;
}();

module.exports = new WatchClass;
