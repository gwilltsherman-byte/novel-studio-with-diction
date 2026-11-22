# Novel Studio with Diction

Draft and revise chapters in Writing. Select a word to look it up in Vocabulary, explore words related to the current scene, and send a chosen word back to your draft.

## Run locally

From the repository root, start a static server with Python 3.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [Novel Studio](http://127.0.0.1:8000/) in your browser. The app runs entirely from the included HTML, CSS, and JavaScript.

A new workspace starts with one empty chapter. Drafts are saved in the browser on the device where you write. Use the app's backup export to keep a separate copy.
