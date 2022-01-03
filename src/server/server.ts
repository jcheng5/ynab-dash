import * as ynab from "ynab";
import { promises as fs } from "fs";
import express, {
  NextFunction,
  Request,
  Response as ExpressResponse,
} from "express";
import session, { SessionOptions } from "express-session";
import sessionFileStore from "session-file-store";
import { engine } from "express-handlebars";
import fetch, { Response as FetchResponse } from "node-fetch";

interface SessionState {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  created_at: number;
  userId: string;
}

const FileStore = sessionFileStore(session);

const apiEndpoint = "https://api.youneedabudget.com/v1";

async function main() {
  const contents = await fs.readFile("secrets.json", { encoding: "utf-8" });
  let { clientId, clientSecret, redirectUrl } = JSON.parse(contents);

  const app = express();

  app.engine("handlebars", engine());
  app.set("trust proxy", 1); // trust first proxy
  const sessionOptions: SessionOptions = {
    secret: clientSecret,
    resave: false,
    saveUninitialized: false,
    store: new FileStore(),
    cookie: {
      secure: "auto",
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    },
    name: "ynab-dash-session",
  };
  app.use(session(sessionOptions));

  app.set("view engine", "handlebars");
  app.set("views", "./views");

  app.get(
    "/",
    wrap(async (req, res) => {
      if (!(req.session as any).userId) {
        res.render("index", {
          // TODO: Use `state` parameter
          login_url: `https://app.youneedabudget.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUrl}&response_type=code&scope=read-only`,
        });
      } else {
        res.render("home", {});
      }
    })
  );

  app.get(
    "/callback",
    wrap(async (req, res) => {
      const authCode = req.query.code;
      const url = `https://app.youneedabudget.com/oauth/token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${redirectUrl}&grant_type=authorization_code&code=${authCode}`;
      const response = await fetch(url, { method: "POST" });
      const { access_token, refresh_token, expires_in, created_at }: any =
        await response.json();
      const s = req.session as any as SessionState;
      s.access_token = access_token;
      s.refresh_token = refresh_token;
      s.expires_in = expires_in;
      s.created_at = created_at;

      const api = new ynab.API(s.access_token, apiEndpoint);
      const userInfo = await api.user.getUser();
      s.userId = userInfo.data.user.id;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            reject(err);
          } else {
            resolve(null);
          }
        });
      });

      res.redirect("/");
    })
  );

  app.get(
    "/logout",
    wrap(async (req, res) => {
      req.session.regenerate(() => {
        res.header("Cache-Control", "no-store");
        res.redirect("/");
      });
    })
  );

  app.get(
    "/api/*",
    wrap(async (req, res) => {
      // TODO: Check if logged in, and if expired
      const resp = await ynabFetch(req, "/" + req.params[0]);
      res.statusCode = resp.status;
      res.statusMessage = resp.statusText;
      if (resp.headers.has("X-Rate-Limit")) {
        res.header("X-Rate-Limit", resp.headers.get("X-Rate-Limit"));
      }
      res.header("Vary", "Authorization");
      res.json(await resp.json());
    })
  );

  app.use(express.static("assets"));
  app.use("/lib/bootstrap", express.static("node_modules/bootstrap/dist"));

  app.use(
    (err: any, req: Request, res: ExpressResponse, next: NextFunction) => {
      if (err) {
        res.render("error", {
          message: err.message ?? err.error?.detail ?? "An error has occurred",
        });
      } else {
        res.render("error", {
          message: "Not found",
        });
      }
    }
  );

  const port = 8123;
  app.listen(port, () => {
    console.error(`Listening on http://0.0.0.0:${port}`);
  });
}

async function ynabFetch(req: Request, path: string): Promise<FetchResponse> {
  const resp = await fetch(apiEndpoint + path, {
    headers: {
      Authorization: `Bearer ${
        (req.session as any as SessionState).access_token
      }`,
    },
  });
  return resp;
}

function wrap(
  asyncHandler: (req: Request, res: ExpressResponse) => Promise<void>
) {
  return async function (
    req: Request,
    res: ExpressResponse,
    next: (error: any) => void
  ) {
    try {
      await asyncHandler(req, res);
    } catch (e) {
      next(e);
    }
  };
}

main();
