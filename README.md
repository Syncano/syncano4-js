# Syncano javascript library v 4.0 alpha

Directory structure:

* lib/ - js library
* examples/browser - examples for browser (in form of web page)
* examples/node - simple node.js test script

## To run the examples

First, you need a Syncano account.
To create one please follow these steps:

* open `examples/node/createAccount.js` in your favourite editor and fill your data (email, password and name)
* `cd examples/node`
* `npm install`
* `node createAccount.js`
* create `examples/browser/js/config.js` file and place the structure returned by createAccount.js in it:

```javascript
var Config = {
	instance: '...',
	email: '...',
	password: '...',
	apiKey: ''
};
```

* download latest jquery and put it in `examples/browser/vendor/jquery.js`
* open `examples/browser/index.html` file
* press the `Connect with email/password` button
* button should become green in a second and you'll see an apiKey in the site header
* put this apiKey in previously generated config.js

Phew! Now you have your own account and instance and you are ready to play with api. Simply reload `examples/browser/index.html` and play with buttons.


# Library methods

All methods accepts callbackOK and callbackError as 2 last parameters. These are methods that will be called on success or fail accordingly. If not set - promise will be returned.

### new Syncano(instance)

instance param is optional. If passed, setInstance method will be called automatically.

### connect(email, password)
### connect(token)
### setInstance(instanceName)
### getInfo()

Returns object with account info (auth_token and user if any), instance and links.


### Accounts.create
### Accounts.get
### Accounts.update
### Accounts.resetKey

If you reset your key, you'll have to write the newly generated apiKey in your config.js file.

### Instances.create
### Instances.list
### Instances.get
### Instances.remove
### Instances.update
### Instances.listAdmins

### Classes.create
### Classes.list
### Classes.remove
### Classes.get
### Classes.update

### DataObjects.create
### DataObjects.list
### DataObjects.remove
### DataObjects.get
### DataObjects.update

### ApiKeys.create
### ApiKeys.list
### ApiKeys.get
### ApiKeys.remove

### CodeBoxes.create
### CodeBoxes.list
### CodeBoxes.listRuntimes
### CodeBoxes.get
### CodeBoxes.update
### CodeBoxes.remove

### Invitations.create
### Invitations.list
### Invitations.get
### Invitations.remove

### WebHooks.create
### WebHooks.list
### WebHooks.get
### WebHooks.update
### WebHooks.remove
### WebHooks.run

### Triggers.create
### Triggers.list
### Triggers.get
### Triggers.update
### Triggers.remove
