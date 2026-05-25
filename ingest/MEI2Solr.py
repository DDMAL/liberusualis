# Usage: python MEI2Solr.py <mei_directory> <shortest_gram> <longest_gram> <solr_url>
# Example: python MEI2Solr.py /path/to/mei 2 10 http://localhost:8983/solr/liber-search
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
STEPREF = {'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11}

# Maps semitones (within an octave) to diatonic interval size
_SEMITONE_TO_GENERIC = {0: 1, 1: 2, 2: 2, 3: 3, 4: 3, 5: 4, 7: 5, 8: 6, 9: 6, 10: 7, 11: 7}

def _semitone_to_generic(semitones):
    n = abs(semitones)
    octaves, rem = divmod(n, 12)
    return _SEMITONE_TO_GENERIC.get(rem, 8) + octaves * 7


def step_to_ps(pname, oct_val):
    return float(((int(oct_val) + 1) * 12) + STEPREF[pname.lower()])


def get_contour(semitones):
    return ''.join('r' if s == 0 else ('u' if s > 0 else 'd') for s in semitones)


def get_intervals(semitones, pnames):
    intervals = []
    for i, interval in enumerate(semitones):
        if interval == 0:
            intervals.append('r')
        else:
            direction = 'u' if interval > 0 else 'd'
            if interval == 6:
                size = 5 if pnames[i] == 'b' else 4
            elif interval == -6:
                size = 4 if pnames[i] == 'b' else 5
            else:
                size = _semitone_to_generic(interval)
            intervals.append(f"{direction}{size}")
    return "_".join(intervals)


def process_mei_file(filepath, shortest_gram, longest_gram, solrconn):
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

    parent_map = {c: p for p in root.iter() for c in p}

    # Assign each nc to a system (identified by the preceding mei:sb xml:id)
    current_system = '__start__'
    nc_system = {}
    for elem in root.iter():
        if elem.tag == f'{M}sb':
            current_system = elem.get(f'{X}id', current_system)
        elif elem.tag == 'nc':
            nc_system[id(elem)] = current_system

    all_nc = list(root.iter('nc'))
    n_nc = len(all_nc)
    docs = []

    for gram_len in range(shortest_gram, longest_gram + 1):
        for j in range(n_nc - gram_len + 1):
            seq = all_nc[j:j + gram_len]

            pnames = []
            midi = []
            valid = True
            for nc in seq:
                pname = nc.get('pname', '').lower()
                oct_val = nc.get('oct', '3')
                if not pname or pname not in 'abcdefg':
                    valid = False
                    break
                pnames.append(pname)
                midi.append(int(step_to_ps(pname, oct_val)))

            if not valid:
                continue

            semitones = [m - n for n, m in zip(midi[:-1], midi[1:])]

            # Neume names: collect unique neume types as nc traverses neumes
            neume_names = []
            prev_neume = None
            for nc in seq:
                neume_elem = parent_map.get(nc)
                if neume_elem is not None and neume_elem is not prev_neume:
                    neume_names.append(neume_elem.get('type', 'unknown'))
                    prev_neume = neume_elem

            # Bounding boxes
            systems = [nc_system.get(id(nc), '__start__') for nc in seq]

            def zone_for_nc(nc):
                neume_elem = parent_map.get(nc)
                if neume_elem is None:
                    return None
                facs = neume_elem.get('facs', '')
                return zones.get(facs)

            def box_for_part(part):
                first_z = zone_for_nc(part[0])
                last_z = zone_for_nc(part[-1])
                if not first_z or not last_z:
                    return None
                all_z = [z for nc in part for z in [zone_for_nc(nc)] if z]
                return {
                    'ulx': first_z['ulx'],
                    'uly': min(z['uly'] for z in all_z),
                    'height': abs(min(z['uly'] for z in all_z) - max(z['lry'] for z in all_z)),
                    'width': abs(first_z['ulx'] - last_z['lrx']),
                }

            if len(set(systems)) == 1:
                box = box_for_part(seq)
                if not box:
                    continue
                location = [box]
            else:
                split = next(i for i in range(1, len(seq)) if systems[i] != systems[i - 1])
                box1 = box_for_part(seq[:split])
                box2 = box_for_part(seq[split:])
                if not box1 or not box2:
                    continue
                location = [box1, box2]

            docs.append({
                'id': str(uuid.uuid4()),
                'pagen': pagen,
                'pnames': ''.join(pnames),
                'neumes': '_'.join(neume_names),
                'contour': get_contour(semitones),
                'semitones': '_'.join(str(s) for s in semitones),
                'intervals': get_intervals(semitones, pnames),
                'location': str(location),
            })

    if docs:
        solrconn.add(docs)
        solrconn.commit()
    print(f'  Page {pagen}: {len(docs)} documents indexed')


if __name__ == '__main__':
    if len(sys.argv) < 5:
        print("Usage: python MEI2Solr.py <directory> <shortest_gram> <longest_gram> <solr_url>")
        sys.exit(1)

    path = sys.argv[1]
    shortest_gram = int(sys.argv[2])
    longest_gram = int(sys.argv[3])
    solr_url = sys.argv[4]

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
            process_mei_file(ffile, shortest_gram, longest_gram, solrconn)
        except Exception as e:
            lg.error(f"Failed on {ffile}: {e}")
            print(f"  ERROR: {e}")