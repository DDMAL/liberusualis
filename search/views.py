from django.http import HttpResponse, Http404
import json
from search.utils import get_transpositions, get_neumes_length, valid_pitch_sequence, valid_contour_sequence, incorporate_zoom
import urllib
from operator import itemgetter

def query(request, query_type, query, zoom):
    # This is going to be a problem later on ... but for now assume it's 4 i guess (for the liber)
    # If we have books with varying zooms, just get their max_zoom data for that page from the db
    max_zoom = 3
    zoom_level = int(zoom)
    base_url = 'http://132.206.14.43:9200/'
    if query_type == 'neumes':
        try:
            notegrams_num = get_neumes_length(query)
        except KeyError:
            # Raise a 404 if there's any error with the search
            raise Http404

        database = 'notegrams_%d/notegrams_%d/' % (notegrams_num, notegrams_num)
        # Lowercase it and replace spaces with underscores
        query_url = 'neumes:' + query.lower().replace(' ', '_')
        pass
    elif query_type == 'pnames' or query_type == 'pnames-invariant':
        # Make sure the only characters are abcdefg
        query = query.lower()
        if not valid_pitch_sequence(query):
            raise Http404
        notegrams_num = len(query) # Ex: aaa --> len of 3
        database = 'notegrams_%d/notegrams_%d/' % (notegrams_num, notegrams_num)

        # If it's the transposition invariant mode, get the transpositions etc
        real_query = query if query_type == 'pnames' else ','.join(get_transpositions(query))
        query_url = 'pnames:' + real_query
    elif query_type == 'contour':
        query = query.lower()
        notegrams_num = len(query) + 1
        database = 'notegrams_%d/notegrams_%d/' % (notegrams_num, notegrams_num)
        query_url = 'contour:' + query

        # Make sure that there are only u, d, and r
        if not valid_contour_sequence(query):
            raise Http404

    elif query_type == 'text':
        database = 'text/text/'
        query_url = 'text:' + query
    elif query_type == 'intervals':
        # Find the length by finding the number of spaces, then adding two
        notegrams_num = query.count(' ') + 2
        database = 'notegrams_%s/notegrams_%s/' % (notegrams_num, notegrams_num)
        real_query = query.lower().replace(' ', '_')
        query_url = query_type + ':' + real_query
    else:
        raise Http404

    url = base_url + database + '_search?size=1000000&fields=pagen,_source.location&q=' + query_url
    result = json.load(urllib.urlopen(url))
    hits = result['hits']
    hits = hits['hits']

    boxes = []
    for hit in hits:
        fields = hit['fields']
        page_number = fields['pagen']
        locations = fields['_source.location']
        # Treat each location field as a separate box
        if type(locations) == type([]):
            for location in locations:
                box_w = location['width']
                box_h = location['height']
                box_x = location['ulx']
                box_y = location['uly']
                boxes.append({'p': page_number, 'w': box_w, 'h': box_h, 'x': box_x, 'y': box_y})
            # A bit hacky ... in case it's not a list
        else:
            box_w = locations['width']
            box_h = locations['height']
            box_x = locations['ulx']
            box_y = locations['uly']
            boxes.append({'p': page_number, 'w': box_w, 'h': box_h, 'x': box_x, 'y': box_y})

    # Now only use all the boxes that are not within the given page range
    real_boxes = []
    for box in boxes:
        # Incorporate zoom
        box['w'] = incorporate_zoom(box['w'], max_zoom - zoom_level)
        box['h'] = incorporate_zoom(box['h'], max_zoom - zoom_level)
        box['x'] = incorporate_zoom(box['x'], max_zoom - zoom_level)
        box['y'] = incorporate_zoom(box['y'], max_zoom - zoom_level)

        # Only if the sizes are reasonable, append them
        # Or rather, only if they exist
        # Looking for reasonable sizes leads to zooming issues
        if box['w'] > 0 and box['h'] > 0:
            real_boxes.append(box)
    
    # Have to sort them so that the page numbers are right
    boxes_sorted = sorted(real_boxes, key=itemgetter('p', 'y'))
    # They should also by sorted by top y-coordinate
    # Not a perfect solution but works for now

    return HttpResponse(json.dumps(boxes_sorted))
