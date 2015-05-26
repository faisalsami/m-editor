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
        EWD.application.editor[routine].getDoc().setValue(text);
    },
    getText: function(routine){
        return EWD.application.editor[routine].getDoc().getValue();
    },
    getRoutine: function(routineName){
        EWD.sockets.sendMessage({
            type: 'getRoutine',
            params: {
                routineName: routineName,
                authorization: EWD.application.authorization
            }
        });
    },
    saveRoutine: function(routineName,routine){
        EWD.sockets.sendMessage({
            type: 'saveRoutine',
            params: {
                routineName: routineName,
                routine: routine,
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
        for(var i=1; i < resultArray.length; i++){
            result = result + resultArray[i] + '<br/>';
        }
        $('#content_results').html(result);
    },
    textChanged: function(instance,changeObj){
        console.log('faisal');
        console.log(instance);
        console.log(changeObj);
    },
    onStartup: function() {
        EWD.application.editor = {};
        this.enableSelect2(EWD.application.authorization);
        $(document).on('keydown', function(event){
            // detect key pressed
            var key = event.keyCode;
            if (event.ctrlKey) {
                if (key === 82) {
                    event.preventDefault();
                }
                if (key === 83) {
                    event.preventDefault();
                    $('#btnSave').click();
                }
            }
        });
        $('body').on( 'click', '#openBtn', function(event) {
            event.preventDefault();
            if($('#selectedRoutine').select2('val')>0){
                var found = false;
                $('.nav-tabs li').each(function(index, element) {
                    if($('#selectedRoutine').select2('data').text == $(element).find('a').text()){
                        found = true;
                        $(element).find('a').click();
                    }
                });
                if(!found) {
                    EWD.application.getRoutine($('#selectedRoutine').select2('data').text);
                }
                $("#selectedRoutine").select2("val", "");
            }
        })
            .on('click','#btnSave', function(event){
                var routineName = $('.nav-tabs .active a').text();
                if(!routineName){return;}
                var routineText = EWD.application.getText(routineName).split('\n');
                var routine = {};
                for(var i=0; i < routineText.length; i++){
                    routine[i+1] = routineText[i];
                }
                EWD.application.saveRoutine(routineName,routine);
            })
            .on('click','#btnNew', function(event){
                $('#txtNewRoutine').val('');
                $('#newRoutineModal').modal({
                    keyboard: false,
                    backdrop: 'static'
                });
            })
            .on('click','#btnNROK', function(event){
                var routineName = $('#txtNewRoutine').val();
                EWD.application.checkRoutineName(routineName);
            });
        $(".nav-tabs").on("click", "a", function (e) {
            e.preventDefault();
            $(this).tab('show');
            EWD.application.currentRoutine = $(this).text();
            EWD.application.editor[$(this).text()].refresh();
            $('#btnSave').show();
            $('#btnBuild').show();
        })
            .on("click", "span", function () {
                var anchor = $(this).siblings('a');
                $(anchor.attr('href')).remove();
                $(this).parent().remove();
                if($('.nav-tabs li').length > 0){
                    $(".nav-tabs li").children('a').first().click();
                }else{
                    $('#btnSave').hide();
                    $('#btnBuild').hide();
                    EWD.application.setResult([]);
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
                if(messageObj.message.routine.length > 0){
                    var routineName = messageObj.message.routine[0].split('^')[1];
                    var routineText = '';
                    for(var i=1; i <messageObj.message.routine.length; i++){
                        if(i == messageObj.message.routine.length-1){
                            routineText = routineText + messageObj.message.routine[i];
                        }else{
                            routineText = routineText + messageObj.message.routine[i] + '\n';
                        }
                    }
                    var rid = 'tab' + routineName;
                    var li = '<li role="presentation"><a href="#' + rid + '">' + routineName + '</a> <span> x </span></li>'
                    $(".nav-tabs").append(li);
                    var tid = 'txt' + routineName;
                    var tarea = '<textarea id="' + tid + '" name="' + tid + '"></textarea>';
                    $('.tab-content').append('<div class="tab-pane" id="' + rid + '">' + tarea + '</div>');
                    var mc = $("#main_Container");
                    var editor = CodeMirror.fromTextArea(document.getElementById(tid), {
                        mode: "mumps",
                        lineNumbers: false,
                        lineWrapping: false
                    });
                    editor.setSize(mc.width(), mc.height());
                    EWD.application.editor[routineName] = editor;
                    EWD.application.setText(routineName,routineText);
                    editor.on("change",EWD.application.textChanged);
                    EWD.application.currentRoutine = routineName;
                    $('.nav-tabs li:last-child a').click();
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
                EWD.application.setResult(messageObj.message.result);
            }
            return;
        },
        checkRoutineName: function(messageObj){
            if(messageObj.message.error){
                alert(messageObj.message.error);
            }else{
                $('#newRoutineModal').modal('hide');
                var routineName = messageObj.message.routine;
                var rid = 'tab' + routineName;
                var li = '<li role="presentation"><a href="#' + rid + '">' + routineName + '</a> <span> x </span></li>'
                $(".nav-tabs").append(li);
                var tid = 'txt' + routineName;
                var tarea = '<textarea id="' + tid + '" name="' + tid + '"></textarea>';
                $('.tab-content').append('<div class="tab-pane" id="' + rid + '">' + tarea + '</div>');
                var mc = $("#main_Container");
                var editor = CodeMirror.fromTextArea(document.getElementById(tid), {
                    mode: "mumps",
                    lineNumbers: false,
                    lineWrapping: false
                });
                editor.setSize(mc.width(), mc.height());
                editor.on("change",EWD.application.textChanged);
                EWD.application.editor[routineName] = editor;
                EWD.application.currentRoutine = routineName;
                $('.nav-tabs li:last-child a').click();
            }
            return;
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