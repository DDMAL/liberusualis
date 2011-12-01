#!/usr/bin/python
import tornado.httpserver
import tornado.ioloop
import tornado.web

import json
import os
import conf

from pymei.Import import xmltomei
from pymei.Export import meitojson


class RootHandler(tornado.web.RequestHandler):
    def get(self):
        app_root = conf.APP_ROOT.rstrip("/")
        self.set_header("Content-Type", "application/json")
        self.write(json.dumps({}))

class PageHandler(tornado.web.RequestHandler):
    def get(self, pgno):

        page_number = pgno.rjust(4, "0")
        page_mei_file = os.path.join(conf.MEI_FILE_PATH, "{0}_corr.mei".format(page_number))

        headers = self.request.headers.get("Accept", "").split(",")

        print headers

        if "application/json" in headers:
            print "json"
            self.set_header("Content-Type", "application/json")
            mei = xmltomei.xmltomei(page_mei_file)
            response = meitojson.meitojson(mei)
        else:
            print "xml"
            self.set_header("Content-Type", "application/xml")
            f = open(page_mei_file, 'r')
            response = f.read()
            f.close()

        self.write(response)

settings = {
    "static_path": os.path.join(os.path.dirname(__file__), "static"),
    "debug": True,
    "cookie_secret": "solesmesnomnomnom"
}

def abs_path(relpath):
    root = conf.APP_ROOT.rstrip("/")
    return r"%s%s" % (root, relpath)

application = tornado.web.Application([
    (abs_path(r"/?"), RootHandler),
    (abs_path(r"/page/([0-9]+)?"), PageHandler),
    ], **settings)

def main(port):
    server = tornado.httpserver.HTTPServer(application)
    server.listen(port)
    tornado.ioloop.IOLoop.instance().start()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    else:
        port = 8080
    main(port)
