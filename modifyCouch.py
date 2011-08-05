# ================================================================
# modifyCouch.py
#
# Usage: 
#
# Author: Jessica Thompson
# Last modified June 2011
#
# ================================================================
import couchdb
import sys
args = sys.argv
shortest_gram = int(args[1])
longest_gram = int(args[2])
couch = couchdb.Server('http://administrator2:readysetgo@localhost:5984')
# map function for converting pagen and location fields to ints
# map_fun = '''function(doc) {
#         emit(doc.pagen, [doc.location.ulx, doc.location.uly, doc.location.height, doc.location.width]);
# }'''
# map function for converting neume field from array of strings to one string
map_fun = '''function(doc) {
        emit(doc.intervals, null);
}'''
# map_fun = '''function(doc) {
#         emit(doc.pagen, null);
#}'''
for i in range(shortest_gram,longest_gram +1):
    dbname = 'notegrams_'+str((i))
    print 'Updating ' + dbname + '...'
    db = couch[dbname] # existing db
    rows = db.query(map_fun)
    for row in rows:
        couch = couchdb.Server('http://administrator2:readysetgo@localhost:5984')
        #nrows = len(rows)
        doc_id = row.id
        doc = db[doc_id]
        # for converting strings to int
        # pagen = row.key
        #         ulx = row.value[0]
        #         uly = row.value[1]
        #         height = row.value[2]
        #         width = row.value[3]
        #         doc['pagen'] = int(pagen)
        #         doc['location'] = {"ulx": int(ulx) ,"uly": int(uly), "height": int(height), "width": int(width)}
        
        # for converting neume array to one string
        #neumes = row.key
        #nneumes = len(neumes)
        #newneumes = neumes[0]
        #for i in range(1,nneumes):
            #newneumes = newneumes + '_' + neumes[i]
        #doc['neumes'] = newneumes
        
        # for converting semitone and interval csv into underscore seperated lists  
        intervals = str(row.key)
        #semitones = str(row.value)
        doc['intervals'] = intervals.replace(', ', '_')
        #doc['semitones'] = semitones.replace(', ', '_')
       # print 'new semitones: ' + semitones.replace(', ', '_')
        print 'new intervals: ' + intervals.replace(', ', '_')
        
        #for deleting pages 1-120
        # pagen = int(row.key)
        #         if pagen < 120:
        #             del db[doc_id]
        #             print 'doc ' + doc_id + ' deleted'
        
        db.save(doc)
    #print str(nrows) + ' updated.\n'
    