#!/usr/bin/python

import tornado.httpserver
import tornado.ioloop
import tornado.web

import json
import os
import conf

class RootHandler(tornado.web.RequestHandler):
    def get(self):
        app_root = conf.APP_ROOT.rstrip("/")
        self.set_header("Content-Type", "application/json")
        self.write(json.dumps({}))

class PageHandler(tornado.web.RequestHandler):
    def get(self):
        self.get_header("Content-Type")
        self.write(json.dumps({}))

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
