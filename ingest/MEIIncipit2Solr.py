import pymei
import sys
import os
import solr
import uuid

from pymei.Import import convert
from pymei.Helpers import flatten

solrconn = solr.SolrConnection("http://132.206.14.42:8080/liber-search")
idcache = {}
systemcache = {}


def findbyID(llist, mid):
    """ Returns the object in llist that has the given id. Used for finding zone.
        pymei function get_by_facs can be used instead, but this one is faster.
    """
    if mid in idcache:
        return idcache[mid]
    else:
        idcache[mid] = llist[(i for i, obj in enumerate(llist) if obj.id == mid).next()]
        return idcache[mid]

def getLocation(seq, meifile, zones):
    """ Given a sequence of notes and the corresponding MEI Document, calculates and returns the json formatted list of 
        locations (box coordinates) to be stored for an instance of a pitch sequence in our CouchDB. 
        If the sequence is contained in a single system, only one location will be stored. If the sequence
        spans two systems, a list of two locations will be stored.
    """
    ulys = []
    lrys = []
    twosystems=0
    endofsystem = len(seq)-1
    if seq[0] not in systemcache:
        systemcache[seq[0]] = meifile.get_system(seq[0])
    if seq[endofsystem] not in systemcache:
        systemcache[seq[endofsystem]] = meifile.get_system(seq[endofsystem])

    if systemcache[seq[0]] != systemcache[seq[endofsystem]]: #then the sequence spans two systems and we must store two seperate locations to highlight
        twosystems=1
        for i in range(1,len(seq)):
            if seq[i-1] not in systemcache:
                systemcache[seq[i-1]] = meifile.get_system(seq[i-1])
            if seq[i] not in systemcache:
                systemcache[seq[i]] = meifile.get_system(seq[i])

            # find the last note on the first system and the first note on the second system
            if systemcache[seq[i-1]] != systemcache[seq[i]]: 
                endofsystem = i # this will be the index of the first note on second system
                # ulx1 = int(meifile.get_by_facs(seq[0].parent.parent.facs)[0].ulx)
                # lrx1 = int(meifile.get_by_facs(seq[i-1].parent.parent.facs)[0].lrx)
                # ulx2 = int(meifile.get_by_facs(seq[i].parent.parent.facs)[0].ulx)
                # lrx2 = int(meifile.get_by_facs(seq[-1].parent.parent.facs)[0].lrx)
                ulx1 =  int(findbyID(zones, seq[0].parent.parent.facs).ulx)
                lrx1 =  int(findbyID(zones, seq[i-1].parent.parent.facs).lrx)
                ulx2 =  int(findbyID(zones, seq[i].parent.parent.facs).ulx)
                lrx2 =  int(findbyID(zones, seq[-1].parent.parent.facs).lrx)
    else: # the sequence is contained in one system and only one box needs to be highlighted
        ulx =  int(findbyID(zones, seq[0].parent.parent.facs).ulx)
        lrx =  int(findbyID(zones, seq[-1].parent.parent.facs).lrx)
        # ulx = int(meifile.get_by_facs(seq[0].parent.parent.facs)[0].ulx)
        # lrx = int(meifile.get_by_facs(seq[-1].parent.parent.facs)[0].lrx)
    for note in seq:
        ulys.append(int(findbyID(zones, note.parent.parent.facs).uly))
        lrys.append(int(findbyID(zones, note.parent.parent.facs).lry))
    if twosystems:
        uly1 = min(ulys[:endofsystem])
        uly2 = min(ulys[endofsystem:])
        lry1 = max(lrys[:endofsystem])
        lry2 = max(lrys[endofsystem:])
        return [{"ulx": int(ulx1) ,"uly": int(uly1), "height": abs(uly1 - lry1), "width": abs(ulx1 - lrx1)},{"ulx": int(ulx2) ,"uly": int(uly2), "height": abs(uly2 - lry2), "width": abs(ulx2 - lrx2)}]      
    else:
        uly =  min(ulys)
        lry = max(lrys)
        return [{"ulx": int(ulx) ,"uly": int(uly), "height": abs(uly - lry), "width": abs(ulx - lrx)}]

def getIncipit(ffile):
    """ For each line of text in the list "lines", this function gets the corresponding box coordinates and saves the 
    line as a doc in the "text" database.
    """
    print '\nProcessing ' + str(ffile) + '...'
    try:
        meifile = convert(str(ffile))
    except Exception, e:
        lg.debug("Could not process file {0}. Threw exception: {1}".format(ffile, e))

    page = meifile.search('page')
    pagen = int(page[0].attribute_by_name('n').value)
    zones = meifile.search('zone')

    flattened = meifile.flat()

    incipits = []
    # find all the final divisions
    final_divisions = []
    for m in meifile.search('division'):
        if m.has_attribute('form') and m.attribute_by_name('form').value == 'final':
            final_divisions.append(m)
    
    # grab the incipit from the flattened files
    for division in final_divisions:
        division_index = flattened.index(division)
        # grab the next eight neumes
        incipit_neumes = []
        for n in flattened[division_index:]:
            if n.name == "neume":
                incipit_neumes.append(n)
            
            if len(incipit_neumes) == 8:
                break
        
        if len(incipit_neumes) < 8:
            continue

        incipit_notes = []
        # grab all the notes in the neumes
        for neume in incipit_neumes:
            neume_notes = [n for n in flatten(neume) if n.name == "note"]
            incipit_notes.extend(neume_notes)

        
        # grab the locations for each neume
        locs = getLocation(incipit_notes, meifile, zones)

        notes = [n.attribute_by_name('pname').value for n in incipit_notes]
        notes = "".join(notes)

        incipits.append({"id": str(uuid.uuid4()), "incipit": notes, "location": str(locs), "pagen": pagen})
    
    print incipits
    solrconn.add_many(incipits)


if __name__ == '__main__':
    #***************************** MEI PROCESSING *******************************      
    args = sys.argv
    path = args[1]

    # Generate list of files to process, preferring human-corrected MEI files
    meifiles = []
    for bd, dn, fn in os.walk(path):
        if ".git" in bd:
            continue
        for f in fn:
            if f.startswith("."):
                continue
            if "_corr.mei" in f:
                meifiles.append(os.path.join(bd,f))
                print "Adding {0}".format(f)
            # if not (('uncorr' in f) and os.path.exists(os.path.join(bd,f[0:5]+'corr.mei'))): # if current is uncorr version and corr version exists, don't add to list
                
            #     meifiles = meifiles + [os.path.join(bd,f)] 

    meifiles.sort()
    # couch = couchdb.Server("http://localhost:5984")
    # textdb = couch['text'] # database for text

    # Iterate through each MEI file in directory
    for ffile in meifiles:
        getIncipit(ffile)
        solrconn.commit()
        idcache.clear()
        systemcache.clear()
