import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import {
    addDummyDbItems,
    addDbItem,
    getAllDbItems,
    getDbItemById,
    DbItem,
    updateDbItemById,
} from "../db";
import filePath from "../filePath";

// loading in some dummy items into the database
// (comment out if desired, or change the number)
addDummyDbItems(20);

const request = require("request");
const querystring = require("querystring");
const app = express();

const redirect_uri_login = "http://localhost:888/callback";
const client_id = "";
const client_secret = "";

/** Parses JSON data in a request automatically */
app.use(express.json());
/** To allow 'Cross-Origin Resource Sharing': https://en.wikipedia.org/wiki/Cross-origin_resource_sharing */
app.use(cors());

// read in contents of any environment variables in the .env file
// Must be done BEFORE trying to access process.env...
dotenv.config();

// use the environment variable PORT, or 4000 as a fallback
const PORT_NUMBER = process.env.PORT ?? 4000;

interface SpotifyAuthOptions {
    url: string;
    form: {
        code: string;
        redirect_uri: string;
        grant_type: string;
    };
    headers: {
        Authorization: string;
    };
    json: boolean;
}

// API info page
app.get("/", (req, res) => {
    const pathToFile = filePath("../public/index.html");
    res.sendFile(pathToFile);
});

app.get("/login", (req, res) => {
    try {
        res.redirect("https://accounts.spotify.com/authorize?") +
            querystring.stringify({
                response_type: "code",
                client_id: client_id,
                scope: "user-read-private user-read-email user-library-read",
                redirect_uri: redirect_uri_login,
            });
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

app.get("/callback", (req, res) => {
    const code: string = req.query.code;
    const redirect_uri: string = "http://localhost:3000/playlist"; // Set your redirect URI

    const authOptions: SpotifyAuthOptions = {
        url: "https://accounts.spotify.com/api/token",
        form: {
            code,
            redirect_uri,
            grant_type: "authorization_code",
        },
        headers: {
            Authorization:
                "Basic " +
                Buffer.from(client_id + ":" + client_secret).toString("base64"),
        },
        json: true,
    };

    // Make the POST request to Spotify API
    request.post(authOptions, (error: string, response: any, body: any) => {
        if (!error && response.statusCode === 200) {
            const access_token: string = body.access_token;
            const uri: string =
                process.env.FRONTEND_URI || "http://localhost:3000/playlist";
            res.redirect(uri + "?access_token=" + access_token);
        } else {
            // Handle errors here
            res.send("Error");
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// GET /items
app.get("/items", (req, res) => {
    const allSignatures = getAllDbItems();
    res.status(200).json(allSignatures);
});

// POST /items
app.post<{}, {}, DbItem>("/items", (req, res) => {
    // to be rigorous, ought to handle non-conforming request bodies
    // ... but omitting this as a simplification
    const postData = req.body;
    const createdSignature = addDbItem(postData);
    res.status(201).json(createdSignature);
});

// GET /items/:id
app.get<{ id: string }>("/items/:id", (req, res) => {
    const matchingSignature = getDbItemById(parseInt(req.params.id));
    if (matchingSignature === "not found") {
        res.status(404).json(matchingSignature);
    } else {
        res.status(200).json(matchingSignature);
    }
});

// DELETE /items/:id
app.delete<{ id: string }>("/items/:id", (req, res) => {
    const matchingSignature = getDbItemById(parseInt(req.params.id));
    if (matchingSignature === "not found") {
        res.status(404).json(matchingSignature);
    } else {
        res.status(200).json(matchingSignature);
    }
});

// PATCH /items/:id
app.patch<{ id: string }, {}, Partial<DbItem>>("/items/:id", (req, res) => {
    const matchingSignature = updateDbItemById(
        parseInt(req.params.id),
        req.body
    );
    if (matchingSignature === "not found") {
        res.status(404).json(matchingSignature);
    } else {
        res.status(200).json(matchingSignature);
    }
});

app.listen(PORT_NUMBER, () => {
    console.log(`Server is listening on port ${PORT_NUMBER}!`);
});
