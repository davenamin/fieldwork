# Flask + SocketIO server wrapping a google spreadsheet
# and serving out a leaflet-based webpage for use
# in tagging crosswalks and sidewalks in the field.
#
# Daven Amin, 09/15/2017
import os
import json
from datetime import datetime
from pathlib import Path
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession
import gspread
from flask import Flask, render_template, url_for
from flask_socketio import SocketIO

# ---------------- app config -------------- #
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

# ------------- app startup --------------- #
ref_worksheet = backend.worksheet("gis_dataset")
ref_cells = ref_worksheet.range(1, 1,
                                ref_worksheet.row_count,
                                ref_worksheet.col_count)
ref_updated_time = datetime.strptime(ref_worksheet.updated,
                                     '%Y-%m-%dT%H:%M:%S.%fZ')

# building the app's notion of the data model
# unfortunately, we don't have any notion of a primary key, so use row nums
data_model = {key: {} for key in range(ref_worksheet.row_count - 1)}
data_headers = {cell.col: cell.value for cell in ref_cells if cell.row == 1}
for cell in ref_cells:
    if cell.row != 1:  # if not header
        data_row = cell.row-2
        data_col = data_headers[cell.col]
        data_model[data_row][data_col] = (cell, cell.value, None)


# ------------- app logic ----------------- #
def get_updated_records():
    """checks if the reference worksheet has been updated since last fetched.
    returns any row numbers which have been added or modified"""
    cur_updated_time = datetime.strptime(ref_worksheet.updated,
                                         '%Y-%m-%dT%H:%M:%S.%fZ')
    if cur_updated_time > ref_updated_time:
        updated_rows = []
        for row, row_dict in data_model.items():
            for col_name, cell_tracker in row_dict:
                if cell_tracker[0].value != cell_tracker[1]:
                    cell_tracker[1] = cell_tracker[0].value
                    cell_tracker[2] = None
                    updated_rows.append(row)
        return updated_rows
    else:
        return []


# ------------ flask routing ------------- #
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
