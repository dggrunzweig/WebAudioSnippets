# WebAudioSnippets

This is a collection of code snippets for free use in creative and commercial projects (with proper acknowledgement and following of the GPL License).

The respository is written in Typescript and transpiled into Javascript for ease of use.
Javascript version is in the "js" folder.

Demos of the various blocks are in subfolders with the word "Demo" in the name. 

## Setup

The repository uses NPM primarily to manage the typescript types and compiler. After pulling the repo and installing npm, run the following command to add the types.

```console
npm install
```

If you want to explore the demos, I use the VSCode extension [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer).

After installing the extension, open the folder containing the desired demo, right click the HTML file, and click "Open with Live Server".

## Building

If you make edits to the code in the Typescript folder, you can compile them by running

```console
tsc
```

The Typescript compiler settings are in the tsconfig.json file.