// NFCU
// Developers:
// Dean Hickerson
// Bruce Khalatbari
var formr = (function() {
    $.ajaxSetup({cache:false});
    var init = (function(configs) {
        this.resourceURL = configs.resourceURL;
        this.targetURL = configs.targetURL;
        this.liveloadURL = configs.liveloadURL;
        this.callback = configs.callback;
        this.preSubmit = configs.preSubmit;
        this.buildCallback = configs.buildCallback;
        this.debug = configs.debug;
        var self = this;
        $.get(configs.resourceURL).done(function(data) {
            buildForm(data);
            self.data = data;
        });
    });

    var debug = {
        log: function(msg) {
            if(formr.debug) {
                console.log(msg);
            }
        },
        warn: function(msg) {
            if(formr.debug) {
                console.warn(msg);
            }
        },
        error: function(msg) {
            if(formr.debug) {
                console.error(msg);
            }
        },
        dir: function(el) {
            if(formr.debug) {
                console.dir(el);
            }
        }
    };

    // Ensure 'noValidate' is on the form to prevent unwanted focus events from firing
    document.forms['formr'].noValidate = true;

    // Helper function to get the index numer of an element from a class selector
    function indexInClass(collection, node) {
        for (var i = 0; i < collection.length; i++) {
        if (collection[i] === node)
            return i;
        }
        return -1;
    }

    // Try to select all text when a formfield is focused.
    // We do this so we don't have to worry about the specific cursor location after a liveload
    document.forms['formr'].addEventListener('focus',function(e) {
        // TODO: Prevent input sooner to avoid the feeling of lag
        // Ideally, we would fire the loading spinner here via an exposed function
        /*
        if(formr.isLiveLoad === true && formr.changedVal !== e.target.value) {
            e.target.readOnly = true;
        }
        */
        if(e.target.classList.contains('formfield')) {
            if(e.target.select) {
                e.target.select();
            }
        }
    },true);

    // SCENARIO: We were focused on a liveload input. We changed the value, and 'tabbed' to the next input
    // Get the index number of the current focus. Run liveload and set the focus using this index
    // NOTE: We use the index # instead of the actual element to account for inputs that are inserted as a result of the liveload
    document.forms['formr'].addEventListener('keyup', function (e) {
        var key = e.which || e.keyCode;
        if(key === 9 && formr.isLiveLoad === true) {
            formr.isLiveLoad = false;
            var liveElement = indexInClass(document.forms['formr'].getElementsByClassName('formfield'),e.target);
            debug.log('  -Triggered by tabbing into the next form field: ' + e.target.id);
            debug.log('  -Invoke liveLoad and focus on the input that matches the current index of: ' + e.target.id + ' (index #' + liveElement + ')');
            formr.liveLoad(liveElement);
        }
    },true);

    // IMPORTANT: When a form field contains a input type 'submit', the 'click' event fires when the enter key is used
    // That said, there is no need to handle the enter key directly
    // SCENARIO: We were focused on a liveload input. We changed the value, and clicked another form field (or pressed enter in a textbox)
    // If we clicked the submit button (or pressed enter), defer the submit process until after liveload
    // If we clicked another form field, run the liveload and set focus to the clicked field
    document.forms['formr'].addEventListener('click',function(e) {
        if(formr.isLiveLoad === true && e.target.classList.contains('formfield') && e.target.type !== 'radio' && e.target.type !== 'checkbox' && e.target.type !== 'file' && e.target.tagName !== 'SELECT' && e.target !== formr.changedInput) {
            formr.isLiveLoad = false;
            var liveElement;
            if(e.target.type === 'submit') {
                liveElement = indexInClass(document.forms['formr'].getElementsByClassName('formfield'),formr.changedInput) + 1;
                formr.deferSubmit = true;
                debug.log('  -Triggered by attempt to submit form when a liveload is pending on: ' + formr.changedInput.id + '. Submit will be deferred');
                debug.log('  -Invoke liveLoad and focus on the input that SUCCEEDS: ' + formr.changedInput.id + ' (index #' + liveElement + ')');
                debug.log('  -  * If form validation fails, change focus to the first input that failed validation');
            }
            else {
                liveElement = indexInClass(document.forms['formr'].getElementsByClassName('formfield'),e.target);
                debug.log('  -Triggered by clicking into another form field: ' + e.target.id);
                debug.log('  -Invoke liveLoad and focus on: ' + e.target.id);
            }
            formr.liveLoad(liveElement);
        }
    },true);

    // The change event fires before click and keyup
    // If we detect a change in liveload element, set isLiveLoad to true UNLESS its a dropdown
    // The click and keyup handlers will perform the liveload only if a change occurs
    // If a dropdown is changed, submit the liveload request directly from the change handler
    document.forms['formr'].addEventListener('change',function(e) {
        if(e.target.classList.contains('formfield') && e.target.classList.contains('liveload')) {
            formr.changedVal = e.target.value;
            if(e.target.tagName === 'SELECT' || e.target.type === 'radio' || e.target.type === 'checkbox' || e.target.type === 'file') {
                debug.log('Dropdown/Checkbox/Radio change detected on: ' + e.target.id);
                debug.log('  -Invoke liveLoad and focus on: ' + e.target.id);
                formr.isLiveLoad = false;
                if(e.target.type === 'file') {
                    //TODO: handle input type file liveload
                }
                formr.liveLoad(e.target.id);
            }
            else {
                debug.log('Textbox change detected on: ' + e.target.id);
                formr.changedInput = e.target;
                formr.isLiveLoad = true;
            }
        }
        else {
            formr.isLiveLoad = false;
        }
    },true);

    // Defer form submit if a liveload is pending. Otherwise execute submitEvent();
    document.forms['formr'].addEventListener('submit',function(e) {
        e.preventDefault();
        if(formr.deferSubmit === true) {
            debug.log('Submit deferred');
        }
        else {
            debug.log('Submitting form');
            submitEvent();
        }
    },true);

    // We build the form in the initialzation of formr
    // and also again each time liveload is triggered
    function buildForm(json,changed) {
        var $form = $('#formr');
        var fieldSets = [];
        if(json[0] == undefined) {
            json = [json];
        }

        // If this is a liveLoad we need to clear the form
        // and later find the onchange element and replace
        // it with original data that triggered liveLoad
        $form.children().each(function() {
            $(this).remove();
        })

        // Next we loop through all JSON objects and build DOM elements
        $.each(json, function(i,v) {
            // Set some inputs with the default form-control class
            var formControl;
            if(v.type && v.type === 'file') {
                formControl = 'form-control-file';
            } else {
                formControl = 'form-control';
            }
            if(!v.class){
                if(v.type != 'button' && !v.formTitle && !v.description && v.type != 'checkboxGroup' && v.type != 'radioGroup') {
                    v.class = formControl;
                }
            } else if(v.class != 'form-control' && v.class != 'form-control-file') {
                if(v.type != 'button' && !v.formTitle && v.type != 'checkboxGroup' && v.type != 'radioGroup') {
                    v.class += ' ' + formControl;
                }
            }
            // Set form-group class if group property is supplied
            if(v.group) {
                v.group = v.group.replace(' ','_') // Replace spaces in the group name with underscores
                fieldSets.push(v.group); // Push the group name into the fieldSets array
                v.group += ' form-group'
                
            } else {
                v.group = 'form-group'
            }
            // Create a reusable form group element to stick inputs into
            var $formGroup = $('<div>',{class: v.group}),
                requiredMsg = $('<small>',{
                    class:'text-muted',
                    text: 'Required'
                });
            // Build form title
            if(v.formTitle) {
                // Create a bootstrap navbar
                var $navBar = $('<nav>',{
                    class: 'navbar',
                });
                // Create a clickable span element and add the title text to it (click reloads the page)
                var $formTitle = $('<span>',{
                    text: v.formTitle,
                    class: 'navbar-brand  m-auto ' + v.class,
                    style: 'cursor:pointer;' + v.style,
                    onclick: 'window.location.href="."',
                    id:'formTitle'
                });
                // Add the span to the nav element
                $formTitle.appendTo($navBar);
                // Add the nav element to the form
                $form.prepend($navBar);
                // Set the document title
                document.title = v.formTitle;
            } else if(v.description) {
                // Build the Description
                $description = $('<p>', v);
                $description.text(v.description);
                $description.removeClass('form-control');
                if($form.find('nav')) {
                    $form.find('nav').after($description);
                } else {
                    $form.prepend($description);
                }
            } else if (v.theme) {
                // Set the body className
                document.body.className = v.theme;
            } else if(v.type == 'dropdown') { 
                // Build dropdowns
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
                $select.addClass('formfield');
                $select[0].dataset.id = v.id;
                $select[0].dataset.type = v.type;
                $.each(bools, function(ind, prop) {
                    $select.prop(prop,true);
                });
                if(v.placeholder) {
                    $('<option style="color:#777;" value="" selected>' + v.placeholder + '</option>').appendTo($select);
                } else {
                    $('<option></option>').appendTo($select);
                }
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
                // Build checkboxes
                $('<label>' + v.label + '</label>').appendTo($formGroup);
                if(v.required == true){
                    groupRequired = true;
                }
                $.each(v.options, function(ind,opt) {
                    var $formCheck = $('<div>',{
                        class: 'form-check ' + v.class
                    });
                    var id = v.id + '-' + ind;
                    var $option = $('<input>',{
                        class: 'form-check-input formfield ' + v.class,
                        type: 'checkbox',
                        id: id,
                    });
                    if(v.value) {
                        //if v.value is an object, check multiple boxes
                        if(typeof v.value === 'object') {
                            $.each(v.value, function(index,value) {
                                if(value == opt) {
                                    $option.prop('checked',true);
                                }
                            });
                        }
                        //otherse assume its a string (single value)
                        else {
                            if(v.value == opt) {
                                $option.prop('checked',true);
                            }
                        }
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
                if(groupRequired == true){
                    groupRequired == false;
                    $formGroup.append(requiredMsg);
                }
                $formGroup[0].id = 'parent-' + v.id;
                $form.append($formGroup);
            } else if(v.type == 'radioGroup') {
                // Build radio buttons
                $('<label>' + v.label + '</label>').appendTo($formGroup);
                if(v.required == true){$formGroup.append(requiredMsg)}
                var bools = [];
                var groupRequired = false;
				if(v.required == true){
                    groupRequired = true;
                }
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
                        class: 'form-check ' + v.class
                    });
                    var id = v.id + '-' + ind;
                    var $option = $('<input>',{
                        class: 'form-check-input formfield ' + v.class,
                        type: 'radio',
                        id: id,
                        name: v.id
                    });
                    $.each(bools, function(ind, prop) {
                        $option.prop(prop,true);
                    });
                    if(v.value) {
                        //if v.value is an object, check multiple boxes
                        if(typeof v.value === 'object') {
                            $.each(v.value, function(index,value) {
                                if(value == opt) {
                                    $option.prop('checked',true);
                                }
                            });
                        }
                        //otherse assume its a string (single value)
                        else {
                            if(v.value == opt) {
                                $option.prop('checked',true);
                            }
                        }
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
                    if(groupRequired == true){
                        groupRequired == false;
                        $formGroup.append(requiredMsg);
                    }
                });
                $formGroup[0].id = 'parent-' + v.id;
                $form.append($formGroup);
            } else if(v.type == 'textarea') {
                // Build text areas
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
                $textarea.addClass('formfield');
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
                // Build buttons
                var buttonClass;
                if(v.class) {
                    buttonClass = 'btn ' + v.class;
                } else {
                    buttonClass = 'btn btn-outline-primary';
                }
                var $button;
                if(v.id === 'submitButton') {
                    $button = $('<input>', {
                        type: 'submit',
                        id: v.id,
                        class: buttonClass,
                        value: v.label
                    });
                } else {
                    $button = $('<button>', {
                        type: v.type,
                        id: v.id,
                        class: buttonClass,
                        text: v.label
                    });
                }
                $button.addClass('formfield');
                $formGroup.addClass('d-flex');
                $formGroup.append($button);
                $formGroup[0].id = 'parent-' + v.id;
                $form.append($formGroup);
            } else if(v.type == 'html') {
                // Build custom html divs
                var $div = $('<' + v.config.type + '>',v.config);
                $div[0].id = v.id;
                $form.append($div);
            } else if(v.type == 'date' && !checkInput('date')) {
                // If the browser doesn't support the date type,
                // we need to use jQuery UI to create a date picker
                var $inputGroup = $('<div>',{class:'input-group'})
                var $input = $('<input>',v);
                var $span = $('<span>',{
                    class:'input-group-text formfield',
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
                // Build text fields
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
                $input.addClass('formfield');
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
                // If we have a file upload input, init our reader function/listener
                if(v.type == 'file') {
                    fileUpload();
                }
            }
        });

        // Collect the unique group names from the fieldSets array
        fieldSets = jQuery.unique(fieldSets);
        $(fieldSets).each(function(i,v) { 
            var $legend = $('.' + v); //Give the legend a className of the group
            //Give the fieldSet an ID of the group
            var $fieldSet = $('<fieldset/>',{
                id:v
            });
            // Wrap the 
            $legend.wrapAll($fieldSet); 
            $('#' + v).prepend('<legend>' + v.replace('_',' ') + '</legend>');
        });

        // Retain the focus after re-write
        // Changed is the element that was last edited by the user
        // and it was passed to the buildForm function from liveload
        if(changed != undefined) {
            var focalPoint = document.forms['formr'].getElementsByClassName('formfield')[changed];
            focalPoint.focus();
            if(formr.deferSubmit === true) {
                formr.deferSubmit = false;
                submitEvent();
            }
        }

        // Triger a build callback function if one is specified
        if(formr.buildCallback) {
            formr.buildCallback();
        }
    }

    // This function gathers the IDs and values of our inputs
    // which is used by both submitEvent() and liveLoad()
    function gather(f) {
        var formData = {};
        f.find('[data-id]').each(function(i,v) {
            if(v.dataset.type == 'dropdown') {
                formData[v.dataset.id] = $(v)[0].options[$(v)[0].selectedIndex].value;
            } else if(v.dataset.type == 'checkbox') {
                if(!formData[v.dataset.id]) {
                    formData[v.dataset.id] = [];
                }
                if(v.checked) {
                    formData[v.dataset.id].push(v.dataset.value);
                }
                if(formData[v.dataset.id].length == 0) {
                    formData[v.dataset.id] = '';
                }
            } else if(v.dataset.type == 'radio') {
                if(v.checked) {
                    formData[v.name] = v.dataset.value;
                }
                if(!formData[v.name]) {
                    formData[v.name] = '';
                }
            } else if(v.dataset.type == 'file') {
                if(formr.file){
                    formData[v.dataset.id] = {
                        fileName: formr.file.fileName,
                        data: formr.file.data
                    };
                } else {
                    formData[v.dataset.id] = '';
                }
            } else {
                formData[v.dataset.id] = v.value;
            }
        });
        if(formData[0] == undefined) {
            formData = [formData];
        }
        return formData;
    }

    function submitEvent(e) {
        // Reset the required text helpers from red to muted
        $.each($('small'), function(i,v) {
            $(v).removeClass('text-danger');
            $(v).addClass('text-muted');
        });
        // Select the form and set it as an object variable
        // also set our validity state and run the vanilla HTML5 validation
        var form = $('#formr');
        var valid = false;
        if(document.querySelector('#formr').checkValidity()) {
            valid = true;
        }
        // Begin creating our object that we will send to our backend (targetURL)
        var formData = gather(form);
        // If HTML5 validation passes we wrap up the formData object in an array
        // and POST to the targetURL
        if(valid) {
            if(formr.preSubmit) {
                debug.log('Calling presubmit callback function');
                formr.preSubmit();
            }
            debug.log(formData);
            if(formr.targetURL) {
                $.ajax({
                    type: 'POST',
                    url: formr.targetURL,
                    data: JSON.stringify(formData),
                    dataType: 'json'
                }).done(function(data){ 
                    debug.log('Response:');
                    debug.log(data);
                    if(formr.callback) {
                        formr.callback(data);
                    }
                });
                // If we want to reset fields after user submission
                // we can uncomment this when in PROD
                // resetFields();
            } else {
                debug.warn('Warning: No Target URL specified at initialization. No Data was sent.');
                formr.callback();
            }
        } else {
            // If HTML5 form validation does not pass
            // we need to find those fields which failed to pass
            // and store them in an array
            var invalids = [];
            form.find('[data-id]').each(function(i,v) {
                if(!v.validity.valid) {
                    invalids.push(v.dataset.id);
                }
            });
            
            // Set focus to the input that failed validation.
            if(invalids[0].slice(0,1) === '$'){
                $('#\\' + invalids[0]).focus();
            } else {
                $('#' + invalids[0]).focus();
            }
            

            // We use a jQuery unique sort to clean up duplicates from checkboxes and radio groups
            invalids = $.uniqueSort(invalids);
            var formGroups = [];
            $.each(invalids, function(i,v) {
                formGroups.push($('[data-id="' + v + '"]').closest('.form-group'));
            });
            // Create an array of the required text elements
            var smalls = [];
            $.each(formGroups, function(i,v) {
                smalls.push(v.find('small'));
            })
            // Set all of the required text elements to red
            $.each(smalls, function(i,v) {
                v.removeClass('text-muted');
                v.addClass('text-danger');
            });
        }
    }
    // Function to find any input types which the user's browser doesn't support
    function checkInput(type) {
        var input = document.createElement("input");
        input.setAttribute("type", type);
        return input.type == type;
    }
    // Function to reset fields, can be used in debugging
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
    // Function to handle files that have been selected to upload.
    function fileUpload() {
        var reader = new FileReader();
        $('input[type="file"]').change(function(e) {
            formr.file = undefined;
            if(e.target.files[0] >= 1000000) {
                return false;
            } else if(e.target.files[0].slice(-4) === '.txt') {
                return false;
            } else {
                reader.readAsText(e.target.files[0]);
                reader.addEventListener('loadend', function() {
                    formr.file = {
                        fileName: e.target.files[0].name,
                        data: reader.result
                    };
                });
            }
        });
    }
    // Function to POST data and manipulate the form on the fly
    // No validation takes place before POST
    function liveLoad(changed) {
        var form = $('#formr'),
            formData = gather(form),
            pausedInputs = [];
        
        debug.log(formData);
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
            debug.log('Response:');
            debug.log(data);
            buildForm(data, changed);
        });
    }
    // More variables are added and removed from the formr object during runtime
    // We want to make these callable from the start of the app
    return {
        init: init,
        resetFields: resetFields,
        liveLoad: liveLoad
    }
})();