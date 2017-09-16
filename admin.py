# admin functions to get GeoJSON data into and out of the spreadsheet
#
# Daven Amin, 09/15/2017
import os
import json
import geojson
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession
import gspread

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


def import_geojson_to_sheet(geojson_path):
    """WARNING: will clear existing spreadsheet!!!
    pushes a geojson file to the google spreadsheet."""
    with open(geojson_path) as f:
        data = geojson.load(f)
        try:
            parsed_list = []
            for feature in data.features:
                if feature.geometry is not None \
                   and feature.geometry.type == "Point":
                    lon, lat = list(geojson.coords(feature))[0]
                    verified = feature.properties.get('verified', 'unknown')
                    marking = feature.properties.get('marking', 'unknown')
                    signal = feature.properties.get('signal', 'unknown')
                    features = feature.properties.get('features', '')
                    notes = feature.properties.get('notes', '')
                    parsed_list.append([lon, lat, verified,
                                        marking, signal, features, notes])
            # if we got here, we built a full parsed list.
            # clear the spreadsheet and push what we have up
            try:
                worksheet = backend.worksheet("gis_dataset")
            except gspread.exceptions.WorksheetNotFound:
                worksheet = backend.add_worksheet("gis_dataset", 1, 1)
            worksheet.clear()
            row_header = ["Longitude", "Latitude", "Verified Status",
                          "Pedestrian Markings", "Crossing Signal",
                          "Other Features", "Notes"]
            # create enough rows and columns to batch an update
            worksheet.resize(rows=len(parsed_list)+1, cols=len(row_header))
            batched_cells = worksheet.range(1, 1,
                                            len(parsed_list)+1,
                                            len(row_header))
            for cel in batched_cells:
                if cel.row == 1:
                    cel.value = row_header[cel.col-1]
                else:
                    cel.value = parsed_list[cel.row-2][cel.col-1]

            worksheet.update_cells(batched_cells)
        except AttributeError as e:
            print("was expecting a file with one FeatureCollection, " +
                  "where each feature is a point!")
            print(e)
