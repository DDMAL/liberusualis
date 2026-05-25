# Usage: python MEIIncipit2Solr.py <mei_directory> <solr_url>
# Example: python MEIIncipit2Solr.py /path/to/mei http://localhost:8983/solr/liber-search
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

INCIPIT_NEUME_COUNT = 8


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

    # Collect all elements in document order to find neumes after each finalis
    all_elements = list(root.iter())

    finalis_indices = [
        i for i, e in enumerate(all_elements)
        if e.tag == 'divLine' and e.get('form') == 'finalis'
    ]

    docs = []
    for fin_idx in finalis_indices:
        # Collect the next INCIPIT_NEUME_COUNT neumes after this divLine
        neumes = []
        for elem in all_elements[fin_idx + 1:]:
            if elem.tag == 'neume':
                neumes.append(elem)
            if len(neumes) == INCIPIT_NEUME_COUNT:
                break

        if len(neumes) < INCIPIT_NEUME_COUNT:
            continue

        # Pitch names from all nc children of the collected neumes
        pnames = []
        for neume in neumes:
            for nc in neume:
                if nc.tag == 'nc':
                    pname = nc.get('pname', '').lower()
                    if pname and pname in 'abcdefg':
                        pnames.append(pname)

        if not pnames:
            continue

        # Bounding box spanning first to last neume
        first_z = zones.get(neumes[0].get('facs', ''))
        last_z = zones.get(neumes[-1].get('facs', ''))
        if not first_z or not last_z:
            continue

        all_z = [zones[n.get('facs', '')] for n in neumes if n.get('facs', '') in zones]
        location = [{
            'ulx': first_z['ulx'],
            'uly': min(z['uly'] for z in all_z),
            'height': abs(min(z['uly'] for z in all_z) - max(z['lry'] for z in all_z)),
            'width': abs(first_z['ulx'] - last_z['lrx']),
        }]

        docs.append({
            'id': str(uuid.uuid4()),
            'pagen': pagen,
            'incipit': ''.join(pnames),
            'location': str(location),
        })

    if docs:
        solrconn.add(docs)
        solrconn.commit()
    print(f'  Page {pagen}: {len(docs)} incipits indexed')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python MEIIncipit2Solr.py <directory> <solr_url>")
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