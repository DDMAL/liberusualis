import pymei
import sys
import os
import solr
import uuid

from pymei.Import import convert

solrconn = solr.SolrConnection("http://132.206.14.42:8080/liber-search")
idcache = {}


def findbyID(llist, mid):
    """ Returns the object in llist that has the given id. Used for finding zone.
        pymei function get_by_facs can be used instead, but this one is faster.
    """
    if mid in idcache:
        return idcache[mid]
    else:
        idcache[mid] = llist[(i for i, obj in enumerate(llist) if obj.id == mid).next()]
        return idcache[mid]


def storeText(ffile):
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

    lines = meifile.search('l')
    zones = meifile.search('zone')

    textdocs = []
    for line in lines:
        text = line.value
        facs = str(line.attribute_by_name('facs').value)
        zone = findbyID(zones, facs)
        ulx = int(zone.ulx)
        uly = int(zone.uly)
        lrx = int(zone.lrx)
        lry = int(zone.lry)
    
        textdocs.append({'id': str(uuid.uuid4()), 'pagen': pagen, 'text': text, 'location': {"ulx": ulx ,"uly": uly, "height": abs(uly - lry), "width": abs(ulx - lrx)}})
    
    solrconn.add_many(textdocs)
    solrconn.commit()

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
        storeText(ffile)
        idcache.clear()




