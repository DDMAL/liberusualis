import tornado.httpserver
import tornado.ioloop
import tornado.web

import search
import json
import os
# import solr
from operator import itemgetter

import divaserve
import conf
import utils

diva_s = divaserve.DivaServe(conf.IMAGE_DIRECTORY)

class SearchHandler(tornado.web.RequestHandler):
    def get(self, search_type, query, zoom_level):
        if not query:
            raise tornado.web.HTTPError(400)
        try:
            boxes = search.do_query(search_type, query, zoom_level)
            self.write(json.dumps(boxes))
        except search.LiberSearchException, e:
            raise tornado.web.HTTPError(400)

class RootHandler(tornado.web.RequestHandler):
    def get(self):
        app_root = conf.APP_ROOT.rstrip("/")
        self.render("templates/index.html", app_root=app_root, iip_server=conf.IIP_SERVER)

class DivaHandler(tornado.web.RequestHandler):
    def get(self):
        z = self.get_argument("z")
        info = diva_s.get(int(z))
        self.set_header("Content-Type", "application/json")
        self.write(json.dumps(info))

settings = {
    "static_path": os.path.join(os.path.dirname(__file__), "static"),
    "debug": True,
    "cookie_secret": "nomnomnomnom"
}

def abs_path(relpath):
    root = conf.APP_ROOT.rstrip("/")
    return r"{0}{1}".format(root, relpath)

application = tornado.web.Application([
    (abs_path(r"/?"), RootHandler),
    (abs_path(r"/divaserve/?"), DivaHandler),
    (abs_path(r"/query/(.*)/(.*)/(.*)"), SearchHandler),
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