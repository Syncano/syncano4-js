/*globals define, describe*/
var Syncano, syncano, instanceName, apiKey, baseURL, sinon, server, D, deferred, request, data;


describe("SyncanoV4 connection and auth tests", function() {
  Syncano = require("../lib/syncano4.js");
  syncano = new Syncano("library");
  sinon = require("sinon");
  D = require("d.js");
  deferred = D();
  request = require("request");
  data = {
    "account_key": "abcdefghijklmnoprstuwxyz"
  };

  // Test data
  baseURL = "https://syncanotest1-env.elasticbeanstalk.com";
  apiKey = "762110fb70fc1e973e1fb40b489d825ec785a05c";
  instanceName = "library";

  // Start fake server before each test
  beforeEach(function() {
    server = sinon.fakeServer.create();
  });
  // Restore original responses 
  afterEach(function() {
    server.restore();
  });

  it("test done", function(done) {
    // Define fake server response
    server.respondWith("/test/url", [
      200, {
        "Content-Type": "application/json"
      },
      JSON.stringify(data)
    ]);
    // Callback to watch if function runs
    callback = sinon.spy(function(res) {
      console.log("CALLBACK \n", res);
      return {
        "account_key": apiKey
      };
    });
    // If request respond - server working
    request.get("/test/url", function(res) {
      console.log(res);
      done();
    })

    syncano.connect(apiKey);
    syncano.Instances.list().then(function(res) {
      console.log(server.requests);
      server.respond();
      console.log(res.library);
      done();
    });

  });

  it("test connect method", function(done) {

    // Check if connect method exists
    expect(syncano.connect).toBeDefined();
    // Check if method throw error with no arguments
    expect(function() {
      syncano.connect()
    }).toThrowError("Incorrect arguments");
    // Create mocked "authWithPassword" method
    spyOn(syncano, "authWithPassword").and.callFake(function() {
      done(); // wait for end of async call
      return deferred.promise;
    });
    // Create mocked "authWithPassword" method

    spyOn(syncano, "setInstance").and.callFake(function() {
      return deferred.promise;
    });
    // Create mocked "authWithApiKey" method
    spyOn(syncano, "authWithApiKey").and.callFake(function() {
      return deferred.promise;
    });
    // Call connect via email and password to test if authWithPassword is called
    syncano.connect("email@domain.com", "password");
    // Check if "connect" method calls mocked "authWithPassword" method when params are email and password
    expect(syncano.authWithPassword).toHaveBeenCalled();
    // Check if "authWithPassword" method is called with correct params
    expect(syncano.authWithPassword).toHaveBeenCalledWith("email@domain.com", "password");
    // Check if "connect" method invoke mocked "setInstance" method
    expect(syncano.setInstance).toHaveBeenCalled();
    // Check if "authWithApiKey" was called
    syncano.connect(apiKey);
    expect(syncano.authWithApiKey).toHaveBeenCalled();



/*    syncano = new Syncano("lib");
    spyOn(syncano, "authWithPassword");
    spyOn(syncano, "setInstance");
    syncano.connect("email@domain.com", "password");
    expect(syncano.authWithPassword).toHaveBeenCalled();
    expect(syncano.setInstance).toHaveBeenCalled();*/
  });
});