# Flask + SocketIO server wrapping a google spreadsheet
# and serving out a leaflet-based webpage for use
# in tagging crosswalks and sidewalks in the field.
#
# Daven Amin, 09/15/2017
import os
import json
import base64
import pandas as pd
from datetime import datetime
from pathlib import Path
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession
import gspread
from flask import Flask, render_template, url_for
import flask_socketio

# ---------------- app config -------------- #
# set up flask and socketio
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ['FLASK_SECRET']
socketio = flask_socketio.SocketIO(app)

# authorize gspread to access the google spreadsheet backend
# adapted from https://github.com/burnash/gspread/issues/472
json_creds = json.loads(base64.b64decode(os.environ['GOOGLE_CREDENTIALS_B64']))
scope = ['https://www.googleapis.com/auth/spreadsheets']
credentials = service_account.Credentials.from_service_account_info(json_creds)
scoped_creds = credentials.with_scopes(scope)
authed_session = AuthorizedSession(scoped_creds)
gc = gspread.Client(auth=scoped_creds)
gc.session = authed_session

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


# ------------- data stuff ---------------- #
# unfortunately, gspread isn't set up to do "dynamic updates" where
# we can easily track when a spreadsheet has changed. we'll rely on
# either a timer or an external notification to refresh our data model.
# these functions will let us grab and store the latest data
# from the spreadsheet.
last_updated_time = None
last_values = pd.DataFrame()


def get_gis_from_google():
    """grab the data in the "gis_dataset" worksheet from the
    google spreadsheet corresponding to environment variable
    "GOOGLE_SHEET_KEY". return a tuple of all data and time last updated.
    """
    backend = gc.open_by_key(os.environ['GOOGLE_SHEET_KEY'])
    ref_worksheet = backend.worksheet("gis_dataset")
    ref_updated_time = datetime.strptime(ref_worksheet.updated,
                                         '%Y-%m-%dT%H:%M:%S.%fZ')
    return ref_worksheet.get_all_records(), ref_updated_time


def update_records():
    """checks and possibly updates the dataset from the gis_dataset worksheet,
    if has been updated since last fetched.
    returns any row numbers which have been added or modified.
    negative numbers represent rows which were deleted, using slice notation
    (-1 is bottommost row, -2 is second from bottom, etc)."""
    global last_updated_time
    global last_values
    latest_raw_values, cur_updated_time = get_gis_from_google()
    if (last_updated_time is None) or (cur_updated_time > last_updated_time):
        last_updated_time = cur_updated_time
        updated_rows = []
        latest_values = pd.DataFrame(latest_raw_values)

        if len(latest_values) < len(last_values):
            # rows were deleted, we need to drop rows
            updated_rows = list(range(len(latest_values)-len(last_values), 0))
            last_values = last_values[:len(latest_values)]
        elif len(latest_values) > len(last_values):
            # if rows were added, append them
            updated_rows = list(range(len(last_values),
                                      len(latest_values)))
            last_values = pd.concat([last_values,
                                     latest_values[len(last_values):]])
        # account for changed rows
        equal_rows = (last_values == latest_values).all(axis=1)
        updated_rows.extend(
            [ix for ix, neq in zip(range(len(equal_rows)), ~equal_rows)
             if neq])
        last_values[~equal_rows] = latest_values[~equal_rows]
        return updated_rows
    else:
        return []


# ------------ socket stuff --------------- #
# this is where we track clients and push data updates
@socketio.on('connect')
def handle_client_connection():
    """called when a new client connects"""
    print('client connected')
    flask_socketio.emit('data',
                        last_values.to_json(orient="records"),
                        broadcast=False,)


@socketio.on('disconnect')
def handle_client_disconnection():
    """called when a client disconnects"""
    print('client disconnected')

    
@socketio.on_error()
def handle_error(e):
    """called on error"""
    print("ERROR: " + str(e))


@socketio.on('submission')
def handle_submission(obj):
    """log a new submission from a client to the spreadsheet"""
    backend = gc.open_by_key(os.environ['GOOGLE_SHEET_KEY'])
    try:
        sub_worksheet = backend.worksheet("field_submissions")
    except gspread.exceptions.WorksheetNotFound:
        sub_worksheet = backend.add_worksheet("field_submissions", 1, 1)

    sub_worksheet.append_row([str(x) for x in obj])


@socketio.on('data_request')
def handle_data_request(rows):
    """send requested rows to a client"""
    bool_mask = [ix in rows for ix in range(len(last_values))]
    flask_socketio.emit('data_response',
                        last_values[bool_mask].to_json(orient="index"),
                        broadcast=False,)


def push_data_update(rows):
    """broadcast changed rows in the google spreadsheet"""
    ix_mask = [ix in rows for ix in range(len(last_values))]
    removed = [ix for ix in rows if ix < 0]
    socketio.emit('data_update', last_values[ix_mask].to_json(orient="index"))
    socketio.emit('data_removed', removed)


# ------------- debug logic ----------------- #
@app.route("/update")
def test_update():
    return json.dumps(update_records())


@app.route("/data")
def test_data():
    return last_values.to_json(orient="records")


# ------------ flask routing ------------- #
background_thread = None


def background_check_for_updates():
    """a background task to poll for changes to the spreadsheet"""
    while True:
        print("checking for updates")
        rows = update_records()
        push_data_update(rows)
        socketio.sleep(10)


@app.before_first_request
def start_background():
    """kick off the background task on the first page load"""
    global background_thread
    if background_thread is None:
        background_thread = socketio.start_background_task(
            background_check_for_updates)


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
