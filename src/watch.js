// [Node-watch](https://github.com/venalis/node-watch) Is a small [nodejs](http://www.nodejs.org/) 
// module/lib to watch for file changes.
// Filechanges are: 
/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses>.
 * 
 */
// 1. changes where the mtime (make-time) of file's changes.
// 2. Files added to a watched folder
// 3. Files deleted from a watched folder
//
// Merged https://github.com/tigerbot version 

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
//        console.log(curr.mtime);
//        console.log(action);
//      });
//   
//      // Clear (remove) the listeners
//      watch.clearListeners();
//      
//      // Remove dirs to watch
//      watch.remove("./spec").remove("./lib/watch");
//  

// *nodejs requirements: EventEmitter, fs, path, util*
var EventEmitter = require("events").EventEmitter, util = require("util");

// ## Watch class declaration ##
// extends from [EventEmitter](http://nodejs.org/api/events.html#events.EventEmitter)

var WatchClass = function() {
  "use strict";
  // ### PUBLIC METHODS ###
  // 
  // -----------------------
  //
  
  // ## Watch class Constructor ##
  
  function Watch(options) {
    // Call the super constructor first to initialize the emitter
    EventEmitter.call(this);
    // objects to track the files and directories we are explicitly
    // told to watch, and the files and directories that we're watching
    // because they are in directories we're explicitly to to watch
    this.__topLvlWatchers = [];
    this.__watchedItems = {};
    this.fs = require('fs');
    this.path = require('path');
  }
  util.inherits(Watch, EventEmitter);

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
    
    return this.__handle(true, str_file_or_path, recursive);
  };
  
  // ## Public method: remove(path) ##
  // `path` is a absolute or relative path
  // to a file or dir to remove (unwatch),
  //
  //
  // returns this object
  
  Watch.prototype.remove = function(str_file_or_path) {
    // we don't really need to specify recursive here,
    // __handle doesn't use it anyway if add isn't true
    return this.__handle(false, str_file_or_path);
  };
  
  // ## Public method: onChange(callback) ##
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
    if (typeof cb === 'function') {
      this.on('change', cb);
    }else{
      throw new Error('Non-function provided as the callback for onChange');
    }
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
    str_file_or_path = this.path.resolve(str_file_or_path);

    // __handle is only called by the public add/remove functions,
    // so we can add/remove anything that gets to this point to/from
    // the list of explicitly watched items
    if (add) {
      if(this.__topLvlWatchers.indexOf(str_file_or_path) === -1){
        // Only add when it's not allready there
        this.__topLvlWatchers.push(str_file_or_path);
      }
    } else {
      var index = this.__topLvlWatchers.indexOf(str_file_or_path);
      if (index >= 0) {
        this.__topLvlWatchers.splice(index, 1);
      }
    }

    // Do not proccess deleted files
    var stat = null;
    try{
      stat = this.fs.statSync(str_file_or_path);
    }catch(e){
      if (add) {
        // We should throw on 'add' to be backwards compatible
        // On the public interface
        throw e;
      }else{
        stat = false;
        // If the file is deleted but still being watched make sure
        // we remove the listeners for it.
        if (self.__watchedItems.hasOwnProperty(str_file_or_path)) {
          self.fs.unwatchFile(str_file_or_path);
          delete self.__watchedItems[str_file_or_path];
        }
      }
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
      if(!self.__watchedItems.hasOwnProperty(dir)){
        self.__watchedItems[dir]= { recursive : recursive };
        self.__rescan(add,dir,recursive,false);
        self.fs.watchFile(dir, function(curr, prev) {
          // Something about the directory has changed, most
          // likely a file has been added. Rescan the directory
          // to see if anything new is found, and tell it to report
          // any new files to the user.
          self.__rescan(add,dir,recursive, true);
        });
      }else{
        throw new Error('Folder already being watched');
      }

    }else{
      if(self.__watchedItems.hasOwnProperty(dir)){
        self.__rescan(add,dir,self.__watchedItems[dir].recursive, false);
        delete self.__watchedItems[dir];
      }

      self.fs.unwatchFile(dir);
    }

    return self;
  };
  
  // ## Private method: __file(boolean, string) ##
  // Finally add (add==true) or remove a
  // file from watching, only files should be passed here,
  // therefore recursive is obsolete.
  // Handle only files
  // In the watch usage, this should not be async
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
      // Make sure we don't accidently put multiple watchers on a
      // single file, as this might cause us to report changes several
      // times and might also cause a memory leak.
      if (self.__watchedItems.hasOwnProperty(file)) {
        throw new Error('File already being watched');
        return self;
      }
      // It doesn't really matter what we assign to this key right now,
      // we merely have to assign something.
      self.__watchedItems[file] = true;

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
            // If this file isn't explicitly being watched, unwatch it now.
            // Otherwise we'll wait until the user explicitly removes it
            // from the list
            if (self.__topLvlWatchers.indexOf(file) < 0) {
              self.fs.unwatchFile(file);
              delete self.__watchedItems[file];
            }
            return;
          }else{
            throw(e);
          }
        }
      });
    } else {
      // console.log('UN WATCH:'+file);
      self.fs.unwatchFile(file);
      delete self.__watchedItems[file];
    }  
    return self;
  };
  // Walk a dir and start watching FILES (only Files),
  // if add === false STOP listening
  // if recursive? Walk the tree, but only ADD files for listening
  // if reportNew? emit the change event for any file we find that wasn't being watched before
  Watch.prototype.__rescan = function(add,folder, recursive, reportNew){
    var self = this;
    self.fs.stat(folder, function(err,stat){
      if(err){
        if(err.code !== 'ENOENT'){
          throw err;
          return;
        }
        // The watched directory has been deleted, so if it's part of
        // a recursively watched directory remove it's watcher.
        // We won't need to call anything recursively to remove watchers
        // for any descendants because they to will have been deleted and
        // have this callback.
        //
        // But what when we want to remove a watched folder, and
        // this folder is not deleted
        //

        console.log('__rescan');

        if(self.__topLvlWatchers.indexOf(folder) < 0){
          self.fs.unwatchFile(folder);
          delete self.__watchedItems[folder];
          
        }
      }else{
        var files = self.fs.readdirSync(folder);
        files.forEach(function (file) {
          var full_path = self.path.join(folder, file);
          var stat;

          // We only need to check this path if we aren't already watching it,
          // or if we need to remove it and all of it's possible descendants.
          if (!add || !self.__watchedItems.hasOwnProperty(full_path)) {
            stat = self.fs.statSync(full_path);
            if (stat.isFile()) {
              self.__file(add, full_path);
              // if we aren't in the process of removing listeners and we get to
              // this point we have a new file that should be reported if this
              // isn't the initial scan of a directory.
              if (add && reportNew) {
                self.emit('change', full_path, stat, stat, 'new');
              }
              // If we read a directory, call recursively to `__dir` method
              // to be able to handle changes in files inside this directory
            } else if (recursive && stat.isDirectory()) {
              self.__dir(add, full_path, recursive);
            }
          }
        });
      }
    });
  };

  return Watch;
}();

module.exports = new WatchClass;
