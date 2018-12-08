# Formr
A JavaScript form builder library

This app/api allows you to setup backend resources which can send and receive JSON data to build and modify an HTML form. It can build a form with text fields, text areas, dropdown selections, checkboxes, radio buttons and even custom html elements like `<divs>` or `<spans>`.

A sample `data.json` source file is included for referencing the required API structure.


## Setup

### Dependencies
- [Bootstrap 4](https://www.getbootstrap.com "getbootstrap.com")
- [jQuery 3](https://www.code.jquery.com "jquery.com")
- [jQuery UI](https://www.code.jqueryui.com "jqueryui.com")

---

### Config
After setting up the HTML with the dependencies you can initialize the app with the following code example below. Note that the `formr.init()` method accepts an object with your configuration items.

```Javascript
formr.init({
    resourceURL: '<your url string>', 
    targetURL: '<your url string>', 
    liveloadURL: '<your url string>', 
    callback: '<your callback function>'
});
```

|Argument|Type|Description
|---|:---:|---|
|`resourceURL`|string|The URL that will pull the initial JSON data.|
|`targetURL`|string|The target URL that the API will POST to at form submission.|
|`liveloadURL`|string|The target URL that the API will POST to when a change occurs to a defined form input.|
|`callback`|function|`OPTIONAL` - A callback to a function defined outside the API. This will trigger when the response is received from the user submission event. The response data will be passed to this function.|

## The `formr` Object

```Javascript
formr {
    callback: ƒ callback(),
    data: [array],
    init: ƒ (resourceURL,targetURL,liveLoadURL,callback),
    liveLoad: ƒ liveLoad(changed),
    liveloadURL: 'url string',
    resetFields: ƒ resetFields(fields = ['input','textarea','select']),
    resourceURL: 'url string',
    targetURL: 'url string'
}
```

## Debugging

You can run `formr.resetFields();` from the web console to reset all the fields. 

You can run it without arguments to reset all fields

> OR

You can pass it an array of just the input types that you want to reset. For example:

```Javascript
// For multiple types
formr.resetFields(['textarea','select']);

// For just one, an array is still required
formr.resetFields(['select']);
```


## JSON Format

|Form Objects|Types|HTML Result|Sub-Objects / Notes|
|---|:---:|:---:|---|
|Form Title|formTitle|`<h2>`|This will also set the Document's title.|
|Input Field|text, number, date|`<input>`|none|
|Multi Line Input Field|textarea|`<textarea>`|none|
|Dropdown Selection|dropdown|`<select>`|`<option>` => `"options":{"key": "value"}`|
|Checkbox Group|checkboxGroup|`form-check`|`<checkbox>` => `"options":{"key": "value"}` _**NOTE:** A label for the checkboxGroup object is **REQUIRED** for this to function properly._|
|Radio Group|radioGroup|`form-check`|`<radio>` => `"options":{"key": "value"}`|
|Button|button|`<button>`|none|
|HTML Element|html|`<div>`,`<span>`,`<p>`, etc.|Provides an HTML element to insert just about anything. Needs a `config` sub-object to define its properties ex: `"config":{"key": "value"}`|

The form will be constructed in the order of the objects in the JSON received.

Simple example of JSON format:
```Javascript
[
    {
        "formTitle": "Sample Form Title"
    },
    {
        "type": "text",
        "label": "Text Label:",
        "id": "text1",
        "placeholder": "Enter text here:",
        "required": true,
        "disabled": false,
        "onchange": "formr.liveLoad(this);"
    },
	{
		"type": "html",
        "id": "html1",
		"config": {
            "type": "div",
            "class": "my-3",
            "html": "<p>This is <b>inner</b> HTML!</p>",
            "style": "color:#fb56f4"
        }
	},
    {
        "type": "textarea",
        "label": "Text Area Label:",
        "id": "textarea1",
        "placeholder": "Enter text here:",
        "rows": "4",
        "required": true
    },
    {
        "type": "dropdown",
        "label": "Select an Option:",
        "id": "dropdown1",
        "required": true,
        "options": {
            "Label for Item 1":"Value for Item 1",
            "Label for Item 2":"Value for Item 2",
            "Label for Item 3":"Value for Item 3"
        }
    },
    {
        "type": "checkboxGroup",
        "label": "Please select any options below:",
        "id": "checkGroup1",
        "value": [
            "Value for Item 2"
        ],
        "options": {
            "Label for Item 1":"Value for Item 1",
            "Label for Item 2":"Value for Item 2"
        }
    },
    {
        "type": "radioGroup",
        "label": "Please select an option below:",
        "id": "radioGroup1",
        "required": true,
        "options": {
            "Label for Item 1":"Value for Item 1",
            "Label for Item 2":"Value for Item 2"
        }
    },
    {
        "type": "button",
        "label": "Submit",
        "id": "submitButton"
    }
]
```

## Live Loading
Liveloading is supported but not required. Liveloading will POST an array-encapsulated object of id:value pairs to the `liveloadURL` at the onchange event of specified fields. 

> _**NOTE:** No validation takes place during liveload._ 

Formr expects return JSON to include the sent id:value pairs. It will use that JSON to rebuild the entire form and fill in the values then focus to the next field from where the user input. 

> _**NOTE:** The form will be set to disabled while the POST request is in flight. This is to prevent the user from entering more values before the form is re rendered and ready, resulting in lost entries._

 To use liveloading 2 things must be done.

1. Define the `"liveloadURL"` in the config object at `init();`
2. Set the hook on any JSON form object with the `"onchange"` property to call the `formr.liveLoad(this);` method.

Example:
```Javascript
{
        "type": "text",
        "label": "Text Label:",
        "id": "text1",
        "placeholder": "Enter text here:",
        "required": true,
        "disabled": false,
        "onchange": "formr.liveLoad(this);" // <--
    }
```

## Form Submission and Validation
Formr self validates and POSTs an array-encapsulated object of id:value pairs to the `targetURL`. Empty required fields will have their 'required' text changed to red to indicate to the user that something is missing.