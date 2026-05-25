import conf
import json
import os
import pysolr
import re
from operator import itemgetter

import search_utils

solrconn = pysolr.Solr(conf.SOLR_URL)


class LiberSearchException(Exception):
    def __init__(self, message):
        self.message = message

    def __str__(self):
        return repr(self.message)


def do_query(qtype, query):
    query = query.lower()

    if qtype == "neumes":
        query_stmt = 'neumes:{0}'.format(query.replace(' ', '_'))
    elif qtype == "pnames" or qtype == "pnames-invariant":
        if not search_utils.valid_pitch_sequence(query):
            raise LiberSearchException("The query you provided is not a valid pitch sequence")
        real_query = query if qtype == 'pnames' else ' OR '.join(search_utils.get_transpositions(query))

        query_stmt = 'pnames:{0}'.format(real_query)
    elif qtype == "contour":
        query_stmt = 'contour:{0}'.format(query)
    elif qtype == "text":
        query_stmt = 'text:"{0}"'.format(query)
    elif qtype == "intervals":
        query_stmt = 'intervals:{0}'.format(query.replace(' ', '_'))
    elif qtype == "incipit":
        query_stmt = "incipit:{0}*".format(query)
    else:
        raise LiberSearchException("Invalid query type provided")

    if qtype == "pnames-invariant":
        response = solrconn.search(query_stmt, sort="pagen asc", rows=1000000, **{'q.op': 'OR'})
    else:
        response = solrconn.search(query_stmt, sort="pagen asc", rows=1000000)

    boxes = []

    # get only the longest ngram in the results
    if qtype == "neumes":
        notegrams_num = search_utils.get_neumes_length(query)
        response = [r for r in response if len(r['pnames']) == notegrams_num]

    for d in response:
        page_number = d['pagen']
        locations = json.loads(d['location'].replace("'", '"'))
        box_id = "m-" + d['id']
        search_data = {
            'semitones': d['semitones'],
            'pnames': d['pnames'],
            'neumes': d['neumes'],
            'contour': d['contour'],
            'intervals': d['intervals']
        }

        locs = [locations] if isinstance(locations, dict) else locations
        for loc in locs:
            boxes.append({'p': page_number, 'w': loc['width'], 'h': loc['height'],
                          'x': loc['ulx'], 'y': loc['uly'], 'id': box_id, 'results': search_data})

    boxes_sorted = sorted(boxes, key=itemgetter('p', 'y'))

    return boxes_sorted
