// Re-usable core VistA interface functions

//getFilesByName -- used to search a fileman file by name; using the B index of DIC global
var getFilesByName = function(prefix, max, ewd) {
    var dicIndex = new ewd.mumps.GlobalNode("DIC", ["B"]);
    var results = [];
    var namesById = {};
    var i = 0;
    dicIndex._forPrefix(prefix.toUpperCase(), function(name, node) {
        node._forEach(function(id) {
            i++;
            if (i > max) return true;
            results.push({
                id: id,
                text: name
            });
            namesById[id] = name;
        });
        if (i > max) return true;
    });
    return {
        results: results,
        namesById: namesById
    };
};

//getChildNode -- return back the file object
//                If exists and is not multiple then it will be returned back file from DIC global
//                otherwise it is assumed that it is multiple and look for parent file and get the file object through recursive call
var getChildNode = function(fileNumber,ewd){
    var result = {};
    var file = new ewd.mumps.GlobalNode("DIC", [fileNumber, '0']);
    if(file._exists){
        var fileName = '';
        var fileName = file._value.split('^')[0] + ' [' + fileNumber + ']';
        result.name = fileName;
        result.children = [];
    }else{
        var file = new ewd.mumps.GlobalNode("DD", [fileNumber, '0', 'UP']);
        if(file._exists){
            result = getChildNode(file._value,ewd);
        }
        else{
            result = null;
        }
    }
    return result;
};

//getFilePointers -- return a fileman file's pointer fields in results array
//                   It also include multiple field and traverse that multiple file to look for pointer file through recursive call
var getFilePointers = function(fileNumber, ewd){
    var results = [];
    var file = new ewd.mumps.GlobalNode("DD", [fileNumber]);
    //Traverse all fields of fileman file through DD Global
    file._forRange('0', 'A', function(fieldNumber, node) {
        if(fieldNumber == '0') return;
        if(isNaN(fieldNumber)) return;
        var field = new ewd.mumps.GlobalNode("DD", [fileNumber, fieldNumber, '0']);
        var field0Node = field._value.split('^');
        //Look for the second piece of the ^DD(fileNumber, fieldNumber, 0) node for the pointer or Variable Pointer field
        //if second piece contains P means it is a pointer type field
        if(field0Node[1].indexOf("P") > -1){
            //If Second Piece contains , means there is global with file number like TIU(8925,
            if(field0Node[2].indexOf(",") > -1){
                var pointedFile0 = new ewd.mumps.GlobalNode(field0Node[2].split('(')[0], [field0Node[2].split('(')[1].split(',')[0], '0']);
                if(pointedFile0._exists){
                    var fileName = '';
                    fileName = pointedFile0._value.split('^')[0] + ' [' + pointedFile0._value.split('^')[1] + ']';
                    results.push({
                        "name": fileName,
                        "children": []
                    });
                }
            }
            //else we assume that Socond piece would be containg the global reference without file number within node like ^DPT(
            else {
                var pointedFile0 = new ewd.mumps.GlobalNode(field0Node[2].split('(')[0], ['0']);
                if(pointedFile0._exists){
                    var fileName = '';
                    fileName = pointedFile0._value.split('^')[0] + ' [' + pointedFile0._value.split('^')[1] + ']';
                    results.push({
                        "name": fileName,
                        "children": []
                    });
                }
            }
        }
        //if second piece contains V means it is a Variable Pointer type field
        if(field0Node[1].indexOf("V") > -1){
            //Get all the files from the B index of the variable pointer field node
            var vpointerfiles = new ewd.mumps.GlobalNode("DD", [fileNumber, fieldNumber, "V", "B"]);
            vpointerfiles._forEach(function(vfile, vfnode) {
                var file = new ewd.mumps.GlobalNode("DIC", [vfile, '0']);
                var fileName = '';
                var fileName = file._value.split('^')[0] + ' [' + vfile + ']';
                results.push({
                    "name": fileName,
                    "children": []
                });
            });
        }
        //Check to see if the field is multiple if the field is multiple then it will always have some float value on the second piece
        var multipleFileNumber = parseFloat(field0Node[1]);
        if(multipleFileNumber>0){
            var multipleFile = new ewd.mumps.GlobalNode("DD", [multipleFileNumber, '0']);
            if(multipleFile._exists){
                var fileName = multipleFile._value.split('^')[0] + ' [' + multipleFileNumber + ']';
                //If multiple file exists then do recursive call to get all pointers of that multiple file
                var multipleResults = getFilePointers(multipleFileNumber, ewd);
                if(multipleResults.length > 0){
                    results.push({
                        "name" : fileName,
                        "children": multipleResults
                    });
                }
            }
        }
    });
    return results;
};

//Prepare data for the tree
//upward object's children array contains all the files that used as pointed file in pointer or variable pointer fields of that file (in Pointers)
//donward object's children array contains all the files that have that file used as pointed file in their fields (out Pointers)
var prepareTreeData = function(fileNumber, ewd) {
    var file = new ewd.mumps.GlobalNode("DIC", [fileNumber, '0']);
    var fileName = '';
    fileName = file._value.split('^')[0] + ' [' + fileNumber + ']';
    var downward = {
        "direction":"downward",
        "name":"origin",
        "children": []
    };
    var upward = {
        "direction":"upward",
        "name":"origin",
        "children": []
    };
    // The "PT" node of file zero node contains all the files in which that file is used as a pointed file.
    var filePT = new ewd.mumps.GlobalNode("DD", [fileNumber, '0', 'PT']);
    filePT._forEach(function(name, node) {
        var result = getChildNode(name,ewd);
        if(result !== null){
            downward.children.push(result);
        }
    });
    var files = getFilePointers(fileNumber, ewd);
    upward.children = files;
    return {
        "name": fileName,
        "fileDD" : {
            "upward": upward,
            "downward": downward
        }
    };
};

module.exports = {

    // EWD.js Application Handlers/wrappers

    onMessage: {
        fileQuery: function(params, ewd) {
            var results = getFilesByName(params.prefix, 40, ewd);
            ewd.session.$('files')._delete();
            ewd.session.$('files')._setDocument(results.namesById);
            ewd.sendWebSocketMsg({
                type: 'fileMatches',
                message: results.results
            });

        },
        fileSelected: function(params, ewd) {
            var file = new ewd.mumps.GlobalNode('DIC', [params.fileId]);
            if(!file._exists){
                return{
                    error: params.fileId + ' file not exists.'
                }
            }
            ewd.session.$('fileIdSelected')._value = params.fileId;
            var results = prepareTreeData(params.fileId, ewd);
            return {
                results: results,
                error: ''
            };
        }
    }
};