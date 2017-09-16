# Flask + SocketIO server wrapping a google spreadsheet
# and serving out a leaflet-based webpage for use
# in tagging crosswalks and sidewalks in the field.
#
# Daven Amin, 09/15/2017
import os
import json
from pathlib import Path
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession
import gspread
from flask import Flask, render_template, url_for
from flask_socketio import SocketIO

# set up flask and socketio
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ['FLASK_SECRET']
socketio = SocketIO(app)

# authorize gspread to access the google spreadsheet backend
# adapted from https://github.com/burnash/gspread/issues/472
json_creds = json.loads(os.environ['GOOGLE_CREDENTIALS'])
scope = ['https://www.googleapis.com/auth/spreadsheets']
credentials = service_account.Credentials.from_service_account_info(json_creds)
scoped_creds = credentials.with_scopes(scope)
authed_session = AuthorizedSession(scoped_creds)
gc = gspread.Client(auth=scoped_creds)
gc.session = authed_session
backend = gc.open_by_key(os.environ['GOOGLE_SHEET_KEY'])

# grab all relevant files in the static directory - we want to inject them
# into the main entry point's HEAD section
css_files = [Path(os.path.join(parent.replace('static'+os.sep, '', 1), x))
             for parent, _, files
             in os.walk('static')
             for x in files
             if x.endswith(".css")]

js_files = [Path(os.path.join(parent.replace('static'+os.sep, '', 1), x))
            for parent, _, files
            in os.walk('static')
            for x in files
            if x.endswith(".js")]


@app.route('/')
def index():
    """main entry point - serves a page which initiates websocket comms"""
    return render_template('index.html',
                           css_files=[url_for('static', filename=x.as_posix())
                                      for x in css_files],
                           js_files=[url_for('static', filename=x.as_posix())
                                     for x in js_files])

if __name__ == '__main__':
    socketio.run(app, debug=True)
