'use strict';

let fs = require("fs");
let PATH = require("path")

let resourceTypes = [{
    type: "cc.Sprite",
    value: "_spriteFrame"
}, {
    type: "cc.AudioSource",
    value: "_clip"
}, {
    type: "cc.Animation",
    value: "_clips"
}, {
    type: "sp.Skeleton",
    value: "_N$skeletonData"
}];

let animTyps = [{
    type: "cc.Sprite",
    value: "spriteFrame"
}, {
    type: "cc.AudioSource",
    value: "_clip"
}];
let assetsTypes = ["scene", "prefab", "animation-clip"]
let checkTyps = ["texture", "audio-clip", "typescript", "javascript", "animation-clip"]
let assetdb = Editor.assetdb;

let checkFilesPaths = []

let pattentType = (type) => {
    for (const resourceType of resourceTypes) {
        if (resourceType["type"] === type) {
            return resourceType;
        }
    }
    return null;
}

let findUsedResource = (assetType) => {
    assetdb.queryAssets('db://assets/**', assetType, (err, results) => {
        if (err) {
            return
        }
        for (const result of results) {
            let data = fs.readFileSync(result.path, {
                encoding: "utf-8"
            });
            if (checkFilesPaths.indexOf(result.url) === -1) continue;
            Editor.log(result.path)
            let assetData = JSON.parse(data);
            if (result.type === "animation-clip") {
                findAnima(assetData);
            } else {
                findSceneAndPrefab(assetData);
            }
        }
        findParentScript();
        Editor.Ipc.sendToPanel("resourcekiller", "onUnsedResults", checkFilesPaths);
    });
}

let findSceneAndPrefab = (assetData) => {
    for (const asset of assetData) {
        let typeData = pattentType(asset["__type__"]);
        if (typeData) {
            let value = asset[typeData["value"]];
            if (!value) continue;
            if (typeData.type === "cc.Animation") {
                for (const data of value) {
                    deleteExistWithUuid(data["__uuid__"]);
                }
            } else {
                deleteExistWithUuid(value["__uuid__"]);
            }
        } else {
            if (asset["__type__"].indexOf("cc.") === -1) {
                let scriptUuid = Editor.Utils.UuidUtils.decompressUuid(asset['__type__']);
                deleteExistWithUuid(scriptUuid)
            }
        }
    }
}

let findAnima = (assetData) => {
    let comps = assetData["curveData"]["comps"];
    if (comps && comps["cc.Sprite"]) {
        let spriteFrames = comps["cc.Sprite"]["spriteFrame"];
        if (spriteFrames) {
            for (const spriteFrame of spriteFrames) {
                let uuid = spriteFrame["value"]["__uuid__"];
                deleteExistWithUuid(uuid);
            }
        }
    }
}

let deleteExistWithUuid = (uuid) => {
    let resourcePath = assetdb.remote.uuidToUrl(uuid);
    resourcePath = PATH.extname(resourcePath) != "" ? resourcePath : PATH.dirname(resourcePath);
    let index = checkFilesPaths.indexOf(resourcePath)
    if (index > -1) checkFilesPaths.splice(index, 1);
}

let findAllUsed = () => {
    findUsedResource(assetsTypes);
}

let findAllResourceInAsset = (cb) => {
    checkFilesPaths.splice(0);
    assetdb.deepQuery((err, results) => {
        if (err) {
            return;
        }
        for (const result of results) {
            if (result.hidden === false && checkTyps.indexOf(result.type) > -1) {
                checkFilesPaths.push(assetdb.remote.uuidToUrl(result.uuid));
            }
        }
        cb()
    })
}

let findDepsScripts = (scriptData) => {
    let depsIndexs = [];
    for (const key in scriptData.deps) {
        depsIndexs.push(scriptData.deps[key])
    }
    return depsIndexs;
}

let deleteScriptUrl = (url) => {
    let index = checkFilesPaths.indexOf(url);
    if (index === -1) {
        url = url.replace(".js", ".ts")
        index = checkFilesPaths.indexOf(url);
    }
    if (index > -1) checkFilesPaths.splice(index, 1);
}

let findParentScript = () => {
    let simulatorPath = PATH.join(PATH.dirname(Editor.appPath), "cocos2d-x", "simulator");
    let settingPath = ""
    if (Editor.isDarwin) {
        settingPath = PATH.join(simulatorPath, "mac/Simulator.app/Contents/Resources/")
    } else {

    }
    settingPath = PATH.join(settingPath, "src/settings.js");
    require(settingPath);
    let settingsScript = _CCSettings.scripts;
    let indexs = [];
    for (const script of settingsScript) {
        if (checkFilesPaths.indexOf(script.file) === -1) {
            indexs = (findDepsScripts(script));
            for (const index of indexs) {
                let scriptUrl = settingsScript[index].file.replace("preview-scripts/", "db://");
                deleteScriptUrl(scriptUrl);
            }
        }
    }
}

module.exports.findEmptyFinder = () => {
    assetdb.queryAssets('db://assets/**', "folder", (err, results) => {
        if (err) {
            return;
        }
        for (const result of results) {
            if (result.hidden === false) {
                let path = assetdb.remote.uuidToFspath(result.uuid);
                deleteFolderRecursive(path);
            }
        }
    });
}

let deleteFolderRecursive = (path) => {
    if (fs.existsSync(path)) {
        let files = fs.readdirSync(path);
        if (files.length === 0) {
            assetdb.delete(assetdb.remote.fspathToUrl(path), (err) => {
                if (!err) {
                    deleteFolderRecursive(PATH.dirname(path));
                }
            })
        }
    }
};


module.exports.findAllUsedResource = () => {
    // findEmptyFinder();
    // findParentScript()
    findAllResourceInAsset(findAllUsed);
}