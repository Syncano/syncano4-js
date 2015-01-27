# To run:

1. add latest jquery in vendor/jquery.js
2. create config.js file with

```
var Config = {
	instance: '',
	email: '',
	password: '',
	token: ''
};
```

# Methods

All methods accepts callbackOK and callbackError as 2 last parameters. These are methods that will be called on success or fail accordingly. If not set - promise will be returned.

### new Syncano(instance)

instance param is optional. If passed, setInstance method will be called automatically.

### connect(email, password)

### connect(token)

### setInstance(instanceName)

### getInfo()

Returns object with account info (auth_token and user if any), instance and links.

### createClass({name, description, schema})

### listClasses()

### deleteClass(className)

### deleteClass(classObject)

Class object with "name" field is expected.

# Shortcuts

Assume
```
var obj = new Syncano();
```

Then:

```obj.models.Klass.list()``` is equivalent to ```obj.listClasses()```


