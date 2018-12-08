// NFCU
// Developers:
// Dean Hickerson
// Bruce Khalatbari
var formr = (function() {
    $(document).on("keypress", ":input:not(textarea)", function(event) {
        return event.keyCode != 13;
    });
    $.ajaxSetup({cache:false});
    var init = (function(configs) {
        this.resourceURL = configs.resourceURL;
        this.targetURL = configs.targetURL;
        this.liveloadURL = configs.liveloadURL;
        this.callback = configs.callback;
        var self = this;
        $.get(configs.resourceURL).done(function(data) {
            buildForm(data);
            self.data = data;
        });
    });

    function buildForm(json,changed) {
        var $form = $('#formr');
        if(json[0] == undefined) {
            json = [json];
        }

        // If this is a liveLoad we need to clear the form
        // and later find the onchange element and replace
        // it with original data that triggered liveLoad
        if(changed != undefined) {
            $form.children().each(function() {
                $(this).remove();
            })
        }

        $.each(json, function(i,v) {
            if(!v.class){
                if(v.type != 'button') {
                    v.class = 'form-control';
                }
            } else if(v.class != 'form-control') {
                if(v.type != 'button') {
                    v.class += ' form-control';
                }
            }
            var $formGroup = $('<div>',{class: 'form-group'}),
                requiredMsg = $('<small>',{
                    class:'text-muted',
                    text: 'Required'
                });
            if(v.formTitle) {
                $('<h2>' + v.formTitle + '</h2>').prependTo($form);
                document.title = v.formTitle;
            } else if(v.type == 'dropdown') {
                // build dropdowns
                $('<label>' + v.label + '</label>').appendTo($formGroup);
                var bools = [];
                $.each(v, function(prop, val) {
                    if(typeof val == 'boolean') {
                        if(val) {
                            bools.push(prop);
                        }
                        delete v[prop];
                    }
                });
                var $select = $('<select>', v);
                $select[0].dataset.id = v.id;
                $select[0].dataset.type = v.type;
                $.each(bools, function(ind, prop) {
                    $select.prop(prop,true);
                });
                $('<option></option>').appendTo($select);
                $.each(v.options, function(ind,opt) {
                    var $option = $('<option>',{
                        'data-value': opt,
                        text: ind,
                        value: opt
                    });
                    $select.append($option);
                });
                if(v.value) {
                    $select.val(v.value);
                }
                $formGroup.append($select);
                $formGroup[0].id = 'parent-' + v.id;
                if($select.prop('required')) {
                    $formGroup.append(requiredMsg);
                }
                $form.append($formGroup);
            } else if(v.type == 'checkboxGroup') {
                // build checkboxes
                $('<h6>' + v.label + '</h6>').appendTo($formGroup);
                $.each(v.options, function(ind,opt) {
                    var $formCheck = $('<div>',{
                        class: 'form-check'
                    });
                    var id = v.id + '-' + ind;
                    var $option = $('<input>',{
                        class: 'form-check-input',
                        type: 'checkbox',
                        id: id,
                    });
                    if(v.value) {
                        $.each(v.value, function(index,value) {
                            if(value == opt) {
                                $option.prop('checked',true);
                            }
                        });
                    }
                    $option[0].dataset.id = v.id;
                    $option[0].dataset.type = 'checkbox';
                    $option[0].dataset.value = opt;
                    $formCheck.append($option);
                    var $label = $('<label>',{
                        class: 'form-check-label',
                        for: id,
                        text: ind
                    });
                    $formCheck.append($label);
                    $formGroup.append($formCheck);
                });
                $formGroup[0].id = 'parent-' + v.id;
                $form.append($formGroup);
            } else if(v.type == 'radioGroup') {
                // build radio buttons
                $('<h6>' + v.label + '</h6>').appendTo($formGroup);
                if(v.required == true){$formGroup.append(requiredMsg)}
                var bools = [];
                $.each(v, function(prop, val) {
                    if(typeof val == 'boolean') {
                        if(val) {
                            bools.push(prop);
                        }
                        delete v[prop];
                    }
                });
                $.each(v.options, function(ind,opt) {
                    var $formCheck = $('<div>',{
                        class: 'form-check'
                    });
                    var id = v.id + '-' + ind;
                    var $option = $('<input>',{
                        class: 'form-check-input',
                        type: 'radio',
                        id: id,
                        name: v.id
                    });
                    $.each(bools, function(ind, prop) {
                        $option.prop(prop,true);
                    });
                    if(v.value) {
                        $.each(v.value, function(index,value) {
                            if(value == opt) {
                                $option.prop('checked',true);
                            }
                        });
                    }
                    $option[0].dataset.id = v.id;
                    $option[0].dataset.type = 'radio';
                    $option[0].dataset.value = opt;
                    $formCheck.append($option);
                    var $label = $('<label>',{
                        class: 'form-check-label',
                        for: id,
                        text: ind
                    });
                    $formCheck.append($label);
                    $formGroup.append($formCheck);
                });
                $formGroup[0].id = 'parent-' + v.id;
                $form.append($formGroup);
            } else if(v.type == 'textarea') {
                // build text areas
                $('<label>' + v.label + '</label>').appendTo($formGroup);
                var bools = [];
                $.each(v, function(prop, val) {
                    if(typeof val == 'boolean') {
                        if(val) {
                            bools.push(prop);
                        }
                        delete v[prop];
                    }
                });
                var $textarea = $('<textarea>',v);
                $.each(bools, function(ind, prop) {
                    $textarea.prop(prop,true);
                });
                $.each(v, function(ind, prop) {
                    $textarea[0].dataset[ind] = prop;
                });
                if(v.value) {
                    $textarea.text(v.value);
                }
                $formGroup.append($textarea);
                if($textarea.prop('required')) {
                    $formGroup.append(requiredMsg);
                }
                $formGroup[0].id = 'parent-' + v.id;
                $form.append($formGroup);
            } else if(v.type == 'button') {
                // build buttons
                var buttonClass;
                if(v.class) {
                    buttonClass = 'btn ' + v.class;
                } else {
                    buttonClass = 'btn btn-outline-primary';
                }
                var $button = $('<button>', {
                    type: v.type,
                    id: v.id,
                    class: buttonClass,
                    text: v.label,
                    onsubmit: 'event.preventDefault();'
                });
                $formGroup.append($button);
                $formGroup[0].id = 'parent-' + v.id;
                $form.append($formGroup);
            } else if(v.type == 'html') {
                // build custom html divs
                var $div = $('<' + v.config.type + '>',v.config);
                $div[0].id = v.id;
                $form.append($div);
            } else if(v.type == 'date' && !checkInput('date')) {
                // if the browser doesn't support the date type
                // we need to use jQuery UI to create a date picker
                var $inputGroup = $('<div>',{class:'input-group'})
                var $input = $('<input>',v);
                var $span = $('<span>',{
                    class:'input-group-text',
                    text: 'DD/MM/YYYY'
                });
                if(v.value) {
                    $input.val(v.value);
                }
                var $appendDiv = $('<div>',{class:'input-group-append'});
                $input.datepicker();
                $appendDiv.append($span);
                $inputGroup.append($input).append($appendDiv);
                $formGroup.append($inputGroup);
                $formGroup[0].id = 'parent-' + v.id;
                $form.append($formGroup);
            } else {
                // build text fields
                $('<label>' + v.label + '</label>').appendTo($formGroup);
                var bools = [];
                $.each(v, function(prop, val) {
                    if(typeof val == 'boolean') {
                        if(val) {
                            bools.push(prop);
                        }
                        delete v[prop];
                    }
                });
                var $input = $('<input>', v);
                $.each(bools, function(ind, prop) {
                    $input.prop(prop,true);
                });
                $.each(v, function(ind, prop) {
                    $input[0].dataset[ind] = prop;
                });
                $formGroup.append($input);
                if($input.prop('required')) {
                    $formGroup.append(requiredMsg);
                }
                $formGroup[0].id = 'parent-' + v.id;
                $form.append($formGroup);
            }
        });

        if(changed != undefined) {
            var changedElement = $form.find('#\\' + changed.id);
            $(changedElement).val(changed.value);
            $(changedElement).parent().next().find('[data-id]').focus();
        }

        $('#submitButton').click(submitEvent);
    }

    function submitEvent(e) {
        e.preventDefault();
        $.each($('small'), function(i,v) {
            $(v).removeClass('text-danger');
            $(v).addClass('text-muted');
        });
        var form = $('#formr');
        var valid = false;
        if(document.querySelector('#formr').checkValidity()) {
            valid = true;
        }
        var formData = {};
        form.find('[data-id]').each(function(i,v) {
            if(v.dataset.type == 'dropdown') {
                formData[v.dataset.id] = $(v)[0].options[$(v)[0].selectedIndex].value;
            } else if(v.dataset.type == 'checkbox') {
                if(v.checked) {
                    if(formData[v.dataset.id]) {
                        var array = [formData[v.dataset.id]];
                        array.push(v.dataset.value);
                        formData[v.dataset.id] = array;
                    } else {
                        formData[v.dataset.id] = v.dataset.value;
                    }
                }
            } else if(v.dataset.type == 'radio') {
                if(v.checked) {
                    formData[v.name] = v.dataset.value;
                }
            } else {
                formData[v.dataset.id] = v.value;
            }
        });
        if(valid) {
            if(formData[0] == undefined) {
                formData = [formData];
            }
            console.log(formData);
            if(formr.targetURL) {
                $.ajax({
                    type: 'POST',
                    url: formr.targetURL,
                    data: JSON.stringify(formData),
                    dataType: 'json'
                }).done(function(data){ 
                    console.log('Response:');
                    console.log(data);
                    if(formr.callback) {
                        formr.callback(data);
                    }
                });
                // if we want to reset fields after user submission
                // we can uncomment this when in PROD
                // resetFields();
            } else {
                console.warn('Warning: No Target URL specified at initialization. No Data was sent.');
                callback();
            }
        } else {
            var invalids = [];
            form.find('[data-id]').each(function(i,v) {
                if(!v.validity.valid) {
                    invalids.push(v.dataset.id);
                }
            });
            invalids = $.uniqueSort(invalids);
            var formGroups = [];
            $.each(invalids, function(i,v) {
                formGroups.push($('[data-id="' + v + '"]').closest('.form-group'));
            });
            var smalls = [];
            $.each(formGroups, function(i,v) {
                smalls.push(v.find('small'));
            })
            $.each(smalls, function(i,v) {
                v.removeClass('text-muted');
                v.addClass('text-danger');
            });
        }
    }
    function checkInput(type) {
        var input = document.createElement("input");
        input.setAttribute("type", type);
        return input.type == type;
    }
    function resetFields(fields) {
        var fieldsArray = ['input','textarea','select'];
        if(fields) {
            fieldsArray = fields
        }
        $.each(fieldsArray, function(i,v) {
            $(v).val('');
            $(v).prop('checked',false);
        });
    }
    function liveLoad(changed) {
        var form = $('#formr'),
            formData = {},
            pausedInputs = [];
        form.find('[data-id]').each(function(i,v) {
            if(v.dataset.type == 'dropdown') {
                formData[v.dataset.id] = $(v)[0].options[$(v)[0].selectedIndex].value;
            } else if(v.dataset.type == 'checkbox') {
                if(v.checked) {
                    if(formData[v.dataset.id]) {
                        var array = [formData[v.dataset.id]];
                        array.push(v.dataset.value);
                        formData[v.dataset.id] = array;
                    } else {
                        formData[v.dataset.id] = v.dataset.value;
                    }
                }
            } else if(v.dataset.type == 'radio') {
                if(v.checked) {
                    formData[v.name] = v.dataset.value;
                }
            } else {
                formData[v.dataset.id] = v.value;
            }
        });
        if(formData[0] == undefined) {
            formData = [formData];
        }
        console.log(formData);
        form.find('[data-id]').each(function(i,v) {
            if(!$(v).prop('disabled')) {
                pausedInputs.push(v);
            }
        });
        $(pausedInputs).each(function(i,v) {
            $(v).prop('disabled',true);
        });
        $('<svg class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>').prependTo(form);
        $.ajax({
            type: 'POST',
            url: formr.liveloadURL,
            data: JSON.stringify(formData),
            dataType: 'json'
        }).done(function(data){
            console.log('Response:');
            console.log(data);
            buildForm(data, changed);
        });
    }
    return {
        init: init,
        resetFields: resetFields,
        liveLoad: liveLoad
    }
})();