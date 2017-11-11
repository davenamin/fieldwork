# a web application for logging of data in the field #

## objectives ##
* log data to a human-friendly spreadsheet, rather than a database
* present choices to a user based off of existing rows from the spreadsheet
* use technologies that can run on a mobile browser
* (possibly) allow for real-time collaboration

## overview of code ##
### what's going on here? ###
this is actually two intertwined applications in the same repository.

the "backend" is written in Python, uses Flask and SocketIO, 
and stores/loads data from Google Spreadsheets. The code is in `server.py`.
helper/utility functions (meant to be run once or twice, 
just when setting things up!) live in `admin.py`.

the "frontend" is written in Typescript, uses Leaflet (with several plugins),
SocketIO, Vue.js, and is built by Webpack. The Webpack and Typescript 
configurationsare in `webpack.config.js` and `tsconfig.json` respectively. 
The code lives in the `src` and `template` folders, and Webpack will emit the 
built code into the `static` folder (and create it if necessary). The contents
of `static` are served up by Flask and the backend.

the application is meant to deploy on Dokku. the `Procfile` and `runtime.txt`
files tell Dokku how to run this application, and that it needs Python 3.

### why is this so complicated? ###
it doesn't need to be, _but_ this is meant to be an extensible starting point
for anyone writing a self-contained map-based logger for fieldwork. it's also a 
learning experience for the authors.

## Getting Started ##
### setup a development environment ###
install Python via the Anaconda distribution or [miniconda](https://conda.io/miniconda.html)

create a new conda environment and install Python 3.6.2
and the python dependencies for this app.
if you're on windows, this means open the Anaconda Command Prompt, and run:
```
> conda create -n fieldwork 
(type y when prompted)
> activate fieldwork
> conda install python=3.6.2
(type y when prompted)
> cd <path to this repository>
> pip install -r requirements.txt
```
the above block created a new conda environment called "fieldwork", installed
python 3.6.2 in it (which is what is supported by Heroku/Dokku) and then
installed all of the required python libraries for this application.


install [NodeJS](https://nodejs.org/), probably the LTS version, 
and install the node dependencies for this application. 
if you're on windows, this means open a command prompt and run:
```
> cd <path to this repository>
> npm install
```

### environment variables to link with a Google Spreadsheet ###
set the following environment variables
* "GOOGLE\_SHEET\_KEY" to the id of the backing sheet, 
* "GOOGLE\_CREDENTIALS" to the private key from the google API.

if you don't know what that means, follow [this tutorial](https://www.twilio.com/blog/2017/03/google-spreadsheets-and-net-core.html), 
especially the section called "Get access to your spreadsheets". don't forget to
share the Google Spreadsheet with the email address from `client_secret.json`!
the "private key from the google API" is the contents of `client_secret.json`
and the "id of the backing sheet" is the [Spreadsheet ID](https://developers.google.com/sheets/api/guides/concepts#spreadsheet_id).

this application is meant to run on Dokku, and that means any information
not explicitly written into the code (like which spreadsheet to use)
needs to be passed as environment variables. unfortunately, the credential 
information from the google API has quotations and stuff that doesn't play nice
with Dokku ([though that might change?](https://github.com/dokku/dokku/issues/1262)).
in the meantime, this app expects the credential information as a base64 encoded
string. start up a python interpreter and use the utility function in `admin.py`.
if you're on windows and followed the previous steps open up a command prompt and: 
```
> activate fieldwork
> cd <path to this repository>
> python
> import admin
> admin.write_base64_encoded_credentials("base64credentials.txt")
```
set the environment variable "GOOGLE\_CREDENTIALS\_B64" to the contents of the
newly-created `base64credentials.txt` file.

### run the app locally, while developing ###
both the server and Webpack can be run in development mode on a local machine.
this means that if you change `server.py`, Flask will reload the backend, and 
if you change anything in `src`, Webpack will re-transpile the frontend.
run `python server.py` and `npm run watch` from the root of the repository.
if you're on windows and followed the previous steps, open up TWO command
prompts, and execute:
```
> activate fieldwork
> cd <path to this repository>
> python server.py
```
and
```
> cd <path to this repository>
> npm run watch
```

### deployment on [Dokku](http://dokku.viewdocs.io/dokku/)! ###
Note: FLASK_SECRET is an additional environment variable for [the Flask secret key](https://stackoverflow.com/questions/22463939/demystify-flask-app-secret-key).
__please set this to something if you're deploying the application!__
* `dokku apps:create <appname>`
* `dokku config:set <appname> FLASK_SECRET=<...> GOOGLE_SHEET_KEY=<...> GOOGLE_CREDENTIALS_B64=<previously encoded string>`
* `dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git`
* `dokku config:set --global DOKKU_LETSENCRYPT_EMAIL=<your email address>`
* `dokku letsencrypt <appname>`

and [push to deploy](http://dokku.viewdocs.io/dokku/deployment/application-deployment/#deploy-the-app). The [Let's Encrypt](https://letsencrypt.org/) stuff is because the HTML5 Geolocation API isn't available unless served over HTTPS.

## other information ##

### technologies used ###

#### web server ####
* [Python language](https://www.python.org/)
* [Flask web framework](http://flask.pocoo.org/)
* [Flask SocketIO integration library](http://flask-socketio.readthedocs.io/en/latest/)
* ["gspread" library for accessing spreadsheet](http://gspread.readthedocs.io/en/latest/)

#### web client ####
* [modern Javascript](https://javascript.info/)
* [NodeJS](https://nodejs.org/)
* [TypeScript](http://www.typescriptlang.org/)
* [WebPack](https://webpack.js.org/)
* [JQuery](http://jquery.com/)
* [SocketIO](https://socket.io/)
* [Leaflet](http://leafletjs.com/)
* [Leaflet fa-markers](https://github.com/danwild/leaflet-fa-markers)
* [Font Awesome](http://fontawesome.io/icons/)
* [Leaflet Marker-Cluster](https://github.com/Leaflet/Leaflet.markercluster)
* [Leaflet providers](https://github.com/leaflet-extras/leaflet-providers)
* [Leaflet EasyButton](https://github.com/cliffcloud/Leaflet.EasyButton)


### still in progress ###
can't think of a good way to force the server to mark the backend as "dirty" and re-fetch it (i.e. if someone manually updates the spreadsheet). working thought right now is to add a script to the spreadsheet to call a "refresh" URL.
