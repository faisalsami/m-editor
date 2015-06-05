// Re-usable core VistA interface functions

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

var listRoutines = function(routineName){
    var files = [];
    var count = 0;
    var gtmRoutines = process.env.gtmroutines;
    var rsplit = gtmRoutines.split('(');
    for(var i=1; i < rsplit.length; i++){
        var dir = rsplit[i].split(')')[0];
        fs.readdirSync(dir).forEach(function(name){
            if(count > 19){return files;}
            var stats = fs.statSync(dir + '/' + name);
            if(!stats.isDirectory()){
                if(name.indexOf(routineName) === 0){
                    count = count + 1;
                    files.push({
                        id: count,
                        path: dir + '/' + name,
                        text: name.split('.')[0]
                    });
                }
            }
        });
    }
    return files;
};

var getRoutine = function(routinePath){
    var result = {};
    result.error = '';
    var invalid = true;
    var gtmRoutines = process.env.gtmroutines;
    var rsplit = gtmRoutines.split('(');
    for(var i=1; i < rsplit.length; i++){
        var dir = rsplit[i].split(')')[0];
        if(routinePath.indexOf(dir) === 0){
            invalid = false;
        }
    }
    if(invalid){
        result.error = 'Invalid path to get routine.';
        return result;
    }
    if(fs.existsSync(routinePath)){
        var routineName = path.basename(routinePath);
        result.name = routineName.split('.')[0];
        result.path = routinePath;
        result.routine = fs.readFileSync(routinePath).toString();
    }else{
        result.error = 'Routine Path not given.'
    }
    return result;
};

var saveRoutine = function(routinePath,routineText,isNew){
    var result = {};
    result.error = '';
    var invalid = true;
    var gtmRoutines = process.env.gtmroutines;
    var rsplit = gtmRoutines.split('(');
    for(var i=1; i < rsplit.length; i++){
        var dir = rsplit[i].split(')')[0];
        if(routinePath.indexOf(dir) === 0){
            invalid = false;
        }
    }
    if(invalid){
        result.error = 'Invalid path to save routine.';
        return result;
    }
    if(fs.existsSync(routinePath) || isNew){
        fs.writeFileSync(routinePath, routineText);
        result.saved = true;
    }else{
        result.error = 'Routine Path not given.'
    }
    return result;
};

var buildRoutine = function(routinePath,ewd){
    var result = {};
    result.error = '';
    var invalid = true;
    var objPath = '';
    var gtmRoutines = process.env.gtmroutines;
    var rsplit = gtmRoutines.split('(');
    for(var i=1; i < rsplit.length; i++){
        var dir = rsplit[i].split(')')[0];
        if(routinePath.indexOf(dir) === 0){
            if(rsplit[i-1].indexOf(')')>=0){
                objPath = rsplit[i-1].split(')')[1].trim();
            }else{
                objPath = rsplit[i-1].trim();
            }
            invalid = false;
        }
    }
    if(invalid){
        result.error = 'Invalid path to build routine.';
        ewd.sendWebSocketMsg({
            type: 'buildRoutine',
            message: result
        });
        return;
    }
    if(fs.existsSync(routinePath)){
        var routineName = path.basename(routinePath);
        routineName = routineName.split('.')[0];
        var command = 'mumps -object=' + objPath + '/' + routineName + '.o ' + routinePath;
        var child = exec(command,
            function (error, stdout, stderr) {
                var result = {};
                result.output = '';
                if(stdout.toString()){
                    result.output = result.output + '\n' + stdout.toString();
                }
                if(stderr.toString()){
                    result.output = result.output + '\n' + stderr.toString();
                }
                result.build = true;
                ewd.sendWebSocketMsg({
                    type: 'buildRoutine',
                    message: result
                });
            });
    }else{
        result.error = 'Routine Path not given.';
        ewd.sendWebSocketMsg({
            type: 'buildRoutine',
            message: result
        });
    }
};

var checkRoutineName = function(routineName){
    var result = {};
    result.check = false;
    result.error = '';
    var patt = /^[A-Z%][0-9A-Z]{0,7}$/i;
    if(patt.test(routineName)){
        var gtmRoutines = process.env.gtmroutines;
        var rsplit = gtmRoutines.split('(');
        result.dirs = [];
        for(var i=1; i < rsplit.length; i++){
            result.dirs.push(rsplit[i].split(')')[0] + '/');
        }
        result.check = true;
        result.routine = routineName;
        for(var i=1; i < rsplit.length; i++){
            var dir = rsplit[i].split(')')[0];
            fs.readdirSync(dir).forEach(function(name){
                var stats = fs.statSync(dir + '/' + name);
                if(!stats.isDirectory()){
                    if(name == (routineName + '.m')){
                        result.check = false;
                        result.error = 'Routine with this name already exists.';
                        return result;
                    }
                }
            });
        }
    }else{
        result.error = 'Invalid Routine Name.';
    }
    return result;
};

module.exports = {

    // EWD.js Application Handlers/wrappers

    onMessage: {
        Login: function(params,ewd){
            if(params.password === 'fasy'){
                ewd.session.setAuthenticated();
                return {
                    error: '',
                    authenticated: true
                };
            }else{
                return {
                    error: 'Invalid Password.',
                    authenticated: false
                };
            }
        },
        routineQuery: function(params, ewd) {
            if (!ewd.session.isAuthenticated) {return;}
            var files = listRoutines(params.prefix.toUpperCase());
            ewd.sendWebSocketMsg({
                type: 'routineMatches',
                message: files
            });
        },
        getRoutine: function(params, ewd) {
            if (!ewd.session.isAuthenticated) {return;}
            var result = getRoutine(params.routinePath);
            return result;
        },
        saveRoutine: function(params,ewd){
            if (!ewd.session.isAuthenticated) {return;}
            var result = saveRoutine(params.routinePath,params.routineText,params.newRoutine);
            return result;
        },
        buildRoutine: function(params,ewd){
            if (!ewd.session.isAuthenticated) {return;}
            buildRoutine(params.routinePath,ewd);
        },
        checkRoutineName: function(params,ewd){
            if (!ewd.session.isAuthenticated) {return;}
            var result = checkRoutineName(params.routineName.trim().toUpperCase());
            return result;
        }
    }
};