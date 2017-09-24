# a web application for logging of pedestrian crossings and sidewalks #

## objectives ##
* log data to a human-friendly spreadsheet, rather than a database
* present choices to a user based off of existing rows from the spreadsheet
* use technologies that can run on a mobile browser
* (possibly) allow for real-time collaboration

## Getting Started ##
### creating the backing sheet ###
this application assumes you have an existing sheet to read from and modify. functions to import and export data from the sheet, outside of the web application, are in the file `admin.py`.

### deployment ###
* set environment variables - 
  * "FLASK\_SECRET" to, something secret?, 
  * "GOOGLE\_SHEET\_KEY" to the id of the backing sheet, 
  * "GOOGLE\_CREDENTIALS" to the private key from the google API.
* use the `admin.py` functions to push data to the google spreadsheet and create a base64 encoded string of the private key credentials

The last step above is because the characters in the private key credentials don't always play nicely in an environment variable, at least not remotely.

Now, if you want to run this on [Dokku](http://dokku.viewdocs.io/dokku/):
* `dokku apps:create <appname>`
* `dokku config:set <appname> FLASK\_SECRET=<...> GOOGLE\_SHEET\_KEY=<...> GOOGLE\_CREDENTIALS\_B64=<previously encoded string>`
* `dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git`
* `dokku config:set --global DOKKU\_LETSENCRYPT\_EMAIL=<your email address>`
* `dokku letsencrypt <appname>`

and push to deploy. The [Let's Encrypt](https://letsencrypt.org/) stuff is because the HTML5 Geolocation API isn't available unless served over HTTPS.

## other information ##

### technologies, tutorials used ###
#### spreadsheet "backend" ####
* [access a Google spreadsheet using their API](https://www.twilio.com/blog/2017/03/google-spreadsheets-and-net-core.html)

#### web server ####
* [Python language](https://www.python.org/)
* [Flask web framework](http://flask.pocoo.org/)
* [Flask SocketIO integration library](http://flask-socketio.readthedocs.io/en/latest/)
* ["gspread" library for accessing spreadsheet](http://gspread.readthedocs.io/en/latest/)

#### web client ####
* [modern Javascript](https://javascript.info/)
* [JQuery](http://jquery.com/)
* [SocketIO](https://socket.io/)
* [Leaflet](http://leafletjs.com/)
* [Leaflet vector markers](https://github.com/hiasinho/Leaflet.vector-markers)
* [Font Awesome](http://fontawesome.io/icons/)
* [Leaflet Marker-Cluster](https://github.com/Leaflet/Leaflet.markercluster)
* [Leaflet providers](https://github.com/leaflet-extras/leaflet-providers)
* [Leaflet EasyButton](https://github.com/cliffcloud/Leaflet.EasyButton)


### gotchas ###
can't think of a good way to force the server to mark the backend as "dirty" and re-fetch it (i.e. if someone manually updates the spreadsheet). working thought right now is to add a script to the spreadsheet to call a "refresh" URL.
