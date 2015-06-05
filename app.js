EWD.sockets.log = true;

EWD.application = {
    name: 'm-editor',
    timeout: 3600,
    labels: {
        'ewd-title': 'Mumps Editor',
        'ewd-navbar-title-phone': 'M Editor',
        'ewd-navbar-title-other': 'M Editor'
    },
    enableSelect2: function(authorization) {
        $("#selectedRoutine").select2({
            minimumInputLength: 1,
            query: function (query) {
                EWD.application.select2 = {
                    callback: query.callback
                };
                EWD.sockets.sendMessage({
                    type: 'routineQuery',
                    params: {
                        prefix: query.term,
                        authorization: authorization
                    }
                });
            }
        });
    },
    setText: function(routine,text){
        EWD.application.routines[routine].editor.getDoc().setValue(text);
    },
    getText: function(routine){
        return EWD.application.routines[routine].editor.getDoc().getValue();
    },
    newRoutine: function(event){
        event.preventDefault();
        $('#txtNewRoutine').val('');
        $('#newRoutineModal').modal({
            keyboard: false,
            backdrop: 'static'
        });
    },
    Login: function(event){
        event.preventDefault();
        var password = $('#txtPassword').val();
        EWD.sockets.sendMessage({
            type: 'Login',
            params: {
                password: password,
                authorization: EWD.application.authorization
            }
        });
    },
    openRoutine: function(routineName,routinePath){
        var found = false;
        $('.nav-tabs li').each(function(index, element) {
            if(routineName == $(element).find('a').text().replace(' *','')){
                found = true;
                $(element).find('a').click();
            }
        });
        if(!found) {
            EWD.sockets.sendMessage({
                type: 'getRoutine',
                params: {
                    routinePath: routinePath,
                    authorization: EWD.application.authorization
                }
            });
        }
    },
    saveRoutine: function(event){
        event.preventDefault();
        var routineName = $('.nav-tabs .active a').text().replace(' *','');
        if(!routineName){return;}
        var routineText = EWD.application.getText(routineName);
        var routinePath = EWD.application.routines[routineName].path;
        var newRoutine = EWD.application.routines[routineName].new;
        EWD.sockets.sendMessage({
            type: 'saveRoutine',
            params: {
                routinePath: routinePath,
                routineText: routineText,
                newRoutine: newRoutine,
                authorization: EWD.application.authorization
            }
        });
    },
    buildRoutine: function(event){
        event.preventDefault();
        var routineName = $('.nav-tabs .active a').text();
        if(!routineName){return;}
        if(routineName.indexOf('*')>=0){
            alert('Please save the routine first.');
            return;
        }
        var routinePath = EWD.application.routines[routineName].path;
        EWD.sockets.sendMessage({
            type: 'buildRoutine',
            params: {
                routinePath: routinePath,
                authorization: EWD.application.authorization
            }
        });
    },
    checkRoutineName: function(routineName){
        EWD.sockets.sendMessage({
            type: 'checkRoutineName',
            params: {
                routineName: routineName,
                authorization: EWD.application.authorization
            }
        });
    },
    setResult: function(resultArray){
        var result = '';
        for(var i=0; i < resultArray.length; i++){
            result = result + resultArray[i] + '<br/>';
        }
        $('#content_results').html(result);
    },
    textChanged: function(instance,changeObj){
        instance.off("change",EWD.application.textChanged);
        if($('.nav-tabs .active a').text().indexOf('*')<0){
            $('.nav-tabs .active a').text($('.nav-tabs .active a').text() + ' *');
        }
    },
    setEditMode: function(mode){
        if(mode){
            $('#btnSave').show();
            $('#btnBuild').show();
            $('#btnFullScreen').show();
            $('#mnuEdit').show();
            $('#mnuBuild').show();
            $('#mnuSave').parents().removeClass('disabled');
        }else{
            $('#btnSave').hide();
            $('#btnBuild').hide();
            $('#btnFullScreen').hide();
            $('#mnuEdit').hide();
            $('#mnuBuild').hide();
            $('#mnuSave').parent().addClass('disabled');
            EWD.application.setResult([]);
        }
    },
    setEditorFullScreen : function(event){
        event.preventDefault();
        var routineName = $('.nav-tabs .active a').text().replace(' *','');
        if(!routineName){return;}
        EWD.application.routines[routineName].editor.setOption("fullScreen", !EWD.application.routines[routineName].editor.getOption("fullScreen"));
    },
    toggleBookmark: function(event){
        event.preventDefault();
        var routineName = $('.nav-tabs .active a').text().replace(' *','');
        if(!routineName){return;}
        var editor = EWD.application.routines[routineName].editor;
        var lineNumber = editor.getCursor().line;
        var found = false;
        editor.getDoc().findMarksAt({line: lineNumber, ch:0}).forEach(function(bookmark){
            bookmark.clear();
            found = true;
        });
        if(!found){
            var elem = document.createElement("span");
            elem.className = 'glyphicon glyphicon-bookmark';
            elem.setAttribute("aria-hidden", "true");
            var bm = editor.getDoc().setBookmark({line: lineNumber, ch:0},{widget: elem});
        }
    },
    clearBookmarks: function(event){
        event.preventDefault();
        var routineName = $('.nav-tabs .active a').text().replace(' *','');
        if(!routineName){return;}
        var editor = EWD.application.routines[routineName].editor;
        editor.getDoc().getAllMarks().forEach(function(bookmark){
            bookmark.clear();
        });
    },
    nextBookmark: function(event){
        event.preventDefault();
        var routineName = $('.nav-tabs .active a').text().replace(' *','');
        if(!routineName){return;}
        var editor = EWD.application.routines[routineName].editor;
        var cLine = editor.getDoc().getCursor().line;
        if(editor.getDoc().getAllMarks().length > 0){
            var found = false;
            for(var i=cLine +1; i<editor.getDoc().lineCount(); i++){
                if(editor.getDoc().findMarksAt({line: i, ch:0}).length > 0){
                    editor.getDoc().setCursor({line: i, ch:0});
                    found = true;
                    return;
                }
            }
            if(!found){
                for(var i=0; i<editor.getDoc().lineCount(); i++){
                    if(editor.getDoc().findMarksAt({line: i, ch:0}).length > 0){
                        editor.getDoc().setCursor({line: i, ch:0});
                        return;
                    }
                }
            }
        }
    },
    previousBookmark: function(event){
        event.preventDefault();
        var routineName = $('.nav-tabs .active a').text().replace(' *','');
        if(!routineName){return;}
        var editor = EWD.application.routines[routineName].editor;
        var cLine = editor.getDoc().getCursor().line;
        if(editor.getDoc().getAllMarks().length > 0){
            var found = false;
            if(cLine === 0){
                cLine = editor.getDoc().lineCount() - 1;
            }
            for(var i=cLine - 1; i>=0; i--){
                if(editor.getDoc().findMarksAt({line: i, ch:0}).length > 0){
                    editor.getDoc().setCursor({line: i, ch:0});
                    found = true;
                    return;
                }
            }
            if(!found){
                for(var i=editor.getDoc().lineCount() - 1; i>=0; i--){
                    if(editor.getDoc().findMarksAt({line: i, ch:0}).length > 0){
                        editor.getDoc().setCursor({line: i, ch:0});
                        return;
                    }
                }
            }
        }
    },
    createRoutineTab: function(routineName,routinePath,routineText,newRoutine){
        var rid = 'tab' + routineName;
        var li = '';
        if(routineText){
            li = '<li role="presentation"><a href="#' + rid + '">' + routineName + '</a> <span> x </span></li>';
        }else{
            li = '<li role="presentation"><a href="#' + rid + '">' + routineName + ' *</a> <span> x </span></li>';
        }
        $(".nav-tabs").append(li);
        var tid = 'txt' + routineName;
        var tarea = '<textarea id="' + tid + '" name="' + tid + '"></textarea>';
        $('.tab-content').append('<div class="tab-pane" id="' + rid + '">' + tarea + '</div>');
        var mc = $("#main_Container");
        var editor = CodeMirror.fromTextArea(document.getElementById(tid), {
            mode: "mumps",
            styleActiveLine: true,
            lineNumbers: true,
            lineWrapping: false,
            extraKeys: {
                "Esc": function(cm) {
                    if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
                }
            }
        });
        editor.setSize(mc.width(), mc.height());
        EWD.application.routines[routineName] = {
            path: routinePath,
            new: newRoutine,
            editor: editor
        };
        EWD.application.setText(routineName,routineText);
        editor.on("change",EWD.application.textChanged);
        $('.nav-tabs li:last-child a').click();
    },
    showAbout: function(event){
        event.preventDefault();
        //$('#txtNewRoutine').val('');
        //var mbody = '<script type="IN/MemberProfile" data-id="https://www.linkedin.com/in/faisalsami" data-format="inline" data-related="false"></script>';
        //$('#aboutModalSocial').html(mbody);
        $('#aboutModal').modal({
            keyboard: true,
            backdrop: 'static'
        });
    },
    onStartup: function() {
        $('#loginModal').modal({
            keyboard: false,
            backdrop: 'static'
        });
        EWD.application.routines = {};
        EWD.application.saveonclosing = false;
        this.enableSelect2(EWD.application.authorization);
        $(document).on('keydown', function(event){
            // detect key pressed
            var key = event.keyCode;
            if (event.ctrlKey) {
                if (key === 82) {
                    event.preventDefault();
                    $('#btnNew').click();
                }
                if (key === 83) {
                    event.preventDefault();
                    $('#btnSave').click();
                }
                if (key === 122){
                    event.preventDefault();
                    $('#btnFullScreen').click();
                }
                if (key === 118) {
                    event.preventDefault();
                    $('#btnBuild').click();
                }
                if (key === 113) {
                    event.preventDefault();
                    $('#mnuToggleBookmark').click();
                }
                if (event.shiftKey){
                    if (key === 113){
                        event.preventDefault();
                        $('#mnuClearBookmark').click();
                    }
                }
            }else{
                if(event.shiftKey){
                    if (key === 113){
                        event.preventDefault();
                        $('#mnuPreviousBookmark').click();
                    }
                }else{
                    if (key === 113){
                        event.preventDefault();
                        $('#mnuNextBookmark').click();
                    }
                }
            }
        });
        $('#loginPanelBody').keydown(function(event){
            if (event.keyCode === 13) {
                document.getElementById('btnLogin').click();
            }
        });
        $('body')
            .on( 'click', '#openBtn', function(event) {
                event.preventDefault();
                if($('#selectedRoutine').select2('val')>0){
                    var routineName = $('#selectedRoutine').select2('data').text;
                    var routinePath = $('#selectedRoutine').select2('data').path;
                    EWD.application.openRoutine(routineName,routinePath);
                    $("#selectedRoutine").select2("val", "");
                }
            })
            .on('click','#btnSave', EWD.application.saveRoutine)
            .on('click','#mnuSave',EWD.application.saveRoutine)
            .on('click','#btnNew', EWD.application.newRoutine)
            .on('click','#mnuNew', EWD.application.newRoutine)
            .on('click','#btnBuild', EWD.application.buildRoutine)
            .on('click','#mnuCompile', EWD.application.buildRoutine)
            .on('click','#btnFullScreen',EWD.application.setEditorFullScreen)
            .on('click','#mnuFullScreen',EWD.application.setEditorFullScreen)
            .on('click','#mnuToggleBookmark',EWD.application.toggleBookmark)
            .on('click','#mnuClearBookmark',EWD.application.clearBookmarks)
            .on('click','#mnuNextBookmark',EWD.application.nextBookmark)
            .on('click','#mnuPreviousBookmark',EWD.application.previousBookmark)
            .on('click','#btnLogin',EWD.application.Login)
            .on('click','#mnuAbout',EWD.application.showAbout)
            .on('click','#btnNROK', function(event){
                var routineName = $('#txtNewRoutine').val();
                EWD.application.checkRoutineName(routineName);
            })
            .on('click','#btnSDOK', function(event){
                var dir = $('#selectDirectoryBody .active');
                if(dir.length > 0){
                    $('#selectDirectoryModal').modal('hide');
                    var routineName = $('#selDirRoutine').html();
                    var routinePath = dir.html();
                    routinePath = routinePath + routineName + '.m';
                    EWD.application.createRoutineTab(routineName,routinePath,'',true);
                }else{
                    alert('select directory from the list.');
                }
            })
            .on('click','#btnSCYes', function(event){
                $('#saveChnagesModal').modal('hide');
                var routineName = EWD.application.eltobeClosed.siblings('a').text().replace(' *','');
                var routineText = EWD.application.getText(routineName);
                var routinePath = EWD.application.routines[routineName].path;
                EWD.application.saveonclosing = true;
                EWD.application.saveRoutine(routinePath,routineText);
                var anchor = EWD.application.eltobeClosed.siblings('a');
                $(anchor.attr('href')).remove();
                EWD.application.eltobeClosed.parent().remove();
                if($('.nav-tabs li').length > 0){
                    $(".nav-tabs li").children('a').first().click();
                }else{
                    EWD.application.setEditMode(false);
                }
                EWD.application.eltobeClosed = null;
            })
            .on('click','#btnSCNo', function(event){
                $('#saveChnagesModal').modal('hide');
                var anchor = EWD.application.eltobeClosed.siblings('a');
                $(anchor.attr('href')).remove();
                EWD.application.eltobeClosed.parent().remove();
                if($('.nav-tabs li').length > 0){
                    $(".nav-tabs li").children('a').first().click();
                }else{
                    EWD.application.setEditMode(false);
                }
                EWD.application.eltobeClosed = null;
            });
        $(".nav-tabs").on("click", "a", function (e) {
            e.preventDefault();
            $(this).tab('show');
            EWD.application.routines[$(this).text().replace(' *','')].editor.refresh();
            EWD.application.setEditMode(true);
        })
            .on("click", "span", function () {
                var routineName = $(this).siblings('a').text();
                if(routineName.indexOf('*')>=0){
                    EWD.application.eltobeClosed = $(this);
                    $('#saveChangesBody').html('Save changes to <b>' + routineName.replace(' *','') + '</b>.');
                    $('#saveChnagesModal').modal({
                        keyboard: false,
                        backdrop: 'static'
                    });
                }else{
                    var anchor = $(this).siblings('a');
                    $(anchor.attr('href')).remove();
                    $(this).parent().remove();
                    if($('.nav-tabs li').length > 0){
                        $(".nav-tabs li").children('a').first().click();
                    }else{
                        EWD.application.setEditMode(false);
                    }
                }
            });
    },

    onPageSwap: {
    },

    onFragment: {

    },

    onMessage: {
        getRoutine: function(messageObj) {
            if(messageObj.message.error){
                alert(messageObj.message.error);
            }else{
                if(messageObj.message.routine){
                    var routineName = messageObj.message.name;
                    var routineText = messageObj.message.routine;
                    var routinePath = messageObj.message.path;
                    EWD.application.createRoutineTab(routineName,routinePath,routineText,false);
                }else{
                    alert('Some error occurred while fething routine.');
                }
            }
            return;
        },
        routineMatches : function(messageObj){
            if (messageObj.params) {
                EWD.application.select2.results = messageObj.params;
            }
            else {
                EWD.application.select2.results = messageObj.message;
            }
            EWD.application.select2.callback(EWD.application.select2);
            return;
        },
        saveRoutine: function(messageObj){
            if(messageObj.message.error){
                alert(messageObj.message.error);
            }else{
                if(messageObj.message.saved){
                    if(EWD.application.saveonclosing){
                        EWD.application.saveonclosing = false;
                        return;
                    }
                    var routineName = $('.nav-tabs .active a').text().replace(' *','');
                    $('.nav-tabs .active a').text(routineName);
                    EWD.application.routines[routineName].editor.on("change",EWD.application.textChanged);
                }else{
                    alert('Some error occurred in saving routine.');
                }
            }
            return;
        },
        buildRoutine : function(messageObj){
            if(messageObj.message.error){
                alert(messageObj.message.error);
            }else{
                if(messageObj.message.build){
                    if(messageObj.message.output){
                        EWD.application.setResult(('Detected errors during compilation\n' + messageObj.message.output).split('\n'));
                    }else{
                        var routineName = $('.nav-tabs .active a').text().replace(' *','');
                        EWD.application.setResult((routineName + ' compiled successfully.').split('\n'));
                    }

                }else{
                    alert('Some error occurred in saving routine.');
                }
            }
            return;
        },
        checkRoutineName: function(messageObj){
            if(messageObj.message.error){
                alert(messageObj.message.error);
            }else{
                if(messageObj.message.check){
                    $('#newRoutineModal').modal('hide');
                    if(messageObj.message.dirs.length > 1){
                        var dirHtml = '';
                        for(var i=0; i < messageObj.message.dirs.length; i++){
                            dirHtml = dirHtml + '<a href="#" class="list-group-item">' + messageObj.message.dirs[i] + '</a>'
                        }
                        $('#selDirRoutine').html(messageObj.message.routine);
                        $('#selectDirectoryBody').html(dirHtml);
                        $('#selectDirectoryBody a').click(function(e) {
                            e.preventDefault();
                            $(this).parent().find('a').removeClass('active');
                            $(this).addClass('active');
                        });
                        $('#selectDirectoryModal').modal({
                            keyboard: false,
                            backdrop: 'static'
                        });
                    }else{
                        var routineName = messageObj.message.routine;
                        var routinePath = messageObj.message.dirs[0];
                        if(routinePath){
                            routinePath = routinePath + routineName + '.m';
                            EWD.application.createRoutineTab(routineName,routinePath,'',true);
                        }
                    }
                }else{
                    alert('error!');
                }
            }
            return;
        },
        Login: function(messageObj){
            if(messageObj.message.error){
                alert(messageObj.message.error);
            }else{
                if(messageObj.message.authenticated){
                    $('#loginModal').modal('hide');
                }else{
                    alert('error!');
                }
            }
        }
    }

};
EWD.onSocketsReady = function() {
    for (id in EWD.application.labels) {
        try {
            document.getElementById(id).innerHTML = EWD.application.labels[id];
        }
        catch(err) {}
    };
    if (EWD.application.onStartup) EWD.application.onStartup();
};
EWD.onSocketMessage = function(messageObj) {
    if (EWD.application.messageHandlers) EWD.application.messageHandlers(messageObj);
};