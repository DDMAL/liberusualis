import json
import os
from urllib.parse import urlparse, parse_qs

import conf
import tornado.httpserver
import tornado.ioloop
import tornado.web

import search


class SearchHandler(tornado.web.RequestHandler):
    def get(self, search_type, query):
        if not query:
            raise tornado.web.HTTPError(400)
        try:
            boxes = search.do_query(search_type, query)
            self.write(json.dumps(boxes))
        except search.LiberSearchException as e:
            raise tornado.web.HTTPError(400)


class RootHandler(tornado.web.RequestHandler):
    def get(self):
        app_root = conf.APP_ROOT.rstrip("/")
        parsed = urlparse(conf.IIP_SERVER)
        iip_server_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        image_dir = parse_qs(parsed.query).get('FIF', ['/liber'])[0].rstrip('/')
        self.render("templates/index.html", app_root=app_root,
                    iip_server_url=iip_server_url, image_dir=image_dir)


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
    (abs_path(r"/query/(.*)/(.*)"), SearchHandler),
], **settings)


def main(port):
    server = tornado.httpserver.HTTPServer(application)
    server.listen(port)
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    import sys
    import os

    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    else:
        port = int(os.environ.get("PORT", 8091))
    main(port)
