# Usage: python MEIText2Solr.py <mei_directory> <solr_url>
# Example: python MEIText2Solr.py /path/to/mei http://localhost:8983/solr/liber-search
# Note: text content in mei:l elements is empty in the MEI5 files; this will index nothing
# until the OCR text layer is restored.
import xml.etree.ElementTree as ET
import pysolr
import uuid
import os
import sys
import logging

logging.basicConfig(filename='errors.log', format='%(asctime)-6s: %(name)s - %(levelname)s - %(message)s')
lg = logging.getLogger('meisearch')
lg.setLevel(logging.DEBUG)

NS_MEI = 'http://www.music-encoding.org/ns/mei'
NS_XML = 'http://www.w3.org/XML/1998/namespace'
M = '{%s}' % NS_MEI
X = '{%s}' % NS_XML


def process_mei_file(filepath, solrconn):
    print(f'\nProcessing {filepath}...')
    try:
        tree = ET.parse(filepath)
    except Exception as e:
        lg.error(f"Could not parse {filepath}: {e}")
        return

    root = tree.getroot()

    pb = root.find(f'.//{M}pb')
    if pb is None:
        lg.warning(f"No pb element in {filepath}")
        return
    pagen = int(pb.get('n', 0))

    zones = {}
    for zone in root.findall(f'.//{M}zone'):
        zid = zone.get(f'{X}id')
        if zid:
            zones[zid] = {
                'ulx': int(zone.get('ulx', 0)),
                'uly': int(zone.get('uly', 0)),
                'lrx': int(zone.get('lrx', 0)),
                'lry': int(zone.get('lry', 0)),
            }

    docs = []
    for line in root.findall(f'.//{M}l'):
        text = (line.text or '').strip()
        if not text:
            continue

        facs = line.get('facs', '')
        zone = zones.get(facs)
        if not zone:
            continue

        docs.append({
            'id': str(uuid.uuid4()),
            'pagen': pagen,
            'text': text,
            'location': str([{
                'ulx': zone['ulx'],
                'uly': zone['uly'],
                'height': abs(zone['uly'] - zone['lry']),
                'width': abs(zone['ulx'] - zone['lrx']),
            }]),
        })

    if docs:
        solrconn.add(docs)
        solrconn.commit()
    print(f'  Page {pagen}: {len(docs)} text lines indexed')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python MEIText2Solr.py <directory> <solr_url>")
        sys.exit(1)

    path = sys.argv[1]
    solr_url = sys.argv[2]
    solrconn = pysolr.Solr(solr_url, timeout=120)

    meifiles = []
    for bd, dn, fn in os.walk(path):
        for f in fn:
            if f.endswith('.mei'):
                meifiles.append(os.path.join(bd, f))

    meifiles.sort()
    print(f"Found {len(meifiles)} MEI files")

    for ffile in meifiles:
        try:
            process_mei_file(ffile, solrconn)
        except Exception as e:
            lg.error(f"Failed on {ffile}: {e}")
            print(f"  ERROR: {e}")