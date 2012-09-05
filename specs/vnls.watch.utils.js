
// Extend VNLS namespace with helper functions
VNLS.ns('watch.utils',{
  
  // ### removeRecursive
  // Delete a file or delete a DIR recursive
  // be aware that this is a powerfull delete function
  // so best is to check if the PATH given is realy
  // the path you want to DELETE entirely 
  //
  // 
  // 
   
  removeRecursive : function(path,cb){
    var self = this;
    var fs = require('fs');

    fs.stat(path, function(err, stats) {
      if(err){
        cb(err,stats);
        return;
      }
      if(stats.isFile()){
        fs.unlink(path, function(err) {
          if(err) {
            cb(err,null);
          }else{
            cb(null,true);
          }
          return;
        });
      }else if(stats.isDirectory()){
        // A dir may contain files
        // We need to delete the files first
        // When all are deleted we could delete the 
        // dir itself
        fs.readdir(path, function(err, files) {
          if(err){
            cb(err,null);
            return;
          }
          var f_length = files.length;
          var f_delete_index = 0;

          // Check and keep track of deleted files
          var checkStatus = function(){
            // We check the status
            // and count till we r done
            if(f_length===f_delete_index){
              fs.rmdir(path, function(err) {
                if(err){
                  cb(err,null);
                }else{ 
                  cb(null,true);
                }
              });
              return true;
            }
            return false;
          };
          if(!checkStatus()){
            for(var i=0;i<f_length;i++){
              // Create a local scope for filepath
              // Not really needed, but just good practice
              // (as strings arn't passed by reference)
              (function(){
                var filePath = path + "/" + files[i] ;
                // Add a named function as callback
                // just to enlighten debugging
                self.removeRecursive(filePath,function removeRecursiveCB(err,status){
                  if(!err){
                    f_delete_index ++;
                    checkStatus();
                  }else{
                    cb(err,null);
                    return;
                  }
                });
    
              })()
            }
          }
        });
      }
    });
  }
});
