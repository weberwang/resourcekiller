'use strict';

exports.load = function () {
    Editor.log("插件打开路径:菜单->资源管理->resourceKiller");

};

exports.unload = function () {
    Editor.log("告辞!!!!");
};

exports.messages = {
    open() {
        Editor.Panel.open('resourcekiller');
    }
};